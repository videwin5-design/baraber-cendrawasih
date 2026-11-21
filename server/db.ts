import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initSecurityTables } from './security.ts';
import type {
  AppStatePayload,
  AttendanceRecord,
  Booking,
  Branch,
  DailyReportSummary,
  Employee,
  InventoryDailyLog,
  NotificationItem,
  OperationalSchedule,
  PeriodDayRow,
  PeriodReportSummary,
  PostItem,
  RoleItem,
  FeatureItem,
  RolePermissionItem,
  SalaryRecord,
  ServiceItem,
  SiteMedia,
  Transaction,
  TransactionItem,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {recursive: true});
}

export const DB_PATH = path.join(DATA_DIR, 'cendrawasih.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_meters INTEGER NOT NULL DEFAULT 150,
      open_time TEXT NOT NULL DEFAULT '09:00',
      close_time TEXT NOT NULL DEFAULT '21:00',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'kasir', 'karyawan')),
      specialty TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      pin TEXT NOT NULL,
      branch_id TEXT,
      base_salary INTEGER NOT NULL DEFAULT 0,
      commission_rate INTEGER NOT NULL DEFAULT 35,
      is_active INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'HAIRCUT',
      price INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 45,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#DCA842',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS operational_schedules (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      shift_notes TEXT NOT NULL DEFAULT '',
      assigned_barber_ids TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      invoice_no TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      barber_id TEXT NOT NULL,
      barber_name TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      barber_commission INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      booking_id TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_code TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      barber_id TEXT NOT NULL,
      barber_name TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_price INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Menunggu',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      distance_meters REAL NOT NULL,
      geofence_status TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS salaries (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      period_month TEXT NOT NULL,
      base_salary INTEGER NOT NULL,
      total_cuts INTEGER NOT NULL,
      total_revenue_generated INTEGER NOT NULL,
      commission_rate INTEGER NOT NULL,
      commission_amount INTEGER NOT NULL,
      bonus INTEGER NOT NULL DEFAULT 0,
      deduction INTEGER NOT NULL DEFAULT 0,
      net_salary INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      paid_at TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      amount INTEGER,
      branch_name TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_daily_logs (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      date TEXT NOT NULL,
      stok_jual_pm INTEGER NOT NULL DEFAULT 0,
      stok_jual_hr INTEGER NOT NULL DEFAULT 0,
      stok_jual_pw INTEGER NOT NULL DEFAULT 0,
      stok_barber_tisu_leher INTEGER NOT NULL DEFAULT 0,
      stok_barber_hair_tonic INTEGER NOT NULL DEFAULT 0,
      stok_barber_shampo INTEGER NOT NULL DEFAULT 0,
      stok_barber_perming INTEGER NOT NULL DEFAULT 0,
      stok_barber_sampo_cultusia INTEGER NOT NULL DEFAULT 0,
      terjual_pm INTEGER NOT NULL DEFAULT 0,
      terjual_hr INTEGER NOT NULL DEFAULT 0,
      terjual_pw INTEGER NOT NULL DEFAULT 0,
      terjual_pm_rp INTEGER NOT NULL DEFAULT 0,
      terjual_hr_rp INTEGER NOT NULL DEFAULT 0,
      terjual_pw_rp INTEGER NOT NULL DEFAULT 0,
      terpakai_pm INTEGER NOT NULL DEFAULT 0,
      terpakai_hr INTEGER NOT NULL DEFAULT 0,
      terpakai_pw INTEGER NOT NULL DEFAULT 0,
      terpakai_tisu_leher INTEGER NOT NULL DEFAULT 0,
      UNIQUE(branch_id, date)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Promo', 'Gaya Rambut', 'Info Cabang', 'Pengumuman')),
      content TEXT NOT NULL,
      promo_code TEXT NOT NULL DEFAULT '',
      valid_until TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe schema migrations for existing DB files
  const brCols = db.prepare(`PRAGMA table_info(branches)`).all() as {name: string}[];
  if (!brCols.some((c) => c.name === 'photo_url')) {
    db.exec(`ALTER TABLE branches ADD COLUMN photo_url TEXT DEFAULT ''`);
  }

  const empCols = db.prepare(`PRAGMA table_info(employees)`).all() as {name: string}[];
  if (!empCols.some((c) => c.name === 'photo_url')) {
    db.exec(`ALTER TABLE employees ADD COLUMN photo_url TEXT DEFAULT ''`);
  }

  const svcCols = db.prepare(`PRAGMA table_info(services)`).all() as {name: string}[];
  if (!svcCols.some((c) => c.name === 'image_url')) {
    db.exec(`ALTER TABLE services ADD COLUMN image_url TEXT DEFAULT ''`);
  }
  if (!svcCols.some((c) => c.name === 'description')) {
    db.exec(`ALTER TABLE services ADD COLUMN description TEXT DEFAULT ''`);
  }
  // Lepas constraint CHECK hardcode — SQLite tidak support ALTER untuk itu, tapi kolom category sudah TEXT
  // Seed kategori default jika tabel service_categories kosong
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM service_categories').get() as {c: number}).c;
  if (catCount === 0) {
    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO service_categories (id, name, sort_order, color, is_active)
      VALUES (@id, @name, @sort_order, @color, @is_active)
    `);
    const defaultCats = [
      {id: 'cat-haircut', name: 'HAIRCUT', sort_order: 1, color: '#DCA842', is_active: 1},
      {id: 'cat-perming', name: 'HAIR PERMING', sort_order: 2, color: '#7C3AED', is_active: 1},
      {id: 'cat-color', name: 'HAIR COLOR', sort_order: 3, color: '#DC2626', is_active: 1},
      {id: 'cat-styling', name: 'STYLING', sort_order: 4, color: '#059669', is_active: 1},
    ];
    for (const cat of defaultCats) insertCat.run(cat);
  }

  const attCols = db.prepare(`PRAGMA table_info(attendance)`).all() as {name: string}[];
  if (!attCols.some((c) => c.name === 'face_similarity')) {
    db.exec(`ALTER TABLE attendance ADD COLUMN face_similarity REAL DEFAULT 0`);
  }
  if (!attCols.some((c) => c.name === 'face_verified')) {
    db.exec(`ALTER TABLE attendance ADD COLUMN face_verified INTEGER DEFAULT 0`);
  }
  if (!attCols.some((c) => c.name === 'operational_status')) {
    db.exec(`ALTER TABLE attendance ADD COLUMN operational_status TEXT DEFAULT ''`);
  }
  if (!attCols.some((c) => c.name === 'photo_url')) {
    db.exec(`ALTER TABLE attendance ADD COLUMN photo_url TEXT DEFAULT ''`);
  }

  // Initialize security and brute-force tracking tables
  initSecurityTables();

  const branchCount = (db.prepare('SELECT COUNT(*) as c FROM branches').get() as {c: number}).c;
  if (branchCount === 0) {
    seedInitialData();
  }
  seedInventoryIfEmpty();
  seedContentAndMediaIfEmpty();
  syncNabireSetmoreDefaults();
  syncCapstersWithEmployees();
  syncPosServices();
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentMonthString(): string {
  return getTodayDateString().slice(0, 7);
}

function seedInitialData() {
  const nowIso = new Date().toISOString();
  const today = getTodayDateString();
  const month = getCurrentMonthString();

  const branches: Branch[] = [
    {
      id: 'br-samratulangi',
      name: 'Cenderawasih Pusat — Sam Ratulangi',
      code: 'CW-01',
      address: 'Jl. Dr. Sam Ratulangi, Oyehe, Distrik Nabire, Kabupaten Nabire, Papua Tengah 98817',
      phone: '0822-3963-7235',
      lat: -3.3649,
      lng: 135.4959,
      radius_meters: 150,
      open_time: '10:00',
      close_time: '21:30',
      is_active: 1,
      created_at: nowIso,
      photo_url: '/assets/setmore/studio-storefront.jpg',
    },
    {
      id: 'br-yossudarso',
      name: 'Cenderawasih Cabang Yos Sudarso',
      code: 'CW-02',
      address: 'Jl. Yos Sudarso, Oyehe, Distrik Nabire, Kabupaten Nabire, Papua Tengah',
      phone: '0813-4245-8106',
      lat: -3.3635,
      lng: 135.5012,
      radius_meters: 150,
      open_time: '10:00',
      close_time: '22:00',
      is_active: 1,
      created_at: nowIso,
      photo_url: '/assets/setmore/gallery-studio.jpg',
    },
  ];

  const insertBranch = db.prepare(`
    INSERT INTO branches (id, name, code, address, phone, lat, lng, radius_meters, open_time, close_time, is_active, created_at, photo_url)
    VALUES (@id, @name, @code, @address, @phone, @lat, @lng, @radius_meters, @open_time, @close_time, @is_active, @created_at, @photo_url)
  `);
  for (const b of branches) insertBranch.run(b);

  const employees = [
    {
      id: 'emp-owner',
      name: 'Owner Cendrawasih',
      role: 'owner',
      specialty: 'Pemilik & Manajemen Pusat',
      phone: '0811-4800-0001',
      pin: '1111',
      branch_id: 'br-samratulangi',
      base_salary: 0,
      commission_rate: 0,
      is_active: 1,
      joined_at: '2024-01-01',
    },
    {
      id: 'emp-kasir-1',
      name: 'Rina Putri',
      role: 'kasir',
      specialty: 'Kasir & Frontdesk Pusat',
      phone: '0812-4800-0101',
      pin: '2222',
      branch_id: 'br-samratulangi',
      base_salary: 2800000,
      commission_rate: 0,
      is_active: 1,
      joined_at: '2024-03-10',
    },
    {
      id: 'emp-kasir-2',
      name: 'Fajar Pratama',
      role: 'kasir',
      specialty: 'Kasir Cabang Yos Sudarso',
      phone: '0813-4245-8106',
      pin: '2223',
      branch_id: 'br-yossudarso',
      base_salary: 2700000,
      commission_rate: 0,
      is_active: 1,
      joined_at: '2024-06-15',
    },
    {
      id: 'emp-barber-1',
      name: 'Riyan',
      role: 'karyawan',
      specialty: 'Burst Fade, Taper & Coloring Specialist',
      phone: '0822-3963-7235',
      pin: '3331',
      branch_id: 'br-samratulangi',
      base_salary: 2500000,
      commission_rate: 35,
      is_active: 1,
      joined_at: '2024-02-01',
    },
    {
      id: 'emp-barber-2',
      name: 'Budi Santoso',
      role: 'karyawan',
      specialty: 'Master Hair Perming & Shaving',
      phone: '0813-4800-0202',
      pin: '3332',
      branch_id: 'br-samratulangi',
      base_salary: 2800000,
      commission_rate: 40,
      is_active: 1,
      joined_at: '2024-02-12',
    },
    {
      id: 'emp-barber-3',
      name: 'Rizky Ramadhan',
      role: 'karyawan',
      specialty: 'Modern Crop, Fade & School Cut',
      phone: '0813-4800-0203',
      pin: '3333',
      branch_id: 'br-yossudarso',
      base_salary: 2400000,
      commission_rate: 35,
      is_active: 1,
      joined_at: '2024-05-01',
    },
    {
      id: 'emp-barber-4',
      name: 'Dimas Saputra',
      role: 'karyawan',
      specialty: 'Hair Color, Curly & Highlight Specialist',
      phone: '0813-4800-0204',
      pin: '3334',
      branch_id: 'br-yossudarso',
      base_salary: 2600000,
      commission_rate: 38,
      is_active: 1,
      joined_at: '2024-07-08',
    },
  ];

  const insertEmp = db.prepare(`
    INSERT INTO employees (id, name, role, specialty, phone, pin, branch_id, base_salary, commission_rate, is_active, joined_at)
    VALUES (@id, @name, @role, @specialty, @phone, @pin, @branch_id, @base_salary, @commission_rate, @is_active, @joined_at)
  `);
  for (const e of employees) insertEmp.run(e);

  const services: ServiceItem[] = [
    {id: 'srv-hc-1', name: 'Haircut Reguler', category: 'HAIRCUT', price: 85000, duration_minutes: 40, is_active: 1},
    {id: 'srv-hc-2', name: 'Haircut School', category: 'HAIRCUT', price: 70000, duration_minutes: 35, is_active: 1},
    {id: 'srv-hc-3', name: 'Haircut School + Kramas', category: 'HAIRCUT', price: 85000, duration_minutes: 45, is_active: 1},
    {id: 'srv-hc-4', name: 'Haircut Kids', category: 'HAIRCUT', price: 70000, duration_minutes: 35, is_active: 1},
    {id: 'srv-hc-5', name: 'Haircut Premium', category: 'HAIRCUT', price: 150000, duration_minutes: 60, is_active: 1},
    {id: 'srv-hc-6', name: 'Haircut + Shaving', category: 'HAIRCUT', price: 120000, duration_minutes: 55, is_active: 1},
    {id: 'srv-hc-7', name: 'Semir Hitam', category: 'HAIRCUT', price: 100000, duration_minutes: 45, is_active: 1},
    {id: 'srv-pm-1', name: 'Perming Pendek', category: 'HAIR PERMING', price: 350000, duration_minutes: 90, is_active: 1},
    {id: 'srv-pm-2', name: 'Perming Pendek + Cukur', category: 'HAIR PERMING', price: 435000, duration_minutes: 120, is_active: 1},
    {id: 'srv-pm-3', name: 'Perming Long', category: 'HAIR PERMING', price: 550000, duration_minutes: 120, is_active: 1},
    {id: 'srv-pm-4', name: 'Perming Long + Cukur', category: 'HAIR PERMING', price: 635000, duration_minutes: 150, is_active: 1},
    {id: 'srv-cl-1', name: 'Highlight Bleaching', category: 'HAIR COLOR', price: 350000, duration_minutes: 90, is_active: 1},
    {id: 'srv-cl-2', name: 'Highlight Warna', category: 'HAIR COLOR', price: 450000, duration_minutes: 110, is_active: 1},
    {id: 'srv-cl-3', name: 'Full Atas Coloring', category: 'HAIR COLOR', price: 450000, duration_minutes: 110, is_active: 1},
    {id: 'srv-cl-4', name: 'Highlight Panjang', category: 'HAIR COLOR', price: 550000, duration_minutes: 130, is_active: 1},
    {id: 'srv-cl-5', name: 'Full Coloring', category: 'HAIR COLOR', price: 550000, duration_minutes: 130, is_active: 1},
    {id: 'srv-st-1', name: 'Masker + Hot Towel', category: 'STYLING', price: 50000, duration_minutes: 25, is_active: 1},
    {id: 'srv-st-2', name: 'Shaving + Hot Towel', category: 'STYLING', price: 40000, duration_minutes: 25, is_active: 1},
  ];

  const insertService = db.prepare(`
    INSERT INTO services (id, name, category, price, duration_minutes, is_active)
    VALUES (@id, @name, @category, @price, @duration_minutes, @is_active)
  `);
  for (const s of services) insertService.run(s);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const insertSched = db.prepare(`
    INSERT INTO operational_schedules (id, branch_id, day_of_week, day_name, is_open, open_time, close_time, shift_notes, assigned_barber_ids)
    VALUES (@id, @branch_id, @day_of_week, @day_name, @is_open, @open_time, @close_time, @shift_notes, @assigned_barber_ids)
  `);

  for (const b of branches) {
    const branchBarbers = employees.filter((e) => e.role === 'karyawan' && e.branch_id === b.id).map((e) => e.id);
    for (let d = 0; d < 7; d++) {
      insertSched.run({
        id: `sch-${b.id}-${d}`,
        branch_id: b.id,
        day_of_week: d,
        day_name: days[d],
        is_open: 1,
        open_time: b.open_time,
        close_time: b.close_time,
        shift_notes:
          d === 0
            ? 'Minggu jam operasional bervariasi — konfirmasi WA 0822-3963-7235'
            : d === 5
              ? 'Jeda Sholat Jumat 11:45 - 13:00 WIT'
              : 'Buka Senin–Sabtu (10.00–22.00 WIT)',
        assigned_barber_ids: JSON.stringify(branchBarbers),
      });
    }
  }

  // Seed today's realistic transactions so reports, cashier log, and employee performance have live data
  const sampleTransactions = [
    {
      id: 'trx-seed-1',
      invoice_no: 'INV-CW-001',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      barber_id: 'emp-barber-1',
      barber_name: 'Riyan',
      cashier_id: 'emp-kasir-1',
      cashier_name: 'Rina Putri',
      customer_name: 'Hendrik Yoku',
      customer_phone: '081248112233',
      items: [{service_id: 'srv-hc-5', service_name: 'Haircut Premium', category: 'HAIRCUT', price: 150000, qty: 1}],
      subtotal: 150000,
      discount: 0,
      total_amount: 150000,
      barber_commission: 52500,
      payment_method: 'QRIS',
      booking_id: null,
      notes: 'Burst fade + tonic',
      created_at: `${today}T09:42:00.000Z`,
    },
    {
      id: 'trx-seed-2',
      invoice_no: 'INV-CW-002',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      barber_id: 'emp-barber-2',
      barber_name: 'Budi Santoso',
      cashier_id: 'emp-kasir-1',
      cashier_name: 'Rina Putri',
      customer_name: 'Mario Kambu',
      customer_phone: '081344556677',
      items: [
        {service_id: 'srv-pm-2', service_name: 'Perming Pendek + Cukur', category: 'HAIR PERMING', price: 435000, qty: 1},
        {service_id: 'srv-st-1', service_name: 'Masker + Hot Towel', category: 'STYLING', price: 50000, qty: 1},
      ],
      subtotal: 485000,
      discount: 0,
      total_amount: 485000,
      barber_commission: 194000,
      payment_method: 'Transfer',
      booking_id: null,
      notes: 'Curly perming natural wave',
      created_at: `${today}T10:25:00.000Z`,
    },
    {
      id: 'trx-seed-3',
      invoice_no: 'INV-CW-003',
      branch_id: 'br-yossudarso',
      branch_name: 'Cenderawasih Cabang Yos Sudarso',
      barber_id: 'emp-barber-3',
      barber_name: 'Rizky Ramadhan',
      cashier_id: 'emp-kasir-2',
      cashier_name: 'Fajar Pratama',
      customer_name: 'Kevin Rumere',
      customer_phone: '081299887766',
      items: [{service_id: 'srv-hc-6', service_name: 'Haircut + Shaving', category: 'HAIRCUT', price: 120000, qty: 1}],
      subtotal: 120000,
      discount: 0,
      total_amount: 120000,
      barber_commission: 42000,
      payment_method: 'Tunai',
      booking_id: null,
      notes: 'Rapikan jenggot',
      created_at: `${today}T11:10:00.000Z`,
    },
    {
      id: 'trx-seed-4',
      invoice_no: 'INV-CW-004',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      barber_id: 'emp-barber-1',
      barber_name: 'Riyan',
      cashier_id: 'emp-kasir-1',
      cashier_name: 'Rina Putri',
      customer_name: 'Darius Kogoya',
      customer_phone: '085211223344',
      items: [{service_id: 'srv-hc-1', service_name: 'Haircut Reguler', category: 'HAIRCUT', price: 85000, qty: 1}],
      subtotal: 85000,
      discount: 0,
      total_amount: 85000,
      barber_commission: 29750,
      payment_method: 'Tunai',
      booking_id: null,
      notes: 'Taper rapi',
      created_at: `${today}T11:55:00.000Z`,
    },
  ];

  const insertTrx = db.prepare(`
    INSERT INTO transactions (id, invoice_no, branch_id, branch_name, barber_id, barber_name, cashier_id, cashier_name, customer_name, customer_phone, items_json, subtotal, discount, total_amount, barber_commission, payment_method, booking_id, notes, created_at)
    VALUES (@id, @invoice_no, @branch_id, @branch_name, @barber_id, @barber_name, @cashier_id, @cashier_name, @customer_name, @customer_phone, @items_json, @subtotal, @discount, @total_amount, @barber_commission, @payment_method, @booking_id, @notes, @created_at)
  `);
  for (const t of sampleTransactions) {
    insertTrx.run({...t, items_json: JSON.stringify(t.items)});
  }

  // Seed bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, booking_code, branch_id, branch_name, barber_id, barber_name, service_id, service_name, service_price, customer_name, customer_phone, booking_date, booking_time, status, notes, created_at)
    VALUES (@id, @booking_code, @branch_id, @branch_name, @barber_id, @barber_name, @service_id, @service_name, @service_price, @customer_name, @customer_phone, @booking_date, @booking_time, @status, @notes, @created_at)
  `);

  insertBooking.run({
    id: 'bk-seed-1',
    booking_code: 'CENDRA-101',
    branch_id: 'br-samratulangi',
    branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
    barber_id: 'emp-barber-1',
    barber_name: 'Riyan',
    service_id: 'srv-hc-5',
    service_name: 'Haircut Premium',
    service_price: 150000,
    customer_name: 'Samuel Wenda',
    customer_phone: '081248990011',
    booking_date: today,
    booking_time: '14:00',
    status: 'Dikonfirmasi',
    notes: 'Minta burst fade + styling pomade',
    created_at: nowIso,
  });

  insertBooking.run({
    id: 'bk-seed-2',
    booking_code: 'CENDRA-102',
    branch_id: 'br-yossudarso',
    branch_name: 'Cenderawasih Cabang Yos Sudarso',
    barber_id: 'emp-barber-3',
    barber_name: 'Rizky Ramadhan',
    service_id: 'srv-cl-2',
    service_name: 'Highlight Warna',
    service_price: 450000,
    customer_name: 'Reza Alfarizi',
    customer_phone: '081355667788',
    booking_date: today,
    booking_time: '15:30',
    status: 'Menunggu',
    notes: 'Warna ash grey',
    created_at: nowIso,
  });

  // Seed attendance
  const insertAtt = db.prepare(`
    INSERT INTO attendance (id, employee_id, employee_name, branch_id, branch_name, date, check_in_time, check_out_time, lat, lng, distance_meters, geofence_status, verified_by, status, notes)
    VALUES (@id, @employee_id, @employee_name, @branch_id, @branch_name, @date, @check_in_time, @check_out_time, @lat, @lng, @distance_meters, @geofence_status, @verified_by, @status, @notes)
  `);

  insertAtt.run({
    id: 'att-seed-1',
    employee_id: 'emp-barber-1',
    employee_name: 'Riyan',
    branch_id: 'br-samratulangi',
    branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
    date: today,
    check_in_time: '09:54',
    check_out_time: null,
    lat: -3.36492,
    lng: 135.49591,
    distance_meters: 2.5,
    geofence_status: 'DALAM_RADIUS',
    verified_by: 'Python 3.10.12 Haversine WGS84',
    status: 'Hadir',
    notes: 'Presensi pagi tepat waktu',
  });

  insertAtt.run({
    id: 'att-seed-2',
    employee_id: 'emp-barber-2',
    employee_name: 'Budi Santoso',
    branch_id: 'br-samratulangi',
    branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
    date: today,
    check_in_time: '09:58',
    check_out_time: null,
    lat: -3.36488,
    lng: 135.49593,
    distance_meters: 4.0,
    geofence_status: 'DALAM_RADIUS',
    verified_by: 'Python 3.10.12 Haversine WGS84',
    status: 'Hadir',
    notes: 'Presensi pagi',
  });

  // Seed initial salaries for current month
  recalculateMonthSalaries(month);

  // Seed notification
  db.prepare(`
    INSERT INTO notifications (id, type, title, message, amount, branch_name, actor_name, is_read, created_at)
    VALUES (@id, @type, @title, @message, @amount, @branch_name, @actor_name, @is_read, @created_at)
  `).run({
    id: 'notif-seed-1',
    type: 'transaction',
    title: 'Transaksi Kasir Baru · INV-CW-004',
    message: 'Darius Kogoya (Haircut Reguler) ditangani oleh Riyan via Tunai',
    amount: 85000,
    branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
    actor_name: 'Rina Putri',
    is_read: 0,
    created_at: `${today}T11:55:00.000Z`,
  });
}

export function recalculateMonthSalaries(periodMonth: string): SalaryRecord[] {
  const employees = db
    .prepare(
      `SELECT e.*, COALESCE(b.name, 'Pusat') as branch_name
       FROM employees e LEFT JOIN branches b ON e.branch_id = b.id
       WHERE e.role IN ('karyawan', 'kasir') AND e.is_active = 1`
    )
    .all() as (Employee & {branch_name: string})[];

  const trxRows = db
    .prepare(`SELECT * FROM transactions WHERE substr(created_at, 1, 7) = ?`)
    .all(periodMonth) as (Omit<Transaction, 'items'> & {items_json: string})[];

  const results: SalaryRecord[] = [];
  const upsertSalary = db.prepare(`
    INSERT INTO salaries (id, employee_id, employee_name, role, branch_name, period_month, base_salary, total_cuts, total_revenue_generated, commission_rate, commission_amount, bonus, deduction, net_salary, status, paid_at, notes)
    VALUES (@id, @employee_id, @employee_name, @role, @branch_name, @period_month, @base_salary, @total_cuts, @total_revenue_generated, @commission_rate, @commission_amount, @bonus, @deduction, @net_salary, @status, @paid_at, @notes)
    ON CONFLICT(id) DO UPDATE SET
      employee_name = excluded.employee_name,
      branch_name = excluded.branch_name,
      base_salary = excluded.base_salary,
      total_cuts = excluded.total_cuts,
      total_revenue_generated = excluded.total_revenue_generated,
      commission_rate = excluded.commission_rate,
      commission_amount = excluded.commission_amount,
      net_salary = excluded.base_salary + excluded.commission_amount + salaries.bonus - salaries.deduction
  `);

  for (const emp of employees) {
    const empTrx = trxRows.filter((t) => t.barber_id === emp.id);
    const totalCuts = empTrx.length;
    const totalRev = empTrx.reduce((sum, t) => sum + t.total_amount, 0);
    const commissionAmt = empTrx.reduce((sum, t) => sum + t.barber_commission, 0);
    const salaryId = `sal-${emp.id}-${periodMonth}`;

    const existing = db.prepare(`SELECT bonus, deduction, status, paid_at, notes FROM salaries WHERE id = ?`).get(salaryId) as
      | {bonus: number; deduction: number; status: 'Draft' | 'Dibayar'; paid_at: string | null; notes: string}
      | undefined;

    // Sistem Gaji Barber 2026:
    // Gaji Pokok: Rp2.000.000/bulan untuk seluruh barber
    const baseSalary = emp.role === 'karyawan' ? 2000000 : (emp.base_salary || 2000000);

    // Bonus Target Bulanan 2026:
    // >= 300: Rp2.500.000 (Legend Barber)
    // >= 200: Rp1.000.000 (Barber Senior)
    // >= 150: Rp500.000   (Barber Junior)
    // >= 100: Rp200.000
    let autoTargetBonus = 0;
    let rankTitle = 'Barber';
    if (emp.role === 'karyawan') {
      if (totalCuts >= 300) {
        autoTargetBonus = 2500000;
        rankTitle = 'Legend Barber (Level 3)';
      } else if (totalCuts >= 200) {
        autoTargetBonus = 1000000;
        rankTitle = 'Barber Senior (Level 2)';
      } else if (totalCuts >= 150) {
        autoTargetBonus = 500000;
        rankTitle = 'Barber Junior (Level 1)';
      } else if (totalCuts >= 100) {
        autoTargetBonus = 200000;
        rankTitle = 'Target 100 Capster';
      } else {
        rankTitle = 'Capster Menuju Target';
      }
    }

    const bonus = Math.max(autoTargetBonus, existing?.bonus ?? autoTargetBonus);
    const deduction = existing?.deduction ?? 0;
    const netSalary = baseSalary + commissionAmt + bonus - deduction;

    const record: SalaryRecord = {
      id: salaryId,
      employee_id: emp.id,
      employee_name: emp.name,
      role: emp.role === 'karyawan' ? 'Barber' : 'Kasir',
      branch_name: emp.branch_name,
      period_month: periodMonth,
      base_salary: baseSalary,
      total_cuts: totalCuts,
      total_revenue_generated: totalRev,
      commission_rate: emp.commission_rate,
      commission_amount: commissionAmt,
      bonus,
      deduction,
      net_salary: netSalary,
      status: existing?.status ?? 'Draft',
      paid_at: existing?.paid_at ?? null,
      notes: existing?.notes || (emp.role === 'karyawan' ? `Sistem Gaji 2026 · ${rankTitle} (${totalCuts} Pelanggan · Bonus Target Rp ${bonus.toLocaleString('id-ID')})` : 'Gaji Pokok Kasir Standar'),
    };
    upsertSalary.run(record);
    results.push(record);
  }

  return db
    .prepare(`SELECT * FROM salaries WHERE period_month = ? ORDER BY net_salary DESC`)
    .all(periodMonth) as SalaryRecord[];
}

export function getFullState(): AppStatePayload {
  const branches = db.prepare(`SELECT * FROM branches ORDER BY created_at ASC`).all() as Branch[];
  const employees = db
    .prepare(
      `SELECT e.*, b.name as branch_name
       FROM employees e
       LEFT JOIN branches b ON e.branch_id = b.id
       ORDER BY CASE e.role WHEN 'owner' THEN 1 WHEN 'kasir' THEN 2 ELSE 3 END, e.name ASC`
    )
    .all() as Employee[];
  const services = db.prepare(`SELECT * FROM services ORDER BY category ASC, price ASC`).all() as ServiceItem[];
  const serviceCategories = db.prepare(`SELECT * FROM service_categories ORDER BY sort_order ASC, name ASC`).all() as {id: string; name: string; sort_order: number; color: string; is_active: number}[];
  const rawSchedules = db.prepare(`SELECT * FROM operational_schedules ORDER BY branch_id ASC, day_of_week ASC`).all() as (Omit<
    OperationalSchedule,
    'assigned_barber_ids'
  > & {assigned_barber_ids: string})[];
  const schedules: OperationalSchedule[] = rawSchedules.map((s) => ({
    ...s,
    assigned_barber_ids: JSON.parse(s.assigned_barber_ids || '[]'),
  }));

  const rawTrx = db.prepare(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200`).all() as (Omit<Transaction, 'items'> & {
    items_json: string;
  })[];
  const transactions: Transaction[] = rawTrx.map((t) => ({
    ...t,
    items: JSON.parse(t.items_json || '[]') as TransactionItem[],
  }));

  const bookings = db.prepare(`SELECT * FROM bookings ORDER BY booking_date DESC, booking_time ASC, created_at DESC`).all() as Booking[];
  const attendance = db.prepare(`SELECT * FROM attendance ORDER BY date DESC, check_in_time DESC`).all() as AttendanceRecord[];
  const salaries = db.prepare(`SELECT * FROM salaries ORDER BY period_month DESC, net_salary DESC`).all() as SalaryRecord[];
  const notifications = db.prepare(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`).all() as NotificationItem[];
  const posts = db.prepare(`SELECT * FROM posts ORDER BY is_pinned DESC, created_at DESC`).all() as PostItem[];
  const settingsRows = db.prepare(`SELECT key, value FROM site_settings`).all() as {key: string; value: string}[];
  const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));
  const siteMedia: SiteMedia = {
    hero_video_url: settingsMap.get('hero_video_url') || '/assets/cendrawasih_showcase.mp4',
    hero_video_title: settingsMap.get('hero_video_title') || 'Presisi Pangkas & Ritual Grooming Cenderawasih',
    hero_video_subtitle:
      settingsMap.get('hero_video_subtitle') ||
      'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.',
    hero_video_poster: settingsMap.get('hero_video_poster') || '/assets/setmore/studio-interior.jpg',
    services_layout: (settingsMap.get('services_layout') as 'card' | 'list') || 'card',
    barbers_layout: (settingsMap.get('barbers_layout') as 'card' | 'list') || 'card',
    posts_layout: (settingsMap.get('posts_layout') as 'card' | 'list') || 'card',
    about_title: settingsMap.get('about_title') || 'Tentang Barbershop Cendrawasih',
    about_description:
      settingsMap.get('about_description') ||
      'Barbershop Cendrawasih adalah barbershop premium terkemuka di Nabire, Papua Tengah yang menghadirkan standar pangkas rambut modern, ritual hot towel, perming kekinian, dan pewarnaan rambut dengan kenyamanan studio ber-AC.',
    services_title: settingsMap.get('services_title') || 'Daftar Layanan & Tarif Resmi',
    services_subtitle:
      settingsMap.get('services_subtitle') ||
      'Pilihan potongan rambut presisi, perming, pewarnaan, dan perawatan lengkap studio',
    barbers_title: settingsMap.get('barbers_title') || 'Barber Pilihan & Penjelasan Keahlian',
    barbers_subtitle:
      settingsMap.get('barbers_subtitle') ||
      'Kenali barber kami, lihat spesialisasi potongan rambutnya, dan pilih langsung untuk pemesanan kursi',
    posts_title: settingsMap.get('posts_title') || 'Promo Spesial & Pengumuman Studio',
    posts_subtitle:
      settingsMap.get('posts_subtitle') ||
      'Informasi promo diskon, edukasi gaya rambut, dan update terkini outlet kami',
    show_about: settingsMap.get('show_about') !== 'false',
    show_barbers: settingsMap.get('show_barbers') !== 'false',
    show_services: settingsMap.get('show_services') !== 'false',
    show_promo: settingsMap.get('show_promo') !== 'false',
    show_lokasi: settingsMap.get('show_lokasi') !== 'false',
    show_medsos: settingsMap.get('show_medsos') !== 'false',
  };

  let roles: RoleItem[] = [];
  let features: FeatureItem[] = [];
  let rolePermissions: RolePermissionItem[] = [];
  const appSettings: Record<string, string> = {};

  try {
    roles = db.prepare(`SELECT * FROM roles WHERE is_active = 1 ORDER BY is_system DESC, name ASC`).all() as RoleItem[];
    features = db.prepare(`SELECT * FROM features ORDER BY menu_group ASC, menu_name ASC`).all() as FeatureItem[];
    rolePermissions = db.prepare(`SELECT * FROM role_permissions`).all() as RolePermissionItem[];
    const rawAppSettings = db.prepare(`SELECT key, value FROM app_settings`).all() as {key: string; value: string}[];
    for (const s of rawAppSettings) {
      appSettings[s.key] = s.value;
    }
  } catch {
    // If table not found during initialization
  }

  return {
    branches,
    employees,
    services,
    serviceCategories,
    schedules,
    transactions,
    bookings,
    attendance,
    salaries,
    notifications,
    posts,
    siteMedia,
    roles,
    features,
    rolePermissions,
    appSettings,
  };
}

