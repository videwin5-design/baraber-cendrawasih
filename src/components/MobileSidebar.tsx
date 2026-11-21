import {
  Award,
  Calendar,
  Camera,
  ChevronRight,
  FileSpreadsheet,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Moon,
  Printer,
  Receipt,
  Scissors,
  Settings,
  Sun,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import React from 'react';
import type {Branch, Employee} from '../types.ts';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee | null;
  branches: Branch[];
  activeView: string;
  onSelectView: (view: string) => void;
  onLogout: () => void;
  onLoginClick: () => void;
  theme: string;
  onToggleTheme: () => void;
  appName?: string;
  appVersion?: string;
}

interface MenuGroup {
  label: string;
  items: {id: string; label: string; icon: React.ComponentType<{className?: string}>}[];
}

const getMenuGroups = (role: string): MenuGroup[] => {
  if (role === 'owner') {
    return [
      {
        label: 'Laporan & Keuangan',
        items: [
          {id: 'owner_dashboard', label: 'Dashboard Keuangan', icon: TrendingUp},
          {id: 'owner_transaksi', label: 'Semua Transaksi', icon: Receipt},
          {id: 'owner_laporan', label: 'Laporan & Export', icon: FileSpreadsheet},
        ],
      },
      {
        label: 'Manajemen SDM',
        items: [
          {id: 'owner_presensi', label: 'Presensi Cabang', icon: Camera},
          {id: 'owner_karyawan', label: 'Karyawan & Mutasi', icon: Users},
          {id: 'owner_gaji', label: 'Gaji & Komisi', icon: Award},
        ],
      },
      {
        label: 'Operasional',
        items: [
          {id: 'owner_layanan', label: 'Layanan & Harga', icon: Scissors},
          {id: 'owner_cabang', label: 'Cabang & Jadwal', icon: MapPin},
          {id: 'owner_konten', label: 'Konten & Promo', icon: Globe},
        ],
      },
      {
        label: 'Lainnya',
        items: [
          {id: 'pelanggan', label: 'Pratinjau Halaman Public', icon: Globe},
          {id: 'owner_pengaturan', label: 'Pengaturan Owner', icon: Settings},
        ],
      },
    ];
  }

  if (role === 'kasir') {
    return [
      {
        label: 'Utama',
        items: [
          {id: 'kasir_pos', label: 'POS Kasir', icon: Scissors},
          {id: 'kasir_dashboard', label: 'Dashboard Harian', icon: LayoutDashboard},
        ],
      },
      {
        label: 'Data & Laporan',
        items: [
          {id: 'kasir_riwayat', label: 'Riwayat Transaksi', icon: History},
          {id: 'kasir_presensi', label: 'Presensi Saya', icon: Camera},
        ],
      },
      {
        label: 'Pengaturan',
        items: [
          {id: 'kasir_printer', label: 'Printer & Laci Kasir', icon: Printer},
          {id: 'kasir_pengaturan', label: 'Pengaturan Kasir', icon: Settings},
        ],
      },
    ];
  }

  // Karyawan / Barber
  return [
    {
      label: 'Aktivitas Harian',
      items: [
        {id: 'karyawan_presensi', label: 'Presensi Wajah & GPS', icon: Camera},
        {id: 'karyawan_dashboard', label: 'Dashboard & KPI', icon: TrendingUp},
      ],
    },
    {
      label: 'Riwayat & Jadwal',
      items: [
        {id: 'karyawan_histori', label: 'Histori Pangkas', icon: Scissors},
        {id: 'karyawan_gaji', label: 'Gaji & Komisi', icon: Award},
        {id: 'karyawan_jadwal', label: 'Jadwal Shift', icon: Calendar},
      ],
    },
    {
      label: 'Pengaturan',
      items: [{id: 'karyawan_pengaturan', label: 'Pengaturan Akun', icon: Settings}],
    },
  ];
};

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  currentUser,
  branches,
  activeView,
  onSelectView,
  onLogout,
  onLoginClick,
  theme,
  onToggleTheme,
  appName = 'Cendrawasih Barbershop',
  appVersion = 'v4.0.1',
}) => {
  const userBranch = branches.find((b) => b.id === currentUser?.branch_id);

  const handleNav = (view: string) => {
    onSelectView(view);
    onClose();
  };

  const menuGroups = currentUser ? getMenuGroups(currentUser.role) : [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#09090B] border-r border-zinc-800 flex flex-col lg:hidden transition-transform duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          <img
            src="/assets/brand-logo.png"
            alt="Barbershop Cenderawasih"
            className="h-9 w-auto object-contain"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        {currentUser ? (
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {currentUser.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.name}
                    className="h-11 w-11 rounded-xl object-cover border border-[#DCA842]/40"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#09090B]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      currentUser.role === 'owner'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : currentUser.role === 'kasir'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  {userBranch && (
                    <span className="text-[10px] text-zinc-500 font-mono">{userBranch.code}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-zinc-800">
            <button
              type="button"
              onClick={() => { onLoginClick(); onClose(); }}
              className="w-full rounded-xl bg-[#DCA842] text-zinc-950 py-2.5 text-sm font-bold hover:bg-[#C5922E] transition-colors cursor-pointer"
            >
              Masuk Staf
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-[#DCA842] text-zinc-950'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-white'}`} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-950/60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 space-y-2 shrink-0 bg-zinc-950/60">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-[#DCA842]" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>

          {/* Logout */}
          {currentUser && (
            <button
              type="button"
              onClick={() => { onLogout(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Keluar ({currentUser.name.split(' ')[0]})</span>
            </button>
          )}

          <p className="text-center text-[10px] text-zinc-600 font-mono pt-1">{appName} · {appVersion}</p>
        </div>
      </aside>
    </>
  );
};

