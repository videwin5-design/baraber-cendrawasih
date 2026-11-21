import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {WebSocket, WebSocketServer} from 'ws';
import {
  db,
  DB_PATH,
  getDailyReport,
  getFullState,
  getPeriodReport,
  initDatabase,
  recalculateMonthSalaries,
  upsertInventoryDailyLog,
} from './server/db.ts';
import {verifyLocationWithPython} from './server/pythonGeo.ts';
import {verifyFaceWithPython} from './server/pythonFace.ts';
import {cekRole} from './server/middleware/cekRole.ts';
import {
  handleMandiriQRISWebhook,
  sendWhatsAppNotification,
  formatMessageTemplate,
  getSetting,
  setSetting,
} from './server/integrations.ts';
import type {Branch, Employee, NotificationItem, PostItem, ServiceItem, TransactionItem} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {recursive: true});
}

initDatabase();

const app = express();

// ==========================================
// SECURITY HARDENING (HELMET & RATE LIMITING)
// ==========================================
app.use(
  helmet({
    contentSecurityPolicy: false, // Memungkinkan Vite HMR, WebSocket, dan WebCam
    crossOriginEmbedderPolicy: false,
  })
);

// Global API Rate Limiter
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 2000, // Maksimal 2000 requests per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: 'Terlalu banyak permintaan ke server, silakan coba lagi beberapa saat.'},
});
app.use('/api/', globalApiLimiter);

// Auth login rate limiter untuk proteksi brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {error: 'Terlalu banyak percobaan masuk, silakan coba lagi setelah 15 menit.'},
});

app.use(express.json({limit: '25mb'}));
app.use('/uploads', express.static(UPLOADS_DIR));

const server = http.createServer(app);
const wss = new WebSocketServer({server, path: '/ws'});

