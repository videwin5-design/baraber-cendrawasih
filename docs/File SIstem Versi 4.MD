Siap, ini saya buat ulang total jadi Versi 4.0. Sekarang Owner punya Pusat Pengaturan sendiri. Owner bisa buat role baru, kasih ijin pakai tombol ON/OFF, atur tampilan, dan atur versi aplikasi.Semua role juga sekarang punya menu Pengaturan sendiri, tapi isinya beda-beda sesuai haknya.Simpan sebagai DOKUMENTASI-CENDERAWASIH-v4.mdmarkdown# DOKUMENTASI LENGKAP SISTEM
## Barbershop Cenderawasih Management System - Nabire, Papua Tengah
**Versi:** 4.0 - Pusat Pengaturan & Manajemen Hak Akses Dinamis
**Cabang:**
- CW-01: Jl. Dr. Sam Ratulangi, Oyehe, Nabire (10.00 - 21.30 WIT)
- CW-02: Jl. Yos Sudarso, Oyehe, Nabire (10.00 - 22.00 WIT)
**Stack:** PWA React 18 + Next.js + TypeScript + Tailwind + Express.js + SQLite + Python 3.10 (Face + GPS)

---

## 1. ARSITEKTUR SISTEM
PWA (React + TypeScript) -> REST API + WebSocket -> Express.js (Port 3000)
                                                          |
                                   +------------------------+------------------------+
                                   |                        |                        |
                              SQLite DB              Python Engine           Hardware
                           (better-sqlite3)        (Face + Haversine)      (Bluetooth Printer + Laci)javascript
**Prinsip Baru v4.0:**
- Tidak ada lagi hak akses yang di-hardcode di kode. Semua hak akses diatur Owner dari menu Pengaturan.
- Setiap tombol, menu, dan halaman dicek ke tabel `permissions` di database, bukan ke `if role == owner` di kode.
- Owner bisa buat Role Baru (misal: Supervisor, Admin Cabang, Magang) tanpa coding.

---

## 2. KONSEP HAK AKSES BARU - DINAMIS

Dulu: Role sudah paten (Owner, Kasir, Karyawan).
Sekarang: Owner bisa buat role sendiri dan atur ijinnya pakai tombol ON / OFF.

### 2.1 Tiga Lapisan Ijin

1. **Menu:** Boleh lihat menu ini atau tidak? (Misal: Menu Gaji)
2. **Aksi:** Di dalam menu itu, boleh apa? Lihat / Tambah / Edit / Hapus / Export / Void
3. **Data:** Data siapa yang boleh dilihat? Data sendiri / Data cabang sendiri / Semua cabang

