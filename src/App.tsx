import {
  Calendar,
  Clock,
  Globe,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Scissors,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppSidebar} from './components/AppSidebar.tsx';
import {ActionConfirmModal, ActionFeedbackModal} from './components/AppActionModal.tsx';
import {AttendancePortal} from './components/AttendancePortal.tsx';
import {CashierPortal} from './components/CashierPortal.tsx';
import {CustomerBookingPortal} from './components/CustomerBookingPortal.tsx';
import {EmployeePortal} from './components/EmployeePortal.tsx';
import {LoginModal} from './components/LoginModal.tsx';
import {NotificationCenter} from './components/NotificationCenter.tsx';
import {OfflineIndicator} from './components/OfflineIndicator.tsx';
import {OwnerPortal} from './components/OwnerPortal.tsx';
import {OwnerSettingsPortal} from './components/OwnerSettingsPortal.tsx';
import {PWAInstallButton} from './components/PWAInstallButton.tsx';
import {SelfSettingsPortal} from './components/SelfSettingsPortal.tsx';
import {CompactSocialButtons} from './components/SocialIcons.tsx';
import {useTheme} from './hooks/useTheme.ts';
import type {AppStatePayload, Employee, NotificationItem} from './types.ts';
import {formatRupiah, playNotificationChime} from './utils/format.ts';

const EMPTY_STATE: AppStatePayload = {
  branches: [],
  employees: [],
  services: [],
  schedules: [],
  transactions: [],
  bookings: [],
  attendance: [],
  salaries: [],
  notifications: [],
  posts: [],
  siteMedia: {
    hero_video_url: '/assets/cendrawasih_showcase.mp4',
    hero_video_title: 'Presisi Pangkas & Ritual Grooming Cenderawasih',
    hero_video_subtitle:
      'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.',
    hero_video_poster: '/assets/setmore/studio-interior.jpg',
  },
  roles: [],
  features: [],
  rolePermissions: [],
  appSettings: {},
};