function broadcastEvent(event: string, payload: unknown) {
  const message = JSON.stringify({event, payload, timestamp: new Date().toISOString()});
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function broadcastFullSync(reason: string) {
  broadcastEvent('state:sync', {reason, state: getFullState()});
}

wss.on('connection', (socket) => {
  socket.send(
    JSON.stringify({
      event: 'state:init',
      payload: {state: getFullState()},
      timestamp: new Date().toISOString(),
    })
  );
});

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getNowTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// ==========================================
// AUTHENTICATION & BOOTSTRAP STATE
// ==========================================

app.get('/api/state', (_req, res) => {
  res.json(getFullState());
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const {employeeId, pin} = req.body as {employeeId?: string; pin?: string};
  if (!employeeId || !pin) {
    res.status(400).json({error: 'Pilih akun dan masukkan PIN'});
    return;
  }
  const emp = db
    .prepare(
      `SELECT e.*, b.name as branch_name FROM employees e LEFT JOIN branches b ON e.branch_id = b.id WHERE e.id = ? AND e.is_active = 1`
    )
    .get(employeeId) as Employee | undefined;

  if (!emp || emp.pin !== String(pin).trim()) {
    res.status(401).json({error: 'PIN tidak sesuai atau akun tidak aktif'});
    return;
  }
  res.json({user: emp});
});

// ==========================================
// BRANCHES (CABANG BARBER) - OWNER FULL CRUD
// ==========================================

app.post('/api/branches', cekRole('owner'), (req, res) => {
  const {name, code, address, phone, lat, lng, radius_meters, open_time, close_time} = req.body;
  if (!name || !address) {
    res.status(400).json({error: 'Nama dan alamat cabang wajib diisi'});
    return;
  }
  const id = uid('br');
  const branch: Branch = {
    id,
    name: String(name).trim(),
    code: String(code || `CW-${Math.floor(10 + Math.random() * 89)}`).trim(),
    address: String(address).trim(),
    phone: String(phone || '-').trim(),
    lat: Number(lat ?? -2.53371),
    lng: Number(lng ?? 140.71813),
    radius_meters: Number(radius_meters ?? 150),
    open_time: String(open_time || '09:00'),
    close_time: String(close_time || '21:00'),
    is_active: 1,
    created_at: new Date().toISOString(),
    photo_url: String(req.body.photo_url || '/assets/setmore/studio-storefront.jpg'),
  };
  db.prepare(`
    INSERT INTO branches (id, name, code, address, phone, lat, lng, radius_meters, open_time, close_time, is_active, created_at, photo_url)
    VALUES (@id, @name, @code, @address, @phone, @lat, @lng, @radius_meters, @open_time, @close_time, @is_active, @created_at, @photo_url)
  `).run(branch);

  // Create default 7-day operational schedule for new branch
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const insertSched = db.prepare(`
    INSERT INTO operational_schedules (id, branch_id, day_of_week, day_name, is_open, open_time, close_time, shift_notes, assigned_barber_ids)
    VALUES (@id, @branch_id, @day_of_week, @day_name, @is_open, @open_time, @close_time, @shift_notes, @assigned_barber_ids)
  `);
  for (let d = 0; d < 7; d++) {
    insertSched.run({
      id: `sch-${id}-${d}`,
      branch_id: id,
      day_of_week: d,
      day_name: days[d],
      is_open: 1,
      open_time: branch.open_time,
      close_time: branch.close_time,
      shift_notes: 'Operasional Reguler',
      assigned_barber_ids: '[]',
    });
  }

  broadcastFullSync('branch:created');
  res.status(201).json(branch);
});

app.put('/api/branches/:id', cekRole('owner'), (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(id) as Branch | undefined;
  if (!existing) {
    res.status(404).json({error: 'Cabang tidak ditemukan'});
    return;
  }
  const updated = {
    ...existing,
    name: req.body.name ?? existing.name,
    code: req.body.code ?? existing.code,
    address: req.body.address ?? existing.address,
    phone: req.body.phone ?? existing.phone,
    lat: req.body.lat !== undefined ? Number(req.body.lat) : existing.lat,
    lng: req.body.lng !== undefined ? Number(req.body.lng) : existing.lng,
    radius_meters: req.body.radius_meters !== undefined ? Number(req.body.radius_meters) : existing.radius_meters,
    open_time: req.body.open_time ?? existing.open_time,
    close_time: req.body.close_time ?? existing.close_time,
    is_active: req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active,
    photo_url: req.body.photo_url !== undefined ? String(req.body.photo_url) : (existing.photo_url || ''),
  };
  db.prepare(`
    UPDATE branches SET name=@name, code=@code, address=@address, phone=@phone, lat=@lat, lng=@lng,
      radius_meters=@radius_meters, open_time=@open_time, close_time=@close_time, is_active=@is_active,
      photo_url=@photo_url
    WHERE id=@id
  `).run(updated);

  broadcastFullSync('branch:updated');
  res.json(updated);
});

app.delete('/api/branches/:id', cekRole('owner'), (req, res) => {
  const {id} = req.params;
  db.prepare(`DELETE FROM operational_schedules WHERE branch_id = ?`).run(id);
  db.prepare(`DELETE FROM branches WHERE id = ?`).run(id);
  broadcastFullSync('branch:deleted');
  res.json({ok: true});
});

// ==========================================
// EMPLOYEES (KARYAWAN) - OWNER FULL CRUD
// ==========================================

app.post('/api/employees', cekRole('owner'), (req, res) => {
  const {name, role, specialty, phone, pin, branch_id, base_salary, commission_rate, photo_url} = req.body;
  if (!name || !role || !pin) {
    res.status(400).json({error: 'Nama, role, dan PIN wajib diisi'});
    return;
  }
  const emp = {
    id: uid('emp'),
    name: String(name).trim(),
    role: role as 'owner' | 'kasir' | 'karyawan',
    specialty: String(specialty || 'Barber & Hair Styling').trim(),
    phone: String(phone || '-').trim(),
    pin: String(pin).trim(),
    branch_id: branch_id || null,
    base_salary: Number(base_salary ?? 0),
    commission_rate: Number(commission_rate ?? 35),
    photo_url: String(photo_url || '').trim(),
    is_active: 1,
    joined_at: getTodayDateString(),
  };
  db.prepare(`
    INSERT INTO employees (id, name, role, specialty, phone, pin, branch_id, base_salary, commission_rate, photo_url, is_active, joined_at)
    VALUES (@id, @name, @role, @specialty, @phone, @pin, @branch_id, @base_salary, @commission_rate, @photo_url, @is_active, @joined_at)
  `).run(emp);
  recalculateMonthSalaries(getTodayDateString().slice(0, 7));
  broadcastFullSync('employee:created');
  res.status(201).json(emp);
});

app.put('/api/employees/:id', cekRole('owner'), (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as Employee | undefined;
  if (!existing) {
    res.status(404).json({error: 'Karyawan tidak ditemukan'});
    return;
  }
  const updated = {
    id,
    name: req.body.name ?? existing.name,
    role: req.body.role ?? existing.role,
    specialty: req.body.specialty ?? existing.specialty,
    phone: req.body.phone ?? existing.phone,
    pin: req.body.pin ?? existing.pin,
    branch_id: req.body.branch_id !== undefined ? req.body.branch_id : existing.branch_id,
    base_salary: req.body.base_salary !== undefined ? Number(req.body.base_salary) : existing.base_salary,
    commission_rate: req.body.commission_rate !== undefined ? Number(req.body.commission_rate) : existing.commission_rate,
    photo_url: req.body.photo_url !== undefined ? req.body.photo_url : (existing.photo_url || ''),
    is_active: req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active,
  };
  db.prepare(`
    UPDATE employees SET name=@name, role=@role, specialty=@specialty, phone=@phone, pin=@pin,
      branch_id=@branch_id, base_salary=@base_salary, commission_rate=@commission_rate, photo_url=@photo_url, is_active=@is_active
    WHERE id=@id
  `).run(updated);
  recalculateMonthSalaries(getTodayDateString().slice(0, 7));
  broadcastFullSync('employee:updated');
  res.json(updated);
});

app.post('/api/employees/:id/photo', (req, res) => {
  const {id} = req.params;
  const {photo_url} = req.body as {photo_url?: string};
  if (!photo_url || typeof photo_url !== 'string' || !photo_url.startsWith('data:image/')) {
    res.status(400).json({error: 'Format foto profil tidak valid'});
    return;
  }
  const existing = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as Employee | undefined;
  if (!existing) {
    res.status(404).json({error: 'Karyawan tidak ditemukan'});
    return;
  }
  db.prepare(`UPDATE employees SET photo_url = ? WHERE id = ?`).run(photo_url, id);
  const updated = db
    .prepare(
      `SELECT e.*, b.name as branch_name FROM employees e LEFT JOIN branches b ON e.branch_id = b.id WHERE e.id = ?`
    )
    .get(id) as Employee;
  broadcastFullSync('employee:photo_updated');
  res.json({user: updated});
});

app.delete('/api/employees/:id', cekRole('owner'), (req, res) => {
  const {id} = req.params;
  if (id === 'emp-owner') {
    res.status(400).json({error: 'Akun owner utama tidak dapat dihapus'});
    return;
  }
  db.prepare(`DELETE FROM employees WHERE id = ?`).run(id);
  broadcastFullSync('employee:deleted');
  res.json({ok: true});
});

// ==========================================
// SERVICE CATEGORIES - OWNER CRUD
// ==========================================

app.get('/api/service-categories', (_req, res) => {
  const cats = db.prepare(`SELECT * FROM service_categories ORDER BY sort_order ASC, name ASC`).all();
  res.json(cats);
});

app.post('/api/service-categories', (req, res) => {
  const {name, color, sort_order} = req.body as {name?: string; color?: string; sort_order?: number};
  if (!name || !name.trim()) {
    res.status(400).json({error: 'Nama kategori wajib diisi'});
    return;
  }
  const id = `cat-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const cat = {id, name: name.trim().toUpperCase(), sort_order: sort_order ?? 99, color: color || '#DCA842', is_active: 1};
  try {
    db.prepare(`INSERT INTO service_categories (id, name, sort_order, color, is_active) VALUES (@id, @name, @sort_order, @color, @is_active)`).run(cat);
    broadcastFullSync('category:created');
    res.status(201).json(cat);
  } catch (e: unknown) {
    res.status(400).json({error: e instanceof Error ? e.message : 'Nama kategori sudah ada'});
  }
});

app.put('/api/service-categories/:id', (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(id) as {id: string; name: string; sort_order: number; color: string; is_active: number} | undefined;
  if (!existing) { res.status(404).json({error: 'Kategori tidak ditemukan'}); return; }
  const updated = {
    id,
    name: req.body.name ? String(req.body.name).trim().toUpperCase() : existing.name,
    sort_order: req.body.sort_order !== undefined ? Number(req.body.sort_order) : existing.sort_order,
    color: req.body.color || existing.color,
    is_active: req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active,
  };
  db.prepare(`UPDATE service_categories SET name=@name, sort_order=@sort_order, color=@color, is_active=@is_active WHERE id=@id`).run(updated);
  broadcastFullSync('category:updated');
  res.json(updated);
});

app.delete('/api/service-categories/:id', (req, res) => {
  const {id} = req.params;
  const catName = (db.prepare(`SELECT name FROM service_categories WHERE id = ?`).get(id) as {name: string} | undefined)?.name;
  if (!catName) { res.status(404).json({error: 'Kategori tidak ditemukan'}); return; }
  const usedCount = (db.prepare(`SELECT COUNT(*) as c FROM services WHERE category = ?`).get(catName) as {c: number}).c;
  if (usedCount > 0) {
    res.status(400).json({error: `Kategori masih dipakai oleh ${usedCount} layanan. Pindahkan dulu sebelum menghapus.`});
    return;
  }
  db.prepare(`DELETE FROM service_categories WHERE id = ?`).run(id);
  broadcastFullSync('category:deleted');
  res.json({ok: true});
});

// ==========================================
// SERVICES (DAFTAR HARGA RESMI) - OWNER CRUD
// ==========================================

app.post('/api/services', (req, res) => {
  const {name, category, price, duration_minutes, image_url, description} = req.body;
  if (!name || !category || price === undefined) {
    res.status(400).json({error: 'Nama layanan, kategori, dan harga wajib diisi'});
    return;
  }
  const svc = {
    id: uid('srv'),
    name: String(name).trim(),
    category: String(category).trim(),
    price: Number(price),
    duration_minutes: Number(duration_minutes ?? 45),
    is_active: 1,
    image_url: typeof image_url === 'string' ? image_url : '',
    description: typeof description === 'string' ? description.trim() : '',
  };
  db.prepare(`
    INSERT INTO services (id, name, category, price, duration_minutes, is_active, image_url, description)
    VALUES (@id, @name, @category, @price, @duration_minutes, @is_active, @image_url, @description)
  `).run(svc);
  broadcastFullSync('service:created');
  res.status(201).json(svc);
});

app.put('/api/services/:id', (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id) as ServiceItem | undefined;
  if (!existing) {
    res.status(404).json({error: 'Layanan tidak ditemukan'});
    return;
  }
  const updated = {
    id,
    name: req.body.name ?? existing.name,
    category: req.body.category !== undefined ? String(req.body.category).trim() : existing.category,
    price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    duration_minutes: req.body.duration_minutes !== undefined ? Number(req.body.duration_minutes) : existing.duration_minutes,
    is_active: req.body.is_active !== undefined ? Number(req.body.is_active) : existing.is_active,
    image_url: req.body.image_url !== undefined ? String(req.body.image_url) : existing.image_url || '',
    description: req.body.description !== undefined ? String(req.body.description).trim() : (existing.description || ''),
  };
  db.prepare(`
    UPDATE services SET name=@name, category=@category, price=@price, duration_minutes=@duration_minutes, is_active=@is_active, image_url=@image_url, description=@description
    WHERE id=@id
  `).run(updated);
  broadcastFullSync('service:updated');
  res.json(updated);
});

app.post('/api/services/:id/photo', (req, res) => {
  const {id} = req.params;
  const {image_url} = req.body as {image_url?: string};
  if (typeof image_url !== 'string' || (!image_url.startsWith('data:image/') && !image_url.startsWith('/'))) {
    res.status(400).json({error: 'Format foto contoh potongan tidak valid'});
    return;
  }
  const existing = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id) as ServiceItem | undefined;
  if (!existing) {
    res.status(404).json({error: 'Layanan tidak ditemukan'});
    return;
  }
  db.prepare(`UPDATE services SET image_url = ? WHERE id = ?`).run(image_url, id);
  const updated = db.prepare(`SELECT * FROM services WHERE id = ?`).get(id) as ServiceItem;
  broadcastFullSync('service:photo_updated');
  res.json(updated);
});

app.delete('/api/services/:id', (req, res) => {
  db.prepare(`DELETE FROM services WHERE id = ?`).run(req.params.id);
  broadcastFullSync('service:deleted');
  res.json({ok: true});
});

// ==========================================
// POSTS, PROMOS & PUBLIC VIDEO SHOWCASE - OWNER CRUD
// ==========================================

app.post('/api/posts', (req, res) => {
  const {title, category, content, promo_code, valid_until, image_url, is_pinned, is_published} = req.body as Partial<PostItem>;
  if (!title || !content) {
    res.status(400).json({error: 'Judul dan isi postingan wajib diisi'});
    return;
  }
  const post: PostItem = {
    id: uid('post'),
    title: String(title).trim(),
    category: (category as PostItem['category']) || 'Promo',
    content: String(content).trim(),
    promo_code: String(promo_code || '').trim().toUpperCase(),
    valid_until: String(valid_until || '').trim(),
    image_url: String(image_url || '').trim(),
    is_pinned: is_pinned ? 1 : 0,
    is_published: is_published === undefined ? 1 : is_published ? 1 : 0,
    created_at: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO posts (id, title, category, content, promo_code, valid_until, image_url, is_pinned, is_published, created_at)
    VALUES (@id, @title, @category, @content, @promo_code, @valid_until, @image_url, @is_pinned, @is_published, @created_at)
  `).run(post);
  broadcastFullSync('post:created');
  res.status(201).json(post);
});

