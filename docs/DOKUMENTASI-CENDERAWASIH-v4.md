# DOKUMENTASI LENGKAP SISTEM
## Barbershop Cenderawasih Management System - Nabire, Papua Tengah
**Versi:** 4.0 - Pusat Pengaturan & Manajemen Hak Akses Dinamis  
**Cabang:**
- CW-01: Jl. Dr. Sam Ratulangi, Oyehe, Nabire (10.00 - 21.30 WIT)
- CW-02: Jl. Yos Sudarso, Oyehe, Nabire (10.00 - 22.00 WIT)  
**Stack:** PWA React 18 + Next.js / Vite + TypeScript + Tailwind + Express.js + SQLite (better-sqlite3) + Python 3.10 (Face + GPS)

---

## 1. ARSITEKTUR SISTEM

```text
PWA (React + TypeScript) -> REST API + WebSocket -> Express.js (Port 3000)
                                                          |
                                   +------------------------+------------------------+
                                   |                        |                        |
                              SQLite DB              Python Engine           Hardware
                           (better-sqlite3)        (Face + Haversine)      (Bluetooth Printer + Laci)
```

**Prinsip Baru v4.0:**
- Tidak ada lagi hak akses yang di-hardcode di kode. Semua hak akses diatur Owner dari menu Pengaturan.
- Setiap tombol, menu, dan halaman dicek ke tabel `permissions` di database, bukan ke `if role == owner` di kode.
- Owner bisa buat Role Baru (misal: Supervisor, Admin Cabang, Magang) tanpa coding.
- **Isolasi Cabang Kasir:** Kasir yang ditetapkan di cabang tertentu (misal CW-01 atau CW-02) hanya menampilkan daftar capster/barber yang bertugas di cabang tersebut saat input transaksi POS.

---

## 2. KONSEP HAK AKSES BARU - DINAMIS

**Dulu:** Role sudah paten (Owner, Kasir, Karyawan).  
**Sekarang:** Owner bisa buat role sendiri dan atur ijinnya pakai tombol ON / OFF.

### 2.1 Tiga Lapisan Ijin

1. **Menu:** Boleh lihat menu ini atau tidak? (Misal: Menu Gaji)
2. **Aksi:** Di dalam menu itu, boleh apa? Lihat / Tambah / Edit / Hapus / Export / Void
3. **Data:** Data siapa yang boleh dilihat? Data sendiri / Data cabang sendiri / Semua cabang

**Contoh:**
- Kasir: Menu Transaksi = ON, Aksi Void = ON tapi hanya Hari Ini, Data = Cabang Sendiri saja
- Karyawan: Menu Gaji = ON, Aksi Lihat = ON, Data = Milik Sendiri saja
- Supervisor (Role Baru): Menu Gaji = ON, Aksi Lihat = ON, Data = Cabang Sendiri

### 2.2 Tabel Database Baru Untuk Hak Akses

```sql
-- Daftar Role, bisa ditambah Owner
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT, -- Owner, Kasir, Karyawan, Supervisor, Magang
  description TEXT,
  is_system INTEGER, -- 1 = tidak boleh dihapus (Owner), 0 = boleh dihapus
  is_active INTEGER
);

-- Daftar Semua Fitur di Aplikasi
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  menu_group TEXT, -- POS, Keuangan, Karyawan, Pengaturan
  menu_name TEXT, -- POS Kasir, Gaji, Laporan
  route TEXT -- /kasir/pos, /owner/gaji
);

-- Ijin per Role per Fitur, ini yang diatur pakai tombol ON/OFF
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT,
  feature_id TEXT,
  can_view INTEGER, -- Lihat Menu
  can_create INTEGER, -- Tambah
  can_edit INTEGER, -- Edit
  can_delete INTEGER, -- Hapus
  can_export INTEGER, -- Download Excel / PDF
  can_void INTEGER, -- Void Transaksi
  data_scope TEXT, -- self, branch, all
  FOREIGN KEY(role_id) REFERENCES roles(id)
);

-- Pengaturan Aplikasi Global
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_by TEXT,
  updated_at TEXT
);
```

---

## 3. MENU PER ROLE - VERSI 4.0

### 3.1 PUBLIC - Tanpa Login
1. Beranda
2. Barber Kami
3. Layanan & Harga
4. Promo & Berita
5. Lokasi & Cabang
6. Tentang Kami

