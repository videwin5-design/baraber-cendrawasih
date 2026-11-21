import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Layers,
  Lock,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Save,
  ScanFace,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Upload,
  User,
  Users,
} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import type {Branch, Employee, FeatureItem, RoleItem, RolePermissionItem, SiteMedia} from '../types.ts';
import {formatRupiah} from '../utils/format.ts';

export interface OwnerSettingsPortalProps {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  roles?: RoleItem[];
  features?: FeatureItem[];
  rolePermissions?: RolePermissionItem[];
  appSettings?: Record<string, string>;
  siteMedia?: SiteMedia;
  onRefreshState: () => void;
}

type SettingTab = 'hak_akses' | 'tampilan' | 'gaji_mutasi' | 'versi_aplikasi' | 'keamanan' | 'integrasi';

export const OwnerSettingsPortal: React.FC<OwnerSettingsPortalProps> = ({
  currentUser,
  branches,
  employees,
  roles = [],
  features = [],
  rolePermissions = [],
  appSettings = {},
  siteMedia,
  onRefreshState,
}) => {
  const [activeTab, setActiveTab] = useState<SettingTab>('hak_akses');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. STATE: HAK AKSES DINAMIS (RBAC)
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[1]?.id || 'role-kasir');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  // 2. STATE: TAMPILAN & PUBLIC
  const [brandName, setBrandName] = useState(appSettings.app_name || 'Barbershop Cenderawasih');
  const [primaryColor, setPrimaryColor] = useState(appSettings.brand_primary_color || '#DCA842');
  const [defaultTheme, setDefaultTheme] = useState(appSettings.theme_default_public || 'dark');
  const [heroTitle, setHeroTitle] = useState(siteMedia?.hero_video_title || 'Presisi Pangkas & Ritual Grooming Cenderawasih');
  const [heroSubtitle, setHeroSubtitle] = useState(
    siteMedia?.hero_video_subtitle ||
      'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.'
  );

  // 3. STATE: MUTASI KARYAWAN & SKEMA GAJI 2026
  const [baseSalaryDefault, setBaseSalaryDefault] = useState(
    appSettings.base_salary_default || '2000000'
  );
  const [paydayDate, setPaydayDate] = useState(appSettings.payday_date || '1');
  const [selectedMutateEmpId, setSelectedMutateEmpId] = useState<string>(employees[0]?.id || '');
  const [targetMutateBranchId, setTargetMutateBranchId] = useState<string>(branches[0]?.id || '');

  // 4. STATE: VERSI APLIKASI
  const [appVersion, setAppVersion] = useState(appSettings.app_version || '4.0.1');
  const [receiptFormat, setReceiptFormat] = useState(appSettings.receipt_format || '58mm');
  const [appTimezone, setAppTimezone] = useState(appSettings.timezone || 'Asia/Jayapura (WIT)');

  // 5. STATE: PRESENSI & KEAMANAN
  const [geofenceRadius, setGeofenceRadius] = useState(appSettings.geofence_default_radius || '150');
  const [faceMatchMin, setFaceMatchMin] = useState(appSettings.face_match_min_percent || '80');
  const [toleranceMinutes, setToleranceMinutes] = useState(appSettings.tolerance_late_minutes || '15');
  const [newOwnerPin, setNewOwnerPin] = useState('');

  // 6. STATE: INTEGRASI MANDIRI QRIS & WHATSAPP API (DINAMIS OWNER)
  const [mandiriQrisEnabled, setMandiriQrisEnabled] = useState(appSettings.mandiri_qris_enabled !== '0');
  const [mandiriMerchantId, setMandiriMerchantId] = useState(appSettings.mandiri_qris_merchant_id || 'CW-MANDIRI-NABIRE-01');
  const [mandiriClientId, setMandiriClientId] = useState(appSettings.mandiri_qris_client_id || '');
  const [mandiriWebhookSecret, setMandiriWebhookSecret] = useState(appSettings.mandiri_qris_webhook_secret || 'sec_cendra_qris_2026');
  const [testWebhookLoading, setTestWebhookLoading] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const [whatsappEnabled, setWhatsappEnabled] = useState(appSettings.whatsapp_enabled !== '0');
  const [whatsappProvider, setWhatsappProvider] = useState(appSettings.whatsapp_provider || 'fonnte');
  const [whatsappApiToken, setWhatsappApiToken] = useState(appSettings.whatsapp_api_token || '');
  const [whatsappSenderNumber, setWhatsappSenderNumber] = useState(appSettings.whatsapp_sender_number || '');
  const [whatsappTemplateBooking, setWhatsappTemplateBooking] = useState(
    appSettings.whatsapp_template_booking ||
      'Halo Kak {nama_pelanggan}! Booking Anda di Cendrawasih Barbershop telah diterima. Kode: {kode_booking}, Tanggal: {tanggal} {jam}, Layanan: {layanan}, Barber: {barber}, Cabang: {cabang}. Mohon hadir 5 menit sebelum jadwal. Terima kasih!'
  );
  const [whatsappTemplateTrx, setWhatsappTemplateTrx] = useState(
    appSettings.whatsapp_template_trx ||
      'Terima kasih Kak {nama_pelanggan}! Pembayaran sebesar Rp {total} untuk invoice {invoice} di Cendrawasih Barbershop ({cabang}) telah berhasil diterima via {metode_bayar}. Layanan oleh: {barber}. Sampai jumpa kembali!'
  );
  const [testWaPhone, setTestWaPhone] = useState('');
  const [testWaLoading, setTestWaLoading] = useState(false);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  // HANDLER: Toggle Permission Field
  const handleTogglePermission = async (
    featureId: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export' | 'can_void',
    currentVal: number
  ) => {
    try {
      const newVal = currentVal === 1 ? 0 : 1;
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({
          role_id: selectedRoleId,
          feature_id: featureId,
          field,
          value: newVal,
        }),
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch {
      showNotification('Gagal mengubah hak akses', true);
    }
  };

  // HANDLER: Toggle Data Scope
  const handleChangeScope = async (featureId: string, scope: 'self' | 'branch' | 'all') => {
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({
          role_id: selectedRoleId,
          feature_id: featureId,
          field: 'data_scope',
          value: scope,
        }),
      });
      if (res.ok) {
        onRefreshState();
      }
    } catch {
      showNotification('Gagal mengubah cakupan data', true);
    }
  };

  // HANDLER: Tambah Role Baru
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Gagal membuat role', true);
        return;
      }
      showNotification(`Role '${data.name}' berhasil dibuat!`);
      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddRoleModal(false);
      onRefreshState();
    } catch {
      showNotification('Gagal membuat role baru', true);
    }
  };

  // HANDLER: Mutasi Karyawan Antar Cabang
  const handleMutateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMutateEmpId || !targetMutateBranchId) return;
    try {
      const res = await fetch(`/api/employees/${selectedMutateEmpId}/branch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({branch_id: targetMutateBranchId}),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Gagal memutasi karyawan', true);
        return;
      }
      showNotification(`Karyawan berhasil dipindahkan ke cabang ${data.branch_name}!`);
      onRefreshState();
    } catch {
      showNotification('Gagal memutasi cabang karyawan', true);
    }
  };

  // HANDLER: Simpan Pengaturan Tampilan & Aplikasi Global
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        app_name: brandName,
        brand_primary_color: primaryColor,
        theme_default_public: defaultTheme,
        app_version: appVersion,
        receipt_format: receiptFormat,
        timezone: appTimezone,
        base_salary_default: baseSalaryDefault,
        payday_date: paydayDate,
        geofence_default_radius: geofenceRadius,
        face_match_min_percent: faceMatchMin,
        tolerance_late_minutes: toleranceMinutes,
        mandiri_qris_enabled: mandiriQrisEnabled ? '1' : '0',
        mandiri_qris_merchant_id: mandiriMerchantId,
        mandiri_qris_client_id: mandiriClientId,
        mandiri_qris_webhook_secret: mandiriWebhookSecret,
        whatsapp_enabled: whatsappEnabled ? '1' : '0',
        whatsapp_provider: whatsappProvider,
        whatsapp_api_token: whatsappApiToken,
        whatsapp_sender_number: whatsappSenderNumber,
        whatsapp_template_booking: whatsappTemplateBooking,
        whatsapp_template_trx: whatsappTemplateTrx,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification('Pengaturan Pusat Owner Berhasil Disimpan!');
        onRefreshState();
      } else {
        showNotification('Gagal menyimpan pengaturan', true);
      }
    } catch {
      showNotification('Terjadi kesalahan koneksi server', true);
    } finally {
      setSaving(false);
    }
  };

  // HANDLER: Ganti PIN Owner
  const handleUpdateOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerPin || newOwnerPin.length < 4) {
      showNotification('PIN baru minimal 4 angka', true);
      return;
    }
    try {
      const res = await fetch(`/api/employees/${currentUser.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({new_pin: newOwnerPin}),
      });
      if (res.ok) {
        showNotification('PIN Owner berhasil diperbarui!');
        setNewOwnerPin('');
        onRefreshState();
      } else {
        showNotification('Gagal memperbarui PIN', true);
      }
    } catch {
      showNotification('Gagal mengubah PIN', true);
    }
  };

  // HANDLER: Test Mandiri QRIS Webhook
  const handleTestMandiriWebhook = async () => {
    setTestWebhookLoading(true);
    try {
      const res = await fetch('/api/payments/mandiri/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({
          amount: 85000,
          customer_name: 'Simulasi Mandiri QRIS',
          reference_id: `MND-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Tes Webhook Mandiri Berhasil! Notifikasi pembayaran otomatis terverifikasi.');
      } else {
        showNotification(data.error || 'Gagal simulasi webhook Mandiri', true);
      }
    } catch {
      showNotification('Gagal menghubungi endpoint webhook', true);
    } finally {
      setTestWebhookLoading(false);
    }
  };

  // HANDLER: Test Kirim WhatsApp
  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testWaPhone || testWaPhone.length < 9) {
      showNotification('Masukkan nomor WhatsApp tujuan yang valid (contoh: 081234567890)', true);
      return;
    }
    setTestWaLoading(true);
    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'owner',
        },
        body: JSON.stringify({
          phone: testWaPhone,
          message: `👋 Halo! Ini adalah pesan uji coba integrasi WhatsApp Cendrawasih Barbershop Nabire pada ${new Date().toLocaleString('id-ID')}. Sistem berjalan normal & aman! ✅`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Pesan WhatsApp berhasil dikirim!');
      } else {
        showNotification(data.message || 'Gagal mengirim pesan WhatsApp', true);
      }
    } catch {
      showNotification('Gagal menghubungi WhatsApp gateway', true);
    } finally {
      setTestWaLoading(false);
    }
  };

  const getFullWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhooks/mandiri-qris`;
    }
    return '/api/webhooks/mandiri-qris';
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(getFullWebhookUrl());
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
      showNotification('URL Webhook berhasil disalin ke clipboard!');
    } catch {
      showNotification('Gagal menyalin URL', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full border border-emerald-500 bg-zinc-950/95 px-6 py-2.5 text-xs sm:text-sm font-semibold text-emerald-400 shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full border border-red-500 bg-zinc-950/95 px-6 py-2.5 text-xs sm:text-sm font-semibold text-red-400 shadow-xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header Pusat Pengaturan Owner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCA842]/10 text-[#DCA842]">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Pusat Pengaturan &amp; Kontrol Owner
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kontrol hak akses dinamis, tampilan publik, mutasi karyawan, skema gaji 2026, dan versi sistem.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>

        {/* Sub-Tabs Navigasi Pengaturan */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          {[
            {id: 'hak_akses', label: '1. Hak Akses Dinamis (RBAC)', icon: ShieldCheck},
            {id: 'tampilan', label: '2. Tampilan & Public', icon: Palette},
            {id: 'gaji_mutasi', label: '3. Mutasi & Gaji Pokok 2026', icon: Award},
            {id: 'versi_aplikasi', label: '4. Aplikasi & Versi', icon: Server},
            {id: 'keamanan', label: '5. Presensi & Keamanan', icon: KeyRound},
            {id: 'integrasi', label: '6. Mandiri QRIS & WhatsApp API', icon: Globe},
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#DCA842] text-zinc-950 font-extrabold shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. SUB-TAB: HAK AKSES DINAMIS (RBAC MATRIKS ON/OFF) */}
      {/* ===================================================================== */}
      {activeTab === 'hak_akses' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Matriks Perizinan Per Role
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ubah hak akses fitur menggunakan sakelar ON/OFF. Perubahan langsung disimpan ke database.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      Role: {r.name.toUpperCase()} {r.is_system ? '(Sistem)' : '(Kustom)'}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCA842] bg-[#DCA842]/10 text-[#DCA842] hover:bg-[#DCA842]/20 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Role</span>
                </button>
              </div>
            </div>

            {/* Matriks Tabel Perizinan */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fitur / Menu</th>
                    <th className="py-3 px-2 text-center">Lihat</th>
                    <th className="py-3 px-2 text-center">Tambah</th>
                    <th className="py-3 px-2 text-center">Edit</th>
                    <th className="py-3 px-2 text-center">Hapus</th>
                    <th className="py-3 px-2 text-center">Export</th>
                    <th className="py-3 px-2 text-center">Void</th>
                    <th className="py-3 px-3 text-center">Cakupan Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {features.map((feat) => {
                    const perm = rolePermissions.find(
                      (p) => p.role_id === selectedRoleId && p.feature_id === feat.id
                    );
                    const canView = perm?.can_view === 1;
                    const canCreate = perm?.can_create === 1;
                    const canEdit = perm?.can_edit === 1;
                    const canDelete = perm?.can_delete === 1;
                    const canExport = perm?.can_export === 1;
                    const canVoid = perm?.can_void === 1;
                    const scope = perm?.data_scope || 'self';

                    const renderToggle = (
                      field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export' | 'can_void',
                      isActive: boolean
                    ) => (
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(feat.id, field, isActive ? 1 : 0)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {isActive ? 'ON' : 'OFF'}
                      </button>
                    );

                    return (
                      <tr
                        key={feat.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{feat.menu_name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {feat.menu_group} · {feat.route}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_view', canView)}</td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_create', canCreate)}</td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_edit', canEdit)}</td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_delete', canDelete)}</td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_export', canExport)}</td>
                        <td className="py-3 px-2 text-center">{renderToggle('can_void', canVoid)}</td>
                        <td className="py-3 px-3 text-center">
                          <select
                            value={scope}
                            onChange={(e) =>
                              handleChangeScope(feat.id, e.target.value as 'self' | 'branch' | 'all')
                            }
                            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="self">Milik Sendiri</option>
                            <option value="branch">Cabang Sendiri</option>
                            <option value="all">Semua Cabang</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SUB-TAB: TAMPILAN & PUBLIC */}
      {/* ===================================================================== */}
      {activeTab === 'tampilan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#DCA842]" />
              <span>Identitas Brand &amp; Warna Tema</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nama Barbershop / Nama Brand di Public
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Warna Utama Brand (Aksen Hex)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-xl border border-zinc-300 dark:border-zinc-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
                />
                <span className="text-xs text-zinc-400">Default: #DCA842 (Gold Cenderawasih)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Tema Default Pengunjung Public
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="theme_default"
                    checked={defaultTheme === 'dark'}
                    onChange={() => setDefaultTheme('dark')}
                  />
                  <span>Mode Gelap (Dark Mode - Direkomendasikan)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="theme_default"
                    checked={defaultTheme === 'light'}
                    onChange={() => setDefaultTheme('light')}
                  />
                  <span>Mode Terang (Light Mode)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#DCA842]" />
              <span>Banner &amp; Header Beranda Publik</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Judul Hero Beranda
              </label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Sub-Judul &amp; Info Jam Buka Beranda
              </label>
              <textarea
                rows={3}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SUB-TAB: MUTASI KARYAWAN & SKEMA GAJI POKOK 2026 */}
      {/* ===================================================================== */}
      {activeTab === 'gaji_mutasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mutasi Karyawan Antar Cabang */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Mutasi Cabang Karyawan
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pindahkan penugasan kasir atau barber ke outlet cabang lain dengan cepat.
                </p>
              </div>
            </div>

            <form onSubmit={handleMutateEmployee} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Pilih Karyawan
                </label>
                <select
                  value={selectedMutateEmpId}
                  onChange={(e) => setSelectedMutateEmpId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {employees
                    .filter((e) => e.role !== 'owner')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role.toUpperCase()}) — Cabang Saat Ini:{' '}
                        {branches.find((b) => b.id === emp.branch_id)?.name || 'Belum Ditugaskan'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Pindah ke Cabang Tujuan
                </label>
                <select
                  value={targetMutateBranchId}
                  onChange={(e) => setTargetMutateBranchId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name} ({b.address})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Terapkan Mutasi Cabang Karyawan
              </button>
            </form>
          </div>

          {/* Konfigurasi Gaji Pokok & Skema Komisi 2026 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCA842]/10 text-[#DCA842]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Parameter Sistem Gaji 2026
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Gaji pokok tetap, persentase komisi, dan target bonus bulanan berjenjang.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Gaji Pokok Default Per Bulan (Rp)
                </label>
                <input
                  type="number"
                  value={baseSalaryDefault}
                  onChange={(e) => setBaseSalaryDefault(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Tanggal Penggajian Bulanan
                </label>
                <select
                  value={paydayDate}
                  onChange={(e) => setPaydayDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold"
                >
                  <option value="1">Tanggal 1 Setiap Bulan</option>
                  <option value="25">Tanggal 25 Setiap Bulan</option>
                  <option value="28">Tanggal 28 Setiap Bulan</option>
                </select>
              </div>

              <div className="rounded-xl border border-[#DCA842]/30 bg-[#DCA842]/5 p-3 text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <p className="font-bold text-[#DCA842] uppercase">Skema Persentase Komisi Haircut:</p>
                <p>• Haircut Premium (Rp150.000): 30% = Rp45.000 / kepala</p>
                <p>• Haircut Reguler (Rp85.000): 25% = Rp21.250 / kepala</p>
                <p>• Haircut Basic / School (Rp70.000): 20% = Rp14.000 / kepala</p>
                <p>• Perming &amp; Coloring: 25% – 40%</p>
                <p className="font-bold text-[#DCA842] uppercase pt-1">Bonus Target Bulanan:</p>
                <p>100 Pelanggan: Rp200.000 | 150 (Junior): Rp500.000 | 200 (Senior): Rp1.000.000 | 300 (Legend): Rp2.500.000</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SUB-TAB: APLIKASI & VERSI */}
      {/* ===================================================================== */}
      {activeTab === 'versi_aplikasi' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Server className="h-5 w-5 text-[#DCA842]" />
            <span>Versi Aplikasi &amp; Pengaturan Hardware Struk</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Nomor Versi Aplikasi
              </label>
              <input
                type="text"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Owner dapat menaikkan nomor versi (contoh: v4.1.0) saat peluncuran fitur baru.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Format Default Thermal Printer
              </label>
              <select
                value={receiptFormat}
                onChange={(e) => setReceiptFormat(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold"
              >
                <option value="58mm">58 mm (Printer Portabel Bluetooth Saku)</option>
                <option value="80mm">80 mm (Printer Desktop POS Standar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Zona Waktu Outlet
              </label>
              <input
                type="text"
                value={appTimezone}
                onChange={(e) => setAppTimezone(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Standar: Asia/Jayapura (WIT - UTC+9)</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SUB-TAB: PRESENSI & KEAMANAN OWNER */}
      {/* ===================================================================== */}
      {activeTab === 'keamanan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-[#DCA842]" />
              <span>Parameter Presensi AI Python</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Radius Geofence GPS Cabang (Meter)
              </label>
              <input
                type="number"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Karyawan wajib berada dalam radius ini untuk dapat presensi masuk/pulang.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Minimal Persentase Kecocokan Wajah (%)
              </label>
              <input
                type="number"
                value={faceMatchMin}
                onChange={(e) => setFaceMatchMin(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Ambang batas kecocokan cosine similarity wajah dengan foto profil (Default 80%).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Toleransi Keterlambatan (Menit)
              </label>
              <input
                type="number"
                value={toleranceMinutes}
                onChange={(e) => setToleranceMinutes(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              <span>Ganti PIN Utama Owner</span>
            </h3>

            <form onSubmit={handleUpdateOwnerPin} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  PIN Baru Owner (Minimal 4 Angka)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Masukkan PIN Baru"
                  value={newOwnerPin}
                  onChange={(e) => setNewOwnerPin(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Ubah PIN Akses Owner
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. SUB-TAB: INTEGRASI MANDIRI QRIS WEBHOOK & WHATSAPP API GATEWAY */}
      {/* ===================================================================== */}
      {activeTab === 'integrasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Mandiri QRIS Webhook Dinamis */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                  QR
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Mandiri QRIS Webhook Dinamis
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Verifikasi pembayaran otomatis dari Bank Mandiri ke POS Kasir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMandiriQrisEnabled(!mandiriQrisEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mandiriQrisEnabled
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {mandiriQrisEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                <span>{mandiriQrisEnabled ? 'Aktif' : 'Non-Aktif'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mandiri Merchant ID / NMID
                </label>
                <input
                  type="text"
                  value={mandiriMerchantId}
                  onChange={(e) => setMandiriMerchantId(e.target.value)}
                  placeholder="Contoh: CW-MANDIRI-NABIRE-01"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Client ID (Mandiri Open API / Partner Portal)
                </label>
                <input
                  type="text"
                  value={mandiriClientId}
                  onChange={(e) => setMandiriClientId(e.target.value)}
                  placeholder="Contoh: 12345678-mandiri-cendra"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Webhook Secret Key (HMAC-SHA256 Signature)
                </label>
                <input
                  type="password"
                  value={mandiriWebhookSecret}
                  onChange={(e) => setMandiriWebhookSecret(e.target.value)}
                  placeholder="Secret key untuk memvalidasi callback webhook"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-mono"
                />
              </div>

              {/* URL Callback / Webhook Endpoint */}
              <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                  URL Webhook Callback (Pasang di Portal Mandiri):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullWebhookUrl()}
                    className="flex-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    {webhookCopied ? 'Tersalin!' : 'Salin URL'}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Method: <span className="font-mono font-bold text-emerald-600">POST</span> · Format Payload: JSON · Notifikasi otomatis masuk ke kasir via WebSocket.
                </p>
              </div>

              {/* Tombol Uji Coba Webhook */}
              <button
                type="button"
                onClick={handleTestMandiriWebhook}
                disabled={testWebhookLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${testWebhookLoading ? 'animate-spin' : ''}`} />
                <span>{testWebhookLoading ? 'Mengirim Simulasi Webhook...' : 'Kirim Simulasi Webhook Mandiri (Rp 85.000)'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: WhatsApp API Gateway */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  WA
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    WhatsApp Gateway Notifikasi
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Kirim struk digital kasir & konfirmasi booking online otomatis ke WhatsApp pelanggan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  whatsappEnabled
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {whatsappEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                <span>{whatsappEnabled ? 'Aktif' : 'Non-Aktif'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Provider Gateway
                  </label>
                  <select
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-bold"
                  >
                    <option value="fonnte">Fonnte (Rekomendasi Indonesia)</option>
                    <option value="wablas">Wablas Official</option>
                    <option value="meta">Meta Cloud API (Official)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nomor Pengirim (Sender)
                  </label>
                  <input
                    type="text"
                    value={whatsappSenderNumber}
                    onChange={(e) => setWhatsappSenderNumber(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API Token / Secret Key
                </label>
                <input
                  type="password"
                  value={whatsappApiToken}
                  onChange={(e) => setWhatsappApiToken(e.target.value)}
                  placeholder="Masukkan token dari Fonnte / Wablas dashboard"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-mono"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  *Kosongkan untuk mengaktifkan mode simulasi (pesan dicatat di log server tanpa memotong saldo).
                </p>
              </div>

              {/* Template Notifikasi Struk */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Template Pesan Struk Kasir
                </label>
                <textarea
                  rows={2}
                  value={whatsappTemplateTrx}
                  onChange={(e) => setWhatsappTemplateTrx(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono"
                />
                <p className="text-[10px] text-zinc-400">Variabel: {'{nama_pelanggan}'}, {'{invoice}'}, {'{total}'}, {'{cabang}'}, {'{metode_bayar}'}, {'{barber}'}</p>
              </div>

              {/* Template Booking Online */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Template Konfirmasi Booking Online
                </label>
                <textarea
                  rows={2}
                  value={whatsappTemplateBooking}
                  onChange={(e) => setWhatsappTemplateBooking(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono"
                />
                <p className="text-[10px] text-zinc-400">Variabel: {'{nama_pelanggan}'}, {'{kode_booking}'}, {'{tanggal}'}, {'{jam}'}, {'{layanan}'}, {'{barber}'}, {'{cabang}'}</p>
              </div>

              {/* Form Uji Coba WhatsApp */}
              <form onSubmit={handleTestWhatsApp} className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-2">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  Uji Coba Kirim Pesan WhatsApp:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="Nomor HP Tujuan (08...)"
                    value={testWaPhone}
                    onChange={(e) => setTestWaPhone(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={testWaLoading}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {testWaLoading ? 'Mengirim...' : 'Kirim Tes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Role Baru */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Buat Role Baru (Tanpa Coding)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Contoh role baru: `Supervisor`, `Admin Cabang`, `Magang`, atau `Kasir Senior`.
            </p>

            <form onSubmit={handleCreateRole} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Role</label>
                <input
                  type="text"
                  placeholder="Contoh: supervisor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi Role</label>
                <textarea
                  rows={2}
                  placeholder="Hak akses yang dimiliki role ini..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Role Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