app.put('/api/posts/:id', (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id) as PostItem | undefined;
  if (!existing) {
    res.status(404).json({error: 'Postingan tidak ditemukan'});
    return;
  }
  const updated: PostItem = {
    ...existing,
    title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
    category: req.body.category ?? existing.category,
    content: req.body.content !== undefined ? String(req.body.content).trim() : existing.content,
    promo_code: req.body.promo_code !== undefined ? String(req.body.promo_code).trim().toUpperCase() : existing.promo_code,
    valid_until: req.body.valid_until !== undefined ? String(req.body.valid_until).trim() : existing.valid_until,
    image_url: req.body.image_url !== undefined ? String(req.body.image_url).trim() : existing.image_url,
    is_pinned: req.body.is_pinned !== undefined ? (req.body.is_pinned ? 1 : 0) : existing.is_pinned,
    is_published: req.body.is_published !== undefined ? (req.body.is_published ? 1 : 0) : existing.is_published,
  };
  db.prepare(`
    UPDATE posts SET title=@title, category=@category, content=@content, promo_code=@promo_code,
      valid_until=@valid_until, image_url=@image_url, is_pinned=@is_pinned, is_published=@is_published
    WHERE id=@id
  `).run(updated);
  broadcastFullSync('post:updated');
  res.json(updated);
});

app.delete('/api/posts/:id', (req, res) => {
  db.prepare(`DELETE FROM posts WHERE id = ?`).run(req.params.id);
  broadcastFullSync('post:deleted');
  res.json({ok: true});
});

app.put('/api/site-media', (req, res) => {
  const {hero_video_url, hero_video_title, hero_video_subtitle, hero_video_poster} = req.body as Record<string, string | undefined>;
  const upsert = db.prepare(`
    INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  if (hero_video_url !== undefined) upsert.run('hero_video_url', String(hero_video_url).trim());
  if (hero_video_title !== undefined) upsert.run('hero_video_title', String(hero_video_title).trim());
  if (hero_video_subtitle !== undefined) upsert.run('hero_video_subtitle', String(hero_video_subtitle).trim());
  if (hero_video_poster !== undefined) upsert.run('hero_video_poster', String(hero_video_poster).trim());
  broadcastFullSync('siteMedia:updated');
  res.json(getFullState().siteMedia);
});

app.put('/api/site-settings/layout', (req, res) => {
  const fields = [
    'services_layout',
    'barbers_layout',
    'posts_layout',
    'about_title',
    'about_description',
    'services_title',
    'services_subtitle',
    'barbers_title',
    'barbers_subtitle',
    'posts_title',
    'posts_subtitle',
    'show_about',
    'show_barbers',
    'show_services',
    'show_promo',
    'show_lokasi',
    'show_medsos',
  ];
  const upsert = db.prepare(`
    INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      upsert.run(f, String(req.body[f]));
    }
  }
  broadcastFullSync('siteMedia:updated');
  res.json(getFullState().siteMedia);
});

app.post('/api/site-media/video', (req, res) => {
  const {filename, data_b64} = req.body as {filename?: string; data_b64?: string};
  if (!data_b64 || typeof data_b64 !== 'string' || !data_b64.includes('base64,')) {
    res.status(400).json({error: 'File video tidak valid'});
    return;
  }
  const [header, b64] = data_b64.split('base64,');
  const ext = header.includes('webm') ? 'webm' : 'mp4';
  const safeName = `${uid('showcase')}-${String(filename || 'video').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}.${ext}`;
  const outPath = path.join(UPLOADS_DIR, safeName);
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  const publicUrl = `/uploads/${safeName}`;
  db.prepare(`
    INSERT INTO site_settings (key, value) VALUES ('hero_video_url', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(publicUrl);
  broadcastFullSync('siteMedia:video_uploaded');
  res.json({hero_video_url: publicUrl});
});

// ==========================================
// OPERATIONAL SCHEDULES - OWNER MANAGES
// ==========================================

app.put('/api/schedules/:id', (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM operational_schedules WHERE id = ?`).get(id) as
    | {
        id: string;
        branch_id: string;
        day_of_week: number;
        day_name: string;
        is_open: number;
        open_time: string;
        close_time: string;
        shift_notes: string;
        assigned_barber_ids: string;
      }
    | undefined;
  if (!existing) {
    res.status(404).json({error: 'Jadwal tidak ditemukan'});
    return;
  }
  const updated = {
    id,
    is_open: req.body.is_open !== undefined ? Number(req.body.is_open) : existing.is_open,
    open_time: req.body.open_time ?? existing.open_time,
    close_time: req.body.close_time ?? existing.close_time,
    shift_notes: req.body.shift_notes ?? existing.shift_notes,
    assigned_barber_ids:
      req.body.assigned_barber_ids !== undefined
        ? JSON.stringify(req.body.assigned_barber_ids)
        : existing.assigned_barber_ids,
  };
  db.prepare(`
    UPDATE operational_schedules
    SET is_open=@is_open, open_time=@open_time, close_time=@close_time, shift_notes=@shift_notes, assigned_barber_ids=@assigned_barber_ids
    WHERE id=@id
  `).run(updated);
  broadcastFullSync('schedule:updated');
  res.json({...existing, ...updated, assigned_barber_ids: JSON.parse(updated.assigned_barber_ids)});
});