- **Floating:** Keranjang Online, Ganti Tema
- **Header Kanan:** Cek Status Booking, Masuk Staf
- **Pengaturan:** TIDAK ADA. Public tidak punya pengaturan.

### 3.2 KASIR - Login PIN Kasir
1. POS Kasir (Grid Layanan & Capster Cabang Aktif)
2. Riwayat Transaksi
3. Dashboard Harian (Omzet, Modal Laci, Leaderboard Cabang)
4. Presensi Saya (Face + GPS)
5. Printer & Laci
6. **Pengaturan Saya (BARU):**
   - Ganti PIN Sendiri
   - Ganti Foto Profil Sendiri
   - Atur Printer Sendiri (Bluetooth, Auto Cetak, Auto Buka Laci)
   - Atur Tema (Terang / Gelap)
   - Atur Bahasa (Indonesia)
   - Lihat Versi Aplikasi (Read-only)
   - Tentang Aplikasi

> **Kasir TIDAK BOLEH:** Lihat gaji orang lain, ubah harga, tambah karyawan, ubah hak akses, ubah tampilan public, lihat pengaturan toko.

### 3.3 KARYAWAN / BARBER - Login PIN Barber
1. Presensi (Face + GPS + Jam Kerja)
2. Dashboard Saya (KPI, Kepala, Omzet saya, Komisi saya)
3. Histori Pangkas
4. Gaji Saya (Pokok + Komisi + Bonus, Read-only milik sendiri)
5. Jadwal Saya (Shift cabang)
6. **Pengaturan Saya (BARU):**
   - Ganti PIN Sendiri
   - Ganti Foto Profil / Foto Wajah Sendiri (Persetujuan Owner)
   - Atur Notifikasi (Pengingat Jadwal, Gaji Masuk)
   - Atur Tema (Terang / Gelap)
   - Lihat Versi Aplikasi (Read-only)
   - Bantuan & Cara Absen

> **Karyawan TIDAK BOLEH:** Lihat omzet toko, lihat gaji teman, buat transaksi POS, ubah harga, ubah jadwal orang lain.

### 3.4 OWNER - Login PIN 1111
1. Dashboard Keuangan
2. Transaksi
3. Presensi Semua Cabang
4. Karyawan
5. Gaji & Komisi
6. Layanan & Harga
7. Cabang & Jadwal
8. Konten Public
9. Laporan & Backup
10. **PENGATURAN (PUSAT KONTROL - BARU, PALING LENGKAP)**

---

## 4. MENU PENGATURAN OWNER - PUSAT KONTROL LENGKAP

Hanya Owner yang bisa buka. Semua dikontrol dari 7 sub-menu ini:

### 4.1 Sub-Menu 1: Pengaturan Tampilan (Appearance)
Owner atur tampilan aplikasi tanpa coding:
- Nama Brand: Barbershop Cenderawasih
- Logo: Upload logo baru
- Warna Utama: Pilih warna (Oranye, Hitam, Gold, dll) $\rightarrow$ Langsung sinkron ke tema
- Warna Sidebar: Gelap / Terang
- Tema Default Public: Terang / Gelap
- Banner Hero Public: Ganti foto / video
- Teks Berjalan / Promo: Edit teks promo
- Footer: Alamat, No HP, Instagram, TikTok
- **Tombol:** `[Simpan Tampilan]` `[Pratinjau Public]` `[Reset ke Default]`

### 4.2 Sub-Menu 2: Manajemen Role & Hak Akses (PALING PENTING)
Owner bisa tambah role, edit role, hapus role, dan atur ijin pakai tombol ON/OFF.

- **Bagian A: Daftar Role**
  - Tabel: Nama Role | Jumlah User | Status Aktif | Aksi
  - Tombol: `[+ Tambah Role Baru]`
  - Contoh Role Bawaan: Owner (Sistem, tidak bisa dihapus), Kasir, Karyawan
  - Contoh Role Baru: Supervisor, Admin Cabang, Magang, Kasir Senior

- **Bagian B: Form Tambah Role Baru**
  - Nama Role: `[Input, contoh: Supervisor]`
  - Deskripsi: `[Input, contoh: Bisa lihat laporan cabang sendiri tapi tidak bisa ubah gaji]`
  - Duplikat Dari Role: `[Pilih: Kasir / Karyawan / Kosong]` (Supaya tidak mulai dari nol)
  - Tombol: `[Simpan Role]` `[Batal]`

