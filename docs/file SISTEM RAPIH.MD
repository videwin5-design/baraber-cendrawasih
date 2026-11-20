1. File MD Baru - Tempel ke Repo
Simpan sebagai ARSITEKTUR-RAPIH.mdmarkdown# Barbershop Cenderawasih - Arsitektur Rapih v3.0
Cabang: CW-01 Sam Ratulangi, CW-02 Yos Sudarso | Nabire

## Prinsip
- Public: Lihat dan Booking saja
- Kasir: Jualan hari ini saja, tidak lihat gaji
- Karyawan: Presensi, performa, gaji sendiri saja
- Owner: Full kontrol

## Menu Public (Tanpa Login)
1. Beranda - Hero video + promo
2. Barber Kami - Daftar kapster
3. Layanan & Harga - HAIRCUT, PERMING, COLORING, STYLING
4. Promo & Berita
5. Lokasi & Cabang - CW-01, CW-02 + Maps
6. Tentang Kami
Floating: Keranjang Online, Ganti Tema

## Menu Kasir (PIN Kasir)
1. /kasir/pos - POS Grid, keranjang, bayar, tahan, laci, stok, pelanggan
2. /kasir/riwayat - Filter, reprint, void hari ini
3. /kasir/dashboard-harian - Omzet hari ini, tunai vs QRIS, modal laci, leaderboard
4. /kasir/presensi-saya - Absen masuk pulang kasir
5. /kasir/printer - Bluetooth, test print, test laci

## Menu Karyawan (PIN Barber)
1. /karyawan/presensi - Face + GPS 150m + Jam Kerja
2. /karyawan/dashboard-saya - KPI, kepala, omzet saya, komisi saya
3. /karyawan/histori - Histori pangkas saya
4. /karyawan/gaji-saya - Gaji pokok + komisi + bonus, read-only
5. /karyawan/jadwal-saya - Shift saya

## Menu Owner (PIN 1111)
1. /owner/dashboard - Omzet, per cabang, per metode bayar, laba kotor
2. /owner/transaksi - Semua transaksi, reprint, void
3. /owner/presensi - Log semua cabang, foto, GPS, % wajah
4. /owner/karyawan - CRUD, PIN, foto wajah, role
5. /owner/gaji - Rekap gaji, skema 2026, bonus, potongan, konfirmasi bayar
6. /owner/layanan - CRUD 16 layanan
7. /owner/cabang - Nama, GPS, radius, jam buka, jeda Jumat 11.45-13.00
8. /owner/konten - Banner, video hero, promo, foto cabang
9. /owner/laporan - Export XLSX, PDF, Auto Backup SQLite

## Hak Akses
- Ubah harga: Owner saja
- Void: Kasir hanya hari ini, Owner semua
- Lihat omzet toko: Kasir hanya hari ini, Owner semua
- Lihat gaji orang lain: Owner saja
- Export / Backup: Owner saja2. File sidebar.tsx - Tinggal Pakai
Simpan di components/Sidebar.tsx. Ini sudah kunci per role, jadi kasir tidak akan pernah lihat menu gaji.tsx// components/Sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";

type Role = "kasir" | "karyawan" | "owner" | "public";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

const MENUS: Record<Role, MenuItem[]> = {
  public: [
    { label: "Beranda", href: "/", icon: "🏠" },
    { label: "Barber Kami", href: "/barber", icon: "💈" },
    { label: "Layanan & Harga", href: "/layanan", icon: "💇" },
    { label: "Promo & Berita", href: "/promo", icon: "🎁" },
    { label: "Lokasi & Cabang", href: "/lokasi", icon: "📍" },
    { label: "Tentang Kami", href: "/tentang", icon: "ℹ️" },
  ],
  kasir: [
    { label: "POS Kasir", href: "/kasir/pos", icon: "🧾" },
    { label: "Riwayat Transaksi", href: "/kasir/riwayat", icon: "📜" },
    { label: "Dashboard Harian", href: "/kasir/dashboard-harian", icon: "📊" },
    { label: "Presensi Saya", href: "/kasir/presensi-saya", icon: "📸" },
    { label: "Printer & Laci", href: "/kasir/printer", icon: "🖨️" },
  ],
  karyawan: [
    { label: "Presensi", href: "/karyawan/presensi", icon: "📸" },
    { label: "Dashboard Saya", href: "/karyawan/dashboard-saya", icon: "📊" },
    { label: "Histori Pangkas", href: "/karyawan/histori", icon: "✂️" },
    { label: "Gaji Saya", href: "/karyawan/gaji-saya", icon: "💰" },
    { label: "Jadwal Saya", href: "/karyawan/jadwal-saya", icon: "🗓️" },
  ],
  owner: [
    { label: "Dashboard Keuangan", href: "/owner/dashboard", icon: "📊" },
    { label: "Transaksi", href: "/owner/transaksi", icon: "🧾" },
    { label: "Presensi Semua Cabang", href: "/owner/presensi", icon: "📸" },
    { label: "Karyawan", href: "/owner/karyawan", icon: "👥" },
    { label: "Gaji & Komisi", href: "/owner/gaji", icon: "💰" },
    { label: "Layanan & Harga", href: "/owner/layanan", icon: "✂️" },
    { label: "Cabang & Jadwal", href: "/owner/cabang", icon: "📍" },
    { label: "Konten Public", href: "/owner/konten", icon: "🖼️" },
    { label: "Laporan & Backup", href: "/owner/laporan", icon: "📥" },
  ],
};