// ==========================================
// TRANSACTIONS (KASIR POS) + AUTO NOTIFICATION
// ==========================================

app.post('/api/transactions', (req, res) => {
  const {branch_id, barber_id, cashier_id, customer_name, customer_phone, service_ids, custom_items, discount, payment_method, booking_id, notes} =
    req.body as {
      branch_id: string;
      barber_id: string;
      cashier_id: string;
      customer_name: string;
      customer_phone?: string;
      service_ids?: string[];
      custom_items?: Array<{service_id?: string; name: string; category?: string; price: number; qty?: number}>;
      discount?: number;
      payment_method: 'Tunai' | 'QRIS' | 'Transfer' | 'Debit';
      booking_id?: string | null;
      notes?: string;
    };

  const hasItems = (Array.isArray(service_ids) && service_ids.length > 0) || (Array.isArray(custom_items) && custom_items.length > 0);
  if (!branch_id || !barber_id || !customer_name || !hasItems) {
    res.status(400).json({error: 'Data cabang, barber, pelanggan, dan layanan wajib dilengkapi'});
    return;
  }

  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  const barber = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(barber_id) as Employee | undefined;
  const cashier = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(cashier_id || 'emp-kasir-1') as Employee | undefined;

  if (!branch || !barber) {
    res.status(404).json({error: 'Cabang atau karyawan pemangkas tidak ditemukan'});
    return;
  }

  const items: TransactionItem[] = [];
  let subtotal = 0;

  if (Array.isArray(custom_items) && custom_items.length > 0) {
    for (const it of custom_items) {
      const q = Math.max(1, Number(it.qty) || 1);
      const pr = Math.max(0, Number(it.price) || 0);
      items.push({
        service_id: it.service_id || uid('srv'),
        service_name: it.name,
        category: it.category || 'HAIRCUT',
        price: pr,
        qty: q,
      });
      subtotal += pr * q;
    }
  } else if (Array.isArray(service_ids)) {
    for (const sid of service_ids) {
      const svc = db.prepare(`SELECT * FROM services WHERE id = ?`).get(sid) as ServiceItem | undefined;
      if (svc) {
        items.push({
          service_id: svc.id,
          service_name: svc.name,
          category: svc.category,
          price: svc.price,
          qty: 1,
        });
        subtotal += svc.price;
      }
    }
  }

  if (items.length === 0) {
    res.status(400).json({error: 'Layanan tidak valid'});
    return;
  }

  const disc = Math.max(0, Number(discount ?? 0));
  const totalAmount = Math.max(0, subtotal - disc);

  // Sistem Gaji Barber 2026:
  // - Haircut Premium (Rp150k): 30% = Rp45.000
  // - Haircut Reguler (Rp85k): 25% = Rp21.250
  // - Haircut Basic / School (Rp70k): 20% = Rp14.000
  // - Layanan lainnya (Perming, Coloring, Produk): rate standar barber (25% - 35%)
  let calculatedCommission = 0;
  for (const item of items) {
    const sName = item.service_name.toLowerCase();
    let rate = barber.commission_rate || 25;
    if (sName.includes('premium') || item.price >= 150000) {
      rate = 30; // 30% = Rp45.000
    } else if (sName.includes('reguler') || (item.price >= 80000 && item.price <= 95000)) {
      rate = 25; // 25% = Rp21.250
    } else if (sName.includes('school') || sName.includes('basic') || (item.price >= 65000 && item.price <= 75000)) {
      rate = 20; // 20% = Rp14.000
    }
    calculatedCommission += Math.round((item.price * rate) / 100);
  }
  const discountRatio = subtotal > 0 ? totalAmount / subtotal : 1;
  const barberCommission = Math.round(calculatedCommission * discountRatio);

  const trxCount = (db.prepare(`SELECT COUNT(*) as c FROM transactions`).get() as {c: number}).c + 1;
  const invoiceNo = `INV-CW-${String(trxCount).padStart(3, '0')}`;
  const createdAt = new Date().toISOString();
  const id = uid('trx');

  db.prepare(`
    INSERT INTO transactions (id, invoice_no, branch_id, branch_name, barber_id, barber_name, cashier_id, cashier_name, customer_name, customer_phone, items_json, subtotal, discount, total_amount, barber_commission, payment_method, booking_id, notes, created_at)
    VALUES (@id, @invoice_no, @branch_id, @branch_name, @barber_id, @barber_name, @cashier_id, @cashier_name, @customer_name, @customer_phone, @items_json, @subtotal, @discount, @total_amount, @barber_commission, @payment_method, @booking_id, @notes, @created_at)
  `).run({
    id,
    invoice_no: invoiceNo,
    branch_id: branch.id,
    branch_name: branch.name,
    barber_id: barber.id,
    barber_name: barber.name,
    cashier_id: cashier?.id ?? 'emp-kasir-1',
    cashier_name: cashier?.name ?? 'Kasir',
    customer_name: customer_name.trim(),
    customer_phone: (customer_phone || '').trim(),
    items_json: JSON.stringify(items),
    subtotal,
    discount: disc,
    total_amount: totalAmount,
    barber_commission: barberCommission,
    payment_method: payment_method || 'Tunai',
    booking_id: booking_id || null,
    notes: (notes || '').trim(),
    created_at: createdAt,
  });

  if (booking_id) {
    db.prepare(`UPDATE bookings SET status = 'Selesai' WHERE id = ?`).run(booking_id);
  }

  // Recalculate current month salaries so barber cut counts & commission stay live
  recalculateMonthSalaries(createdAt.slice(0, 7));

  // Create persistent automatic notification for Owner & Barber
  const serviceSummary = items.map((i) => i.service_name).join(', ');
  const notification: NotificationItem = {
    id: uid('notif'),
    type: 'transaction',
    title: `Transaksi Kasir · ${invoiceNo}`,
    message: `${customer_name.trim()} (${serviceSummary}) oleh ${barber.name} · ${payment_method || 'Tunai'}`,
    amount: totalAmount,
    branch_name: branch.name,
    actor_name: cashier?.name ?? 'Kasir',
    is_read: 0,
    created_at: createdAt,
  };

  db.prepare(`
    INSERT INTO notifications (id, type, title, message, amount, branch_name, actor_name, is_read, created_at)
    VALUES (@id, @type, @title, @message, @amount, @branch_name, @actor_name, @is_read, @created_at)
  `).run(notification);

  broadcastEvent('notification:new', notification);
  broadcastFullSync('transaction:created');

  // Kirim notifikasi WhatsApp struk digital ke pelanggan jika nomor HP terisi
  if (customer_phone && customer_phone.trim().length >= 9) {
    const waTemplate = getSetting(
      'whatsapp_template_trx',
      'Terima kasih Kak {nama_pelanggan}! Pembayaran sebesar Rp {total} untuk invoice {invoice} di Cendrawasih Barbershop ({cabang}) telah berhasil diterima via {metode_bayar}. Layanan oleh: {barber}. Sampai jumpa kembali!'
    );
    const waText = formatMessageTemplate(waTemplate, {
      nama_pelanggan: customer_name.trim(),
      invoice: invoiceNo,
      total: totalAmount.toLocaleString('id-ID'),
      cabang: branch.name,
      metode_bayar: payment_method || 'Tunai',
      barber: barber.name,
    });
    void sendWhatsAppNotification({to: customer_phone.trim(), message: waText});
  }

  res.status(201).json({id, invoice_no: invoiceNo, total_amount: totalAmount, barber_commission: barberCommission, notification});
});