export function getDailyReport(date: string, branchId: string): DailyReportSummary {
  const query =
    branchId && branchId !== 'ALL'
      ? `SELECT * FROM transactions WHERE substr(created_at, 1, 10) = ? AND branch_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM transactions WHERE substr(created_at, 1, 10) = ? ORDER BY created_at DESC`;

  const rawTrx = (
    branchId && branchId !== 'ALL' ? db.prepare(query).all(date, branchId) : db.prepare(query).all(date)
  ) as (Omit<Transaction, 'items'> & {items_json: string})[];

  const transactions: Transaction[] = rawTrx.map((t) => ({
    ...t,
    items: JSON.parse(t.items_json || '[]') as TransactionItem[],
  }));

  const total_revenue = transactions.reduce((s, t) => s + t.total_amount, 0);
  const total_discount = transactions.reduce((s, t) => s + t.discount, 0);
  const total_barber_commission = transactions.reduce((s, t) => s + t.barber_commission, 0);

  const payMap = new Map<string, {count: number; total: number}>();
  const branchMap = new Map<string, {branch_id: string; branch_name: string; count: number; total: number}>();
  const barberMap = new Map<string, {barber_id: string; barber_name: string; cuts: number; revenue: number; commission: number}>();

  for (const t of transactions) {
    const p = payMap.get(t.payment_method) ?? {count: 0, total: 0};
    p.count += 1;
    p.total += t.total_amount;
    payMap.set(t.payment_method, p);

    const br = branchMap.get(t.branch_id) ?? {branch_id: t.branch_id, branch_name: t.branch_name, count: 0, total: 0};
    br.count += 1;
    br.total += t.total_amount;
    branchMap.set(t.branch_id, br);

    const bb = barberMap.get(t.barber_id) ?? {
      barber_id: t.barber_id,
      barber_name: t.barber_name,
      cuts: 0,
      revenue: 0,
      commission: 0,
    };
    bb.cuts += 1;
    bb.revenue += t.total_amount;
    bb.commission += t.barber_commission;
    barberMap.set(t.barber_id, bb);
  }

  return {
    date,
    branch_id: branchId || 'ALL',
    total_revenue,
    total_discount,
    total_transactions: transactions.length,
    total_cuts: transactions.length,
    total_barber_commission,
    net_barbershop_income: total_revenue - total_barber_commission,
    payment_breakdown: Array.from(payMap.entries()).map(([method, v]) => ({method, ...v})),
    branch_breakdown: Array.from(branchMap.values()),
    barber_breakdown: Array.from(barberMap.values()),
    transactions,
  };
}