- **Bagian C: Atur Hak Akses Per Role (Matriks Ijin + Tombol ON/OFF)**

| Fitur / Menu | Lihat | Tambah | Edit | Hapus | Export | Void | Data Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| POS Kasir | [ON] | [ON] | [ON] | [OFF] | [OFF] | [OFF] | Cabang Sendiri |
| Riwayat Transaksi | [ON] | [OFF] | [OFF] | [OFF] | [OFF] | [ON] | Cabang Sendiri |
| Dashboard Harian | [ON] | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | Cabang Sendiri |
| Gaji & Komisi | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | - |
| Karyawan | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | - |
| Laporan & Backup | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | - |
| Pengaturan Toko | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | [OFF] | - |
| Pengaturan Saya | [ON] | [OFF] | [ON] | [OFF] | [OFF] | [OFF] | Milik Sendiri |

- **Bagian D: Atur Ijin Khusus Per User (Override)**
  - Pilih User: `[Udin]`
  - Tambah Ijin Khusus: `[Boleh Void Semua Transaksi]` `[ON]`
  - Berlaku Sampai: `[Tanggal]`
  - Tombol: `[Simpan Override]` `[Hapus Override]`

### 4.3 Sub-Menu 3: Pengaturan Aplikasi & Versi
- Nama Aplikasi: Cenderawasih POS
- Versi Aplikasi: v4.0.1 (Owner bisa edit, contoh naikkan ke v4.1.0 setelah update)
- Mode Aplikasi: `[Online]` / `[Offline / PWA]`
- Bahasa Default: Indonesia
- Zona Waktu: WIT (Asia/Jayapura)
- Mata Uang: IDR (Rp)
- Format Struk: 58mm / 80mm
- Nomor Struk Otomatis: CW-01-XXXX
- Tombol: `[Simpan]` `[Cek Update]` `[Lihat Log Perubahan Versi]`

### 4.4 Sub-Menu 4: Pengaturan Presensi & Keamanan
- Metode Presensi: `[Wajah]` `[GPS]` `[Jam Kerja]` - Bisa ON/OFF per metode
- Radius Geofence: `[150]` meter (bisa diubah per cabang)
- Toleransi Telat: `[15]` menit
- Minimal % Kecocokan Wajah: `[80]` % (Python Cosine Similarity)
- Wajib Foto Wajah Saat Absen: `[ON]`
- Ganti PIN Owner: `[Input PIN Baru]`
- Sesi Login Otomatis Logout: `[30]` menit tidak aktif
- Tombol: `[Simpan Keamanan]`

### 4.5 Sub-Menu 5: Pengaturan Cabang & Jadwal
- Daftar Cabang: CW-01, CW-02
- Per Cabang: Nama, Alamat, Telepon, Koordinat GPS, Radius, Jam Buka, Jam Tutup, Jeda Jumat 11.45-13.00
- Tombol: `[Tambah Cabang]` `[Edit]` `[Nonaktifkan]`

### 4.6 Sub-Menu 6: Pengaturan Gaji & Komisi
- Gaji Pokok Default: Rp 2.000.000
- Skema Komisi 2026: Premium 30%, Reguler 25%, School 20%, Coloring 25-40%
- Bonus Target: 100 = 200rb, 150 = 500rb, 200 = 1jt, 300 = 2,5jt
- Tanggal Gajian: `[Tanggal 1 Setiap Bulan]`
- Tombol: `[Simpan Skema]` `[Simulasi Gaji]`

### 4.7 Sub-Menu 7: Pengaturan Lain-lain
- Backup Otomatis: `[ON]` Setiap Jam 23.00 ke `data/backups/`
- Notifikasi WA: `[ON/OFF]`
- Log Aktivitas: Siapa ubah apa, jam berapa (Audit Trail)
- Hapus Data: Hanya Owner, wajib verifikasi PIN

---

## 5. PENGATURAN PER ROLE - RINGKASAN PERBEDAAN

