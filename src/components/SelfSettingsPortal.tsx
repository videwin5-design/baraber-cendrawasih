import {
  AlertCircle,
  Bell,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  Lock,
  Moon,
  Printer,
  Save,
  Server,
  Sparkles,
  Sun,
  Upload,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, {useRef, useState} from 'react';
import type {Branch, Employee} from '../types.ts';
import {compressImageFileToSquareDataUrl} from '../utils/image.ts';

export interface SelfSettingsPortalProps {
  currentUser: Employee;
  branches: Branch[];
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRefreshState: () => void;
  appVersion?: string;
}

export const SelfSettingsPortal: React.FC<SelfSettingsPortalProps> = ({
  currentUser,
  branches,
  theme,
  onToggleTheme,
  onRefreshState,
  appVersion = 'v4.0.1',
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState<string | null>(null);

  // Profile upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  const assignedBranch = branches.find((b) => b.id === currentUser.branch_id);

  // Handle PIN Change
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin || !newPin) {
      setPinErr('PIN lama dan PIN baru wajib diisi');
      return;
    }
    if (newPin.length < 4) {
      setPinErr('PIN baru minimal 4 angka');
      return;
    }
    setPinLoading(true);
    setPinErr(null);
    setPinMsg(null);
    try {
      const res = await fetch(`/api/employees/${currentUser.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({old_pin: oldPin, new_pin: newPin}),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinErr(data.error || 'Gagal mengubah PIN');
        return;
      }
      setPinMsg('PIN Anda berhasil diubah! Gunakan PIN baru ini untuk login berikutnya.');
      setOldPin('');
      setNewPin('');
      onRefreshState();
    } catch {
      setPinErr('Terjadi kesalahan koneksi server');
    } finally {
      setPinLoading(false);
    }
  };

  // Handle Photo Profile Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoMsg(null);
    try {
      const dataUrl = await compressImageFileToSquareDataUrl(file, 400);
      const res = await fetch(`/api/employees/${currentUser.id}/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({photo_url: dataUrl}),
      });
      if (res.ok) {
        setPhotoMsg('Foto profil berhasil diperbarui!');
        onRefreshState();
      }
    } catch {
      alert('Gagal mengunggah foto profil');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Pengaturan Saya */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {currentUser.photo_url ? (
              <img
                src={currentUser.photo_url}
                alt={currentUser.name}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-[#DCA842]"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-300">
                <User className="h-7 w-7" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti Foto Profil"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#DCA842] text-zinc-950 shadow-md hover:scale-110 transition-transform cursor-pointer"
            >
              <Upload className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Pengaturan Saya — {currentUser.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/30">
                Role: {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Penempatan:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {assignedBranch ? `${assignedBranch.code} (${assignedBranch.name})` : 'Pusat'}
              </strong>{' '}
              · Khusus akun login pribadi Anda.
            </p>
            {photoMsg && (
              <p className="text-xs font-semibold text-emerald-500 mt-1">{photoMsg}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Ganti PIN Login Pribadi */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Ganti PIN Login Pribadi
              </h3>
              <p className="text-[11px] text-zinc-500">Jaga kerahasiaan PIN akses Anda</p>
            </div>
          </div>

          {pinMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 font-medium">
              {pinMsg}
            </div>
          )}
          {pinErr && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium">
              {pinErr}
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                PIN Lama Anda
              </label>
              <input
                type="password"
                maxLength={8}
                placeholder="PIN Sekarang"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                PIN Baru (Minimal 4 Angka)
              </label>
              <input
                type="password"
                maxLength={8}
                placeholder="PIN Baru"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pinLoading}
              className="w-full rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 py-2.5 text-xs font-bold shadow transition-all cursor-pointer"
            >
              {pinLoading ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
          </form>
        </div>

        {/* 2. Preferensi Tampilan Tema */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Preferensi Tampilan Aplikasi
              </h3>
              <p className="text-[11px] text-zinc-500">Sesuaikan mode nyaman untuk mata Anda</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-[#DCA842]" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Mode {theme === 'dark' ? 'Gelap (Dark Mode)' : 'Terang (Light Mode)'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {theme === 'dark' ? 'Gelap hemat energi baterai tablet' : 'Terang kontras tinggi'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleTheme}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
              >
                Ganti Tema
              </button>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 space-y-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Server className="h-4 w-4 text-zinc-400" />
                <span>Informasi Versi &amp; Terminal</span>
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Versi Sistem: <strong className="text-zinc-700 dark:text-zinc-300">{appVersion}</strong>
              </p>
              <p className="text-[11px] text-zinc-500">
                Pembaruan dan aturan hak akses diatur sepenuhnya oleh Owner Barbershop Cenderawasih.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