function seedInventoryIfEmpty() {
  const count = (db.prepare(`SELECT COUNT(*) as c FROM inventory_daily_logs`).get() as {c: number}).c;
  if (count > 0) return;

  const today = getTodayDateString();
  const baseDate = new Date(`${today}T00:00:00`);
  const insertInv = db.prepare(`
    INSERT INTO inventory_daily_logs (
      id, branch_id, date,
      stok_jual_pm, stok_jual_hr, stok_jual_pw,
      stok_barber_tisu_leher, stok_barber_hair_tonic, stok_barber_shampo, stok_barber_perming, stok_barber_sampo_cultusia,
      terjual_pm, terjual_hr, terjual_pw,
      terjual_pm_rp, terjual_hr_rp, terjual_pw_rp,
      terpakai_pm, terpakai_hr, terpakai_pw, terpakai_tisu_leher
    ) VALUES (
      @id, @branch_id, @date,
      @stok_jual_pm, @stok_jual_hr, @stok_jual_pw,
      @stok_barber_tisu_leher, @stok_barber_hair_tonic, @stok_barber_shampo, @stok_barber_perming, @stok_barber_sampo_cultusia,
      @terjual_pm, @terjual_hr, @terjual_pw,
      @terjual_pm_rp, @terjual_hr_rp, @terjual_pw_rp,
      @terpakai_pm, @terpakai_hr, @terpakai_pw, @terpakai_tisu_leher
    )
  `);

  // Seed last 5 days including today for Sam Ratulangi & Abepura
  for (let offset = 4; offset >= 0; offset--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const pmSold = offset % 2 === 0 ? 2 : 1;
    const hrSold = offset === 0 ? 2 : 1;
    const pwSold = offset === 1 ? 2 : 1;

    insertInv.run({
      id: `inv-br-samratulangi-${dateStr}`,
      branch_id: 'br-samratulangi',
      date: dateStr,
      stok_jual_pm: 18 - offset,
      stok_jual_hr: 14 - offset,
      stok_jual_pw: 12 - offset,
      stok_barber_tisu_leher: 10,
      stok_barber_hair_tonic: 6,
      stok_barber_shampo: 5,
      stok_barber_perming: 4,
      stok_barber_sampo_cultusia: 4,
      terjual_pm: pmSold,
      terjual_hr: hrSold,
      terjual_pw: pwSold,
      terjual_pm_rp: pmSold * 85000,
      terjual_hr_rp: hrSold * 75000,
      terjual_pw_rp: pwSold * 65000,
      terpakai_pm: 1,
      terpakai_hr: 1,
      terpakai_pw: 1,
      terpakai_tisu_leher: 1,
    });
  }
}