app.delete('/api/transactions/:id', (req, res) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.body?.user_role as string);
  const trx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(req.params.id) as
    | {id: string; created_at: string}
    | undefined;

  if (!trx) {
    res.status(404).json({error: 'Transaksi tidak ditemukan'});
    return;
  }

  // Aturan RBAC: Kasir hanya boleh void transaksi hari ini
  if (userRole === 'kasir') {
    const today = getTodayDateString();
    if (!trx.created_at || !trx.created_at.startsWith(today)) {
      res.status(403).json({
        error: 'Kasir hanya diperbolehkan membatalkan (void) transaksi yang dibuat pada hari ini.',
      });
      return;
    }
  } else if (userRole && userRole !== 'owner') {
    res.status(403).json({error: 'Hanya Kasir dan Owner yang berhak melakukan void transaksi'});
    return;
  }

  db.prepare(`DELETE FROM transactions WHERE id = ?`).run(req.params.id);
  recalculateMonthSalaries(getTodayDateString().slice(0, 7));
  broadcastFullSync('transaction:deleted');
  res.json({ok: true});
});

app.post('/api/transactions/:id/void', (req, res) => {
  const userRole = (req.headers['x-user-role'] as string) || (req.body?.user_role as string) || 'owner';
  const trx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(req.params.id) as
    | {id: string; created_at: string}
    | undefined;

  if (!trx) {
    res.status(404).json({error: 'Transaksi tidak ditemukan'});
    return;
  }

  if (userRole === 'kasir') {
    const today = getTodayDateString();
    if (!trx.created_at || !trx.created_at.startsWith(today)) {
      res.status(403).json({
        error: 'Kasir hanya diperbolehkan membatalkan (void) transaksi yang dibuat pada hari ini.',
      });
      return;
    }
  } else if (userRole && userRole !== 'owner') {
    res.status(403).json({error: 'Hanya Kasir dan Owner yang berhak melakukan void transaksi'});
    return;
  }

  db.prepare(`DELETE FROM transactions WHERE id = ?`).run(req.params.id);
  recalculateMonthSalaries(getTodayDateString().slice(0, 7));
  broadcastFullSync('transaction:deleted');
  res.json({ok: true});
});

// ==========================================
// ONLINE BOOKINGS (PEMESANAN PELANGGAN)
// ==========================================

app.post('/api/bookings', (req, res) => {
  const {branch_id, barber_id, service_id, customer_name, customer_phone, booking_date, booking_time, notes} = req.body;
  if (!branch_id || !barber_id || !service_id || !customer_name || !customer_phone || !booking_date || !booking_time) {
    res.status(400).json({error: 'Lengkapi cabang, barber, layanan, tanggal, jam, nama, dan nomor WhatsApp'});
    return;
  }

  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  const barber = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(barber_id) as Employee | undefined;
  const service = db.prepare(`SELECT * FROM services WHERE id = ?`).get(service_id) as ServiceItem | undefined;
  if (!branch || !barber || !service) {
    res.status(404).json({error: 'Data cabang, barber, atau layanan tidak ditemukan'});
    return;
  }

  const count = (db.prepare(`SELECT COUNT(*) as c FROM bookings`).get() as {c: number}).c + 101;
  const bookingCode = `CENDRA-${count}`;
  const createdAt = new Date().toISOString();
  const id = uid('bk');

  const booking = {
    id,
    booking_code: bookingCode,
    branch_id: branch.id,
    branch_name: branch.name,
    barber_id: barber.id,
    barber_name: barber.name,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    customer_name: String(customer_name).trim(),
    customer_phone: String(customer_phone).trim(),
    booking_date: String(booking_date),
    booking_time: String(booking_time),
    status: 'Menunggu',
    notes: String(notes || '').trim(),
    created_at: createdAt,
  };

  db.prepare(`
    INSERT INTO bookings (id, booking_code, branch_id, branch_name, barber_id, barber_name, service_id, service_name, service_price, customer_name, customer_phone, booking_date, booking_time, status, notes, created_at)
    VALUES (@id, @booking_code, @branch_id, @branch_name, @barber_id, @barber_name, @service_id, @service_name, @service_price, @customer_name, @customer_phone, @booking_date, @booking_time, @status, @notes, @created_at)
  `).run(booking);

  const notification: NotificationItem = {
    id: uid('notif'),
    type: 'booking',
    title: `Booking Online Baru · ${bookingCode}`,
    message: `${booking.customer_name} memesan ${service.name} (${booking_date} ${booking_time}) dengan ${barber.name}`,
    amount: service.price,
    branch_name: branch.name,
    actor_name: booking.customer_name,
    is_read: 0,
    created_at: createdAt,
  };
  db.prepare(`
    INSERT INTO notifications (id, type, title, message, amount, branch_name, actor_name, is_read, created_at)
    VALUES (@id, @type, @title, @message, @amount, @branch_name, @actor_name, @is_read, @created_at)
  `).run(notification);

  broadcastEvent('notification:new', notification);
  broadcastFullSync('booking:created');

  // Kirim notifikasi WhatsApp otomatis ke pelanggan
  if (booking.customer_phone && booking.customer_phone.length >= 9) {
    const waTemplate = getSetting(
      'whatsapp_template_booking',
      'Halo Kak {nama_pelanggan}! Booking Anda di Cendrawasih Barbershop telah diterima. Kode: {kode_booking}, Tanggal: {tanggal} {jam}, Layanan: {layanan}, Barber: {barber}, Cabang: {cabang}. Mohon hadir 5 menit sebelum jadwal. Terima kasih!'
    );
    const waText = formatMessageTemplate(waTemplate, {
      nama_pelanggan: booking.customer_name,
      kode_booking: bookingCode,
      tanggal: booking_date,
      jam: booking_time,
      layanan: service.name,
      barber: barber.name,
      cabang: branch.name,
    });
    void sendWhatsAppNotification({to: booking.customer_phone, message: waText});
  }

  res.status(201).json(booking);
});

app.patch('/api/bookings/:id', (req, res) => {
  const {id} = req.params;
  const {status} = req.body;
  const existing = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id);
  if (!existing) {
    res.status(404).json({error: 'Booking tidak ditemukan'});
    return;
  }
  db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, id);
  broadcastFullSync('booking:updated');
  res.json({ok: true, id, status});
});

app.delete('/api/bookings/:id', (req, res) => {
  db.prepare(`DELETE FROM bookings WHERE id = ?`).run(req.params.id);
  broadcastFullSync('booking:deleted');
  res.json({ok: true});
});

// ==========================================
// PYTHON LOCATION-BASED ATTENDANCE (PRESENSI)
// ==========================================

app.post('/api/geo/verify', async (req, res) => {
  const {branch_id, lat, lng, accuracy} = req.body as {
    branch_id: string;
    lat: number;
    lng: number;
    accuracy?: number;
  };
  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  if (!branch) {
    res.status(404).json({error: 'Cabang tidak ditemukan'});
    return;
  }
  const result = await verifyLocationWithPython({
    user_lat: Number(lat),
    user_lng: Number(lng),
    branch_lat: branch.lat,
    branch_lng: branch.lng,
    radius_meters: branch.radius_meters,
    accuracy_meters: Number(accuracy ?? 20),
  });
  res.json({branch, verification: result});
});

function getTodayBranchSchedule(branchId: string, branch: Branch, currentTime: string) {
  const dow = new Date().getDay();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const row = db
    .prepare(`SELECT * FROM operational_schedules WHERE branch_id = ? AND day_of_week = ?`)
    .get(branchId, dow) as {is_open: number; open_time: string; close_time: string; day_name: string} | undefined;
  return {
    is_open: row?.is_open ?? 1,
    open_time: row?.open_time ?? branch.open_time,
    close_time: row?.close_time ?? branch.close_time,
    day_name: row?.day_name ?? days[dow],
    current_time: currentTime,
  };
}

