# Barbershop Cenderawasih - Arsitektur Rapih v3.0
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
- Export / Backup: Owner saja