export function upsertInventoryDailyLog(input: Omit<InventoryDailyLog, 'id'>): InventoryDailyLog {
  const id = `inv-${input.branch_id}-${input.date}`;
  const row: InventoryDailyLog = {
    ...input,
    id,
  };
  db.prepare(`
    INSERT INTO inventory_daily_logs (
      id, branch_id, date,
      stok_jual_pm, stok_jual_hr, stok_jual_pw,
      stok_barber_tisu_leher, stok_barber_hair_tonic, stok_barber_shampo, stok_barber_perming, stok_barber_sampo_cultusia,
      terjual_pm, terjual_hr, terjual_pw,
      terjual_pm_rp, terjual_hr_rp, terjual_pw_rp,
      terpakai_pm, terpakai_hr, terpakai_pw, terpakai_tisu_leher
    ) VALUES (
      @id, @branch_id, @date,
      @stok_jual_pm, @stok_jual_hr, @stok_jual_pw,
      @stok_barber_tisu_leher, @stok_barber_hair_tonic, @stok_barber_shampo, @stok_barber_perming, @stok_barber_sampo_cultusia,
      @terjual_pm, @terjual_hr, @terjual_pw,
      @terjual_pm_rp, @terjual_hr_rp, @terjual_pw_rp,
      @terpakai_pm, @terpakai_hr, @terpakai_pw, @terpakai_tisu_leher
    )
    ON CONFLICT(branch_id, date) DO UPDATE SET
      stok_jual_pm = excluded.stok_jual_pm,
      stok_jual_hr = excluded.stok_jual_hr,
      stok_jual_pw = excluded.stok_jual_pw,
      stok_barber_tisu_leher = excluded.stok_barber_tisu_leher,
      stok_barber_hair_tonic = excluded.stok_barber_hair_tonic,
      stok_barber_shampo = excluded.stok_barber_shampo,
      stok_barber_perming = excluded.stok_barber_perming,
      stok_barber_sampo_cultusia = excluded.stok_barber_sampo_cultusia,
      terjual_pm = excluded.terjual_pm,
      terjual_hr = excluded.terjual_hr,
      terjual_pw = excluded.terjual_pw,
      terjual_pm_rp = excluded.terjual_pm_rp,
      terjual_hr_rp = excluded.terjual_hr_rp,
      terjual_pw_rp = excluded.terjual_pw_rp,
      terpakai_pm = excluded.terpakai_pm,
      terpakai_hr = excluded.terpakai_hr,
      terpakai_pw = excluded.terpakai_pw,
      terpakai_tisu_leher = excluded.terpakai_tisu_leher
  `).run(row);
  return row;
}

