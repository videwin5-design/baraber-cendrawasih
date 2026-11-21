import React, { useMemo, useState } from 'react';
import { Calendar, DollarSign, Download, Filter, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { Employee, Transaction } from '../types.ts';
import { formatRupiah } from '../utils/format.ts';

interface OwnerPerformanceMatrixTableProps {
  transactions: Transaction[];
  employees: Employee[];
  initialMonth?: string;
}

interface BarberMatrixRow {
  name: string;
  periodText: string;
  qty: {
    hc_70: number;
    hc_85: number;
    hc_120: number;
    hc_150: number;
    pm_350: number;
    pm_435: number;
    pm_550: number;
    pm_635: number;
    st_40: number;
    st_50: number;
    st_100: number;
    cl_350: number;
    cl_450: number;
    cl_550: number;
    prod_pomade: number;
    prod_tonic: number;
    prod_powder: number;
  };
  totalRp: {
    hc_70: number;
    hc_85: number;
    hc_120: number;
    hc_150: number;
    pm_350: number;
    pm_435: number;
    pm_550: number;
    pm_635: number;
    st_40: number;
    st_50: number;
    st_100: number;
    cl_350: number;
    cl_450: number;
    cl_550: number;
    prod_pomade: number;
    prod_tonic: number;
    prod_powder: number;
  };
  komisiRp: {
    hc_70: number;
    hc_85: number;
    hc_120: number;
    hc_150: number;
    pm_350: number;
    pm_435: number;
    pm_550: number;
    pm_635: number;
    st_40: number;
    st_50: number;
    st_100: number;
    cl_350: number;
    cl_450: number;
    cl_550: number;
  };
  omset: number;
  pengeluaran: number;
  totalOmsetNet: number;
  totalKomisi: number;
  targetGaji: number;
  selisihGaji: number;
  totalProdukRp: number;
}

// Data acuan riil Cendrawasih untuk baseline
const BASELINE_DATA: Record<string, Partial<BarberMatrixRow>> = {
  UDIN: {
    qty: {
      hc_70: 1, hc_85: 27, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 3, prod_tonic: 0, prod_powder: 1,
    },
    totalRp: {
      hc_70: 70, hc_85: 2295, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 450, prod_tonic: 0, prod_powder: 150,
    },
    komisiRp: {
      hc_70: 14, hc_85: 573.75, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
    },
    omset: 2365,
    pengeluaran: 0,
    totalOmsetNet: 2365,
    totalKomisi: 587.75,
    targetGaji: 2587.75,
    selisihGaji: -222.75,
    totalProdukRp: 600,
  },
  ACEL: {
    qty: {
      hc_70: 6, hc_85: 24, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 1, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    totalRp: {
      hc_70: 420, hc_85: 2040, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 350, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    komisiRp: {
      hc_70: 84, hc_85: 510, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
    },
    omset: 2810,
    pengeluaran: 75,
    totalOmsetNet: 2735,
    totalKomisi: 594,
    targetGaji: 2594,
    selisihGaji: 141,
    totalProdukRp: 0,
  },
  ATTA: {
    qty: {
      hc_70: 4, hc_85: 20, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 1, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    totalRp: {
      hc_70: 280, hc_85: 1700, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 450, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    komisiRp: {
      hc_70: 56, hc_85: 425, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
    },
    omset: 2430,
    pengeluaran: 0,
    totalOmsetNet: 2430,
    totalKomisi: 481,
    targetGaji: 2481,
    selisihGaji: -51,
    totalProdukRp: 0,
  },
  NOEL: {
    qty: {
      hc_70: 3, hc_85: 19, hc_120: 0, hc_150: 0,
      pm_350: 1, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    totalRp: {
      hc_70: 210, hc_85: 1615, hc_120: 0, hc_150: 0,
      pm_350: 350, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    komisiRp: {
      hc_70: 42, hc_85: 403.75, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
    },
    omset: 2175,
    pengeluaran: 0,
    totalOmsetNet: 2175,
    totalKomisi: 445.75,
    targetGaji: 2445.75,
    selisihGaji: -270.75,
    totalProdukRp: 0,
  },
  ASWAR: {
    qty: {
      hc_70: 1, hc_85: 11, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    totalRp: {
      hc_70: 70, hc_85: 935, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
      prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
    },
    komisiRp: {
      hc_70: 0, hc_85: 1005, hc_120: 0, hc_150: 0,
      pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
      st_40: 0, st_50: 0, st_100: 0,
      cl_350: 0, cl_450: 0, cl_550: 0,
    },
    omset: 1005,
    pengeluaran: 0,
    totalOmsetNet: 1005,
    totalKomisi: 1005,
    targetGaji: 301.5,
    selisihGaji: 703.5,
    totalProdukRp: 0,
  },
};

export const OwnerPerformanceMatrixTable: React.FC<OwnerPerformanceMatrixTableProps> = ({
  transactions,
  employees,
  initialMonth = '2026-10',
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);

  // Filter transaksi untuk bulan terpilih
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.created_at && t.created_at.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Daftar nama Capster unik
  const capsterList = useMemo(() => {
    const list = ['UDIN', 'ACEL', 'ATTA', 'NOEL', 'ASWAR'];
    employees.forEach((emp) => {
      if (emp.role === 'karyawan') {
        const uName = emp.name.toUpperCase().replace('CAPSTER', '').trim();
        if (uName && !list.includes(uName)) {
          list.push(uName);
        }
      }
    });
    return list;
  }, [employees]);

  // Kalkulasi data per Capster secara dinamis
  const matrixData: BarberMatrixRow[] = useMemo(() => {
    const daysInMonth = new Date(
      Number(selectedMonth.split('-')[0]),
      Number(selectedMonth.split('-')[1]),
      0
    ).getDate();
    const periodStr = `01/${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]} - ${daysInMonth}/${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;

    return capsterList.map((cName) => {
      // Cek apakah ada transaksi realtime untuk capster ini
      const cTrx = monthTransactions.filter((t) => {
        const tName = (t.barber_name || '').toUpperCase();
        return tName.includes(cName);
      });

      // Default baseline jika belum ada transaksi di bulan tersebut
      const base = BASELINE_DATA[cName];

      if (cTrx.length === 0 && base) {
        return {
          name: cName,
          periodText: periodStr,
          qty: { ...base.qty! },
          totalRp: { ...base.totalRp! },
          komisiRp: { ...base.komisiRp! },
          omset: base.omset || 0,
          pengeluaran: base.pengeluaran || 0,
          totalOmsetNet: base.totalOmsetNet || 0,
          totalKomisi: base.totalKomisi || 0,
          targetGaji: base.targetGaji || 0,
          selisihGaji: base.selisihGaji || 0,
          totalProdukRp: base.totalProdukRp || 0,
        };
      }

      // Hitung dinamis dari transaksi
      const row: BarberMatrixRow = {
        name: cName,
        periodText: periodStr,
        qty: {
          hc_70: 0, hc_85: 0, hc_120: 0, hc_150: 0,
          pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
          st_40: 0, st_50: 0, st_100: 0,
          cl_350: 0, cl_450: 0, cl_550: 0,
          prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
        },
        totalRp: {
          hc_70: 0, hc_85: 0, hc_120: 0, hc_150: 0,
          pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
          st_40: 0, st_50: 0, st_100: 0,
          cl_350: 0, cl_450: 0, cl_550: 0,
          prod_pomade: 0, prod_tonic: 0, prod_powder: 0,
        },
        komisiRp: {
          hc_70: 0, hc_85: 0, hc_120: 0, hc_150: 0,
          pm_350: 0, pm_435: 0, pm_550: 0, pm_635: 0,
          st_40: 0, st_50: 0, st_100: 0,
          cl_350: 0, cl_450: 0, cl_550: 0,
        },
        omset: 0,
        pengeluaran: base?.pengeluaran || 0,
        totalOmsetNet: 0,
        totalKomisi: 0,
        targetGaji: 2500, // Standar target 2.5 juta
        selisihGaji: 0,
        totalProdukRp: 0,
      };

      cTrx.forEach((t) => {
        try {
          const items = Array.isArray(t.items)
            ? t.items
            : JSON.parse((t as unknown as {items_json?: string}).items_json || '[]');
          items.forEach((it: {service_name: string; price: number; qty?: number}) => {
            const price = Math.round(it.price / 1000);
            const sName = (it.service_name || '').toLowerCase();
            const count = it.qty || 1;

            if (sName.includes('pomade')) {
              row.qty.prod_pomade += count;
              row.totalRp.prod_pomade += price * count;
            } else if (sName.includes('tonic')) {
              row.qty.prod_tonic += count;
              row.totalRp.prod_tonic += price * count;
            } else if (sName.includes('powder')) {
              row.qty.prod_powder += count;
              row.totalRp.prod_powder += price * count;
            } else if (price === 70) {
              row.qty.hc_70 += count;
              row.totalRp.hc_70 += 70 * count;
              row.komisiRp.hc_70 += 14 * count; // 20%
            } else if (price === 85) {
              row.qty.hc_85 += count;
              row.totalRp.hc_85 += 85 * count;
              row.komisiRp.hc_85 += 21.25 * count; // 25%
            } else if (price === 120) {
              row.qty.hc_120 += count;
              row.totalRp.hc_120 += 120 * count;
              row.komisiRp.hc_120 += 36 * count;
            } else if (price === 150) {
              row.qty.hc_150 += count;
              row.totalRp.hc_150 += 150 * count;
              row.komisiRp.hc_150 += 45 * count; // 30%
            } else if (price === 350) {
              if (sName.includes('color')) {
                row.qty.cl_350 += count;
                row.totalRp.cl_350 += 350 * count;
              } else {
                row.qty.pm_350 += count;
                row.totalRp.pm_350 += 350 * count;
              }
            } else if (price === 435) {
              row.qty.pm_435 += count;
              row.totalRp.pm_435 += 435 * count;
            } else if (price === 450) {
              row.qty.cl_450 += count;
              row.totalRp.cl_450 += 450 * count;
            } else if (price === 550) {
              if (sName.includes('color')) {
                row.qty.cl_550 += count;
                row.totalRp.cl_550 += 550 * count;
              } else {
                row.qty.pm_550 += count;
                row.totalRp.pm_550 += 550 * count;
              }
            } else if (price === 635) {
              row.qty.pm_635 += count;
              row.totalRp.pm_635 += 635 * count;
            } else if (price === 40) {
              row.qty.st_40 += count;
              row.totalRp.st_40 += 40 * count;
            } else if (price === 50) {
              row.qty.st_50 += count;
              row.totalRp.st_50 += 50 * count;
            } else if (price === 100) {
              row.qty.st_100 += count;
              row.totalRp.st_100 += 100 * count;
            }
          });
        } catch {}
      });

      // Hitung Omset
      row.omset =
        row.totalRp.hc_70 + row.totalRp.hc_85 + row.totalRp.hc_120 + row.totalRp.hc_150 +
        row.totalRp.pm_350 + row.totalRp.pm_435 + row.totalRp.pm_550 + row.totalRp.pm_635 +
        row.totalRp.st_40 + row.totalRp.st_50 + row.totalRp.st_100 +
        row.totalRp.cl_350 + row.totalRp.cl_450 + row.totalRp.cl_550;

      row.totalProdukRp = row.totalRp.prod_pomade + row.totalRp.prod_tonic + row.totalRp.prod_powder;
      row.totalOmsetNet = row.omset - row.pengeluaran;

      row.totalKomisi =
        row.komisiRp.hc_70 + row.komisiRp.hc_85 + row.komisiRp.hc_120 + row.komisiRp.hc_150 +
        row.komisiRp.pm_350 + row.komisiRp.pm_435 + row.komisiRp.pm_550 + row.komisiRp.pm_635 +
        row.komisiRp.st_40 + row.komisiRp.st_50 + row.komisiRp.st_100 +
        row.komisiRp.cl_350 + row.komisiRp.cl_450 + row.komisiRp.cl_550;

      row.selisihGaji = row.totalKomisi - row.targetGaji;

      return row;
    });
  }, [capsterList, monthTransactions, selectedMonth]);

  // Grand Total Akumulasi Seluruh Capster
  const grandTotal = useMemo(() => {
    let omsetKotor = 0;
    let pengeluaranCapster = 0;
    let totalProduk = 0;
    matrixData.forEach((m) => {
      omsetKotor += m.omset;
      pengeluaranCapster += m.pengeluaran;
      totalProduk += m.totalProdukRp;
    });

    const pengeluaranBarber = 732; // Operasional toko
    const gajiNurul = -3500;
    const totalGaji = matrixData.reduce((s, m) => s + m.selisihGaji, 0) + gajiNurul;
    const labaBersih = omsetKotor - pengeluaranBarber + totalGaji;

    return {
      omsetKotor,
      pengeluaranBarber,
      totalGaji,
      totalProduk,
      pengeluaranCapster,
      labaBersih,
      uangTunai: 3063,
      qris: 2705,
      qiMandiri: 0,
      transfer: 1085,
      totalMetode: 3790,
    };
  }, [matrixData]);

  const formatK = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNeg ? `-Rp${formatted}` : `Rp${formatted}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD & FILTER BULAN */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCA842]/15 border border-[#DCA842]/30 text-[#DCA842] shadow-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Rekapan Detail Kinerja Barber &amp; Laporan Omzet</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Format Spreadsheet Resmi
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sesuai format Excel Cendrawasih: breakdown Haircut, Perming, Styling, Color, Produk, Komisi &amp; Gaji Net
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#C5922E]" />
            <span>Pilih Bulan:</span>
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-1.5 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-sm focus:border-[#DCA842] focus:outline-none"
          />
        </div>
      </div>

      {/* SPREADSHEET VIEWPORT */}
      <div className="rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden shadow-xl">
        {/* Indikator Geser Horizontal untuk Layar HP / Tablet */}
        <div className="lg:hidden px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>👉</span>
            <span>Geser tabel ke samping untuk melihat seluruh 17 kolom</span>
          </span>
          <span className="rounded bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-mono font-bold">
            Scroll ⇄
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[10px] sm:text-[11px] md:text-xs tabular-nums text-zinc-900 select-none">
            {/* THEAD SPESIAL DENGAN WARNA EXCEL ASLI */}
            <thead>
              <tr className="border-b border-black text-center font-bold">
                <th rowSpan={2} className="border border-black bg-[#FF0000] text-white px-3 py-2 whitespace-nowrap min-w-[140px]">
                  TANGGAL
                </th>
                <th rowSpan={2} className="border border-black bg-[#FF0000] text-white px-3 py-2 whitespace-nowrap min-w-[80px]">
                  NAMA
                </th>

                {/* HAIRCUT (Kuning) */}
                <th colSpan={4} className="border border-black bg-[#FFFF00] text-black px-2 py-1 text-center font-bold">
                  HAIRCUT
                </th>

                {/* HAIR PERMING (Hijau Terang) */}
                <th colSpan={4} className="border border-black bg-[#92D050] text-black px-2 py-1 text-center font-bold">
                  HAIR PERMING
                </th>

                {/* STAYLING (Pink / Magenta) */}
                <th colSpan={3} className="border border-black bg-[#FF00FF] text-white px-2 py-1 text-center font-bold">
                  STAYLING
                </th>

                {/* HAIR COLOR (Hijau Muda) */}
                <th colSpan={3} className="border border-black bg-[#00B050] text-white px-2 py-1 text-center font-bold">
                  HAIR COLOR
                </th>

                {/* OMSET & TOTAL (Merah Gelap) */}
                <th rowSpan={2} className="border border-black bg-[#C00000] text-white px-2.5 py-1 text-center font-bold">
                  OMSET
                </th>
                <th rowSpan={2} className="border border-black bg-[#C00000] text-white px-2 py-1 text-center font-bold text-[10px]">
                  pengeluaran
                </th>
                <th rowSpan={2} className="border border-black bg-[#C00000] text-white px-2.5 py-1 text-center font-bold">
                  TOTAL
                </th>

                {/* PENJUALAN PRODUK (Biru Muda) */}
                <th colSpan={3} className="border border-black bg-[#FF0000] text-white px-2 py-1 text-center font-bold">
                  PENJUALAN PRODUK
                </th>
                <th rowSpan={2} className="border border-black bg-[#00B0F0] text-black px-2 py-1 text-center font-bold text-[10px]">
                  TOTAL
                </th>
              </tr>

              {/* BARIS SUB-HARGA */}
              <tr className="border-b border-black text-center font-bold text-black">
                {/* Haircut sub */}
                <th className="border border-black bg-[#FFFF00] px-2 py-1">70</th>
                <th className="border border-black bg-[#FFFF00] px-2 py-1">85</th>
                <th className="border border-black bg-[#FFFF00] px-2 py-1">120</th>
                <th className="border border-black bg-[#FFFF00] px-2 py-1">150</th>

                {/* Perming sub */}
                <th className="border border-black bg-[#92D050] px-2 py-1">350</th>
                <th className="border border-black bg-[#92D050] px-2 py-1">435</th>
                <th className="border border-black bg-[#92D050] px-2 py-1">550</th>
                <th className="border border-black bg-[#92D050] px-2 py-1">635</th>

                {/* Styling sub */}
                <th className="border border-black bg-[#FF00FF] text-white px-2 py-1">40</th>
                <th className="border border-black bg-[#FF00FF] text-white px-2 py-1">50</th>
                <th className="border border-black bg-[#FF00FF] text-white px-2 py-1">100</th>

                {/* Color sub */}
                <th className="border border-black bg-[#00B050] text-white px-2 py-1">350</th>
                <th className="border border-black bg-[#00B050] text-white px-2 py-1">450</th>
                <th className="border border-black bg-[#00B050] text-white px-2 py-1">550</th>

                {/* Produk sub */}
                <th className="border border-black bg-[#D9E1F2] px-2 py-1 text-[10px]">POMADE</th>
                <th className="border border-black bg-[#D9E1F2] px-2 py-1 text-[10px]">HAIRTONIC</th>
                <th className="border border-black bg-[#D9E1F2] px-2 py-1 text-[10px]">POWDER</th>
              </tr>
            </thead>

            {/* TBODY: BLOK PER-CAPSTER */}
            <tbody>
              {matrixData.map((c) => (
                <React.Fragment key={c.name}>
                  {/* BARIS 1: QTY KINERJA */}
                  <tr className="bg-white hover:bg-zinc-100 transition-colors">
                    <td className="border border-black px-2 py-1 text-center font-sans text-[10px] font-semibold">
                      {c.periodText}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-sans font-bold bg-zinc-50">
                      {c.name}
                    </td>

                    <td className="border border-black px-2 py-1 text-center">{c.qty.hc_70 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center font-bold text-blue-700">{c.qty.hc_85 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.hc_120 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.hc_150 || 0}</td>

                    <td className="border border-black px-2 py-1 text-center">{c.qty.pm_350 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.pm_435 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.pm_550 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.pm_635 || 0}</td>

                    <td className="border border-black px-2 py-1 text-center">{c.qty.st_40 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.st_50 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.st_100 || 0}</td>

                    <td className="border border-black px-2 py-1 text-center">{c.qty.cl_350 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.cl_450 || 0}</td>
                    <td className="border border-black px-2 py-1 text-center">{c.qty.cl_550 || 0}</td>

                    <td className="border border-black px-2 py-1 text-right font-bold bg-amber-50/60">
                      {formatK(c.omset)}
                    </td>
                    <td className="border border-black px-2 py-1 text-right text-rose-600">
                      {formatK(c.pengeluaran)}
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold bg-amber-100/70">
                      {formatK(c.totalOmsetNet)}
                    </td>

                    <td className="border border-black px-2 py-1 text-right">{formatK(c.totalRp.prod_pomade)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatK(c.totalRp.prod_tonic)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatK(c.totalRp.prod_powder)}</td>
                    <td className="border border-black px-2 py-1 text-right font-bold bg-blue-50">
                      {c.totalProdukRp > 0 ? formatK(c.totalProdukRp) : ''}
                    </td>
                  </tr>

                  {/* BARIS 2: TOTAL (RP) */}
                  <tr className="bg-zinc-50/70">
                    <td className="border border-black px-2 py-1 text-center font-sans font-semibold text-zinc-500" />
                    <td className="border border-black px-2 py-1 text-left font-sans font-bold text-zinc-700">
                      total
                    </td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.hc_70)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px] font-bold text-blue-900">{formatK(c.totalRp.hc_85)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.hc_120)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.hc_150)}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.pm_350)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.pm_435)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.pm_550)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.pm_635)}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.st_40)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.st_50)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.st_100)}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.cl_350)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.cl_450)}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{formatK(c.totalRp.cl_550)}</td>

                    <td className="border border-black px-2 py-1 text-right font-bold bg-amber-50/60" />
                    <td className="border border-black px-2 py-1 text-right" />
                    <td className="border border-black px-2 py-1 text-right font-bold bg-amber-100/70" />

                    <td className="border border-black px-2 py-1" />
                    <td className="border border-black px-2 py-1" />
                    <td className="border border-black px-2 py-1" />
                    <td className="border border-black px-2 py-1 text-right font-bold bg-[#00B0F0]/20">
                      {c.totalProdukRp > 0 ? formatK(c.totalProdukRp) : ''}
                    </td>
                  </tr>

                  {/* BARIS 3: KOMISI & GAJI NET */}
                  <tr className="bg-amber-50/40 border-b-2 border-zinc-500">
                    <td className="border border-black px-2 py-1 text-center font-sans font-semibold text-zinc-500" />
                    <td className="border border-black px-2 py-1 text-left font-sans font-bold text-amber-900">
                      komisi
                    </td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.hc_70 ? formatK(c.komisiRp.hc_70) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px] font-bold text-emerald-800">{c.komisiRp.hc_85 ? formatK(c.komisiRp.hc_85) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.hc_120 ? formatK(c.komisiRp.hc_120) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.hc_150 ? formatK(c.komisiRp.hc_150) : ''}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.pm_350 ? formatK(c.komisiRp.pm_350) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.pm_435 ? formatK(c.komisiRp.pm_435) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.pm_550 ? formatK(c.komisiRp.pm_550) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.pm_635 ? formatK(c.komisiRp.pm_635) : ''}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.st_40 ? formatK(c.komisiRp.st_40) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.st_50 ? formatK(c.komisiRp.st_50) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.st_100 ? formatK(c.komisiRp.st_100) : ''}</td>

                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.cl_350 ? formatK(c.komisiRp.cl_350) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.cl_450 ? formatK(c.komisiRp.cl_450) : ''}</td>
                    <td className="border border-black px-2 py-1 text-right text-[10px]">{c.komisiRp.cl_550 ? formatK(c.komisiRp.cl_550) : ''}</td>

                    {/* Total Komisi */}
                    <td className="border border-black px-2 py-1 text-right font-bold text-emerald-800 bg-emerald-50">
                      {formatK(c.totalKomisi)}
                    </td>

                    {/* Target / Gaji Acuan */}
                    <td className="border border-black px-2 py-1 text-right font-semibold text-zinc-600 bg-zinc-100">
                      {formatK(c.targetGaji)}
                    </td>

                    {/* Selisih Gaji Net */}
                    <td className={`border border-black px-2 py-1 text-right font-bold ${
                      c.selisihGaji >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                    }`}>
                      {formatK(c.selisihGaji)}
                    </td>

                    <td className="border border-black px-2 py-1" />
                    <td className="border border-black px-2 py-1 font-bold text-center text-zinc-700 font-sans text-[10px]">
                      TOTAL
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold bg-[#00B0F0]/25">
                      {c.totalProdukRp > 0 ? formatK(c.totalProdukRp) : ''}
                    </td>
                    <td className="border border-black px-2 py-1" />
                  </tr>
                </React.Fragment>
              ))}

              {/* SEKSI KASIR (NURUL) */}
              <tr className="border-t-2 border-black">
                <td className="border border-black bg-[#00B050] text-white px-2 py-1.5 text-center font-bold">
                  TANGGAL
                </td>
                <td className="border border-black bg-[#00B050] text-white px-2 py-1.5 text-center font-bold">
                  NAMA
                </td>
                <td colSpan={2} className="border border-black bg-[#00B050] text-white px-2 py-1.5 text-center font-bold">
                  KASIR
                </td>
                <td colSpan={18} className="border border-black bg-zinc-100" />
              </tr>
              <tr className="bg-white">
                <td className="border border-black px-2 py-1.5 text-center font-sans text-[10px]">
                  01/10/2026-31/10/2026
                </td>
                <td className="border border-black px-2 py-1.5 text-center font-sans font-bold">
                  NURUL
                </td>
                <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-bold text-rose-700 bg-rose-50">
                  -Rp3.500,00
                </td>
                <td colSpan={18} className="border border-black bg-zinc-50" />
              </tr>
              <tr className="bg-zinc-50">
                <td colSpan={2} className="border border-black bg-[#0070C0] text-white px-2 py-1 text-left font-sans text-[10px] font-bold">
                  pembayaran via trasfer
                </td>
                <td colSpan={2} className="border border-black bg-[#0070C0] text-white px-2 py-1 text-right font-bold">
                  Rp0,00
                </td>
                <td colSpan={18} className="border border-black bg-zinc-50" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL RINGKASAN GRAND TOTAL KEUANGAN BULANAN */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-black space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[11px] tabular-nums text-zinc-950 border border-black">
              <thead>
                <tr className="bg-[#FFFF00] font-bold text-center border-b border-black text-black">
                  <th className="border border-black px-3 py-2">TOTAL OMSET KOTOR</th>
                  <th className="border border-black px-3 py-2">PENGELUARA BARBER</th>
                  <th colSpan={7} className="border border-black px-3 py-2 bg-[#FFFF00]">
                    GAJI KARYAWAN
                  </th>
                  <th className="border border-black px-3 py-2">PENJUALAN PRODAK</th>
                  <th className="border border-black px-3 py-2">PENGELUARAN CAPSTER</th>
                  <th className="border border-black px-3 py-2 bg-[#FFFF00]">LABA BERISH</th>
                  <th className="border border-black px-3 py-2">UANG TUNAI</th>
                  <th className="border border-black px-3 py-2">QRIS</th>
                  <th className="border border-black px-3 py-2">QI MANDIRI</th>
                  <th className="border border-black px-3 py-2">TRANSFER</th>
                  <th className="border border-black px-3 py-2 bg-[#FFFF00]">TOTAL</th>
                </tr>
                <tr className="bg-[#FFFF00] text-[10px] font-bold text-center border-b border-black text-black">
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  {/* Nama-nama Karyawan */}
                  <th className="border border-black px-2 py-1">UDIN</th>
                  <th className="border border-black px-2 py-1">ACEL</th>
                  <th className="border border-black px-2 py-1">ATTA</th>
                  <th className="border border-black px-2 py-1">NOEL</th>
                  <th className="border border-black px-2 py-1">ASWAR</th>
                  <th className="border border-black px-2 py-1">NURUL</th>
                  <th className="border border-black px-2 py-1 bg-amber-200">TOTAL</th>
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                  <th className="border border-black px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white font-bold text-right">
                  <td className="border border-black px-3 py-2 text-center text-sm font-extrabold text-blue-900 bg-amber-50">
                    {formatK(grandTotal.omsetKotor)}
                  </td>
                  <td className="border border-black px-3 py-2 text-rose-700 bg-rose-50">
                    {formatK(grandTotal.pengeluaranBarber)}
                  </td>

                  {/* Rincian Gaji Capster */}
                  <td className="border border-black px-2 py-2 text-[10px] text-rose-700 bg-rose-50/50">
                    -Rp222,75
                  </td>
                  <td className="border border-black px-2 py-2 text-[10px] text-emerald-700 bg-emerald-50/50">
                    Rp141,00
                  </td>
                  <td className="border border-black px-2 py-2 text-[10px] text-rose-700 bg-rose-50/50">
                    -Rp51,00
                  </td>
                  <td className="border border-black px-2 py-2 text-[10px] text-rose-700 bg-rose-50/50">
                    -Rp270,75
                  </td>
                  <td className="border border-black px-2 py-2 text-[10px] text-emerald-700 bg-emerald-50/50">
                    Rp703,50
                  </td>
                  <td className="border border-black px-2 py-2 text-[10px] text-rose-700 bg-rose-50/50">
                    -Rp3.500,00
                  </td>
                  <td className="border border-black px-2 py-2 text-[11px] font-extrabold text-rose-800 bg-[#FFFF00]/40">
                    -Rp3.200,00
                  </td>

                  <td className="border border-black px-3 py-2 text-blue-800">
                    {formatK(grandTotal.totalProduk)}
                  </td>
                  <td className="border border-black px-3 py-2">
                    {formatK(grandTotal.pengeluaranCapster)}
                  </td>
                  <td className="border border-black px-3 py-2 font-extrabold text-emerald-800 text-sm bg-emerald-100">
                    {formatK(grandTotal.labaBersih)}
                  </td>

                  {/* Rincian Metode Pembayaran */}
                  <td className="border border-black px-2.5 py-2 text-zinc-900">{formatK(grandTotal.uangTunai)}</td>
                  <td className="border border-black px-2.5 py-2 text-zinc-900">{formatK(grandTotal.qris)}</td>
                  <td className="border border-black px-2.5 py-2 text-zinc-900">{formatK(grandTotal.qiMandiri)}</td>
                  <td className="border border-black px-2.5 py-2 text-zinc-900">{formatK(grandTotal.transfer)}</td>
                  <td className="border border-black px-3 py-2 font-extrabold text-blue-900 bg-blue-100">
                    {formatK(grandTotal.totalMetode)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL BONUS KHUSUS TARGET BULANAN 85 */}
          <div className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-black shadow-md">
            <table className="w-full border-collapse font-mono text-[11px] tabular-nums text-black">
              <thead>
                <tr className="bg-[#FF0000] text-white font-bold text-center border-b border-black">
                  <th className="border border-black px-3 py-1.5">TARGET BULANAN KHUSUS 85</th>
                  <th className="border border-black px-3 py-1.5">BONUS</th>
                </tr>
              </thead>
              <tbody className="font-semibold">
                <tr className="bg-red-50 hover:bg-red-100/80">
                  <td className="border border-black px-3 py-1 text-left">100 PELANGGAN</td>
                  <td className="border border-black px-3 py-1 text-right font-bold text-emerald-700">Rp200,00</td>
                </tr>
                <tr className="bg-red-50 hover:bg-red-100/80">
                  <td className="border border-black px-3 py-1 text-left">150 PELANGGAN</td>
                  <td className="border border-black px-3 py-1 text-right font-bold text-emerald-700">Rp500,00</td>
                </tr>
                <tr className="bg-red-50 hover:bg-red-100/80">
                  <td className="border border-black px-3 py-1 text-left">200 PELANGGAN</td>
                  <td className="border border-black px-3 py-1 text-right font-bold text-emerald-700">Rp1.000,00</td>
                </tr>
                <tr className="bg-red-50 hover:bg-red-100/80">
                  <td className="border border-black px-3 py-1 text-left">300 PELANGGAN</td>
                  <td className="border border-black px-3 py-1 text-right font-bold text-emerald-700">Rp2.500,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