Contoh:
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
);3. MENU PER ROLE - VERSI 4.03.1 PUBLIC - Tanpa LoginBerandaBarber KamiLayanan & HargaPromo & BeritaLokasi & CabangTentang Kami
Floating: Keranjang Online, Ganti Tema
Header Kanan: Cek Status Booking, Masuk Staf
Pengaturan: TIDAK ADA. Public tidak punya pengaturan.3.2 KASIR - Login PIN KasirPOS KasirRiwayat TransaksiDashboard HarianPresensi SayaPrinter & LaciPengaturan Saya (BARU)Ganti PIN SendiriGanti Foto Profil SendiriAtur Printer Sendiri (Bluetooth, Auto Cetak, Auto Buka Laci)Atur Tema (Terang / Gelap)Atur Bahasa (Indonesia)Lihat Versi Aplikasi (Read-only)Tentang AplikasiKasir TIDAK BOLEH: Lihat gaji orang lain, ubah harga, tambah karyawan, ubah hak akses, ubah tampilan public, lihat pengaturan toko.3.3 KARYAWAN / BARBER - Login PIN BarberPresensiDashboard SayaHistori PangkasGaji SayaJadwal SayaPengaturan Saya (BARU)Ganti PIN SendiriGanti Foto Profil / Foto Wajah Sendiri (Harus persetujuan Owner)Atur Notifikasi (Pengingat Jadwal, Gaji Masuk)Atur Tema (Terang / Gelap)Lihat Versi Aplikasi (Read-only)Bantuan & Cara AbsenKaryawan TIDAK BOLEH: Lihat omzet toko, lihat gaji teman, buat transaksi, ubah harga, ubah jadwal orang lain.3.4 OWNER - Login PIN 1111Dashboard KeuanganTransaksiPresensi Semua CabangKaryawanGaji & KomisiLayanan & HargaCabang & JadwalKonten PublicLaporan & BackupPENGATURAN (PUSAT KONTROL - BARU, PALING LENGKAP)4. MENU PENGATURAN OWNER - PUSAT KONTROL LENGKAPIni menu baru yang kamu minta. Hanya Owner yang bisa buka. Semua diatur dari sini.4.1 Sub-Menu 1: Pengaturan Tampilan (Appearance)Owner atur tampilan aplikasi tanpa coding.Nama Brand: Barbershop CenderawasihLogo: Upload logo baruWarna Utama: Pilih warna (Oranye, Hitam, dll) -> Langsung berubah di semua halamanWarna Sidebar: Gelap / TerangTema Default Public: Terang / GelapBanner Hero Public: Ganti foto / videoTeks Berjalan / Promo: Edit teks promoFooter: Alamat, No HP, Instagram, TikTokTombol: [Simpan Tampilan] [Pratinjau Public] [Reset ke Default]4.2 Sub-Menu 2: Manajemen Role & Hak Akses (PALING PENTING)Owner bisa tambah role, edit role, hapus role, dan atur ijin pakai tombol.Bagian A: Daftar RoleTabel: Nama Role | Jumlah User | Status Aktif | AksiTombol: [+ Tambah Role Baru]Contoh Role Bawaan: Owner (Tidak bisa dihapus), Kasir, KaryawanContoh Role Baru yang bisa dibuat Owner: Supervisor, Admin Cabang, Magang, Kasir SeniorBagian B: Form Tambah Role BaruNama Role: [Input, contoh: Supervisor]Deskripsi: [Input, contoh: Bisa lihat laporan cabang sendiri tapi tidak bisa ubah gaji]Duplikat Dari Role: [Pilih: Kasir / Karyawan / Kosong] -> Supaya tidak setting dari nolTombol: [Simpan Role] [Batal]Bagian C: Atur Hak Akses Per Role (Matriks Ijin + Tombol ON/OFF)
Owner pilih Role -> Muncul tabel tombol.Contoh jika Owner pilih Role = Kasir:Fitur / MenuLihatTambahEditHapusExportVoidData ScopePOS Kasir[ON][ON][ON][OFF][OFF][OFF]Cabang SendiriRiwayat Transaksi[ON][OFF][OFF][OFF][OFF][ON]Cabang SendiriDashboard Harian[ON][OFF][OFF][OFF][OFF][OFF]Cabang SendiriGaji & Komisi[OFF][OFF][OFF][OFF][OFF][OFF]-Karyawan[OFF][OFF][OFF][OFF][OFF][OFF]-Laporan & Backup[OFF][OFF][OFF][OFF][OFF][OFF]-Pengaturan Toko[OFF][OFF][OFF][OFF][OFF][OFF]-Pengaturan Saya[ON][OFF][ON][OFF][OFF][OFF]Milik SendiriSetiap tombol langsung tersimpan (Auto Save)Tombol: [Simpan Hak Akses] [Salin Dari Role Lain] [Reset ke Default]Bagian D: Atur Ijin Khusus Per User (Override)
Kalau ada 1 orang kasir yang dipercaya, Owner bisa kasih ijin lebih tanpa ubah semua kasir.Pilih User: [Udin]Tambah Ijin Khusus: [Boleh Void Semua Transaksi] [ON]Berlaku Sampai: [Tanggal]Tombol: [Simpan Override] [Hapus Override]4.3 Sub-Menu 3: Pengaturan Aplikasi & VersiNama Aplikasi: Cenderawasih POSVersi Aplikasi: v4.0.1 (Owner bisa edit, contoh naikkan ke v4.1.0 setelah update)Mode Aplikasi: [Online] / [Offline / PWA]Bahasa Default: IndonesiaZona Waktu: WIT (Asia/Jayapura)Mata Uang: IDR (Rp)Format Struk: 58mm / 80mmNomor Struk Otomatis: CW-01-XXXXTombol: [Simpan] [Cek Update] [Lihat Log Perubahan Versi]4.4 Sub-Menu 4: Pengaturan Presensi & KeamananMetode Presensi: [Wajah] [GPS] [Jam Kerja] - Bisa ON/OFF per metodeRadius Geofence: [150] meter (bisa diubah per cabang)Toleransi Telat: [15] menitMinimal % Kecocokan Wajah: [80] % (Python Cosine Similarity)Wajib Foto Wajah Saat Absen: [ON]Ganti PIN Owner: [Input PIN Baru]Sesi Login Otomatis Logout: [30] menit tidak aktifTombol: [Simpan Keamanan]4.5 Sub-Menu 5: Pengaturan Cabang & Jadwal (Pindah ke Pengaturan)Daftar Cabang: CW-01, CW-02Per Cabang: Nama, Alamat, Telepon, Koordinat GPS, Radius, Jam Buka, Jam Tutup, Jeda Jumat 11.45-13.00Tombol: [Tambah Cabang] [Edit] [Nonaktifkan]4.6 Sub-Menu 6: Pengaturan Gaji & Komisi (Pindah ke Pengaturan)Gaji Pokok Default: Rp 2.000.000Skema Komisi 2026: Premium 30%, Reguler 25%, School 20%, Coloring 25-40%Bonus Target: 100 = 200rb, 150 = 500rb, 200 = 1jt, 300 = 2,5jtTanggal Gajian: [Tanggal 1 Setiap Bulan]Tombol: [Simpan Skema] [Simulasi Gaji]4.7 Sub-Menu 7: Pengaturan Lain-lainBackup Otomatis: [ON] Setiap Jam 23.00 ke data/backups/Notifikasi WA: [ON/OFF] - Notifikasi gaji masuk, absen telatLog Aktivitas: Siapa ubah apa, jam berapa (Audit Trail)Hapus Data: Hanya Owner, harus masukkan PIN lagi5. PENGATURAN PER ROLE - RINGKASAN PERBEDAANPengaturanKasirKaryawanOwnerGanti PIN SendiriYaYaYaGanti Foto Profil SendiriYaYa, butuh persetujuan OwnerYaAtur Tema SendiriYaYaYaAtur Printer SendiriYaTidakYaAtur Tampilan PublicTidakTidakYaAtur Warna & LogoTidakTidakYaBuat / Hapus RoleTidakTidakYaAtur Hak Akses RoleTidakTidakYaAtur Versi AplikasiTidak, hanya lihatTidak, hanya lihatYa, bisa editAtur Geofence & PresensiTidakTidakYaAtur Skema GajiTidakTidakYaAtur BackupTidakTidakYaLihat Log AktivitasTidakTidakYa6. SISTEM GAJI 2026 (Tetap)Gaji Pokok: Rp 2.000.000Komisi: Premium 30% (45rb), Reguler 25% (21.250), School 20% (14.000), Coloring 25-40%Bonus: 100 = 200rb, 150 = 500rb, 200 = 1jt, 300 = 2,5jtRumus: Net = Pokok + Komisi + Bonus - Potongan7. KODE FRONTEND - SIDEBAR DINAMIS (Sesuai Hak Akses dari Database)Dulu sidebar hardcode. Sekarang sidebar ambil dari API permissions.Simpan di: components/SidebarDynamic.tsxjavascript
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
        <Link key={m.href} href={m.href} className={`px-3 py-2.5 rounded-lg flex gap-2 text-sm ${router.pathname === m.href ? "bg-orange-500 font-semibold" : "text-zinc-300 hover:bg-zinc-800"}`}>
          <span>{m.icon}</span><span>{m.label}</span>
        </Link>
      ))}
      <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="mt-auto bg-red-600 py-2.5 rounded-lg text-sm font-semibold">Keluar</button>
    </aside>
  );
}8. KODE FRONTEND - HALAMAN PENGATURAN OWNER (Tombol ON/OFF Hak Akses)Simpan di: pages/owner/pengaturan/hak-akses.tsxjavascript
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
      <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-bold ${on ? "bg-green-500 text-white" : "bg-zinc-300 text-zinc-600"}`}>
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
        <thead><tr className="bg-zinc-100"><th className="p-2 text-left">Fitur</th><th>Lihat</th><th>Tambah</th><th>Edit</th><th>Hapus</th><th>Export</th><th>Void</th></tr></thead>
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

      <button className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold">Simpan Hak Akses {role}</button>
    </div>
  );
}9. KODE BACKEND - CEK HAK AKSES DINAMIS (Express.js)Dulu cek if role == owner. Sekarang cek ke database.Simpan di: server/middleware/cekIjin.jsjavascript
```js
// server/middleware/cekIjin.js
const db = require("../db");