export function getPeriodReport(
  mode: 'weekly' | 'monthly',
  startDate: string,
  endDate: string,
  branchId: string
): PeriodReportSummary {
  const isAll = !branchId || branchId === 'ALL';
  const branch = !isAll ? (db.prepare(`SELECT * FROM branches WHERE id = ?`).get(branchId) as Branch | undefined) : undefined;

  const trxRows = (
    isAll
      ? db
          .prepare(`SELECT * FROM transactions WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`)
          .all(startDate, endDate)
      : db
          .prepare(
            `SELECT * FROM transactions WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ? AND branch_id = ?`
          )
          .all(startDate, endDate, branchId)
  ) as {created_at: string; total_amount: number; barber_commission: number; payment_method: string}[];

  const invRows = (
    isAll
      ? db.prepare(`SELECT * FROM inventory_daily_logs WHERE date >= ? AND date <= ?`).all(startDate, endDate)
      : db
          .prepare(`SELECT * FROM inventory_daily_logs WHERE date >= ? AND date <= ? AND branch_id = ?`)
          .all(startDate, endDate, branchId)
  ) as InventoryDailyLog[];

  const days: PeriodDayRow[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const totals: PeriodReportSummary['totals'] = {
    transactions_count: 0,
    cuts_count: 0,
    tunai: 0,
    qris: 0,
    transfer: 0,
    debit: 0,
    gross_revenue: 0,
    barber_commission: 0,
    net_income: 0,
    stok_jual_pm: 0,
    stok_jual_hr: 0,
    stok_jual_pw: 0,
    stok_barber_tisu_leher: 0,
    stok_barber_hair_tonic: 0,
    stok_barber_shampo: 0,
    stok_barber_perming: 0,
    stok_barber_sampo_cultusia: 0,
    terjual_pm: 0,
    terjual_hr: 0,
    terjual_pw: 0,
    terjual_pm_rp: 0,
    terjual_hr_rp: 0,
    terjual_pw_rp: 0,
    terpakai_pm: 0,
    terpakai_hr: 0,
    terpakai_pw: 0,
    terpakai_tisu_leher: 0,
  };

  let idx = 1;
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dateLabel = `${d}/${m}/${y}`;

    const dayTrx = trxRows.filter((t) => t.created_at.slice(0, 10) === dateStr);
    const tunai = dayTrx.filter((t) => t.payment_method === 'Tunai').reduce((s, t) => s + t.total_amount, 0);
    const qris = dayTrx.filter((t) => t.payment_method === 'QRIS').reduce((s, t) => s + t.total_amount, 0);
    const transfer = dayTrx.filter((t) => t.payment_method === 'Transfer').reduce((s, t) => s + t.total_amount, 0);
    const debit = dayTrx.filter((t) => t.payment_method === 'Debit').reduce((s, t) => s + t.total_amount, 0);
    const gross_revenue = dayTrx.reduce((s, t) => s + t.total_amount, 0);
    const barber_commission = dayTrx.reduce((s, t) => s + t.barber_commission, 0);
    const net_income = gross_revenue - barber_commission;

    const dayInvList = invRows.filter((r) => r.date === dateStr);
    const inv: InventoryDailyLog = {
      id: `agg-${branchId}-${dateStr}`,
      branch_id: isAll ? 'br-samratulangi' : branchId,
      date: dateStr,
      stok_jual_pm: dayInvList.reduce((s, r) => s + r.stok_jual_pm, 0),
      stok_jual_hr: dayInvList.reduce((s, r) => s + r.stok_jual_hr, 0),
      stok_jual_pw: dayInvList.reduce((s, r) => s + r.stok_jual_pw, 0),
      stok_barber_tisu_leher: dayInvList.reduce((s, r) => s + r.stok_barber_tisu_leher, 0),
      stok_barber_hair_tonic: dayInvList.reduce((s, r) => s + r.stok_barber_hair_tonic, 0),
      stok_barber_shampo: dayInvList.reduce((s, r) => s + r.stok_barber_shampo, 0),
      stok_barber_perming: dayInvList.reduce((s, r) => s + r.stok_barber_perming, 0),
      stok_barber_sampo_cultusia: dayInvList.reduce((s, r) => s + r.stok_barber_sampo_cultusia, 0),
      terjual_pm: dayInvList.reduce((s, r) => s + r.terjual_pm, 0),
      terjual_hr: dayInvList.reduce((s, r) => s + r.terjual_hr, 0),
      terjual_pw: dayInvList.reduce((s, r) => s + r.terjual_pw, 0),
      terjual_pm_rp: dayInvList.reduce((s, r) => s + r.terjual_pm_rp, 0),
      terjual_hr_rp: dayInvList.reduce((s, r) => s + r.terjual_hr_rp, 0),
      terjual_pw_rp: dayInvList.reduce((s, r) => s + r.terjual_pw_rp, 0),
      terpakai_pm: dayInvList.reduce((s, r) => s + r.terpakai_pm, 0),
      terpakai_hr: dayInvList.reduce((s, r) => s + r.terpakai_hr, 0),
      terpakai_pw: dayInvList.reduce((s, r) => s + r.terpakai_pw, 0),
      terpakai_tisu_leher: dayInvList.reduce((s, r) => s + r.terpakai_tisu_leher, 0),
    };

    days.push({
      no: idx++,
      date: dateStr,
      date_label: dateLabel,
      transactions_count: dayTrx.length,
      cuts_count: dayTrx.length,
      tunai,
      qris,
      transfer,
      debit,
      gross_revenue,
      barber_commission,
      net_income,
      inventory: inv,
    });

    totals.transactions_count += dayTrx.length;
    totals.cuts_count += dayTrx.length;
    totals.tunai += tunai;
    totals.qris += qris;
    totals.transfer += transfer;
    totals.debit += debit;
    totals.gross_revenue += gross_revenue;
    totals.barber_commission += barber_commission;
    totals.net_income += net_income;
    totals.stok_jual_pm += inv.stok_jual_pm;
    totals.stok_jual_hr += inv.stok_jual_hr;
    totals.stok_jual_pw += inv.stok_jual_pw;
    totals.stok_barber_tisu_leher += inv.stok_barber_tisu_leher;
    totals.stok_barber_hair_tonic += inv.stok_barber_hair_tonic;
    totals.stok_barber_shampo += inv.stok_barber_shampo;
    totals.stok_barber_perming += inv.stok_barber_perming;
    totals.stok_barber_sampo_cultusia += inv.stok_barber_sampo_cultusia;
    totals.terjual_pm += inv.terjual_pm;
    totals.terjual_hr += inv.terjual_hr;
    totals.terjual_pw += inv.terjual_pw;
    totals.terjual_pm_rp += inv.terjual_pm_rp;
    totals.terjual_hr_rp += inv.terjual_hr_rp;
    totals.terjual_pw_rp += inv.terjual_pw_rp;
    totals.terpakai_pm += inv.terpakai_pm;
    totals.terpakai_hr += inv.terpakai_hr;
    totals.terpakai_pw += inv.terpakai_pw;
    totals.terpakai_tisu_leher += inv.terpakai_tisu_leher;
  }

  return {
    mode,
    start_date: startDate,
    end_date: endDate,
    branch_id: branchId || 'ALL',
    branch_name: isAll ? 'Semua Cabang Cendrawasih' : branch?.name || 'Cabang',
    days,
    totals,
  };
}

