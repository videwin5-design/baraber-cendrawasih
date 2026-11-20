import {KeyRound, Lock, X} from 'lucide-react';
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
      } else {
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Pilih Akun Staf</label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError('');
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
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">PIN Akses (4 Digit)</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN..."
                className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/50 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-tactile w-full rounded-lg bg-[#09090B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
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
      </div>
    </div>
  );
};