function cekIjin(feature, aksi) {
  // feature: "gaji", "karyawan", "laporan"
  // aksi: "can_view", "can_create", "can_edit", "can_delete", "can_export", "can_void"
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Belum login" });

    // Owner selalu lolos
    if (user.role === "owner") return next();

    const row = db.prepare(`
      SELECT rp.* FROM role_permissions rp
      JOIN features f ON f.id = rp.feature_id
      JOIN roles r ON r.id = rp.role_id
      WHERE r.name = ? AND f.menu_name = ? AND rp.${aksi} = 1
    `).get(user.role, feature);

    if (!row) {
      return res.status(403).json({ error: `Role ${user.role} tidak punya ijin ${aksi} untuk ${feature}. Hubungi Owner.` });
    }

    // Cek data scope: karyawan hanya boleh lihat data sendiri
    if (row.data_scope === "self" && req.params.id && req.params.id !== user.id) {
      return res.status(403).json({ error: "Kamu hanya boleh akses data milikmu sendiri" });
    }

    next();
  };
}

module.exports = cekIjin;Cara Pakai:jsconst cekIjin = require("./middleware/cekIjin");

app.get("/api/gaji/:id", cekIjin("Gaji & Komisi", "can_view"), lihatGaji);
app.post("/api/gaji", cekIjin("Gaji & Komisi", "can_create"), buatGaji);
app.put("/api/karyawan/:id", cekIjin("Karyawan", "can_edit"), editKaryawan);
app.get("/api/laporan", cekIjin("Laporan & Backup", "can_export"), exportLaporan);
app.post("/api/transaksi/void/:id", cekIjin("Riwayat Transaksi", "can_void"), voidTransaksi);10. STRUKTUR FOLDER FINAL v4.0javascript/public - Beranda, Layanan, Promo, Lokasi, Tentang
/kasir - pos, riwayat, dashboard-harian, printer, presensi-saya, pengaturan-saya
/karyawan - presensi, dashboard-saya, histori, gaji-saya, jadwal-saya, pengaturan-saya
/owner - dashboard, transaksi, presensi, karyawan, gaji, layanan, cabang, konten, laporan
/owner/pengaturan - tampilan, hak-akses, aplikasi-versi, presensi-keamanan, cabang-jadwal, gaji-komisi, lain-lain
/components - SidebarDynamic.tsx
/server - middleware/cekIjin.js, routes, db
/python - face_match.py, geo_haversine.py11. CHECKLIST MIGRASI KE v4.0Buat tabel baru: roles, features, role_permissions, app_settingsPindahkan data role lama (Owner, Kasir, Karyawan) ke tabel rolesBuat halaman /owner/pengaturan dengan 7 sub-menu di atasGanti Sidebar lama dengan SidebarDynamic.tsxGanti cekRole lama dengan cekIjin.js di semua APITambahkan menu Pengaturan Saya di Kasir dan KaryawanUji: Buat role baru "Supervisor", kasih ijin lihat laporan cabang sendiri saja, login sebagai Supervisor, pastikan tidak bisa buka menu gaji orang lainjavascript
---

Itu sudah full v4.0. Bedanya dengan v3:

- **Owner** sekarang punya 7 sub-menu Pengaturan lengkap, bisa atur tampilan, buat role baru, ON/OFF hak akses pakai tombol, atur versi aplikasi
- **Kasir & Karyawan** juga punya Pengaturan Saya, tapi isinya cuma untuk diri sendiri
- **Hak akses tidak lagi di-hardcode**, semua dari database, jadi Owner bisa ubah kapan saja tanpa panggil kamu lagi

Mau saya buatkan juga contoh data awal `roles` dan `permissions` dalam bentuk file `seed.sql` biar tinggal kamu import ke SQLite-mu?