function seedContentAndMediaIfEmpty() {
  const settingsCount = (db.prepare(`SELECT COUNT(*) as c FROM site_settings`).get() as {c: number}).c;
  if (settingsCount === 0) {
    const upsertSetting = db.prepare(`INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)`);
    upsertSetting.run('hero_video_url', '/assets/cendrawasih_showcase.mp4');
    upsertSetting.run('hero_video_title', 'Presisi Pangkas & Ritual Grooming Cenderawasih');
    upsertSetting.run(
      'hero_video_subtitle',
      'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.'
    );
    upsertSetting.run('hero_video_poster', '/assets/setmore/studio-interior.jpg');
  }

  // Official photos directly from https://cendrawasihbarber.setmore.com/
  const setmoreServicePhotos: Record<string, string> = {
    'srv-hc-1': '/assets/setmore/srv-hc-reguler.jpg',
    'srv-hc-2': '/assets/setmore/srv-hc-school.jpg',
    'srv-hc-3': '/assets/setmore/srv-hc-school-kramas.jpg',
    'srv-hc-4': '/assets/setmore/srv-hc-kids.jpg',
    'srv-hc-5': '/assets/setmore/srv-hc-premium.jpg',
    'srv-hc-6': '/assets/setmore/srv-hc-shaving.jpg',
    'srv-hc-7': '/assets/setmore/studio-riyan.jpg',
    'srv-pm-1': '/assets/setmore/srv-pm-pendek.jpg',
    'srv-pm-2': '/assets/setmore/srv-pm-pendek-cukur.jpg',
    'srv-pm-3': '/assets/setmore/srv-pm-long.jpg',
    'srv-pm-4': '/assets/setmore/srv-pm-long-cukur.jpg',
    'srv-cl-1': '/assets/setmore/srv-cl-bleaching.jpg',
    'srv-cl-2': '/assets/setmore/srv-cl-warna.jpg',
    'srv-cl-3': '/assets/setmore/srv-cl-full-atas.jpg',
    'srv-cl-4': '/assets/setmore/srv-cl-panjang.jpg',
    'srv-cl-5': '/assets/setmore/srv-cl-full.jpg',
    'srv-st-1': '/assets/setmore/studio-wash.jpg',
    'srv-st-2': '/assets/setmore/studio-team.jpg',
  };
  const updateSvcPhoto = db.prepare(
    `UPDATE services SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '' OR image_url LIKE '/src/assets/images/%')`
  );
  for (const [sid, url] of Object.entries(setmoreServicePhotos)) {
    updateSvcPhoto.run(url, sid);
  }

  const postsCount = (db.prepare(`SELECT COUNT(*) as c FROM posts`).get() as {c: number}).c;
  if (postsCount === 0) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setDate(now.getDate() + 30);
    const validUntil = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`;
    const insertPost = db.prepare(`
      INSERT INTO posts (id, title, category, content, promo_code, valid_until, image_url, is_pinned, is_published, created_at)
      VALUES (@id, @title, @category, @content, @promo_code, @valid_until, @image_url, @is_pinned, @is_published, @created_at)
    `);
    insertPost.run({
      id: 'post-seed-1',
      title: 'Cabang Baru Jl. Yos Sudarso Oyehe Nabire dengan Konsep Modern',
      category: 'Info Cabang',
      content:
        'Selain cabang utama di Jl. Dr. Sam Ratulangi Nabire, kini tersedia Cabang Yos Sudarso Oyehe dengan interior lebih modern dan jam buka hingga 22.00 WIT.',
      promo_code: 'NABIRE20',
      valid_until: validUntil,
      image_url: '/assets/setmore/studio-interior.jpg',
      is_pinned: 1,
      is_published: 1,
      created_at: now.toISOString(),
    });
    insertPost.run({
      id: 'post-seed-2',
      title: 'Burst Fade, Curly Perming & Coloring oleh Barber Riyan',
      category: 'Gaya Rambut',
      content:
        'Konsultasikan gaya Burst Fade, Curly Perming pendek/panjang, atau pewarnaan rambut langsung dengan barber profesional Cenderawasih. Tersedia juga treatment Masker + Hot Towel Rp50.000.',
      promo_code: '',
      valid_until: '',
      image_url: '/assets/setmore/srv-pm-pendek.jpg',
      is_pinned: 0,
      is_published: 1,
      created_at: new Date(now.getTime() - 3600_000 * 6).toISOString(),
    });
    insertPost.run({
      id: 'post-seed-3',
      title: 'Booking Online Terhubung Setmore & WhatsApp Resmi Nabire',
      category: 'Pengumuman',
      content:
        'Reservasi kursi kini bisa langsung melalui website ini atau halaman Setmore resmi kami. Buka Senin–Sabtu pukul 10.00–21.30 WIT (Sam Ratulangi) dan 10.00–22.00 WIT (Yos Sudarso). Info WA: 0822-3963-7235 / 0813-4245-8106.',
      promo_code: '',
      valid_until: '',
      image_url: '/assets/setmore/studio-storefront.jpg',
      is_pinned: 0,
      is_published: 1,
      created_at: new Date(now.getTime() - 3600_000 * 24).toISOString(),
    });
  }
}

function syncNabireSetmoreDefaults() {
  // Idempotent migration if existing SQLite still contains old Jayapura/Abepura/Sentani sample data
  const oldAbepura = db.prepare(`SELECT id FROM branches WHERE id = 'br-abepura'`).get() as {id: string} | undefined;
  const hasYosSudarso = db.prepare(`SELECT id FROM branches WHERE id = 'br-yossudarso'`).get() as {id: string} | undefined;

  if (oldAbepura && !hasYosSudarso) {
    db.prepare(`
      UPDATE branches
      SET id = 'br-yossudarso',
          name = 'Cenderawasih Cabang Yos Sudarso',
          code = 'CW-02',
          address = 'Jl. Yos Sudarso, Oyehe, Distrik Nabire, Kabupaten Nabire, Papua Tengah',
          phone = '0813-4245-8106',
          lat = -3.3635,
          lng = 135.5012,
          open_time = '10:00',
          close_time = '22:00'
      WHERE id = 'br-abepura'
    `).run();

    db.prepare(`UPDATE employees SET branch_id = 'br-yossudarso', specialty = 'Kasir Cabang Yos Sudarso' WHERE branch_id = 'br-abepura'`).run();
    db.prepare(`UPDATE transactions SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-abepura'`).run();
    db.prepare(`UPDATE bookings SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-abepura'`).run();
    db.prepare(`UPDATE attendance SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-abepura'`).run();
    db.prepare(`UPDATE operational_schedules SET id = replace(id, 'br-abepura', 'br-yossudarso'), branch_id = 'br-yossudarso', open_time = '10:00', close_time = '22:00' WHERE branch_id = 'br-abepura'`).run();
    db.prepare(`UPDATE inventory_daily_logs SET id = replace(id, 'br-abepura', 'br-yossudarso'), branch_id = 'br-yossudarso' WHERE branch_id = 'br-abepura'`).run();
  }

  // Update Sam Ratulangi seed branch if it still has old Jayapura coordinates/address
  db.prepare(`
    UPDATE branches
    SET name = 'Cenderawasih Pusat — Sam Ratulangi',
        address = 'Jl. Dr. Sam Ratulangi, Oyehe, Distrik Nabire, Kabupaten Nabire, Papua Tengah 98817',
        phone = '0822-3963-7235',
        lat = -3.3649,
        lng = 135.4959,
        open_time = '10:00',
        close_time = '21:30'
    WHERE id = 'br-samratulangi' AND (address LIKE '%Akper%' OR lat > -3)
  `).run();

  // Remove fictional Sentani branch if it has no user-created non-seed transactions
  const hasSentani = db.prepare(`SELECT id FROM branches WHERE id = 'br-sentani'`).get() as {id: string} | undefined;
  if (hasSentani) {
    db.prepare(`UPDATE employees SET branch_id = 'br-yossudarso' WHERE branch_id = 'br-sentani'`).run();
    db.prepare(`UPDATE transactions SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-sentani'`).run();
    db.prepare(`UPDATE bookings SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-sentani'`).run();
    db.prepare(`UPDATE attendance SET branch_id = 'br-yossudarso', branch_name = 'Cenderawasih Cabang Yos Sudarso' WHERE branch_id = 'br-sentani'`).run();
    db.prepare(`DELETE FROM operational_schedules WHERE branch_id = 'br-sentani'`).run();
    db.prepare(`DELETE FROM branches WHERE id = 'br-sentani'`).run();
  }

  // Update old Sam Ratulangi schedule hours & names if still 09:00-21:00
  db.prepare(`
    UPDATE operational_schedules
    SET open_time = '10:00',
        close_time = '21:30',
        shift_notes = CASE
          WHEN day_of_week = 0 THEN 'Minggu jam operasional bervariasi — konfirmasi WA 0822-3963-7235'
          WHEN day_of_week = 5 THEN 'Jeda Sholat Jumat 11:45 - 13:00 WIT'
          ELSE 'Buka Senin–Sabtu (10.00–21.30 WIT)'
        END
    WHERE branch_id = 'br-samratulangi' AND open_time = '09:00'
  `).run();

  // Sync employee Riyan on emp-barber-1 if still Andi Wijaya
  db.prepare(`
    UPDATE employees
    SET name = 'Riyan',
        specialty = 'Burst Fade, Taper & Coloring Specialist',
        phone = '0822-3963-7235'
    WHERE id = 'emp-barber-1' AND name = 'Andi Wijaya'
  `).run();
  db.prepare(`UPDATE transactions SET barber_name = 'Riyan' WHERE barber_id = 'emp-barber-1' AND barber_name = 'Andi Wijaya'`).run();
  db.prepare(`UPDATE bookings SET barber_name = 'Riyan' WHERE barber_id = 'emp-barber-1' AND barber_name = 'Andi Wijaya'`).run();
  db.prepare(`UPDATE attendance SET employee_name = 'Riyan' WHERE employee_id = 'emp-barber-1' AND employee_name = 'Andi Wijaya'`).run();

  // Refresh legacy Jayapura text in site_settings & seed posts
  db.prepare(`
    UPDATE site_settings
    SET value = 'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.'
    WHERE key = 'hero_video_subtitle' AND (value LIKE '%Jayapura%' OR value LIKE '%Sentani%' OR value LIKE '%Abepura%')
  `).run();
  db.prepare(`
    UPDATE site_settings
    SET value = '/assets/setmore/studio-interior.jpg'
    WHERE key = 'hero_video_poster' AND value LIKE '/src/assets/images/%'
  `).run();

  db.prepare(`
    UPDATE posts
    SET title = 'Cabang Baru Jl. Yos Sudarso Oyehe Nabire dengan Konsep Modern',
        category = 'Info Cabang',
        content = 'Selain cabang utama di Jl. Dr. Sam Ratulangi Nabire, kini tersedia Cabang Yos Sudarso Oyehe dengan interior lebih modern dan jam buka hingga 22.00 WIT.',
        promo_code = 'NABIRE20',
        image_url = '/assets/setmore/studio-interior.jpg'
    WHERE id = 'post-seed-1' AND (content LIKE '%Jayapura%' OR image_url LIKE '/src/assets/images/%')
  `).run();

  db.prepare(`
    UPDATE posts
    SET title = 'Burst Fade, Curly Perming & Coloring oleh Barber Riyan',
        content = 'Konsultasikan gaya Burst Fade, Curly Perming pendek/panjang, atau pewarnaan rambut langsung dengan barber profesional Cenderawasih. Tersedia juga treatment Masker + Hot Towel Rp50.000.',
        image_url = '/assets/setmore/srv-pm-pendek.jpg'
    WHERE id = 'post-seed-2' AND image_url LIKE '/src/assets/images/%'
  `).run();

  db.prepare(`
    UPDATE posts
    SET title = 'Booking Online Terhubung Setmore & WhatsApp Resmi Nabire',
        category = 'Pengumuman',
        content = 'Reservasi kursi kini bisa langsung melalui website ini atau halaman Setmore resmi kami. Buka Senin–Sabtu pukul 10.00–21.30 WIT (Sam Ratulangi) dan 10.00–22.00 WIT (Yos Sudarso). Info WA: 0822-3963-7235 / 0813-4245-8106.',
        image_url = '/assets/setmore/studio-storefront.jpg'
    WHERE id = 'post-seed-3' AND (content LIKE '%Abepura%' OR image_url LIKE '/src/assets/images/%')
  `).run();

  // Update branch photos with real barbershop storefront & interior photos
  db.prepare(`
    UPDATE branches
    SET photo_url = '/assets/setmore/studio-storefront.jpg'
    WHERE id = 'br-samratulangi' AND (photo_url IS NULL OR photo_url = '')
  `).run();
  db.prepare(`
    UPDATE branches
    SET photo_url = '/assets/setmore/gallery-studio.jpg'
    WHERE id = 'br-yossudarso' AND (photo_url IS NULL OR photo_url = '')
  `).run();
}

