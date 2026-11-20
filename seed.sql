-- =========================================================================
-- BARBERSHOP CENDERAWASIH NABIRE - SEED DATA HAK AKSES & PUSAT PENGATURAN v4.0
-- Database: SQLite (better-sqlite3)
-- =========================================================================

-- 1. Tabel Master Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system INTEGER DEFAULT 0, -- 1 = Bawaan sistem (tidak boleh dihapus), 0 = Kustom Owner
  is_active INTEGER DEFAULT 1
);

-- 2. Tabel Master Fitur / Menu Sistem
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  menu_group TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  route TEXT NOT NULL UNIQUE
);

-- 3. Tabel Hak Akses (Permissions Matriks ON/OFF)
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  can_view INTEGER DEFAULT 0,
  can_create INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_export INTEGER DEFAULT 0,
  can_void INTEGER DEFAULT 0,
  data_scope TEXT DEFAULT 'self', -- 'self' (diri sendiri), 'branch' (cabang sendiri), 'all' (semua cabang)
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY(feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- 4. Tabel Pengaturan Aplikasi Global
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT
);

-- =========================================================================
-- INSERT INITIAL SEED DATA
-- =========================================================================

-- Seed Roles
INSERT OR REPLACE INTO roles (id, name, description, is_system, is_active) VALUES
('role-owner', 'owner', 'Pemilik Barbershop - Akses Penuh ke Semua Cabang & Pengaturan', 1, 1),
('role-kasir', 'kasir', 'Kasir Operasional Cabang - POS, Laci, Struk & Transaksi Cabang', 1, 1),
('role-karyawan', 'karyawan', 'Barber / Kapster - Presensi Wajah, Performa & Gaji Sendiri', 1, 1),
('role-supervisor', 'supervisor', 'Supervisor Operasional - Pantau Transaksi & Laporan Cabang Sendiri', 0, 1),
('role-magang', 'magang', 'Barber Magang - Presensi & Histori Pangkas Terbatas', 0, 1);

-- Seed Features
INSERT OR REPLACE INTO features (id, menu_group, menu_name, route) VALUES
('feat-pos', 'POS', 'POS Kasir', '/kasir/pos'),
('feat-riwayat', 'POS', 'Riwayat Transaksi', '/kasir/riwayat'),
('feat-dash-harian', 'POS', 'Dashboard Harian', '/kasir/dashboard-harian'),
('feat-presensi-saya', 'Presensi', 'Presensi Saya', '/kasir/presensi-saya'),
('feat-printer', 'Hardware', 'Printer & Laci', '/kasir/printer'),
('feat-karyawan-presensi', 'Karyawan', 'Presensi Barber', '/karyawan/presensi'),
('feat-karyawan-dashboard', 'Karyawan', 'Dashboard Saya', '/karyawan/dashboard-saya'),
('feat-karyawan-histori', 'Karyawan', 'Histori Pangkas', '/karyawan/histori'),
('feat-karyawan-gaji', 'Karyawan', 'Gaji Saya', '/karyawan/gaji-saya'),
('feat-karyawan-jadwal', 'Karyawan', 'Jadwal Saya', '/karyawan/jadwal-saya'),
('feat-owner-dashboard', 'Owner', 'Dashboard Keuangan', '/owner/dashboard'),
('feat-owner-transaksi', 'Owner', 'Semua Transaksi', '/owner/transaksi'),
('feat-owner-presensi', 'Owner', 'Presensi Semua Cabang', '/owner/presensi'),
('feat-owner-karyawan', 'Owner', 'Kelola Karyawan', '/owner/karyawan'),
('feat-owner-gaji', 'Owner', 'Gaji & Komisi 2026', '/owner/gaji'),
('feat-owner-layanan', 'Owner', 'Layanan & Harga', '/owner/layanan'),
('feat-owner-cabang', 'Owner', 'Cabang & Jadwal', '/owner/cabang'),
('feat-owner-konten', 'Owner', 'Konten Public', '/owner/konten'),
('feat-owner-laporan', 'Owner', 'Laporan & Backup', '/owner/laporan'),
('feat-owner-pengaturan', 'Owner', 'Pusat Pengaturan', '/owner/pengaturan'),
('feat-pengaturan-saya', 'Pengaturan', 'Pengaturan Saya', '/pengaturan-saya');