app.post('/api/face/verify', async (req, res) => {
  const {employee_id, branch_id, live_image_b64, client_time} = req.body as {
    employee_id: string;
    branch_id: string;
    live_image_b64: string;
    client_time?: string;
  };
  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employee_id) as Employee | undefined;
  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  if (!emp || !branch) {
    res.status(404).json({error: 'Karyawan atau cabang tidak ditemukan'});
    return;
  }
  const currentTime = client_time && /^\d{2}:\d{2}$/.test(client_time) ? client_time : getNowTimeString();
  const schedule = getTodayBranchSchedule(branch.id, branch, currentTime);
  const faceResult = await verifyFaceWithPython({
    profile_image_b64: emp.photo_url || '',
    live_image_b64: live_image_b64 || '',
    schedule,
  });
  res.json({verification: faceResult, schedule});
});

app.post('/api/attendance/checkin', async (req, res) => {
  const {employee_id, branch_id, lat, lng, accuracy, live_image_b64, client_time, notes} = req.body as {
    employee_id: string;
    branch_id: string;
    lat: number;
    lng: number;
    accuracy?: number;
    live_image_b64?: string;
    client_time?: string;
    notes?: string;
  };

  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employee_id) as Employee | undefined;
  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  if (!emp || !branch) {
    res.status(404).json({error: 'Karyawan atau cabang tidak ditemukan'});
    return;
  }

  const today = getTodayDateString();
  const nowTime = client_time && /^\d{2}:\d{2}$/.test(client_time) ? client_time : getNowTimeString();
  const schedule = getTodayBranchSchedule(branch.id, branch, nowTime);

  // 1. Python Haversine Location Geofence Check
  const verification = await verifyLocationWithPython({
    user_lat: Number(lat),
    user_lng: Number(lng),
    branch_lat: branch.lat,
    branch_lng: branch.lng,
    radius_meters: branch.radius_meters,
    accuracy_meters: Number(accuracy ?? 20),
  });

  if (!verification.valid) {
    res.status(400).json({error: verification.error || 'Koordinat lokasi tidak valid', verification});
    return;
  }

  if (!verification.within_radius) {
    res.status(403).json({
      error: `Presensi ditolak oleh Python Geo-Engine: Jarak Anda ${verification.distance_meters}m dari ${branch.name} (batas ${verification.radius_meters}m).`,
      verification,
    });
    return;
  }

  // 2 & 3. Python Face Recognition + Operational Hours Check
  const faceVerification = await verifyFaceWithPython({
    profile_image_b64: emp.photo_url || '',
    live_image_b64: live_image_b64 || '',
    schedule,
  });

  if (!faceVerification.operational_allowed) {
    res.status(403).json({
      error: `Presensi ditolak: ${faceVerification.operational_message}`,
      verification,
      faceVerification,
    });
    return;
  }

  if (!faceVerification.valid || !faceVerification.face_detected || !faceVerification.face_match) {
    res.status(403).json({
      error: faceVerification.error || faceVerification.status_label || 'Verifikasi wajah Python tidak cocok',
      verification,
      faceVerification,
    });
    return;
  }

  const existing = db
    .prepare(`SELECT * FROM attendance WHERE employee_id = ? AND date = ?`)
    .get(employee_id, today) as {id: string} | undefined;

  if (existing) {
    res.status(400).json({error: 'Anda sudah melakukan presensi masuk hari ini', verification, faceVerification});
    return;
  }

  const status = faceVerification.operational_status === 'TERLAMBAT' ? 'Terlambat' : 'Hadir';

  const record = {
    id: uid('att'),
    employee_id: emp.id,
    employee_name: emp.name,
    branch_id: branch.id,
    branch_name: branch.name,
    date: today,
    check_in_time: nowTime,
    check_out_time: null,
    lat: Number(lat),
    lng: Number(lng),
    distance_meters: verification.distance_meters ?? 0,
    geofence_status: verification.geofence_status ?? 'DALAM_RADIUS',
    face_similarity: faceVerification.similarity_percent,
    face_verified: 1,
    operational_status: faceVerification.operational_status,
    verified_by: `Python Geo (${verification.distance_meters}m) + Face (${faceVerification.similarity_percent}%)`,
    status,
    notes: String(notes || `${faceVerification.operational_message}`).trim(),
  };

  db.prepare(`
    INSERT INTO attendance (id, employee_id, employee_name, branch_id, branch_name, date, check_in_time, check_out_time, lat, lng, distance_meters, geofence_status, face_similarity, face_verified, operational_status, verified_by, status, notes)
    VALUES (@id, @employee_id, @employee_name, @branch_id, @branch_name, @date, @check_in_time, @check_out_time, @lat, @lng, @distance_meters, @geofence_status, @face_similarity, @face_verified, @operational_status, @verified_by, @status, @notes)
  `).run(record);

  const notification: NotificationItem = {
    id: uid('notif'),
    type: 'attendance',
    title: `Presensi Masuk · ${emp.name}`,
    message: `Wajah cocok ${faceVerification.similarity_percent}% · Jarak ${verification.distance_meters}m · ${status}`,
    amount: null,
    branch_name: branch.name,
    actor_name: emp.name,
    is_read: 0,
    created_at: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO notifications (id, type, title, message, amount, branch_name, actor_name, is_read, created_at)
    VALUES (@id, @type, @title, @message, @amount, @branch_name, @actor_name, @is_read, @created_at)
  `).run(notification);

  broadcastEvent('notification:new', notification);
  broadcastFullSync('attendance:checkin');
  res.status(201).json({record, verification, faceVerification});
});

app.post('/api/attendance/checkout', async (req, res) => {
  const {employee_id, branch_id, lat, lng, accuracy, live_image_b64, client_time} = req.body as {
    employee_id: string;
    branch_id: string;
    lat: number;
    lng: number;
    accuracy?: number;
    live_image_b64?: string;
    client_time?: string;
  };
  const today = getTodayDateString();
  const existing = db
    .prepare(`SELECT * FROM attendance WHERE employee_id = ? AND date = ?`)
    .get(employee_id, today) as {id: string; check_out_time: string | null} | undefined;

  if (!existing) {
    res.status(404).json({error: 'Belum ada presensi masuk hari ini'});
    return;
  }

  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employee_id) as Employee | undefined;
  const branch = db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branch_id) as Branch | undefined;
  const verification = branch
    ? await verifyLocationWithPython({
        user_lat: Number(lat),
        user_lng: Number(lng),
        branch_lat: branch.lat,
        branch_lng: branch.lng,
        radius_meters: branch.radius_meters,
        accuracy_meters: Number(accuracy ?? 20),
      })
    : {valid: true, within_radius: true, distance_meters: 0, verified_by: 'Python Haversine'};

  if (!verification.within_radius) {
    res.status(403).json({
      error: `Presensi pulang ditolak: Jarak Anda ${verification.distance_meters}m di luar radius cabang.`,
      verification,
    });
    return;
  }

  const nowTime = client_time && /^\d{2}:\d{2}$/.test(client_time) ? client_time : getNowTimeString();
  if (emp?.photo_url && live_image_b64 && branch) {
    const schedule = getTodayBranchSchedule(branch.id, branch, nowTime);
    const faceCheck = await verifyFaceWithPython({
      profile_image_b64: emp.photo_url,
      live_image_b64,
      schedule,
    });
    if (!faceCheck.face_detected || !faceCheck.face_match) {
      res.status(403).json({
        error: faceCheck.status_label || 'Verifikasi wajah presensi pulang tidak cocok',
        verification,
        faceVerification: faceCheck,
      });
      return;
    }
  }

  db.prepare(`UPDATE attendance SET check_out_time = ?, status = 'Selesai' WHERE id = ?`).run(nowTime, existing.id);
  broadcastFullSync('attendance:checkout');
  res.json({ok: true, check_out_time: nowTime, verification});
});

app.delete('/api/attendance/:id', (req, res) => {
  db.prepare(`DELETE FROM attendance WHERE id = ?`).run(req.params.id);
  broadcastFullSync('attendance:deleted');
  res.json({ok: true});
});

// ==========================================
// SALARIES (MANAJEMEN GAJI) - OWNER CRUD
// ==========================================

app.post('/api/salaries/recalculate', cekRole('owner'), (req, res) => {
  const month = String(req.body.period_month || getTodayDateString().slice(0, 7));
  const records = recalculateMonthSalaries(month);
  broadcastFullSync('salary:recalculated');
  res.json(records);
});

app.put('/api/salaries/:id', cekRole('owner'), (req, res) => {
  const {id} = req.params;
  const existing = db.prepare(`SELECT * FROM salaries WHERE id = ?`).get(id) as
    | {
        id: string;
        base_salary: number;
        commission_amount: number;
        bonus: number;
        deduction: number;
        status: string;
        paid_at: string | null;
        notes: string;
      }
    | undefined;
  if (!existing) {
    res.status(404).json({error: 'Data gaji tidak ditemukan'});
    return;
  }
  const bonus = req.body.bonus !== undefined ? Number(req.body.bonus) : existing.bonus;
  const deduction = req.body.deduction !== undefined ? Number(req.body.deduction) : existing.deduction;
  const status = req.body.status ?? existing.status;
  const paid_at = status === 'Dibayar' ? existing.paid_at || new Date().toISOString() : null;
  const notes = req.body.notes ?? existing.notes;
  const net_salary = existing.base_salary + existing.commission_amount + bonus - deduction;

  db.prepare(`
    UPDATE salaries SET bonus=?, deduction=?, net_salary=?, status=?, paid_at=?, notes=? WHERE id=?
  `).run(bonus, deduction, net_salary, status, paid_at, notes, id);

  broadcastFullSync('salary:updated');
  res.json({ok: true, net_salary, status, paid_at});
});

// ==========================================
// DAILY FINANCIAL REPORT & NOTIFICATIONS
// ==========================================

app.get('/api/reports/daily', (req, res) => {
  const date = String(req.query.date || getTodayDateString());
  const branchId = String(req.query.branchId || 'ALL');
  res.json(getDailyReport(date, branchId));
});

app.get('/api/reports/period', (req, res) => {
  const mode = req.query.mode === 'weekly' ? 'weekly' : 'monthly';
  const today = getTodayDateString();
  const monthPrefix = today.slice(0, 7);
  const startDate = String(req.query.startDate || `${monthPrefix}-01`);
  const endDate = String(req.query.endDate || today);
  const branchId = String(req.query.branchId || 'ALL');
  res.json(getPeriodReport(mode, startDate, endDate, branchId));
});

app.put('/api/inventory/daily', (req, res) => {
  const body = req.body;
  if (!body.branch_id || !body.date) {
    res.status(400).json({error: 'branch_id dan date wajib diisi'});
    return;
  }
  const saved = upsertInventoryDailyLog({
    branch_id: String(body.branch_id),
    date: String(body.date),
    stok_jual_pm: Number(body.stok_jual_pm ?? 0),
    stok_jual_hr: Number(body.stok_jual_hr ?? 0),
    stok_jual_pw: Number(body.stok_jual_pw ?? 0),
    stok_barber_tisu_leher: Number(body.stok_barber_tisu_leher ?? 0),
    stok_barber_hair_tonic: Number(body.stok_barber_hair_tonic ?? 0),
    stok_barber_shampo: Number(body.stok_barber_shampo ?? 0),
    stok_barber_perming: Number(body.stok_barber_perming ?? 0),
    stok_barber_sampo_cultusia: Number(body.stok_barber_sampo_cultusia ?? 0),
    terjual_pm: Number(body.terjual_pm ?? 0),
    terjual_hr: Number(body.terjual_hr ?? 0),
    terjual_pw: Number(body.terjual_pw ?? 0),
    terjual_pm_rp: Number(body.terjual_pm_rp ?? 0),
    terjual_hr_rp: Number(body.terjual_hr_rp ?? 0),
    terjual_pw_rp: Number(body.terjual_pw_rp ?? 0),
    terpakai_pm: Number(body.terpakai_pm ?? 0),
    terpakai_hr: Number(body.terpakai_hr ?? 0),
    terpakai_pw: Number(body.terpakai_pw ?? 0),
    terpakai_tisu_leher: Number(body.terpakai_tisu_leher ?? 0),
  });
  broadcastFullSync('inventory:updated');
  res.json(saved);
});

app.post('/api/notifications/read-all', (_req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1`).run();
  broadcastFullSync('notifications:read');
  res.json({ok: true});
});