| Pengaturan | Kasir | Karyawan | Owner |
| :--- | :---: | :---: | :---: |
| Ganti PIN Sendiri | Ya | Ya | Ya |
| Ganti Foto Profil Sendiri | Ya | Ya (Persetujuan Owner) | Ya |
| Atur Tema Sendiri | Ya | Ya | Ya |
| Atur Printer Sendiri | Ya | Tidak | Ya |
| Atur Tampilan Public | Tidak | Tidak | Ya |
| Atur Warna & Logo | Tidak | Tidak | Ya |
| Buat / Hapus Role | Tidak | Tidak | Ya |
| Atur Hak Akses Role | Tidak | Tidak | Ya |
| Atur Versi Aplikasi | Tidak (Hanya lihat) | Tidak (Hanya lihat) | Ya (Bisa edit) |
| Atur Geofence & Presensi | Tidak | Tidak | Ya |
| Atur Skema Gaji | Tidak | Tidak | Ya |
| Atur Backup | Tidak | Tidak | Ya |
| Lihat Log Aktivitas | Tidak | Tidak | Ya |

---

## 6. SISTEM GAJI 2026 (Tetap)
- **Gaji Pokok:** Rp 2.000.000
- **Komisi:** Premium 30% (45rb), Reguler 25% (21.250), School 20% (14.000), Coloring 25-40%
- **Bonus Bulanan:** 100 = 200rb, 150 = 500rb, 200 = 1jt, 300 = 2,5jt
- **Rumus:** $\text{Net} = \text{Pokok} + \text{Komisi} + \text{Bonus} - \text{Potongan}$

---

## 7. KODE FRONTEND - SIDEBAR DINAMIS

Simpan di: `components/SidebarDynamic.tsx`

```tsx
// components/SidebarDynamic.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Menu = {
  label: string;
  href: string;
  icon: string;
  can_view: boolean;
};

export default function SidebarDynamic({ role }: { role: string }) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Ambil menu dari backend berdasarkan role yang login
    fetch(`/api/permissions/menu?role=${role}`)
      .then((r) => r.json())
      .then((data) => setMenus(data.filter((m: Menu) => m.can_view)));
  }, [role]);

  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-white p-4 flex flex-col gap-1">
      <p className="font-bold text-lg mb-4">CENDERAWASIH</p>
      <p className="text-xs text-zinc-400 uppercase mb-4">Role: {role}</p>
      {menus.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={`px-3 py-2.5 rounded-lg flex gap-2 text-sm ${
            router.pathname === m.href ? "bg-orange-500 font-semibold" : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </Link>
      ))}
      <button
        onClick={() => {
          localStorage.clear();
          router.push("/login");
        }}
        className="mt-auto bg-red-600 py-2.5 rounded-lg text-sm font-semibold"
      >
        Keluar
      </button>
    </aside>
  );
}
```

---

## 8. KODE FRONTEND - HALAMAN PENGATURAN OWNER (ON/OFF HAK AKSES)

Simpan di: `pages/owner/pengaturan/hak-akses.tsx`

```tsx
// pages/owner/pengaturan/hak-akses.tsx
import { useState } from "react";

type PermissionRow = {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_void: boolean;
};