export function syncCapstersWithEmployees() {
  const capsters = [
    {
      id: 'emp-capster-haikal',
      name: 'HAIKAL',
      role: 'karyawan',
      specialty: 'Fade, French Crop & Pompadour Specialist',
      phone: '0822-3963-7200',
      pin: '1000',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      base_salary: 2000000,
      commission_rate: 35,
      is_active: 1,
      joined_at: '2024-01-10',
      photo_url: '/assets/setmore/studio-riyan.jpg',
      oct_cuts: 125,
      oct_revenue: 11200000,
      oct_commission: 4480000,
      oct_net: 6980000,
      nov_cuts: 48,
      nov_revenue: 4120000,
      nov_commission: 1648000,
      nov_net: 4148000,
    },
    {
      id: 'emp-capster-udin',
      name: 'UDIN',
      role: 'karyawan',
      specialty: 'Senior Capster · Haircut & Perming Master',
      phone: '0822-3963-7201',
      pin: '1001',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      base_salary: 2500000,
      commission_rate: 40,
      is_active: 1,
      joined_at: '2024-01-15',
      photo_url: '/assets/setmore/studio-riyan.jpg',
      oct_cuts: 112,
      oct_revenue: 10410000,
      oct_commission: 4164000,
      oct_net: 6664000,
      nov_cuts: 42,
      nov_revenue: 3820000,
      nov_commission: 1528000,
      nov_net: 4028000,
    },
    {
      id: 'emp-capster-atta',
      name: 'ATTA',
      role: 'karyawan',
      specialty: 'Master Capster · Modern Styling & Fade Specialist',
      phone: '0822-3963-7202',
      pin: '1002',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      base_salary: 2500000,
      commission_rate: 40,
      is_active: 1,
      joined_at: '2024-01-15',
      photo_url: '/assets/setmore/studio-team.jpg',
      oct_cuts: 143,
      oct_revenue: 12120000,
      oct_commission: 4848000,
      oct_net: 7348000,
      nov_cuts: 51,
      nov_revenue: 4560000,
      nov_commission: 1824000,
      nov_net: 4324000,
    },
    {
      id: 'emp-capster-noel',
      name: 'NOEL',
      role: 'karyawan',
      specialty: 'Pro Capster · Perming, Shaving & Beard Detail',
      phone: '0822-3963-7203',
      pin: '1003',
      branch_id: 'br-samratulangi',
      branch_name: 'Cenderawasih Pusat — Sam Ratulangi',
      base_salary: 2500000,
      commission_rate: 40,
      is_active: 1,
      joined_at: '2024-02-01',
      photo_url: '/assets/setmore/studio-interior.jpg',
      oct_cuts: 114,
      oct_revenue: 10730000,
      oct_commission: 4292000,
      oct_net: 6792000,
      nov_cuts: 40,
      nov_revenue: 3750000,
      nov_commission: 1500000,
      nov_net: 4000000,
    },
    {
      id: 'emp-capster-aswar',
      name: 'ASWAR',
      role: 'karyawan',
      specialty: 'Classic Cut, Taper & Scalp Treatment Specialist',
      phone: '0813-4245-8104',
      pin: '1004',
      branch_id: 'br-yossudarso',
      branch_name: 'Cenderawasih Cabang Yos Sudarso',
      base_salary: 2400000,
      commission_rate: 35,
      is_active: 1,
      joined_at: '2024-03-01',
      photo_url: '/assets/setmore/srv-pm-pendek.jpg',
      oct_cuts: 45,
      oct_revenue: 3735000,
      oct_commission: 1307250,
      oct_net: 3707250,
      nov_cuts: 28,
      nov_revenue: 2350000,
      nov_commission: 822500,
      nov_net: 3222500,
    },
    {
      id: 'emp-capster-acel',
      name: 'ACEL',
      role: 'karyawan',
      specialty: 'Burst Fade, Hair Color & Highlight Master',
      phone: '0813-4245-8105',
      pin: '1005',
      branch_id: 'br-yossudarso',
      branch_name: 'Cenderawasih Cabang Yos Sudarso',
      base_salary: 2500000,
      commission_rate: 40,
      is_active: 1,
      joined_at: '2024-03-01',
      photo_url: '/assets/setmore/studio-riyan.jpg',
      oct_cuts: 118,
      oct_revenue: 10055000,
      oct_commission: 4022000,
      oct_net: 6522000,
      nov_cuts: 44,
      nov_revenue: 3980000,
      nov_commission: 1592000,
      nov_net: 4092000,
    },
  ];

  // 1. Sinkronisasi Karyawan (Employees Table)
  const upsertEmp = db.prepare(`
    INSERT INTO employees (id, name, role, specialty, phone, pin, branch_id, base_salary, commission_rate, is_active, joined_at, photo_url)
    VALUES (@id, @name, @role, @specialty, @phone, @pin, @branch_id, @base_salary, @commission_rate, @is_active, @joined_at, @photo_url)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      specialty = excluded.specialty,
      phone = excluded.phone,
      pin = excluded.pin,
      branch_id = excluded.branch_id,
      base_salary = excluded.base_salary,
      commission_rate = excluded.commission_rate,
      is_active = excluded.is_active,
      photo_url = CASE WHEN employees.photo_url IS NULL OR employees.photo_url = '' THEN excluded.photo_url ELSE employees.photo_url END
  `);

  for (const c of capsters) {
    upsertEmp.run({
      id: c.id,
      name: c.name,
      role: c.role,
      specialty: c.specialty,
      phone: c.phone,
      pin: c.pin,
      branch_id: c.branch_id,
      base_salary: c.base_salary,
      commission_rate: c.commission_rate,
      is_active: c.is_active,
      joined_at: c.joined_at,
      photo_url: c.photo_url,
    });
  }

  // 2. Sinkronisasi Penggajian (Salaries Table) - Bulan Oktober 2026 & November 2026
  const upsertSalary = db.prepare(`
    INSERT INTO salaries (id, employee_id, employee_name, role, branch_name, period_month, base_salary, total_cuts, total_revenue_generated, commission_rate, commission_amount, bonus, deduction, net_salary, status, paid_at, notes)
    VALUES (@id, @employee_id, @employee_name, @role, @branch_name, @period_month, @base_salary, @total_cuts, @total_revenue_generated, @commission_rate, @commission_amount, @bonus, @deduction, @net_salary, @status, @paid_at, @notes)
    ON CONFLICT(id) DO UPDATE SET
      employee_name = excluded.employee_name,
      role = excluded.role,
      branch_name = excluded.branch_name,
      base_salary = excluded.base_salary,
      total_cuts = excluded.total_cuts,
      total_revenue_generated = excluded.total_revenue_generated,
      commission_rate = excluded.commission_rate,
      commission_amount = excluded.commission_amount,
      net_salary = excluded.net_salary,
      status = excluded.status,
      paid_at = excluded.paid_at,
      notes = excluded.notes
  `);

  for (const c of capsters) {
    // Oktober 2026 (Sesuai Template Real)
    upsertSalary.run({
      id: `sal-${c.id}-2026-10`,
      employee_id: c.id,
      employee_name: c.name,
      role: 'Barber / Capster',
      branch_name: c.branch_name,
      period_month: '2026-10',
      base_salary: c.base_salary,
      total_cuts: c.oct_cuts,
      total_revenue_generated: c.oct_revenue,
      commission_rate: c.commission_rate,
      commission_amount: c.oct_commission,
      bonus: 0,
      deduction: 0,
      net_salary: c.oct_net,
      status: 'Dibayar',
      paid_at: '2026-10-31T20:00:00.000Z',
      notes: `Laporan Rekap Real Oktober 2026 (${c.oct_cuts} Transaksi Pangkas & Produk — Omzet Rp ${c.oct_revenue.toLocaleString('id-ID')})`,
    });

    // November 2026 (Bulan Berjalan)
    upsertSalary.run({
      id: `sal-${c.id}-2026-11`,
      employee_id: c.id,
      employee_name: c.name,
      role: 'Barber / Capster',
      branch_name: c.branch_name,
      period_month: '2026-11',
      base_salary: c.base_salary,
      total_cuts: c.nov_cuts,
      total_revenue_generated: c.nov_revenue,
      commission_rate: c.commission_rate,
      commission_amount: c.nov_commission,
      bonus: 0,
      deduction: 0,
      net_salary: c.nov_net,
      status: 'Draft',
      paid_at: null,
      notes: `Akumulasi Berjalan Bulan November (${c.nov_cuts} Transaksi Pangkas)`,
    });
  }

  // 3. Sinkronisasi Presensi / Absensi (Attendance Table)
  const insertAttendance = db.prepare(`
    INSERT OR REPLACE INTO attendance (id, employee_id, employee_name, branch_id, branch_name, date, check_in_time, check_out_time, lat, lng, distance_meters, geofence_status, verified_by, status, notes)
    VALUES (@id, @employee_id, @employee_name, @branch_id, @branch_name, @date, @check_in_time, @check_out_time, @lat, @lng, @distance_meters, @geofence_status, @verified_by, @status, @notes)
  `);

  // Presensi Oktober 2026 (Hari 1 s.d. 31)
  for (let d = 1; d <= 31; d++) {
    const dStr = String(d).padStart(2, '0');
    const date = `2026-10-${dStr}`;
    const dt = new Date(`${date}T00:00:00`);
    const dow = dt.getDay(); // 0 = Minggu

    for (const c of capsters) {
      const attId = `att-${c.id}-${date}`;
      const isSunday = dow === 0;
      const isLate = !isSunday && (d + c.name.length) % 7 === 0;

      const status = isSunday ? 'Libur' : isLate ? 'Terlambat' : 'Hadir';
      const checkIn = isSunday ? null : isLate ? '10:28' : '09:52';
      const checkOut = isSunday ? null : '21:35';
      const distance = isSunday ? 0 : 12.4;

      insertAttendance.run({
        id: attId,
        employee_id: c.id,
        employee_name: c.name,
        branch_id: c.branch_id,
        branch_name: c.branch_name,
        date,
        check_in_time: checkIn,
        check_out_time: checkOut,
        lat: c.branch_id === 'br-samratulangi' ? -3.3649 : -3.3635,
        lng: c.branch_id === 'br-samratulangi' ? 135.4959 : 135.5012,
        distance_meters: distance,
        geofence_status: isSunday ? 'DI_LUAR' : 'VALID_RADIUS',
        verified_by: isSunday ? 'Sistem Jadwal' : 'Radius GPS & Face Recognition',
        status,
        notes: isSunday
          ? 'Libur Operasional Hari Minggu'
          : isLate
          ? 'Hadir Terlambat (+28 Menit)'
          : 'Presensi Tepat Waktu Terverifikasi',
      });
    }
  }

  // Presensi Berjalan November 2026 (Hari 1 s.d. 18)
  for (let d = 1; d <= 18; d++) {
    const dStr = String(d).padStart(2, '0');
    const date = `2026-11-${dStr}`;
    const dt = new Date(`${date}T00:00:00`);
    const dow = dt.getDay();

    for (const c of capsters) {
      const attId = `att-${c.id}-${date}`;
      const isSunday = dow === 0;
      const isLate = !isSunday && (d + c.name.length) % 6 === 0;

      const status = isSunday ? 'Libur' : isLate ? 'Terlambat' : 'Hadir';
      const checkIn = isSunday ? null : isLate ? '10:15' : '09:55';
      const checkOut = isSunday ? null : '21:30';

      insertAttendance.run({
        id: attId,
        employee_id: c.id,
        employee_name: c.name,
        branch_id: c.branch_id,
        branch_name: c.branch_name,
        date,
        check_in_time: checkIn,
        check_out_time: checkOut,
        lat: c.branch_id === 'br-samratulangi' ? -3.3649 : -3.3635,
        lng: c.branch_id === 'br-samratulangi' ? 135.4959 : 135.5012,
        distance_meters: 10.5,
        geofence_status: isSunday ? 'DI_LUAR' : 'VALID_RADIUS',
        verified_by: 'Radius GPS & Face Recognition',
        status,
        notes: isSunday ? 'Libur Operasional Hari Minggu' : 'Presensi Masuk Terverifikasi',
      });
    }
  }

  // 4. Update Jadwal Operasional (Operational Schedules) untuk Barber Capster
  const samRatulangiCapsters = JSON.stringify(['emp-capster-udin', 'emp-capster-atta', 'emp-capster-noel', 'emp-barber-1', 'emp-barber-2']);
  const yosSudarsoCapsters = JSON.stringify(['emp-capster-aswar', 'emp-capster-acel', 'emp-barber-3', 'emp-barber-4']);

  db.prepare(`
    UPDATE operational_schedules
    SET assigned_barber_ids = ?
    WHERE branch_id = 'br-samratulangi'
  `).run(samRatulangiCapsters);

  db.prepare(`
    UPDATE operational_schedules
    SET assigned_barber_ids = ?
    WHERE branch_id = 'br-yossudarso'
  `).run(yosSudarsoCapsters);
}