export default function App() {
  const {theme, toggleTheme} = useTheme();
  const [appState, setAppState] = useState<AppStatePayload>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    try {
      const saved = localStorage.getItem('cendrawasih_user');
      return saved ? (JSON.parse(saved) as Employee) : null;
    } catch {
      return null;
    }
  });

  // State tampilan / workspace view
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cendrawasih_user');
      if (!saved) return 'pelanggan';
      const u = JSON.parse(saved) as Employee;
      if (u.role === 'owner') return 'owner_dashboard';
      if (u.role === 'kasir') return 'kasir_pos';
      return 'karyawan_presensi';
    } catch {
      return 'pelanggan';
    }
  });

  // Sidebar toggle state (Default open di desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const fetchInitialState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = (await res.json()) as AppStatePayload;
        setAppState(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  // Sinkronkan currentUser saat ada update data (misal ganti foto atau PIN)
  useEffect(() => {
    if (!currentUser || appState.employees.length === 0) return;
    const fresh = appState.employees.find((e) => e.id === currentUser.id);
    if (
      fresh &&
      (fresh.photo_url !== currentUser.photo_url ||
        fresh.name !== currentUser.name ||
        fresh.branch_id !== currentUser.branch_id ||
        fresh.pin !== currentUser.pin)
    ) {
      setCurrentUser(fresh);
      try {
        localStorage.setItem('cendrawasih_user', JSON.stringify(fresh));
      } catch {
        // Ignore storage error
      }
    }
  }, [appState.employees, currentUser]);

  // Otomatis logout jika user membuka aplikasi lain, meminimalkan browser, atau beralih tab
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User membuka aplikasi lain di HP/laptop atau beralih tab
        setCurrentUser(null);
        setActiveView('pelanggan');
        try {
          localStorage.removeItem('cendrawasih_user');
        } catch {
          // Ignore
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // ATURAN RBAC: Hanya Owner yang boleh mengakses halaman 'pelanggan' (public) saat login.
  // Role lain (kasir/karyawan) tidak boleh dan harus logout terlebih dahulu.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'owner' && activeView === 'pelanggan') {
      setActiveView(currentUser.role === 'kasir' ? 'kasir_pos' : 'karyawan_presensi');
    }
  }, [currentUser, activeView]);

  // Real-time WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let isMounted = true;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as {event: string; payload: unknown};
          if (msg.event === 'state:init' || msg.event === 'state:sync') {
            const p = msg.payload as {state: AppStatePayload};
            if (p?.state) {
              setAppState(p.state);
              setLoading(false);
            }
          } else if (msg.event === 'notification:new') {
            const notif = msg.payload as NotificationItem;
            if (
              currentUserRef.current &&
              (currentUserRef.current.role === 'owner' || currentUserRef.current.role === 'kasir')
            ) {
              setLiveToast(notif);
              if (soundEnabledRef.current) {
                playNotificationChime();
              }
              window.setTimeout(() => {
                setLiveToast((curr) => (curr?.id === notif.id ? null : curr));
              }, 6000);
            }
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const handleLoginSuccess = (user: Employee) => {
    setCurrentUser(user);
    localStorage.setItem('cendrawasih_user', JSON.stringify(user));
    setLoginOpen(false);
    if (user.role === 'owner') {
      setActiveView('owner_dashboard');
    } else if (user.role === 'kasir') {
      setActiveView('kasir_pos');
    } else {
      setActiveView('karyawan_presensi');
    }
  };

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutFeedbackOpen, setLogoutFeedbackOpen] = useState(false);

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    setCurrentUser(null);
    localStorage.removeItem('cendrawasih_user');
    setActiveView('pelanggan');
    setMobileMenuOpen(false);
    setLogoutFeedbackOpen(true);
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/read-all', {method: 'POST'});
  };

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {method: 'PATCH'});
  };

  // Label section aktif untuk header staff
  const getSectionTitle = () => {
    if (activeView === 'owner_pengaturan') return 'Pusat Pengaturan Owner';
    if (activeView === 'owner_dashboard') return 'Dashboard Keuangan Owner';
    if (activeView === 'owner_transaksi') return 'Transaksi Semua Cabang';
    if (activeView === 'owner_presensi') return 'Presensi Semua Cabang';
    if (activeView === 'owner_karyawan') return 'Karyawan & Mutasi Cabang';
    if (activeView === 'owner_gaji') return 'Gaji & Komisi 2026';
    if (activeView === 'owner_layanan') return 'Layanan & Harga';
    if (activeView === 'owner_cabang') return 'Cabang & Jadwal';
    if (activeView === 'owner_konten') return 'Konten Public';
    if (activeView === 'owner_laporan') return 'Laporan & Backup';
    if (activeView === 'kasir_pos') return 'POS Kasir (Grid Tablet)';
    if (activeView === 'kasir_riwayat') return 'Riwayat Transaksi';
    if (activeView === 'kasir_dashboard') return 'Dashboard Harian Kasir';
    if (activeView === 'kasir_presensi') return 'Presensi Saya';
    if (activeView === 'kasir_printer') return 'Printer & Laci Kasir';
    if (activeView === 'kasir_pengaturan') return 'Pengaturan Kasir';
    if (activeView === 'karyawan_presensi') return 'Presensi Wajah & GPS';
    if (activeView === 'karyawan_dashboard') return 'Dashboard & KPI Saya';
    if (activeView === 'karyawan_histori') return 'Histori Pangkas';
    if (activeView === 'karyawan_gaji') return 'Gaji & Komisi Saya';
    if (activeView === 'karyawan_jadwal') return 'Jadwal Shift';
    if (activeView === 'karyawan_pengaturan') return 'Pengaturan Karyawan';
    if (activeView === 'pelanggan') return 'Pratinjau Halaman Public';
    return 'Barbershop Cenderawasih';
  };

  const userBranch = appState.branches.find((b) => b.id === currentUser?.branch_id);

  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 transition-colors">
      {/* 1. SIDEBAR NAVIGASI (Aktif saat staf login) */}
      {currentUser && (
        <AppSidebar
          currentUser={currentUser}
          branches={appState.branches}
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen((v) => !v)}
          onLogout={handleLogout}
          appName={appState.appSettings?.app_name || 'Barbershop Cenderawasih'}
          appVersion={appState.appSettings?.app_version || 'v4.0.1'}
        />
      )}

      {/* 2. WRAPPER UTAMA */}
      <div
        className={`min-h-screen flex-1 flex flex-col transition-all duration-300 w-full ${
          currentUser ? (isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20') : ''
        }`}
      >
        {/* Banner Khusus Mode Pratinjau Public untuk Owner */}
        {currentUser?.role === 'owner' && activeView === 'pelanggan' && (
          <div className="sticky top-0 z-50 bg-[#DCA842] text-zinc-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>
                Mode Pratinjau Halaman Public (Owner) — Halaman yang dilihat oleh pelanggan saat ini.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('owner_dashboard')}
              className="rounded-lg bg-zinc-950 text-white px-3 py-1 text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Kembali ke Dashboard Owner
            </button>
          </div>
        )}

        {/* TOP BAR / HEADER */}
        {currentUser ? (
          // Header Khusus Staf Login (dengan Tombol Hamburger & Indikator Role)
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-[#09090B]/95 backdrop-blur-md px-4 sm:px-6 py-2.5 transition-colors">
            <div className="flex items-center justify-between gap-4">
              {/* Sisi Kiri: Tombol Hamburger & Breadcrumb */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  aria-label="Toggle Sidebar Menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-xs"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>{getSectionTitle()}</span>
                  </h2>
                  <p className="text-[11px] text-zinc-400 hidden sm:block">
                    {userBranch ? `${userBranch.code} (${userBranch.name})` : 'Pusat Nabire'} · Akses:{' '}
                    <span className="uppercase font-semibold text-[#DCA842]">{currentUser.role}</span>
                  </p>
                </div>
              </div>

              {/* Sisi Kanan: Theme Toggle, Notifications, User Badge */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-[#DCA842]" />
                  ) : (
                    <Moon className="h-4 w-4 text-zinc-700" />
                  )}
                </button>

                {/* Notifications for Owner & Cashier */}
                {(currentUser.role === 'owner' || currentUser.role === 'kasir') && (
                  <NotificationCenter
                    notifications={appState.notifications}
                    soundEnabled={soundEnabled}
                    onToggleSound={() => setSoundEnabled((v) => !v)}
                    onMarkAllRead={handleMarkAllRead}
                    onMarkRead={handleMarkRead}
                  />
                )}

                {/* User Info Avatar Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.role === 'owner') setActiveView('owner_pengaturan');
                    else if (currentUser.role === 'kasir') setActiveView('kasir_pengaturan');
                    else setActiveView('karyawan_pengaturan');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  {currentUser.photo_url ? (
                    <img
                      src={currentUser.photo_url}
                      alt={currentUser.name}
                      className="h-6 w-6 rounded-lg object-cover border border-[#DCA842]/40"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-lg bg-zinc-700 flex items-center justify-center text-[10px] text-white">
                      {currentUser.name[0]}
                    </div>
                  )}
                  <span className="hidden md:inline">{currentUser.name}</span>
                  <Settings className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
          </header>
        ) : (
          // Header Pengunjung Publik (Saat Tanpa Login)
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-[#09090B]/95 backdrop-blur-md transition-colors">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 py-2.5">
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                aria-label="Barbershop Cenderawasih"
                className="flex items-center text-left whitespace-nowrap shrink-0 cursor-pointer group py-0.5"
              >
                <img
                  src="/assets/brand-logo.png"
                  alt="Barbershop Cenderawasih"
                  className="h-10 sm:h-12 w-auto object-contain transition-transform duration-150 group-hover:scale-105 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </button>

              <nav className="hidden md:flex items-center gap-1">
                {[
                  {href: '#hero', label: 'Beranda'},
                  {href: '#barber-kami', label: 'Barber Kami'},
                  {href: '#layanan', label: 'Layanan & Harga'},
                  {href: '#promo', label: 'Promo & Berita'},
                  {href: '#lokasi', label: 'Lokasi & Cabang'},
                  {href: '#tentang-kami', label: 'Tentang Kami'},
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="relative text-xs lg:text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg text-zinc-500 hover:text-[#09090B] hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  title="Ganti Tema"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-[#DCA842]" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="rounded-xl bg-[#09090B] dark:bg-[#DCA842] text-white dark:text-zinc-950 px-4 py-2 text-xs font-bold shadow-sm transition-all hover:scale-105 cursor-pointer"
                >
                  Masuk Staf
                </button>
              </div>
            </div>
          </header>
        )}

        {/* 3. MAIN CONTENT */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-44 rounded-2xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
                <div className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
                <div className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {/* TAMPILAN HALAMAN PUBLIC (Saat belum login atau Owner dalam mode pratinjau) */}
              {(!currentUser || activeView === 'pelanggan') && (
                <CustomerBookingPortal
                  branches={appState.branches}
                  employees={appState.employees}
                  services={appState.services}
                  schedules={appState.schedules}
                  bookings={appState.bookings}
                  posts={appState.posts || []}
                  siteMedia={appState.siteMedia}
                  onLogoClick={() => {
                    if (!currentUser) setLoginOpen(true);
                  }}
                  onBooked={() => {
                    // Otomatis tersinkronisasi via WebSocket
                  }}
                  showBookingModal={showBookingModal}
                  onCloseBookingModal={() => setShowBookingModal(false)}
                />
              )}

              {/* TAMPILAN OWNER */}
              {currentUser?.role === 'owner' && (
                <>
                  {activeView === 'owner_pengaturan' && (
                    <OwnerSettingsPortal
                      currentUser={currentUser}
                      branches={appState.branches}
                      employees={appState.employees}
                      roles={appState.roles}
                      features={appState.features}
                      rolePermissions={appState.rolePermissions}
                      appSettings={appState.appSettings}
                      siteMedia={appState.siteMedia}
                      onRefreshState={fetchInitialState}
                    />
                  )}

                  {activeView !== 'owner_pengaturan' && activeView !== 'pelanggan' && (
                    <OwnerPortal
                      branches={appState.branches}
                      employees={appState.employees}
                      services={appState.services}
                      serviceCategories={appState.serviceCategories}
                      schedules={appState.schedules}
                      bookings={appState.bookings}
                      attendance={appState.attendance}
                      salaries={appState.salaries}
                      transactions={appState.transactions}
                      posts={appState.posts || []}
                      siteMedia={appState.siteMedia}
                      initialTab={
                        activeView === 'owner_transaksi'
                          ? 'transaksi'
                          : activeView === 'owner_layanan'
                          ? 'layanan'
                          : activeView === 'owner_presensi'
                          ? 'presensi'
                          : activeView === 'owner_karyawan'
                          ? 'karyawan'
                          : activeView === 'owner_gaji'
                          ? 'gaji'
                          : activeView === 'owner_cabang' || activeView === 'owner_jadwal'
                          ? 'cabang'
                          : activeView === 'owner_konten'
                          ? 'konten'
                          : activeView === 'owner_laporan'
                          ? 'excel'
                          : 'keuangan'
                      }
                    />
                  )}
                </>
              )}

              {/* TAMPILAN KASIR */}
              {currentUser?.role === 'kasir' && (
                <>
                  {activeView === 'kasir_pengaturan' ? (
                    <SelfSettingsPortal
                      currentUser={currentUser}
                      branches={appState.branches}
                      theme={theme}
                      onToggleTheme={toggleTheme}
                      onRefreshState={fetchInitialState}
                      appVersion={appState.appSettings?.app_version || 'v4.0.1'}
                    />
                  ) : (
                    <CashierPortal
                      currentUser={currentUser}
                      branches={appState.branches}
                      employees={appState.employees}
                      services={appState.services}
                      bookings={appState.bookings}
                      transactions={appState.transactions}
                      attendance={appState.attendance}
                      schedules={appState.schedules}
                      initialTab={
                        activeView === 'kasir_riwayat'
                          ? 'riwayat'
                          : activeView === 'kasir_dashboard'
                          ? 'dashboard'
                          : activeView === 'kasir_presensi'
                          ? 'presensi_saya'
                          : activeView === 'kasir_printer'
                          ? 'printer_settings'
                          : 'pos_grid'
                      }
                      onTransactionCreated={() => {
                        // Sinkronisasi realtime
                      }}
                    />
                  )}
                </>
              )}

              {/* TAMPILAN KARYAWAN / BARBER */}
              {currentUser?.role === 'karyawan' && (
                <>
                  {activeView === 'karyawan_pengaturan' ? (
                    <SelfSettingsPortal
                      currentUser={currentUser}
                      branches={appState.branches}
                      theme={theme}
                      onToggleTheme={toggleTheme}
                      onRefreshState={fetchInitialState}
                      appVersion={appState.appSettings?.app_version || 'v4.0.1'}
                    />
                  ) : activeView === 'karyawan_presensi' ? (
                    <AttendancePortal
                      currentUser={currentUser}
                      employees={appState.employees}
                      branches={appState.branches}
                      attendance={appState.attendance}
                      schedules={appState.schedules}
                      onAttendanceSuccess={() => fetchInitialState()}
                    />
                  ) : (
                    <EmployeePortal
                      currentUser={currentUser}
                      employees={appState.employees}
                      branches={appState.branches}
                      transactions={appState.transactions}
                      attendance={appState.attendance}
                      salaries={appState.salaries}
                      schedules={appState.schedules}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>

        {/* 4. FOOTER */}
        <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#09090B] py-6 transition-colors">
          <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-xs text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => {
                if (!currentUser) setLoginOpen(true);
              }}
              aria-label="Barbershop Cenderawasih Nabire"
              className="flex items-center gap-3 cursor-pointer group text-left"
            >
              <img
                src="/assets/brand-logo.png"
                alt="Logo Cenderawasih"
                className="h-10 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
              />
              <div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  © {new Date().getFullYear()} · CW-01 Sam Ratulangi &amp; CW-02 Yos Sudarso, Nabire
                </p>
              </div>
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <CompactSocialButtons />
              <div className="flex items-center gap-2">
                <OfflineIndicator />
                <span className="font-mono text-[10px] text-zinc-400">
                  {appState.appSettings?.app_version || 'v4.0.1'}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* MODAL LOGIN STAF */}
      {loginOpen && (
        <LoginModal
          employees={appState.employees}
          onClose={() => setLoginOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      )}

      {/* MODAL KONFIRMASI KELUAR */}
      <ActionConfirmModal
        isOpen={logoutConfirmOpen}
        type="logout"
        title="Konfirmasi Keluar Akun"
        message={`Apakah Anda yakin ingin keluar dari akun ${currentUser?.name || 'staf'} (${currentUser?.role ? currentUser.role.toUpperCase() : ''})? Sesi kerja Anda pada sistem ini akan diakhiri.`}
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

      {/* MODAL FEEDBACK HASIL KELUAR */}
      <ActionFeedbackModal
        isOpen={logoutFeedbackOpen}
        type="success"
        title="Berhasil Keluar"
        message="Sesi akun Anda telah berhasil ditutup dengan aman. Terima kasih atas kerja keras Anda!"
        buttonLabel="Selesai"
        autoCloseMs={2500}
        onClose={() => setLogoutFeedbackOpen(false)}
      />
    </div>
  );
}
