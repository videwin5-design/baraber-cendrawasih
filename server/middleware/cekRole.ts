import type {NextFunction, Request, Response} from 'express';

export type Role = 'owner' | 'kasir' | 'karyawan' | 'public';

/**
 * Middleware untuk validasi hak akses RBAC (Role-Based Access Control)
 * Berdasarkan spesifikasi dokumen ARSITEKTUR-RAPIH & DOKUMENTASI-LENGKAP.
 */
export function cekRole(...rolesBoleh: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ambil identitas role dari header atau body
    const userRole = (req.headers['x-user-role'] as Role) || (req.body?.user_role as Role);
    const userId = (req.headers['x-user-id'] as string) || (req.body?.user_id as string);

    // Jika userRole ditentukan (misal kasir, karyawan, public)
    if (userRole) {
      // Owner selalu memiliki izin penuh
      if (userRole === 'owner') {
        return next();
      }

      // Periksa apakah role diizinkan
      if (!rolesBoleh.includes(userRole)) {
        return res.status(403).json({
          error: `Akses ditolak. Role '${userRole}' tidak diizinkan mengakses resource ini. Hubungi Owner.`,
        });
      }

      // Aturan khusus: Karyawan hanya boleh melihat data/gaji milik sendiri
      if (userRole === 'karyawan') {
        const targetId = req.params.id || req.params.employee_id || (req.query.employee_id as string);
        if (req.path.includes('salaries') || req.path.includes('gaji')) {
          if (targetId && userId && targetId !== userId) {
            return res.status(403).json({
              error: 'Karyawan hanya diperbolehkan mengakses data gaji milik sendiri.',
            });
          }
        }
      }
    }

    next();
  };
}
