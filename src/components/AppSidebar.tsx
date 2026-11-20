import {
  Award,
  Calendar,
  Camera,
  FileSpreadsheet,
  Globe,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Printer,
  Receipt,
  Scissors,
  Settings,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import React from 'react';
import type {Branch, Employee} from '../types.ts';

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{className?: string}>;
  badge?: string | number;
  highlight?: boolean;
}

export interface AppSidebarProps {
  currentUser: Employee;
  branches: Branch[];
  activeView: string;
  onSelectView: (view: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onLogout: () => void;
  appName?: string;
  appVersion?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  branches,
  activeView,
  onSelectView,
  isOpen,
  onToggleOpen,
  onLogout,
  appName = 'Cenderawasih Barbershop',
  appVersion = 'v4.0.1',
}) => {
  const userBranch = branches.find((b) => b.id === currentUser.branch_id);

  // Daftar menu yang teratur dan terisolasi per role
  const getMenuItems = (): SidebarMenuItem[] => {
    if (currentUser.role === 'owner') {
      return [
        {id: 'owner_dashboard', label: 'Dashboard Keuangan', icon: TrendingUp},
        {id: 'owner_transaksi', label: 'Transaksi Semua Cabang', icon: Receipt},
        {id: 'owner_presensi', label: 'Presensi Semua Cabang', icon: Camera},
        {id: 'owner_karyawan', label: 'Karyawan & Mutasi Cabang', icon: Users},
        {id: 'owner_gaji', label: 'Gaji & Komisi 2026', icon: Award},
        {id: 'owner_layanan', label: 'Layanan & Harga', icon: Scissors},
        {id: 'owner_cabang', label: 'Cabang & Jadwal', icon: MapPin},
        {id: 'owner_konten', label: 'Konten Public & Promo', icon: ImageIcon},
        {id: 'owner_laporan', label: 'Laporan & Backup Data', icon: FileSpreadsheet},
        {id: 'owner_pengaturan', label: 'Pusat Pengaturan Owner', icon: Settings, highlight: true},
        // HANYA Owner yang memiliki akses pratinjau halaman public setelah login
        {id: 'pelanggan', label: 'Pratinjau Halaman Public', icon: Globe},
      ];
    }

    if (currentUser.role === 'kasir') {
      return [
        {id: 'kasir_pos', label: 'POS Kasir (Grid Tablet)', icon: Scissors},
        {id: 'kasir_riwayat', label: 'Riwayat Transaksi', icon: History},
        {id: 'kasir_dashboard', label: 'Dashboard Harian Kasir', icon: LayoutDashboard},
        {id: 'kasir_presensi', label: 'Presensi Saya (Face + GPS)', icon: Camera},
        {id: 'kasir_printer', label: 'Printer & Laci Kasir', icon: Printer},
        {id: 'kasir_pengaturan', label: 'Pengaturan Kasir', icon: Settings, highlight: true},
      ];
    }

    // Role Karyawan / Barber
    return [
      {id: 'karyawan_presensi', label: 'Presensi Wajah & GPS', icon: Camera},
      {id: 'karyawan_dashboard', label: 'Dashboard & KPI Saya', icon: TrendingUp},
      {id: 'karyawan_histori', label: 'Histori Pangkas Saya', icon: Scissors},
      {id: 'karyawan_gaji', label: 'Gaji & Komisi Saya', icon: Award},
      {id: 'karyawan_jadwal', label: 'Jadwal Shift Cabang', icon: Calendar},
      {id: 'karyawan_pengaturan', label: 'Pengaturan Karyawan', icon: Settings, highlight: true},
    ];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#09090B] border-r border-[#27272A] text-zinc-100 transition-all duration-300 shadow-2xl ${
          isOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Header Sidebar */}
        <div className={`flex h-16 items-center border-b border-[#27272A] shrink-0 ${isOpen ? 'justify-between px-4' : 'justify-center px-2'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {isOpen ? (
              <img
                src="/assets/brand-logo.png"
                alt="Barbershop Cenderawasih"
                className="h-8 max-w-[190px] w-auto object-contain shrink-0"
              />
            ) : (
              <img
                src="/assets/brand-icon.png"
                alt="Logo"
                className="h-8 w-8 object-contain shrink-0"
              />
            )}
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-b border-[#27272A] bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.name}
                  className="h-10 w-10 rounded-xl object-cover border border-[#DCA842]/40"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300">
                  <User className="h-5 w-5" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#09090B]" />
            </div>

            {isOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
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
                    <span className="text-[10px] text-zinc-400 font-mono truncate">
                      {userBranch.code}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  if (window.innerWidth < 1024) {
                    onToggleOpen();
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#DCA842] text-zinc-950 font-bold shadow-md shadow-[#DCA842]/20'
                    : item.highlight
                    ? 'text-[#DCA842] hover:bg-[#DCA842]/10 border border-[#DCA842]/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                } ${!isOpen ? 'justify-center px-0' : ''}`}
                title={!isOpen ? item.label : undefined}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-zinc-950' : item.highlight ? 'text-[#DCA842]' : 'text-zinc-400 group-hover:text-white'
                  }`}
                />
                {isOpen && <span className="truncate">{item.label}</span>}
                {isOpen && item.badge !== undefined && (
                  <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar: Logout Button */}
        <div className="p-3 border-t border-[#27272A] shrink-0 bg-zinc-950/60">
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-red-500/20 transition-all ${
              !isOpen ? 'justify-center px-0' : ''
            }`}
            title="Keluar / Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isOpen && <span>Keluar ({currentUser.name.split(' ')[0]})</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