app.patch('/api/notifications/:id/read', (req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(req.params.id);
  broadcastFullSync('notifications:read');
  res.json({ok: true});
});

// ==========================================
// BACKUP DATA — Download SQLite DB sebagai file
// ==========================================

const BACKUP_DIR = path.resolve(process.cwd(), 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, {recursive: true});
}

/** Buat backup file SQLite dengan nama timestamped */
function createBackupFile(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const backupName = `cendrawasih_backup_${ts}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  fs.copyFileSync(DB_PATH, backupPath);
  // Hanya simpan 30 backup terakhir
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('cendrawasih_backup_') && f.endsWith('.db'))
    .sort();
  if (files.length > 30) {
    files.slice(0, files.length - 30).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
    });
  }
  return backupPath;
}

/** GET /api/backup/download — download backup SQLite langsung */
app.get('/api/backup/download', (_req, res) => {
  try {
    const backupPath = createBackupFile();
    const filename = path.basename(backupPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(backupPath);
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({error: 'Gagal membuat backup database'});
  }
});

/** GET /api/backup/json — download semua data sebagai JSON */
app.get('/api/backup/json', (_req, res) => {
  try {
    const state = getFullState();
    const now = new Date();
    const payload = {
      backup_created_at: now.toISOString(),
      app: 'Barbershop Cendrawasih Management System',
      version: '2.0',
      data: state,
    };
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    res.setHeader('Content-Disposition', `attachment; filename="cendrawasih_data_${ts}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(payload);
  } catch (err) {
    console.error('JSON backup error:', err);
    res.status(500).json({error: 'Gagal membuat backup JSON'});
  }
});

/** POST /api/backup/auto — trigger backup otomatis (dipanggil dari cron/scheduler) */
app.post('/api/backup/auto', (_req, res) => {
  try {
    const backupPath = createBackupFile();
    res.json({ok: true, file: path.basename(backupPath), path: backupPath});
  } catch (err) {
    res.status(500).json({error: 'Gagal membuat auto backup'});
  }
});

/** GET /api/backup/list — list semua file backup yang ada */
app.get('/api/backup/list', (_req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') || f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          size_kb: Math.round(stat.size / 1024),
          created_at: stat.mtime.toISOString(),
        };
      });
    res.json(files);
  } catch {
    res.json([]);
  }
});

// Auto-backup setiap hari pada jam 02:00 WIT (server time)
function scheduleAutoBackup() {
  const now = new Date();
  const nextBackup = new Date();
  nextBackup.setHours(2, 0, 0, 0);
  if (nextBackup <= now) nextBackup.setDate(nextBackup.getDate() + 1);
  const delay = nextBackup.getTime() - now.getTime();
  setTimeout(() => {
    try {
      createBackupFile();
      console.log(`[AUTO BACKUP] Backup otomatis berhasil: ${new Date().toISOString()}`);
    } catch (e) {
      console.error('[AUTO BACKUP] Gagal:', e);
    }
    // Ulangi setiap 24 jam
    setInterval(() => {
      try {
        createBackupFile();
        console.log(`[AUTO BACKUP] Backup otomatis berhasil: ${new Date().toISOString()}`);
      } catch (e) {
        console.error('[AUTO BACKUP] Gagal:', e);
      }
    }, 24 * 60 * 60 * 1000);
  }, delay);
  console.log(`[AUTO BACKUP] Backup otomatis dijadwalkan: ${nextBackup.toLocaleString('id-ID')}`);
}
scheduleAutoBackup();