export function syncPosServices() {
  const posServices: Array<{id: string; name: string; category: ServiceItem['category']; price: number; duration_minutes: number}> = [
    {id: 'srv-pos-1', name: 'HARCUT PREMIUM', category: 'HAIRCUT', price: 150000, duration_minutes: 60},
    {id: 'srv-pos-2', name: 'HAIRCUT REGULER', category: 'HAIRCUT', price: 85000, duration_minutes: 40},
    {id: 'srv-pos-3', name: 'HAIRCUT SCHOOL', category: 'HAIRCUT', price: 70000, duration_minutes: 35},
    {id: 'srv-pos-4', name: 'HAIRCUT MEMBER', category: 'HAIRCUT', price: 50000, duration_minutes: 30},
    {id: 'srv-pos-5', name: 'HAIRCUT+SHAVING', category: 'HAIRCUT', price: 120000, duration_minutes: 55},
    {id: 'srv-pos-6', name: 'HAIR PERMING PENDEK', category: 'HAIR PERMING', price: 350000, duration_minutes: 90},
    {id: 'srv-pos-7', name: 'SEMIR HITAM', category: 'HAIRCUT', price: 100000, duration_minutes: 45},
    {id: 'srv-pos-8', name: 'HIGHLIGHT WARNA', category: 'HAIR COLOR', price: 450000, duration_minutes: 110},
    {id: 'srv-pos-9', name: 'HIGHLIGHT BLEACHING', category: 'HAIR COLOR', price: 350000, duration_minutes: 90},
    {id: 'srv-pos-10', name: 'FULL ATAS COLORING', category: 'HAIR COLOR', price: 450000, duration_minutes: 110},
    {id: 'srv-pos-11', name: 'BLACING', category: 'HAIR COLOR', price: 350000, duration_minutes: 90},
    {id: 'srv-pos-12', name: 'HIGHLIGHT PANJANG', category: 'HAIR COLOR', price: 550000, duration_minutes: 130},
    {id: 'srv-pos-13', name: 'BUZCUT FULL', category: 'HAIR COLOR', price: 400000, duration_minutes: 90},
    {id: 'srv-pos-14', name: 'BUZCUT ALOY', category: 'HAIR COLOR', price: 450000, duration_minutes: 100},
    {id: 'srv-pos-15', name: 'FULL COLORING', category: 'HAIR COLOR', price: 550000, duration_minutes: 130},
    {id: 'srv-pos-16', name: 'Tambahan Warna', category: 'HAIR COLOR', price: 350000, duration_minutes: 60},
  ];

  const upsertSvc = db.prepare(`
    INSERT INTO services (id, name, category, price, duration_minutes, is_active)
    VALUES (@id, @name, @category, @price, @duration_minutes, 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price = excluded.price
  `);

  for (const s of posServices) {
    upsertSvc.run(s);
  }
}


