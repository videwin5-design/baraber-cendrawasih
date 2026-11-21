import {AlertTriangle, CheckCircle2, KeyRound, Lock, Mail, ShieldAlert, X} from 'lucide-react';
import React, {useState} from 'react';
import type {Employee} from '../types.ts';

interface LoginModalProps {
  employees: Employee[];
  onClose: () => void;
  onSuccess: (user: Employee) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({employees, onClose, onSuccess}) => {
  const activeEmployees = employees.filter((e) => e.is_active === 1);
  const [selectedId, setSelectedId] = useState(activeEmployees[0]?.id || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // State untuk Reset PIN via Email / Google Auth
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailOrPhone, setResetEmailOrPhone] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'newPin'>('request');
  const [resetToken, setResetToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedId);

  const submitLogin = async (empId: string, empPin: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({employeeId: empId, pin: empPin}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal masuk');
        if (data.isLocked) {
          setIsLocked(true);
          setAttemptsLeft(0);
        } else if (typeof data.attemptsLeft === 'number') {
          setAttemptsLeft(data.attemptsLeft);
        }
      } else {
        setAttemptsLeft(null);
        setIsLocked(false);
        onSuccess(data.user);
      }
    } catch {
      setError('Koneksi ke server gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLogin(selectedId, pin);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({employeeId: selectedId, emailOrPhone: resetEmailOrPhone}),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetMsg({type: 'error', text: data.error || 'Gagal memverifikasi akun terdaftar'});
      } else {
        setResetToken(data.resetToken);
        setResetStep('newPin');
        setResetMsg({type: 'success', text: '✅ Autorisasi Google & Email berhasil divalidasi. Masukkan PIN baru Anda.'});
      }
    } catch {
      setResetMsg({type: 'error', text: 'Gagal menghubungi server'});
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setResetMsg({type: 'error', text: 'Konfirmasi PIN tidak cocok'});
      return;
    }
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({resetToken, newPin}),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetMsg({type: 'error', text: data.error || 'Gagal mengubah PIN'});
      } else {
        setResetMsg({type: 'success', text: '✅ PIN baru berhasil disimpan! Silakan masuk dengan PIN baru.'});
        setIsLocked(false);
        setAttemptsLeft(3);
        setPin(newPin);
        setTimeout(() => {
          setShowResetModal(false);
          setResetStep('request');
        }, 1500);
      }
    } catch {
      setResetMsg({type: 'error', text: 'Gagal menghubungi server'});
    } finally {
      setResetLoading(false);
    }
  };

  const roleLabel = (role: Employee['role']) => {
    if (role === 'owner') return 'Owner (Akses Penuh)';
    if (role === 'kasir') return 'Kasir POS';
    return 'Barber / Karyawan';
  };

  const quickPresets = [
    {label: 'Owner', id: 'emp-owner', pin: '1111'},
    {label: 'Kasir Rina', id: 'emp-kasir-1', pin: '2222'},
    {label: 'Barber Riyan', id: 'emp-barber-1', pin: '3331'},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#09090B] px-6 py-5 text-white border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/brand-logo.png"
              alt="Barbershop Cenderawasih"
              className="h-9 w-auto object-contain bg-transparent shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Tutup dialog masuk"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!showResetModal ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Pilih Akun Staf</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setError('');
                  setAttemptsLeft(null);
                  setIsLocked(false);
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {roleLabel(emp.role)}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Cabang: {selectedEmployee.branch_name || 'Seluruh Cabang'} · {selectedEmployee.specialty}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">PIN Akses (4-6 Digit)</label>
                {attemptsLeft !== null && (
                  <span className={`text-[11px] font-bold ${attemptsLeft <= 1 ? 'text-rose-500' : 'text-amber-500'}`}>
                    Sisa Percobaan: {attemptsLeft} / 3
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  disabled={isLocked}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={isLocked ? 'Akun terkunci 15 menit' : 'Masukkan PIN...'}
                  className={`w-full rounded-lg border bg-white pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 ${
                    isLocked
                      ? 'border-rose-400 bg-rose-50/20 text-rose-300'
                      : 'border-zinc-300 focus:border-[#09090B] dark:border-zinc-700 dark:focus:border-[#DCA842]'
                  }`}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/50 p-3 text-xs font-medium text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="btn-tactile w-full rounded-lg bg-[#09090B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Memverifikasi...' : isLocked ? 'Terkunci (3x Salah PIN)' : 'Masuk ke Dashboard'}
            </button>

            {/* Opsi Reset PIN via Google/Email jika Lupa PIN atau Terkunci */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(true);
                  setResetMsg(null);
                }}
                className="text-xs font-semibold text-[#C5922E] dark:text-[#DCA842] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5" /> Lupa PIN? Reset melalui Akun Google / Email Terdaftar
              </button>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                <KeyRound className="h-3.5 w-3.5 text-[#C5922E]" />
                <span>Akses Cepat Demo Staf:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {quickPresets.map((preset) => {
                  const exists = activeEmployees.some((e) => e.id === preset.id);
                  if (!exists) return null;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(preset.id);
                        setPin(preset.pin);
                        submitLogin(preset.id, preset.pin);
                      }}
                      className="btn-tactile rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-center hover:border-[#09090B] hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-[#DCA842] dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#09090B] dark:text-white">{preset.label}</div>
                      <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">PIN {preset.pin}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        ) : (
          /* FORM RESET PIN TERVERIFIKASI GOOGLE / EMAIL */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#DCA842]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Reset PIN Aman Akun</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Kembali
              </button>
            </div>

            {resetMsg && (
              <div
                className={`rounded-lg border p-3 text-xs font-medium flex items-start gap-2 ${
                  resetMsg.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-950/40 text-rose-300'
                }`}
              >
                {resetMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{resetMsg.text}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nama Karyawan
                  </label>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700">
                    {selectedEmployee?.name} ({roleLabel(selectedEmployee?.role || 'karyawan')})
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Google Terdaftar / No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={resetEmailOrPhone}
                    onChange={(e) => setResetEmailOrPhone(e.target.value)}
                    placeholder="Contoh: owner@cendrawasih.com atau 0812..."
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#DCA842] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    required
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Sistem akan memverifikasi identitas pemilik sah secara aman.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn-tactile w-full rounded-lg bg-[#DCA842] hover:bg-[#C5922E] px-4 py-2.5 text-xs font-bold text-zinc-950 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Memverifikasi Akun...' : 'Verifikasi Autorisasi Google & Lanjut'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleExecuteReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    PIN Baru (4-6 Angka)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Contoh: 1234"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono tracking-widest text-zinc-900 focus:border-[#DCA842] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Konfirmasi PIN Baru
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Ulangi PIN baru..."
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono tracking-widest text-zinc-900 focus:border-[#DCA842] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn-tactile w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Menyimpan PIN Baru...' : 'Simpan & Aktifkan PIN Baru'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