export default function Sidebar({ role }: { role: Role }) {
  const router = useRouter();
  const menus = MENUS[role];

  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-white p-4 flex flex-col gap-1">
      <div className="mb-6">
        <p className="font-bold text-lg">CENDERAWASIH</p>
        <p className="text-xs text-zinc-400 uppercase">Role: {role}</p>
      </div>

      {menus.map((m) => {
        const active = router.pathname === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`px-3 py-2.5 rounded-lg flex gap-2 items-center text-sm ${
              active ? "bg-orange-500 text-white font-semibold" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </Link>
        );
      })}

      <button
        onClick={() => {
          localStorage.clear();
          router.push("/login");
        }}
        className="mt-auto px-3 py-2.5 rounded-lg bg-red-600 text-sm font-semibold"
      >
        Keluar
      </button>
    </aside>
  );
}Cara pakai di halamanmutsx// Contoh di halaman kasir
import Sidebar from "@/components/Sidebar";

export default function PosPage() {
  return (
    <div className="flex">
      <Sidebar role="kasir" />
      <main className="flex-1 p-6">Isi POS di sini</main>
    </div>
  );
} markdown# DOKUMENTASI LENGKAP SISTEM
## Barbershop Cenderawasih Management System - Nabire, Papua Tengah
**Versi:** 3.0 Rapih | **Tahun:** 2026 | **Status:** Produksi / Stabil
**Cabang:**
- CW-01: Jl. Dr. Sam Ratulangi, Oyehe, Nabire (10.00 - 21.30 WIT)
- CW-02: Jl. Yos Sudarso, Oyehe, Nabire (10.00 - 22.00 WIT)

---

## 1. ARSITEKTUR SISTEM
Klien Web PWA (React 18 + Next.js + TypeScript + Tailwind)REST API + WebSocket Realtimev
Server Express.js (Port 3000) + WebSocket GatewaySpawn Async Processv                v
Database SQLite    Engine Python 3.10
(better-sqlite3)   (Geo Haversine + Face Match)
   |
   v
Hardware: Thermal Printer & Laci Kasir (Web Bluetooth ESC/POS)javascript
**Prinsip Pemisahan:**
- TypeScript (Frontend): Tampilan, kamera, kirim foto, tampilkan hasil
- Python (Backend Otak): Cek wajah, hitung jarak GPS, kembalikan hasil
- Express.js (Backend Utama): Atur data, transaksi, gaji, hak akses

**Alur Presensi:**
Kamera (TypeScript) -> Kirim Foto -> Python (Cek Wajah) -> Balas Hasil -> Tampil di Website

---

## 2. ROLE & HAK AKSES (RBAC)

Ada 4 peran. Tidak ada peran yang bisa lihat semua kecuali Owner.

### 2.1 Public - Tanpa Login
Boleh: Lihat beranda, barber, layanan, promo, lokasi, booking online, cek status booking
Tidak Boleh: Lihat omzet, gaji, transaksi, masuk dashboard

### 2.2 Kasir - Login PIN Kasir
Boleh: POS, riwayat transaksi hari ini, dashboard harian, presensi diri sendiri, printer
Tidak Boleh: Lihat gaji kapster, ubah harga, ubah karyawan, export laporan, lihat omzet total

### 2.3 Karyawan / Barber - Login PIN Barber
Boleh: Presensi diri sendiri, dashboard performa sendiri, histori pangkas sendiri, gaji sendiri, jadwal sendiri
Tidak Boleh: Lihat omzet toko, lihat gaji teman, buat transaksi, ubah harga

### 2.4 Owner - Login PIN 1111
Boleh: Semua. Full CRUD cabang, karyawan, layanan, jadwal, gaji, konten, laporan, backup

### 2.5 Tabel Hak Akses Lengkap

| Fitur | Public | Kasir | Karyawan | Owner |
| :--- | :--- | :--- | :--- | :--- |
| Lihat layanan & harga | Ya | Ya | Ya | Ya |
| Ubah layanan & harga | Tidak | Tidak | Tidak | Ya |
| Buat transaksi POS | Tidak | Ya | Tidak | Ya |
| Void transaksi | Tidak | Hanya hari ini | Tidak | Semua |
| Lihat omzet toko | Tidak | Hanya hari ini | Tidak | Semua |
| Lihat gaji orang lain | Tidak | Tidak | Tidak | Ya |
| Lihat gaji sendiri | Tidak | Tidak | Ya | Ya |
| Ubah skema gaji 2026 | Tidak | Tidak | Tidak | Ya |
| Tambah / Hapus karyawan | Tidak | Tidak | Tidak | Ya |
| Ubah konten public | Tidak | Tidak | Tidak | Ya |
| Export Excel / PDF | Tidak | Tidak | Tidak | Ya |
| Backup database | Tidak | Tidak | Tidak | Ya |
| Presensi | Tidak | Diri sendiri | Diri sendiri | Monitoring saja |

---

## 3. PETA MENU & PENEMPATAN HALAMAN

### 3.1 Public - Tanpa Login
Urutan Navbar:
1. Beranda - Hero video + promo utama
2. Barber Kami - Daftar kapster, foto, rating, efek RGB Glow
3. Layanan & Harga - Kategori HAIRCUT, PERMING, COLORING, STYLING
4. Promo & Berita - Diskon, info cabang
5. Lokasi & Cabang - Foto CW-01, CW-02 + Rute Google Maps
6. Tentang Kami - Profil lengkap

Header Kanan: Tombol Cek Status Booking, Masuk Karyawan/Staf
Floating Kanan Bawah: Keranjang Online + Ganti Tema Terang/Gelap
Footer: Hak cipta, alamat, sosmed, logo sebagai shortcut login staf

### 3.2 Kasir - Portal POS Tablet
Sub-Tab Atas (Urutan Fix):
1. POS Kasir (Grid)
2. Riwayat Transaksi
3. Dashboard Harian
4. Presensi Saya
5. Printer & Laci

**Detail POS Kasir:**
Action Bar Atas:
- Laci Kasir (Merah): Buka laci + suara bel
- Tahan Transaksi (Kuning Emas): Tahan ke antrean + badge counter
- Stok Persediaan (Kuning): Cek pomade, powder, tonic
- Pelanggan (Hijau): Input nama + WA walk-in
- Hapus (Oranye/Merah): Kosongkan keranjang
- Search / Barcode: Cari layanan atau produk

Kolom Kiri (Keranjang):
- Kosong: Tampilkan "Tidak ada data"
- Terisi: Kartu layanan, nama barber, stepper - / +, harga
- Bawah: Total: RpX,00 + Tombol besar merah "Pembayaran"

Kolom Kanan (Barber & Layanan):
- Tab Barber: HAIKAL, UDIN, ACEL, ASWAR, PRODAK, NOEL, ATTA. Tab aktif outline oranye
- Tab PRODAK: Grid retail pomade, powder, vitamin + stok sisa
- Tab Barber: 16 grid layanan:
    1. HAIRCUT PREMIUM Rp150.000
    2. HAIRCUT REGULER Rp85.000
    3. HAIRCUT SCHOOL Rp70.000
    4. HAIRCUT MEMBER Rp50.000
    5. HAIRCUT+SHAVING Rp120.000
    6. HAIR PERMING PENDEK Rp350.000
    7. SEMIR HITAM Rp100.000
    8. HIGHLIGHT WARNA Rp450.000
    9. HIGHLIGHT BLEACHING Rp350.000
    10. FULL ATAS COLORING Rp450.000
    11. BLACING Rp350.000
    12. HIGHLIGHT PANJANG Rp550.000
    13. BUZCUT FULL Rp400.000
    14. BUZCUT ALOY Rp450.000
    15. FULL COLORING Rp550.000
    16. Tambahan Warna Rp350.000

Modal Pembayaran:
- Metode: Tunai, QRIS Dinamis (EMVCo), Transfer Bank, Debit
- Tunai: Tombol Uang Pas, 50k, 100k, 150k, 200k, 300k, 500k + kembalian otomatis
- Checkbox: Buka laci otomatis, Cetak struk otomatis

**Detail Riwayat Transaksi:**
- Filter: Hari Ini, Kemarin, 7 Hari, Bulan Ini, Semua + Capster + Metode Bayar + Cari teks
- Metrik: Total nominal terfilter, jumlah struk selesai
- Aksi: Cetak Ulang, Buka Struk Digital, Void

**Detail Dashboard Harian Kasir:**
- KPI: Total Omzet, Tunai (Laci), Non-Tunai (QRIS & Transfer), Total Komisi Barber
- Rekonsiliasi Laci: Modal Awal (localStorage) + Penjualan Tunai = Uang Fisik Laci
- Leaderboard Capster Hari Ini: Ranking berdasarkan jumlah kepala, omzet, komisi harian

**Detail Printer & Laci:**
- Koneksi Web Bluetooth API: Hubungkan / Putuskan printer 58mm & 80mm
- Status: Hijau / Abu-abu + nama printer
- Alat Uji: Kick Drawer Pin 2, Cetak struk uji
- Otomasi: Sakelar buka laci otomatis, cetak struk otomatis

### 3.3 Karyawan / Barber - Portal Karyawan
Urutan Menu:
1. Presensi - Face + GPS + Jam Kerja, tombol Masuk / Pulang
2. Dashboard Saya - KPI harian & bulanan, jumlah kepala, omzet saya, komisi saya
3. Histori Pangkas - Daftar pelanggan saya + komisi per transaksi
4. Gaji Saya - Gaji pokok + komisi + bonus, read-only, hanya milik sendiri
5. Jadwal Saya - Jadwal shift di cabang saya

### 3.4 Owner - Portal Manajemen
Urutan Menu:
1. Dashboard Keuangan - Grafik pendapatan, per cabang, per metode bayar, laba kotor
2. Transaksi - Semua transaksi semua cabang, reprint, void
3. Presensi Semua Cabang - Rekap real-time, status geofence, % kecocokan wajah, verifikasi waktu
4. Karyawan - Tambah, edit, nonaktifkan, ganti PIN, tentukan role, upload foto wajah
5. Gaji & Komisi - Sinkronisasi komisi dari transaksi, bonus, potongan, konfirmasi bayar
6. Layanan & Harga - CRUD layanan
7. Cabang & Jadwal - Nama, kode, alamat, telepon, GPS, radius geofence, jam operasional, jeda Sholat Jumat 11.45-13.00 WIT, penugasan barber
8. Konten Public - Video hero, subtitle banner, promo, foto profil cabang (preset / link kustom)
9. Laporan & Backup - Export XLSX multi-sheet, PDF, Auto Backup ke data/backups/

### 3.5 Presensi Mandiri - 3 Lapis Keamanan
Dulu portal terpisah, sekarang jadi menu nomor 1 di Kasir dan Karyawan.
1. Verifikasi Lokasi (GPS Haversine): Harus dalam radius 150 meter cabang
2. Verifikasi Wajah (Face Recognition): Foto selfie vs foto profil, Python OpenCV + Cosine Similarity
3. Verifikasi Jam Operasional: Cek jam masuk vs jadwal buka cabang di database

---

## 4. SISTEM GAJI BARBER 2026

File: BarberSalarySchemeModal.tsx -> Sekarang pindah jadi halaman penuh Owner di /owner/gaji

- Gaji Pokok: Rp 2.000.000 / bulan untuk semua barber
- Komisi Haircut:
    - Premium (Rp150.000): 30% = Rp45.000
    - Reguler (Rp85.000): 25% = Rp21.250
    - Basic / School (Rp70.000): 20% = Rp14.000
    - Pewarnaan / Perming / Produk: 25% - 40%
- Bonus Target Bulanan:
    - 100 Pelanggan: Bonus Rp200.000
    - 150 Pelanggan (Junior): Bonus Rp500.000 -> Total Rp5.687.500
    - 200 Pelanggan (Senior): Bonus Rp1.000.000 -> Total Rp7.250.000
    - 300 Pelanggan (Legend): Bonus Rp2.500.000 -> Total Rp10.875.000
- Dilengkapi kalkulator simulasi slider jumlah pelanggan

Rumus Gaji Bersih:
Net = Gaji Pokok + Komisi + Bonus - Potongan (Telat / Izin)

---

## 5. STRUKTUR DATABASE (SQLite)

Tabel Utama:
- BRANCHES: id, name, code, address, phone, lat, lng, radius_meters, open_time, close_time, photo_url, is_active
- EMPLOYEES: id, name, role, specialty, phone, pin, branch_id, base_salary, commission_rate, photo_url, is_active
- SERVICES: id, name, category, price, duration_minutes, is_active
- TRANSACTIONS: id, invoice_no, branch_id, barber_id, cashier_id, customer_name, customer_phone, items_json, subtotal, discount, total_amount, barber_commission, payment_method, notes, created_at
- SALARIES: id, employee_id, period_month, base_salary, total_cuts, total_revenue_generated, commission_rate, commission_amount, bonus, deduction, net_salary, status
- BOOKINGS, ATTENDANCE, OPERATIONAL_SCHEDULES

Relasi:
BRANCHES 1 - N EMPLOYEES, TRANSACTIONS, BOOKINGS, SCHEDULES, ATTENDANCE
EMPLOYEES 1 - N TRANSACTIONS, BOOKINGS, ATTENDANCE, SALARIES
SERVICES 1 - N BOOKINGS

---

## 6. INTEGRASI HARDWARE & ESC/POS

- Web Bluetooth: navigator.bluetooth, chunking payload 100 bytes, untuk printer BLE 58mm dan 80mm
- Perintah ESC/POS:
    - Init: [0x1b, 0x40]
    - Tengah + Bold: [0x1b, 0x61, 0x01], [0x1b, 0x45, 0x01]
    - Buka Laci Pin 2: [0x1b, 0x70, 0x00, 0x19, 0xfa]
    - Potong Kertas: [0x1d, 0x56, 0x41, 0x10]
- Fallback: printReceiptViaBrowser + Web Audio API bunyi lonceng laci jika Bluetooth tidak terhubung

---

## 7. KODE SIDEBAR PER ROLE (Frontend)

Simpan di: components/Sidebar.tsxtsx// components/Sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";

type Role = "kasir" | "karyawan" | "owner" | "public";

type MenuItem = { label: string; href: string; icon: string };

const MENUS: Record<Role, MenuItem[]> = {
  public: [
    { label: "Beranda", href: "/", icon: "🏠" },
    { label: "Barber Kami", href: "/barber", icon: "💈" },
    { label: "Layanan & Harga", href: "/layanan", icon: "💇" },
    { label: "Promo & Berita", href: "/promo", icon: "🎁" },
    { label: "Lokasi & Cabang", href: "/lokasi", icon: "📍" },
    { label: "Tentang Kami", href: "/tentang", icon: "ℹ️" },
  ],
  kasir: [
    { label: "POS Kasir", href: "/kasir/pos", icon: "🧾" },
    { label: "Riwayat Transaksi", href: "/kasir/riwayat", icon: "📜" },
    { label: "Dashboard Harian", href: "/kasir/dashboard-harian", icon: "📊" },
    { label: "Presensi Saya", href: "/kasir/presensi-saya", icon: "📸" },
    { label: "Printer & Laci", href: "/kasir/printer", icon: "🖨️" },
  ],
  karyawan: [
    { label: "Presensi", href: "/karyawan/presensi", icon: "📸" },
    { label: "Dashboard Saya", href: "/karyawan/dashboard-saya", icon: "📊" },
    { label: "Histori Pangkas", href: "/karyawan/histori", icon: "✂️" },
    { label: "Gaji Saya", href: "/karyawan/gaji-saya", icon: "💰" },
    { label: "Jadwal Saya", href: "/karyawan/jadwal-saya", icon: "🗓️" },
  ],
  owner: [
    { label: "Dashboard Keuangan", href: "/owner/dashboard", icon: "📊" },
    { label: "Transaksi", href: "/owner/transaksi", icon: "🧾" },
    { label: "Presensi Semua Cabang", href: "/owner/presensi", icon: "📸" },
    { label: "Karyawan", href: "/owner/karyawan", icon: "👥" },
    { label: "Gaji & Komisi", href: "/owner/gaji", icon: "💰" },
    { label: "Layanan & Harga", href: "/owner/layanan", icon: "✂️" },
    { label: "Cabang & Jadwal", href: "/owner/cabang", icon: "📍" },
    { label: "Konten Public", href: "/owner/konten", icon: "🖼️" },
    { label: "Laporan & Backup", href: "/owner/laporan", icon: "📥" },
  ],
};

export default function Sidebar({ role }: { role: Role }) {
  const router = useRouter();
  const menus = MENUS[role];
  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-white p-4 flex flex-col gap-1">
      <div className="mb-6">
        <p className="font-bold text-lg">CENDERAWASIH</p>
        <p className="text-xs text-zinc-400 uppercase">Role: {role}</p>
      </div>
      {menus.map((m) => {
        const active = router.pathname === m.href;
        return (
          <Link key={m.href} href={m.href} className={`px-3 py-2.5 rounded-lg flex gap-2 items-center text-sm ${active ? "bg-orange-500 text-white font-semibold" : "text-zinc-300 hover:bg-zinc-800"}`}>
            <span>{m.icon}</span><span>{m.label}</span>
          </Link>
        );
      })}
      <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="mt-auto px-3 py-2.5 rounded-lg bg-red-600 text-sm font-semibold">Keluar</button>
    </aside>
  );
}Cara Pakai:tsximport Sidebar from "@/components/Sidebar";
export default function PosPage() {
  return (
    <div className="flex">
      <Sidebar role="kasir" />
      <main className="flex-1 p-6">Isi POS di sini</main>
    </div>
  );
}8. KODE KUNCI ROLE (Backend Express.js)
Ini yang paling penting. Jangan cuma sembunyikan menu di frontend. Kunci di backend biar tidak bisa ditembak pakai Postman.
Simpan di: server/middleware/cekRole.jsjavascript
```js
// server/middleware/cekRole.js
function cekRole(...rolesBoleh) {
  return (req, res, next) => {
    const user = req.user; // dari token / session kamu
    if (!user) return res.status(401).json({ error: "Belum login" });
    if (!rolesBoleh.includes(user.role)) {
      return res.status(403).json({ error: "Kamu tidak punya akses ke menu ini" });
    }
    // Aturan khusus: karyawan hanya boleh lihat gaji sendiri
    if (user.role === "karyawan" && req.params.id && req.params.id !== user.id) {
      if (req.path.includes("gaji")) {
        return res.status(403).json({ error: "Karyawan hanya boleh lihat gaji sendiri" });
      }
    }
    next();
  };
}
module.exports = cekRole;Cara Pakai di server.js:jsconst cekRole = require("./middleware/cekRole");

// Kasir dan Owner boleh buat transaksi
app.post("/api/transaksi", cekRole("kasir", "owner"), buatTransaksi);

// Gaji: Owner saja yang bisa ubah, Karyawan hanya lihat milik sendiri
app.get("/api/gaji/:id", cekRole("karyawan", "owner"), lihatGaji);
app.post("/api/gaji", cekRole("owner"), buatGaji);
app.put("/api/gaji/:id", cekRole("owner"), editGaji);

// Karyawan: Owner saja
app.post("/api/karyawan", cekRole("owner"), tambahKaryawan);
app.delete("/api/karyawan/:id", cekRole("owner"), hapusKaryawan);

// Laporan: Owner saja
app.get("/api/laporan", cekRole("owner"), exportLaporan);9. STRUKTUR FOLDER YANG DISARANKANjavascript/public - Beranda, Layanan, Promo, Lokasi, Tentang
/kasir - pos, riwayat, dashboard-harian, printer, presensi-saya
/karyawan - presensi, dashboard-saya, histori, gaji-saya, jadwal-saya
/owner - dashboard, transaksi, presensi, karyawan, gaji, layanan, cabang, konten, laporan
/components - Sidebar.tsx, BarberSalarySchemeModal.tsx (hanya dipakai di Owner)
/server - middleware/cekRole.js, routes
/python - face_match.py, geo_haversine.py10. CHECKLIST PERBAIKAN PRIORITAS
Hapus menu Skema Gaji dari Kasir, pindahkan ke /owner/gajiHapus Portal Presensi terpisah, jadikan menu di dalam Kasir & KaryawanPasang Sidebar.tsx per role di semua halamanPasang cekRole.js di semua API gaji, karyawan, laporanBatasi void kasir hanya untuk transaksi hari iniPastikan karyawan tidak bisa akses /owner/* lewat URL langsungjavascript
---

Itu sudah 1 dokumentasi utuh: Arsitektur + Menu + Hak Akses + Gaji + Database + Hardware + Kode Frontend + Kode Backend.