export default function HakAksesPage() {
  const [role, setRole] = useState("kasir");
  const [rows, setRows] = useState<PermissionRow[]>([
    { feature: "POS Kasir", can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, can_void: false },
    { feature: "Riwayat Transaksi", can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: false, can_void: true },
    { feature: "Gaji & Komisi", can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_void: false },
    { feature: "Karyawan", can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_void: false },
  ]);

  function toggle(index: number, key: keyof PermissionRow) {
    const copy = [...rows];
    // @ts-ignore
    copy[index][key] = !copy[index][key];
    setRows(copy);
  }

  function Tombol({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          on ? "bg-green-500 text-white" : "bg-zinc-300 text-zinc-600"
        }`}
      >
        {on ? "ON" : "OFF"}
      </button>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Pengaturan Hak Akses</h1>
      <p className="text-sm text-zinc-500">Hanya Owner yang bisa ubah. Perubahan langsung berlaku.</p>

      <div className="my-4 flex gap-2 items-center">
        <label>Pilih Role:</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border p-2 rounded">
          <option value="kasir">Kasir</option>
          <option value="karyawan">Karyawan</option>
          <option value="supervisor">Supervisor</option>
          <option value="magang">Magang</option>
        </select>
        <button className="bg-orange-500 text-white px-4 py-2 rounded">+ Tambah Role Baru</button>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-zinc-100">
            <th className="p-2 text-left">Fitur</th>
            <th>Lihat</th>
            <th>Tambah</th>
            <th>Edit</th>
            <th>Hapus</th>
            <th>Export</th>
            <th>Void</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.feature} className="border-t">
              <td className="p-2 font-medium">{r.feature}</td>
              <td className="text-center"><Tombol on={r.can_view} onClick={() => toggle(i, "can_view")} /></td>
              <td className="text-center"><Tombol on={r.can_create} onClick={() => toggle(i, "can_create")} /></td>
              <td className="text-center"><Tombol on={r.can_edit} onClick={() => toggle(i, "can_edit")} /></td>
              <td className="text-center"><Tombol on={r.can_delete} onClick={() => toggle(i, "can_delete")} /></td>
              <td className="text-center"><Tombol on={r.can_export} onClick={() => toggle(i, "can_export")} /></td>
              <td className="text-center"><Tombol on={r.can_void} onClick={() => toggle(i, "can_void")} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold">
        Simpan Hak Akses {role}
      </button>
    </div>
  );
}
```

---

## 9. KODE BACKEND - CEK HAK AKSES DINAMIS (Express.js)

Simpan di: `server/middleware/cekIjin.js`

```javascript
// server/middleware/cekIjin.js
const db = require("../db");

function cekIjin(feature, aksi) {
  // feature: "Gaji & Komisi", "Karyawan", "Laporan & Backup", "Riwayat Transaksi"
  // aksi: "can_view", "can_create", "can_edit", "can_delete", "can_export", "can_void"
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.user?.role;
    const userId = req.headers['x-user-id'] || req.user?.id;
    if (!userRole) return res.status(401).json({ error: "Belum login" });

    // Owner selalu lolos
    if (userRole === "owner") return next();

    const row = db.prepare(`
      SELECT rp.* FROM role_permissions rp
      JOIN features f ON f.id = rp.feature_id
      JOIN roles r ON r.id = rp.role_id
      WHERE r.name = ? AND f.menu_name = ? AND rp.${aksi} = 1
    `).get(userRole, feature);

    if (!row) {
      return res.status(403).json({ error: `Role ${userRole} tidak punya ijin ${aksi} untuk ${feature}. Hubungi Owner.` });
    }

    // Cek data scope: karyawan hanya boleh lihat data sendiri
    if (row.data_scope === "self" && req.params.id && req.params.id !== userId) {
      return res.status(403).json({ error: "Kamu hanya boleh akses data milikmu sendiri" });
    }

    next();
  };
}

module.exports = cekIjin;
```

**Cara Pakai:**
```javascript
const cekIjin = require("./middleware/cekIjin");

app.get("/api/gaji/:id", cekIjin("Gaji & Komisi", "can_view"), lihatGaji);
app.post("/api/gaji", cekIjin("Gaji & Komisi", "can_create"), buatGaji);
app.put("/api/karyawan/:id", cekIjin("Karyawan", "can_edit"), editKaryawan);
app.get("/api/laporan", cekIjin("Laporan & Backup", "can_export"), exportLaporan);
app.post("/api/transaksi/void/:id", cekIjin("Riwayat Transaksi", "can_void"), voidTransaksi);
```

---

## 10. STRUKTUR FOLDER FINAL v4.0

```text
/public            - Beranda, Layanan, Promo, Lokasi, Tentang
/kasir             - pos, riwayat, dashboard-harian, printer, presensi-saya, pengaturan-saya
/karyawan          - presensi, dashboard-saya, histori, gaji-saya, jadwal-saya, pengaturan-saya
/owner             - dashboard, transaksi, presensi, karyawan, gaji, layanan, cabang, konten, laporan
/owner/pengaturan  - tampilan, hak-akses, aplikasi-versi, presensi-keamanan, cabang-jadwal, gaji-komisi, lain-lain
/components        - SidebarDynamic.tsx
/server            - middleware/cekIjin.js, routes, db
/python            - face_match.py, geo_haversine.py
```

---

## 11. CHECKLIST MIGRASI KE v4.0
- [x] Buat tabel baru: `roles`, `features`, `role_permissions`, `app_settings`
- [x] Buat data awal `roles` dan `permissions` dalam bentuk `seed.sql`
- [x] Filter POS Kasir: Jika kasir ditetapkan di suatu cabang, hanya capster cabang tersebut yang tampil
- [ ] Buat UI Halaman `/owner/pengaturan` dengan 7 sub-menu dinamis
- [ ] Ganti Sidebar statis dengan `SidebarDynamic.tsx`
- [ ] Tambahkan menu Pengaturan Saya di Kasir dan Karyawan
