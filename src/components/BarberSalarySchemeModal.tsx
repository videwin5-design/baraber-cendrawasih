import {
  Award,
  Calculator,
  CheckCircle2,
  Crown,
  DollarSign,
  Flame,
  HelpCircle,
  Percent,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import React, {useState} from 'react';
import {formatRupiah} from '../utils/format.ts';

interface BarberSalarySchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BarberSalarySchemeModal: React.FC<BarberSalarySchemeModalProps> = ({isOpen, onClose}) => {
  const [simCustomers, setSimCustomers] = useState<number>(150);

  if (!isOpen) return null;

  // Kalkulasi Simulasi
  const baseSalary = 2000000;
  const avgCommission = 21250; // Rata-rata komisi haircut reguler
  const totalCommission = simCustomers * avgCommission;

  let simBonus = 0;
  let simRank = 'Menuju Target';
  let simRankColor = 'text-zinc-400';
  if (simCustomers >= 300) {
    simBonus = 2500000;
    simRank = '👑 LEGEND BARBER';
    simRankColor = 'text-[#DCA842]';
  } else if (simCustomers >= 200) {
    simBonus = 1000000;
    simRank = '⭐ BARBER SENIOR';
    simRankColor = 'text-amber-400';
  } else if (simCustomers >= 150) {
    simBonus = 500000;
    simRank = '🎖️ BARBER JUNIOR';
    simRankColor = 'text-emerald-400';
  } else if (simCustomers >= 100) {
    simBonus = 200000;
    simRank = '🎯 TARGET 100';
    simRankColor = 'text-blue-400';
  }

  const simTotal = baseSalary + totalCommission + simBonus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto my-auto rounded-3xl bg-[#09090B] border-2 border-[#DCA842]/60 text-white shadow-[0_0_50px_rgba(220,168,66,0.25)]">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#C5922E]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#DCA842]/20 blur-3xl" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-zinc-800 bg-[#121215] px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/brand-icon.png"
              alt="Logo Cenderawasih"
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="text-[11px] font-bold text-[#DCA842] tracking-wider uppercase">
                Barbershop Cenderawasih
              </p>
              <h2 className="font-brand text-lg sm:text-xl font-bold text-white tracking-tight">
                SISTEM GAJI BARBER 2026
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Subtitle Banner */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCA842]/40 bg-[#DCA842]/10 px-4 py-1 text-xs font-semibold text-[#DCA842]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PROFESIONAL · TRANSPARAN · BERBASIS KINERJA</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-lg mx-auto pt-1">
              Skema penggajian resmi Barbershop Cenderawasih tahun 2026 yang menjamin kepastian gaji pokok, komisi adil tiap kepala, dan bonus berjenjang.
            </p>
          </div>

          {/* 2 Kolom Atas: Gaji Pokok & Komisi + Target Bulanan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Kiri: Gaji Pokok + Komisi per Pelanggan */}
            <div className="space-y-4">
              {/* Card Gaji Pokok */}
              <div className="rounded-2xl border-2 border-[#DCA842] bg-gradient-to-r from-[#18181B] to-[#27272A] p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#DCA842] text-zinc-950 px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-bl-xl tracking-wider">
                  GAJI POKOK
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-[#09090B] border border-[#DCA842]/50 flex items-center justify-center text-[#DCA842] shrink-0">
                    <DollarSign className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                      Rp2.000.000
                    </p>
                    <p className="text-xs font-semibold text-zinc-400 mt-0.5">/ BULAN TETAP</p>
                  </div>
                </div>
              </div>

              {/* Tabel Komisi per Pelanggan */}
              <div className="rounded-2xl border border-zinc-800 bg-[#121215] overflow-hidden">
                <div className="bg-[#18181B] border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-[#DCA842]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    KOMISI PER PELANGGAN (HAIRCUT)
                  </span>
                </div>
                <div className="p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-800 text-[11px]">
                        <th className="text-left pb-2">LAYANAN</th>
                        <th className="text-center pb-2">HARGA</th>
                        <th className="text-right pb-2">KOMISI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      <tr>
                        <td className="py-2 font-sans font-bold text-white flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-[#DCA842]" />
                          <span>HAIRCUT PREMIUM</span>
                        </td>
                        <td className="text-center text-zinc-300">Rp150.000</td>
                        <td className="text-right font-bold text-[#DCA842]">
                          30% = Rp45.000
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans font-bold text-white flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-zinc-300" />
                          <span>HAIRCUT REGULER</span>
                        </td>
                        <td className="text-center text-zinc-300">Rp85.000</td>
                        <td className="text-right font-bold text-[#DCA842]">
                          25% = Rp21.250
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans font-bold text-white flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                          <span>HAIRCUT BASIC / SCHOOL</span>
                        </td>
                        <td className="text-center text-zinc-300">Rp70.000</td>
                        <td className="text-right font-bold text-[#DCA842]">
                          20% = Rp14.000
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Kanan: Tabel Bonus Target Bulanan */}
            <div className="rounded-2xl border border-zinc-800 bg-[#121215] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#18181B] border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#DCA842]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    BONUS TARGET BULANAN
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Bonus apresiasi tambahan langsung cair setiap akhir bulan berdasarkan akumulasi jumlah kepala pelanggan yang dicukur:
                  </p>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="flex items-center gap-2 font-sans text-zinc-300">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span>100 Pelanggan</span>
                      </span>
                      <span className="font-bold text-blue-400 text-sm">Rp200.000</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-emerald-900/50">
                      <span className="flex items-center gap-2 font-sans text-zinc-200 font-bold">
                        <Users className="h-4 w-4 text-emerald-400" />
                        <span>150 Pelanggan (Junior)</span>
                      </span>
                      <span className="font-bold text-emerald-400 text-sm">Rp500.000</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-amber-900/50">
                      <span className="flex items-center gap-2 font-sans text-zinc-200 font-bold">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span>200 Pelanggan (Senior)</span>
                      </span>
                      <span className="font-bold text-amber-400 text-sm">Rp1.000.000</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-zinc-900 to-[#1e1b12] border border-[#DCA842]/50 shadow-xs">
                      <span className="flex items-center gap-2 font-sans text-white font-extrabold">
                        <Crown className="h-4 w-4 text-[#DCA842]" />
                        <span>300 Pelanggan (Legend)</span>
                      </span>
                      <span className="font-extrabold text-[#DCA842] text-sm">Rp2.500.000</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/80 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-400 text-center">
                Semakin banyak mencukur, semakin berlipat ganda penghasilan Anda!
              </div>
            </div>
          </div>

          {/* ================= 3 KARTU JENJANG KARIER (SESUAI GAMBAR 1) ================= */}
          <div>
            <h3 className="font-brand text-center text-sm font-bold text-[#DCA842] uppercase tracking-wider mb-3">
              SIMULASI TINGKATAN &amp; TOTAL PENGHASILAN BULANAN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. BARBER JUNIOR */}
              <div className="rounded-2xl border-2 border-zinc-700 bg-gradient-to-b from-[#18181B] to-[#121215] p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400">TINGKAT 1</span>
                    <h4 className="font-bold text-base text-white">BARBER JUNIOR</h4>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400">
                    <Scissors className="h-4 w-4" />
                  </div>
                </div>

                <div className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-2.5 py-1 text-center">
                  Target: 150 Pelanggan / Bulan
                </div>

                <div className="space-y-1.5 text-xs font-mono pt-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Gaji Pokok:</span>
                    <span>Rp2.000.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Komisi (150x):</span>
                    <span>Rp3.187.500</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Bonus Target:</span>
                    <span>Rp500.000</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-center">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">TOTAL PENGHASILAN</p>
                  <p className="font-mono text-xl font-extrabold text-white mt-0.5">
                    Rp5.687.500
                  </p>
                </div>
              </div>

              {/* 2. BARBER SENIOR */}
              <div className="rounded-2xl border-2 border-amber-600/70 bg-gradient-to-b from-[#18181B] to-[#14120a] p-4 space-y-3 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400">TINGKAT 2</span>
                    <h4 className="font-bold text-base text-amber-300">BARBER SENIOR</h4>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-amber-950/60 flex items-center justify-center text-amber-400">
                    <Star className="h-4 w-4 fill-amber-400" />
                  </div>
                </div>

                <div className="text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-lg px-2.5 py-1 text-center">
                  Target: 200 Pelanggan / Bulan
                </div>

                <div className="space-y-1.5 text-xs font-mono pt-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Gaji Pokok:</span>
                    <span>Rp2.000.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Komisi (200x):</span>
                    <span>Rp4.250.000</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Bonus Target:</span>
                    <span>Rp1.000.000</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-center">
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider">TOTAL PENGHASILAN</p>
                  <p className="font-mono text-xl font-extrabold text-[#DCA842] mt-0.5">
                    Rp7.250.000
                  </p>
                </div>
              </div>

              {/* 3. LEGEND BARBER */}
              <div className="rounded-2xl border-2 border-[#DCA842] bg-gradient-to-b from-[#18181B] via-[#1c180e] to-[#09090B] p-4 space-y-3 relative overflow-hidden shadow-[0_0_20px_rgba(220,168,66,0.3)]">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-[#DCA842]">TINGKAT TERTINGGI</span>
                    <h4 className="font-bold text-base text-white">LEGEND BARBER</h4>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-[#DCA842]/20 flex items-center justify-center text-[#DCA842]">
                    <Crown className="h-4 w-4" />
                  </div>
                </div>

                <div className="text-[11px] font-bold text-[#DCA842] bg-[#DCA842]/15 border border-[#DCA842]/40 rounded-lg px-2.5 py-1 text-center">
                  Target: 300 Pelanggan / Bulan
                </div>

                <div className="space-y-1.5 text-xs font-mono pt-1 text-zinc-300">
                  <div className="flex justify-between">
                    <span>Gaji Pokok:</span>
                    <span>Rp2.000.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Komisi (300x):</span>
                    <span>Rp6.375.000</span>
                  </div>
                  <div className="flex justify-between text-[#DCA842] font-bold">
                    <span>Bonus Target:</span>
                    <span>Rp2.500.000</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-center">
                  <p className="text-[10px] text-[#DCA842] uppercase tracking-wider font-bold">TOTAL PENGHASILAN</p>
                  <p className="font-mono text-2xl font-black text-[#DCA842] mt-0.5">
                    Rp10.875.000
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= KALKULATOR SIMULASI INTERAKTIF ================= */}
          <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#DCA842]" />
                <h4 className="font-bold text-sm text-white">Kalkulator Simulasi Gaji Kinerja Anda</h4>
              </div>
              <span className={`text-xs font-extrabold ${simRankColor}`}>{simRank}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Geser atau ketik target pelanggan Anda per bulan:</span>
                <span className="font-mono text-base font-extrabold text-[#DCA842]">
                  {simCustomers} Pelanggan
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={400}
                step={5}
                value={simCustomers}
                onChange={(e) => setSimCustomers(Number(e.target.value))}
                className="w-full accent-[#DCA842] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-zinc-800">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-center">
                <p className="text-[10px] text-zinc-400 font-sans">Gaji Pokok</p>
                <p className="font-bold text-white mt-1">{formatRupiah(baseSalary)}</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-2.5 text-center">
                <p className="text-[10px] text-zinc-400 font-sans">Estimasi Komisi</p>
                <p className="font-bold text-white mt-1">{formatRupiah(totalCommission)}</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-2.5 text-center">
                <p className="text-[10px] text-zinc-400 font-sans">Bonus Target</p>
                <p className="font-bold text-[#DCA842] mt-1">{formatRupiah(simBonus)}</p>
              </div>
              <div className="rounded-xl bg-[#DCA842]/20 border border-[#DCA842]/50 p-2.5 text-center">
                <p className="text-[10px] text-[#DCA842] font-sans font-bold">TOTAL GAJI</p>
                <p className="font-extrabold text-white mt-1">{formatRupiah(simTotal)}</p>
              </div>
            </div>
          </div>

          {/* Keunggulan Sistem Footer */}
          <div className="rounded-2xl border border-zinc-800 bg-[#09090B] p-4 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Gaji Pokok Tetap
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Komisi Setiap Pelanggan
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Bonus Target Bulanan
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Jenjang Karier Jelas
              </span>
            </div>
            <p className="font-brand italic text-sm text-[#DCA842]">
              "Bertumbuh Bersama, Sukses Bersama!"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