-- Seed Role Permissions: KASIR
-- Kasir: POS, Riwayat (Void Hari Ini), Dashboard Harian, Presensi Diri, Printer & Laci, Pengaturan Saya
INSERT OR REPLACE INTO role_permissions (id, role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export, can_void, data_scope) VALUES
('perm-kasir-pos', 'role-kasir', 'feat-pos', 1, 1, 1, 0, 0, 0, 'branch'),
('perm-kasir-riwayat', 'role-kasir', 'feat-riwayat', 1, 0, 0, 0, 0, 1, 'branch'),
('perm-kasir-dash-harian', 'role-kasir', 'feat-dash-harian', 1, 0, 0, 0, 0, 0, 'branch'),
('perm-kasir-presensi-saya', 'role-kasir', 'feat-presensi-saya', 1, 1, 0, 0, 0, 0, 'self'),
('perm-kasir-printer', 'role-kasir', 'feat-printer', 1, 1, 1, 0, 0, 0, 'branch'),
('perm-kasir-pengaturan-saya', 'role-kasir', 'feat-pengaturan-saya', 1, 0, 1, 0, 0, 0, 'self'),
('perm-kasir-gaji', 'role-kasir', 'feat-owner-gaji', 0, 0, 0, 0, 0, 0, 'self'),
('perm-kasir-karyawan', 'role-kasir', 'feat-owner-karyawan', 0, 0, 0, 0, 0, 0, 'self'),
('perm-kasir-laporan', 'role-kasir', 'feat-owner-laporan', 0, 0, 0, 0, 0, 0, 'self');

-- Seed Role Permissions: KARYAWAN (BARBER)
-- Karyawan: Presensi, Dashboard KPI Pribadi, Histori Pangkas Sendiri, Gaji Milik Sendiri, Jadwal, Pengaturan Saya
INSERT OR REPLACE INTO role_permissions (id, role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export, can_void, data_scope) VALUES
('perm-karyawan-presensi', 'role-karyawan', 'feat-karyawan-presensi', 1, 1, 0, 0, 0, 0, 'self'),
('perm-karyawan-dashboard', 'role-karyawan', 'feat-karyawan-dashboard', 1, 0, 0, 0, 0, 0, 'self'),
('perm-karyawan-histori', 'role-karyawan', 'feat-karyawan-histori', 1, 0, 0, 0, 0, 0, 'self'),
('perm-karyawan-gaji', 'role-karyawan', 'feat-karyawan-gaji', 1, 0, 0, 0, 0, 0, 'self'),
('perm-karyawan-jadwal', 'role-karyawan', 'feat-karyawan-jadwal', 1, 0, 0, 0, 0, 0, 'branch'),
('perm-karyawan-pengaturan-saya', 'role-karyawan', 'feat-pengaturan-saya', 1, 0, 1, 0, 0, 0, 'self');

-- Seed Role Permissions: SUPERVISOR (Role Kustom)
-- Supervisor: Lihat transaksi cabang, lihat laporan cabang, tidak boleh ubah gaji
INSERT OR REPLACE INTO role_permissions (id, role_id, feature_id, can_view, can_create, can_edit, can_delete, can_export, can_void, data_scope) VALUES
('perm-spv-pos', 'role-supervisor', 'feat-pos', 1, 1, 1, 0, 0, 0, 'branch'),
('perm-spv-riwayat', 'role-supervisor', 'feat-riwayat', 1, 0, 0, 0, 1, 1, 'branch'),
('perm-spv-dash-harian', 'role-supervisor', 'feat-dash-harian', 1, 0, 0, 0, 1, 0, 'branch'),
('perm-spv-presensi', 'role-supervisor', 'feat-presensi-saya', 1, 1, 0, 0, 0, 0, 'self'),
('perm-spv-laporan', 'role-supervisor', 'feat-owner-laporan', 1, 0, 0, 0, 1, 0, 'branch'),
('perm-spv-pengaturan-saya', 'role-supervisor', 'feat-pengaturan-saya', 1, 0, 1, 0, 0, 0, 'self');

-- Seed App Settings
INSERT OR REPLACE INTO app_settings (key, value, updated_by, updated_at) VALUES
('app_name', 'Cenderawasih POS', 'Owner', datetime('now')),
('app_version', '4.0.1', 'Owner', datetime('now')),
('timezone', 'Asia/Jayapura (WIT)', 'Owner', datetime('now')),
('currency', 'IDR', 'Owner', datetime('now')),
('receipt_format', '58mm', 'Owner', datetime('now')),
('geofence_default_radius', '150', 'Owner', datetime('now')),
('tolerance_late_minutes', '15', 'Owner', datetime('now')),
('face_match_min_percent', '80', 'Owner', datetime('now')),
('brand_primary_color', '#DCA842', 'Owner', datetime('now')),
('theme_default_public', 'dark', 'Owner', datetime('now')),
('auto_backup_enabled', '1', 'Owner', datetime('now'));