// ==========================================
// DYNAMIC APP SETTINGS & RBAC PERMISSIONS (v4.0)
// ==========================================

app.get('/api/settings', (_req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, updated_by, updated_at FROM app_settings').all() as {
      key: string;
      value: string;
      updated_by?: string;
      updated_at?: string;
    }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch {
    res.status(500).json({error: 'Gagal mengambil pengaturan aplikasi'});
  }
});

app.put('/api/settings', cekRole('owner'), (req, res) => {
  try {
    const settings = req.body as Record<string, string>;
    const userRole = (req.headers['x-user-role'] as string) || 'Owner';
    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO app_settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `);

    for (const [k, v] of Object.entries(settings)) {
      if (typeof v === 'string') {
        upsert.run(k, v, userRole, now);
      }
    }

    broadcastFullSync('settings:updated');
    res.json({ok: true});
  } catch {
    res.status(500).json({error: 'Gagal memperbarui pengaturan aplikasi'});
  }
});

// ==========================================
// MANDIRI QRIS DYNAMIC WEBHOOK & INTEGRATIONS
// ==========================================

// Webhook receiver for Mandiri QRIS payments
app.post('/api/webhooks/mandiri-qris', async (req, res) => {
  await handleMandiriQRISWebhook(req, res, broadcastEvent);
});

// Test Mandiri QRIS Webhook simulation (Owner only)
app.post('/api/payments/mandiri/test-webhook', cekRole('owner'), async (req, res) => {
  try {
    const {amount = 85000, reference_id = `TEST-${Date.now()}`, customer_name = 'Test Mandiri QRIS'} = req.body;
    const simulatedReq = {
      headers: req.headers,
      body: {
        merchant_id: getSetting('mandiri_qris_merchant_id', 'CW-MANDIRI-01'),
        reference_id,
        amount,
        transaction_status: 'SUCCESS',
        payment_type: 'QRIS_MANDIRI',
        customer_name,
        transaction_time: new Date().toISOString(),
      },
    } as express.Request;

    await handleMandiriQRISWebhook(simulatedReq, res, broadcastEvent);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({error: `Gagal simulasi webhook: ${errorMsg}`});
  }
});

// Test send WhatsApp notification (Owner only)
app.post('/api/whatsapp/send-test', cekRole('owner'), async (req, res) => {
  try {
    const {phone, message} = req.body;
    if (!phone || !message) {
      res.status(400).json({error: 'Nomor telepon tujuan dan pesan wajib disertakan'});
      return;
    }
    const result = await sendWhatsAppNotification({
      to: String(phone),
      message: String(message),
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({error: `Gagal kirim pesan WhatsApp: ${errorMsg}`});
  }
});

app.get('/api/permissions', (_req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM roles ORDER BY is_system DESC, name ASC').all();
    const features = db.prepare('SELECT * FROM features ORDER BY menu_group ASC, menu_name ASC').all();
    const permissions = db.prepare('SELECT * FROM role_permissions').all();
    res.json({roles, features, permissions});
  } catch {
    res.status(500).json({error: 'Gagal mengambil matriks perizinan'});
  }
});

app.put('/api/permissions', cekRole('owner'), (req, res) => {
  try {
    const {role_id, feature_id, field, value} = req.body;
    if (!role_id || !feature_id || !field) {
      res.status(400).json({error: 'role_id, feature_id, dan field wajib disertakan'});
      return;
    }
    const allowedFields = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export', 'can_void', 'data_scope'];
    if (!allowedFields.includes(field)) {
      res.status(400).json({error: 'Field perizinan tidak valid'});
      return;
    }

    const existing = db
      .prepare('SELECT id FROM role_permissions WHERE role_id = ? AND feature_id = ?')
      .get(role_id, feature_id) as {id: string} | undefined;

    if (existing) {
      db.prepare(`UPDATE role_permissions SET ${field} = ? WHERE id = ?`).run(value, existing.id);
    } else {
      const newId = uid('perm');
      db.prepare(`
        INSERT INTO role_permissions (id, role_id, feature_id, ${field})
        VALUES (?, ?, ?, ?)
      `).run(newId, role_id, feature_id, value);
    }

    broadcastFullSync('permissions:updated');
    res.json({ok: true});
  } catch {
    res.status(500).json({error: 'Gagal memperbarui matriks perizinan'});
  }
});

app.post('/api/roles', cekRole('owner'), (req, res) => {
  try {
    const {name, description} = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({error: 'Nama role wajib diisi'});
      return;
    }
    const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const id = `role-${normalizedName}`;
    db.prepare(`
      INSERT INTO roles (id, name, description, is_system, is_active)
      VALUES (?, ?, ?, 0, 1)
    `).run(id, normalizedName, description || `Role kustom ${name}`);

    // Salin perizinan dari kasir sebagai default
    const basePerms = db.prepare("SELECT * FROM role_permissions WHERE role_id = 'role-kasir'").all() as any[];
    const insertPerm = db.prepare(`
      INSERT INTO role_permissions (id, role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export, can_void, data_scope)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of basePerms) {
      insertPerm.run(
        uid('perm'),
        id,
        p.feature_id,
        p.can_view,
        p.can_create,
        p.can_edit,
        p.can_delete,
        p.can_export,
        p.can_void,
        p.data_scope
      );
    }

    broadcastFullSync('role:created');
    res.status(201).json({id, name: normalizedName});
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(400).json({error: 'Nama role sudah terdaftar'});
      return;
    }
    res.status(500).json({error: 'Gagal membuat role baru'});
  }
});

// Mutasi Cabang Karyawan oleh Owner
app.put('/api/employees/:id/branch', cekRole('owner'), (req, res) => {
  try {
    const {id} = req.params;
    const {branch_id} = req.body;
    if (!branch_id) {
      res.status(400).json({error: 'Target cabang wajib ditentukan'});
      return;
    }
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined;
    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branch_id) as Branch | undefined;
    if (!emp || !branch) {
      res.status(404).json({error: 'Karyawan atau Cabang tidak ditemukan'});
      return;
    }
    db.prepare('UPDATE employees SET branch_id = ? WHERE id = ?').run(branch_id, id);
    broadcastFullSync('employee:mutated');
    res.json({ok: true, employee_id: id, branch_id, branch_name: branch.name});
  } catch {
    res.status(500).json({error: 'Gagal memutasi cabang karyawan'});
  }
});

// Ganti PIN Sendiri (Kasir / Karyawan / Owner)
app.put('/api/employees/:id/pin', (req, res) => {
  try {
    const {id} = req.params;
    const {old_pin, new_pin} = req.body;
    const userRole = req.headers['x-user-role'];

    if (!new_pin || String(new_pin).length < 4) {
      res.status(400).json({error: 'PIN baru minimal 4 angka'});
      return;
    }

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined;
    if (!emp) {
      res.status(404).json({error: 'Karyawan tidak ditemukan'});
      return;
    }

    // Jika bukan Owner, wajib verifikasi PIN lama
    if (userRole !== 'owner') {
      if (emp.pin !== old_pin) {
        res.status(400).json({error: 'PIN lama tidak cocok'});
        return;
      }
    }

    db.prepare('UPDATE employees SET pin = ? WHERE id = ?').run(String(new_pin), id);
    broadcastFullSync('employee:pin_changed');
    res.json({ok: true});
  } catch {
    res.status(500).json({error: 'Gagal mengubah PIN'});
  }
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cendrawasih Barbershop server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
