import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  DollarSign,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Package,
  Receipt,
  Save,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useState} from 'react';
import type {
  AttendanceRecord,
  Branch,
  Employee,
  InventoryDailyLog,
  PeriodDayRow,
  PeriodReportSummary,
  Transaction,
} from '../types.ts';
import {
  generateMonthlyAttendanceMatrix,
  TEMPLATE_CAPSTERS,
  TEMPLATE_EXPENSES,
} from '../utils/barberTemplateData.ts';
import {downloadPeriodExcel} from '../utils/excelExport.ts';
import {downloadPeriodPdf, generateReportFilename} from '../utils/pdfExport.ts';
import {formatRupiah, getTodayISO} from '../utils/format.ts';

export interface ExcelPeriodReportProps {
  branches: Branch[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  transactions?: Transaction[];
}

function getMonthBounds(yyyyMm: string): {start: string; end: string} {
  const [yStr, mStr] = yyyyMm.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${yStr}-${mStr}-01`,
    end: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

function getWeekBounds(anchorDate: string): {start: string; end: string} {
  const d = new Date(`${anchorDate}T00:00:00`);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return {start: fmt(monday), end: fmt(sunday)};
}

type SheetViewType = 'capster' | 'absensi' | 'pengeluaran' | 'stok' | 'keuangan';

export const ExcelPeriodReport: React.FC<ExcelPeriodReportProps> = ({
  branches,
  employees,
  attendance,
  transactions,
}) => {
  const today = getTodayISO();
  const [mode, setMode] = useState<'monthly' | 'weekly'>('monthly');
  const [monthValue, setMonthValue] = useState(today.slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [branchId, setBranchId] = useState('ALL');
  const [sheetView, setSheetView] = useState<SheetViewType>('capster');
  const [selectedCapsterTab, setSelectedCapsterTab] = useState<string>('ALL');
  const [report, setReport] = useState<PeriodReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  // Edit modal for daily inventory row
  const [editingRow, setEditingRow] = useState<PeriodDayRow | null>(null);
  const [editBranchId, setEditBranchId] = useState(branches[0]?.id || 'br-samratulangi');
  const [editInv, setEditInv] = useState<Omit<InventoryDailyLog, 'id' | 'branch_id' | 'date'> | null>(null);
  const [savingInv, setSavingInv] = useState(false);

  const bounds = mode === 'monthly' ? getMonthBounds(monthValue) : getWeekBounds(weekAnchor);

  const loadPeriodReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode,
        startDate: bounds.start,
        endDate: bounds.end,
        branchId,
      });
      const res = await fetch(`/api/reports/period?${params.toString()}`);
      if (res.ok) {
        setReport(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [mode, bounds.start, bounds.end, branchId]);

  useEffect(() => {
    loadPeriodReport();
  }, [loadPeriodReport]);

  const shiftWeek = (deltaDays: number) => {
    const d = new Date(`${weekAnchor}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setWeekAnchor(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  };

  const handleDownloadExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await downloadPeriodExcel({
        report,
        monthYear: monthValue,
        employees,
        attendance,
        transactions,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = () => {
    setExportingPdf(true);
    const period = mode === 'monthly' ? monthValue : `${bounds.start}_sd_${bounds.end}`;
    const filename = generateReportFilename('laporan_cendrawasih', period);
    const title = mode === 'monthly'
      ? `Laporan Bulanan ${monthValue}`
      : `Laporan Mingguan ${bounds.start} s.d. ${bounds.end}`;
    setTimeout(() => {
      downloadPeriodPdf({elementId: 'laporan-pdf-content', filename, title});
      setExportingPdf(false);
    }, 150);
  };

  const handleBackup = async (type: 'db' | 'json') => {
    setBackingUp(true);
    setBackupMsg('');
    try {
      const url = type === 'db' ? '/api/backup/download' : '/api/backup/json';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `backup_${type}_${new Date().toISOString().slice(0, 10)}.${type === 'db' ? 'db' : 'json'}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setBackupMsg(`✓ Backup ${type.toUpperCase()} berhasil diunduh`);
    } catch {
      setBackupMsg('✗ Gagal membuat backup');
    } finally {
      setBackingUp(false);
      setTimeout(() => setBackupMsg(''), 4000);
    }
  };

  const openEditRow = (row: PeriodDayRow) => {
    setEditingRow(row);
    setEditBranchId(branchId !== 'ALL' ? branchId : branches[0]?.id || 'br-samratulangi');
    const {id: _id, branch_id: _b, date: _d, ...rest} = row.inventory;
    setEditInv(rest);
  };

  const handleSaveInventoryRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow || !editInv) return;
    setSavingInv(true);
    try {
      const res = await fetch('/api/inventory/daily', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          branch_id: editBranchId,
          date: editingRow.date,
          ...editInv,
        }),
      });
      if (res.ok) {
        setEditingRow(null);
        await loadPeriodReport();
      }
    } finally {
      setSavingInv(false);
    }
  };

  const attendanceMatrix = generateMonthlyAttendanceMatrix(monthValue);
  const totalGrossCapsters = TEMPLATE_CAPSTERS.reduce((s, c) => s + c.totalRpK.total * 1000, 0);
  const totalExpenses = TEMPLATE_EXPENSES.reduce((s, e) => s + e.price_k * 1000, 0);
  const netIncomeCalc = totalGrossCapsters - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#C5922E]" />
              <span>Laporan Lengkap &amp; Rekapan Bulanan (Format Excel)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Rekapan per-capster (haircut, perming, styling, color, produk), rekapan absensi harian, pengeluaran operasional, stok barang, dan ekspor .xlsx
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Weekly / Monthly Mode Switch */}
            <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                type="button"
                onClick={() => setMode('monthly')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'monthly'
                    ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setMode('weekly')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'weekly'
                    ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                Mingguan
              </button>
            </div>

            {/* Period Picker */}
            {mode === 'monthly' ? (
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
              />
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 px-2 py-1">
                <button
                  type="button"
                  onClick={() => shiftWeek(-7)}
                  className="rounded p-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                  aria-label="Minggu sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="inline-flex items-center gap-1.5 px-2 font-mono text-xs font-semibold text-[#09090B] dark:text-zinc-100 tabular-nums">
                  <Calendar className="h-3.5 w-3.5 text-[#C5922E]" />
                  {bounds.start} s/d {bounds.end}
                </span>
                <button
                  type="button"
                  onClick={() => shiftWeek(7)}
                  className="rounded p-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                  aria-label="Minggu berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Branch Filter */}
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
            >
              <option value="ALL">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Download .xlsx Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={!report || exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#09090B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#18181B] dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#DCA842] dark:text-zinc-950" />
              <span>{exporting ? 'Menyiapkan...' : 'Unduh Excel (.xlsx)'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!report || exportingPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>{exportingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF (.pdf)'}</span>
            </button>

            {/* Backup Dropdown */}
            <div className="relative group">
              <button
                type="button"
                disabled={backingUp}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <HardDrive className="h-4 w-4 text-blue-500" />
                <span>{backingUp ? 'Backup...' : 'Backup Data'}</span>
              </button>
              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-1 z-30 hidden group-hover:block min-w-[210px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1">
                <button
                  type="button"
                  onClick={() => handleBackup('db')}
                  disabled={backingUp}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <HardDrive className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold">Backup Database (.db)</p>
                    <p className="text-zinc-400 text-[10px]">File SQLite lengkap semua data</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleBackup('json')}
                  disabled={backingUp}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Database className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold">Backup JSON (.json)</p>
                    <p className="text-zinc-400 text-[10px]">Semua data dalam format JSON</p>
                  </div>
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800 mx-2 my-1" />
                <div className="px-4 py-2 text-[10px] text-zinc-400">
                  🔄 Auto-backup setiap hari jam 02:00 WIT
                </div>
              </div>
              {backupMsg && (
                <p className={`absolute right-0 top-full mt-1 z-40 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg whitespace-nowrap ${
                  backupMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {backupMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Strip (Sesuai Kalkulasi Real Template) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70 px-4 py-3">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>Total Omzet Capster (Laba Kotor)</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-[#09090B] dark:text-white tabular-nums">
              {formatRupiah(totalGrossCapsters)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">5 Capster (Udin, Atta, Noel, Aswar, Acel)</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70 px-4 py-3">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Total Pengeluaran Operasional</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatRupiah(totalExpenses)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">23 Item (Listrik, Sampo, Tisu, Perming dll)</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70 px-4 py-3">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>Tingkat Kehadiran Karyawan</span>
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-[#09090B] dark:text-white tabular-nums">
              92% Rata-rata
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">27 Hari Kerja Aktif (Senin - Sabtu)</p>
          </div>

          <div className="rounded-xl bg-[#09090B] px-4 py-3 text-white border border-[#27272A]">
            <p className="text-[11px] text-zinc-300">Laba Bersih Operasional</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#DCA842] tabular-nums">
              {formatRupiah(netIncomeCalc)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Omzet Kotor - Beban Operasional</p>
          </div>
        </div>
      </div>

      {/* Sheet Switcher & Spreadsheet Viewport */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-sm">
        {/* Navigation Tabs for Sheets */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/70 px-5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSheetView('capster')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                sheetView === 'capster'
                  ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-sm'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-[#C5922E]" />
              <span>Sheet 1: Rekap Capster (Sesuai Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetView('absensi')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                sheetView === 'absensi'
                  ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-sm'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>Sheet 2: Rekapan Absensi Bulanan</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetView('pengeluaran')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                sheetView === 'pengeluaran'
                  ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-sm'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Sheet 3: Pengeluaran Operasional</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetView('stok')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                sheetView === 'stok'
                  ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-sm'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-amber-500" />
              <span>Sheet 4: Stok &amp; Produk</span>
            </button>

            <button
              type="button"
              onClick={() => setSheetView('keuangan')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                sheetView === 'keuangan'
                  ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-sm'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              <span>Sheet 5: Keuangan &amp; Pangkas</span>
            </button>
          </div>

          {sheetView === 'capster' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 mr-1">Filter Capster:</span>
              <button
                type="button"
                onClick={() => setSelectedCapsterTab('ALL')}
                className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  selectedCapsterTab === 'ALL'
                    ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                    : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                }`}
              >
                Semua
              </button>
              {TEMPLATE_CAPSTERS.map((c) => (
                <button
                  key={c.capsterName}
                  type="button"
                  onClick={() => setSelectedCapsterTab(c.capsterName)}
                  className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    selectedCapsterTab === c.capsterName
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {c.capsterName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* VIEWPORT BODY */}
        {loading || !report ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Memuat tabel laporan Excel...</div>
        ) : sheetView === 'capster' ? (
          /* =========================================================
             TAB 1: REKAP CAPSTER (UDIN, ATTA, NOEL, ASWAR, ACEL)
             ========================================================= */
          <div className="p-4 space-y-8 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            {TEMPLATE_CAPSTERS.filter(
              (c) => selectedCapsterTab === 'ALL' || c.capsterName === selectedCapsterTab
            ).map((cTable) => (
              <div
                key={cTable.capsterName}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
              >
                {/* Capster Title Header */}
                <div className="bg-[#18181B] px-4 py-2.5 text-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#DCA842]" />
                    <span className="font-bold text-sm uppercase tracking-wide">CAPSTER: {cTable.capsterName}</span>
                    <span className="text-xs text-zinc-400">(Barber Cendrawasih)</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#DCA842]">
                    Total Laba Capster: {formatRupiah(cTable.totalRpK.total * 1000)}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px] font-mono tabular-nums text-zinc-900">
                    <thead>
                      {/* Row 1: Merged Category Groups */}
                      <tr>
                        <th rowSpan={2} className="border border-zinc-400 bg-zinc-200 px-2 py-1.5 text-center font-bold">
                          NO
                        </th>
                        <th rowSpan={2} className="border border-zinc-400 bg-zinc-200 px-3 py-1.5 text-center font-bold whitespace-nowrap">
                          TANGGAL
                        </th>
                        <th colSpan={4} className="border border-zinc-400 bg-[#FFFF00] px-2 py-1 text-center font-bold text-zinc-950">
                          HAIRCUT
                        </th>
                        <th colSpan={4} className="border border-zinc-400 bg-[#92D050] px-2 py-1 text-center font-bold text-zinc-950">
                          HAIR PERMING
                        </th>
                        <th colSpan={3} className="border border-zinc-400 bg-[#FFA500] px-2 py-1 text-center font-bold text-zinc-950">
                          STAYLING
                        </th>
                        <th colSpan={3} className="border border-zinc-400 bg-[#9E6FD6] px-2 py-1 text-center font-bold text-zinc-950">
                          HAIR COLOR
                        </th>
                        <th colSpan={3} className="border border-zinc-400 bg-[#BDD7EE] px-2 py-1 text-center font-bold text-zinc-950">
                          PRODUK
                        </th>
                        <th rowSpan={2} className="border border-zinc-400 bg-[#FEF08A] px-2.5 py-1.5 text-center font-bold text-zinc-950">
                          TOTAL (K)
                        </th>
                      </tr>

                      {/* Row 2: Price Sub-columns */}
                      <tr>
                        <th className="border border-zinc-400 bg-[#FFFF00] px-2 py-1 text-center font-semibold text-zinc-900">70</th>
                        <th className="border border-zinc-400 bg-[#FFFF00] px-2 py-1 text-center font-semibold text-zinc-900">85</th>
                        <th className="border border-zinc-400 bg-[#FFFF00] px-2 py-1 text-center font-semibold text-zinc-900">120</th>
                        <th className="border border-zinc-400 bg-[#FFFF00] px-2 py-1 text-center font-semibold text-zinc-900">150</th>

                        <th className="border border-zinc-400 bg-[#92D050] px-2 py-1 text-center font-semibold text-zinc-900">350</th>
                        <th className="border border-zinc-400 bg-[#92D050] px-2 py-1 text-center font-semibold text-zinc-900">435</th>
                        <th className="border border-zinc-400 bg-[#92D050] px-2 py-1 text-center font-semibold text-zinc-900">550</th>
                        <th className="border border-zinc-400 bg-[#92D050] px-2 py-1 text-center font-semibold text-zinc-900">635</th>

                        <th className="border border-zinc-400 bg-[#FFA500] px-2 py-1 text-center font-semibold text-zinc-900">40</th>
                        <th className="border border-zinc-400 bg-[#FFA500] px-2 py-1 text-center font-semibold text-zinc-900">50</th>
                        <th className="border border-zinc-400 bg-[#FFA500] px-2 py-1 text-center font-semibold text-zinc-900">100</th>

                        <th className="border border-zinc-400 bg-[#9E6FD6] px-2 py-1 text-center font-semibold text-zinc-900">350</th>
                        <th className="border border-zinc-400 bg-[#9E6FD6] px-2 py-1 text-center font-semibold text-zinc-900">450</th>
                        <th className="border border-zinc-400 bg-[#9E6FD6] px-2 py-1 text-center font-semibold text-zinc-900">550</th>

                        <th className="border border-zinc-400 bg-[#BDD7EE] px-2 py-1 text-center font-semibold text-zinc-900">PM</th>
                        <th className="border border-zinc-400 bg-[#BDD7EE] px-2 py-1 text-center font-semibold text-zinc-900">HR</th>
                        <th className="border border-zinc-400 bg-[#BDD7EE] px-2 py-1 text-center font-semibold text-zinc-900">PW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cTable.rows.map((r) => (
                        <tr
                          key={r.date}
                          className={r.total_rp_k === 0 ? 'bg-zinc-50/70 opacity-60' : 'hover:bg-amber-50/40'}
                        >
                          <td className="border border-zinc-300 px-2 py-1 text-center font-semibold">{r.no}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-center whitespace-nowrap">{r.date}</td>

                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.hc_70 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.hc_85 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.hc_120 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.hc_150 || ''}</td>

                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.pm_350 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.pm_435 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.pm_550 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.pm_635 || ''}</td>

                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.st_40 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.st_50 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.st_100 || ''}</td>

                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.cl_350 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.cl_450 || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.cl_550 || ''}</td>

                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.prod_pm || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.prod_hr || ''}</td>
                          <td className="border border-zinc-300 px-2 py-1 text-right">{r.prod_pw || ''}</td>

                          <td className="border border-zinc-300 bg-amber-50/50 px-2 py-1 text-right font-bold">
                            {r.total_rp_k ? r.total_rp_k.toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}

                      {/* Total Qty Row */}
                      <tr className="bg-zinc-200 font-bold text-zinc-950 border-t-2 border-zinc-500">
                        <td className="border border-zinc-400 px-2 py-1 text-center" />
                        <td className="border border-zinc-400 px-2 py-1 font-sans text-left">Total Qty</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.hc_70}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.hc_85}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.hc_120}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.hc_150}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.pm_350}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.pm_435}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.pm_550}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.pm_635}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.st_40}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.st_50}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.st_100}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.cl_350}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.cl_450}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.cl_550}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.prod_pm}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.prod_hr}</td>
                        <td className="border border-zinc-400 px-2 py-1 text-right">{cTable.totalQty.prod_pw}</td>
                        <td className="border border-zinc-400 bg-amber-100 px-2 py-1 text-right font-bold">
                          {cTable.totalQty.total} Transaksi
                        </td>
                      </tr>

                      {/* Total Nominal Row (Rp Ribuan) */}
                      <tr className="bg-[#FEF08A] font-bold text-zinc-950 border-b-2 border-zinc-600">
                        <td className="border border-zinc-400 px-2 py-1.5 text-center" />
                        <td className="border border-zinc-400 px-2 py-1.5 font-sans text-left">Total (Rp)</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.hc_70.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.hc_85.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.hc_120.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.hc_150.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.pm_350.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.pm_435.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.pm_550.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.pm_635.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.st_40.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.st_50.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.st_100.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.cl_350.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.cl_450.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.cl_550.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.prod_pm.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.prod_hr.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 px-2 py-1.5 text-right">{cTable.totalRpK.prod_pw.toLocaleString('id-ID')}</td>
                        <td className="border border-zinc-400 bg-amber-300 px-2 py-1.5 text-right font-extrabold text-sm">
                          {cTable.totalRpK.total.toLocaleString('id-ID')}k
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* RINGKASAN GRAND TOTAL SEMUA CAPSTER */}
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 p-5">
              <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#C5922E]" />
                <span>Ringkasan Laba Kotor Seluruh Capster (Bulan {monthValue})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {TEMPLATE_CAPSTERS.map((c) => (
                  <div key={c.capsterName} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-500 font-semibold uppercase">Capster {c.capsterName}</p>
                    <p className="font-mono text-base font-bold text-[#09090B] dark:text-white mt-1">
                      {formatRupiah(c.totalRpK.total * 1000)}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{c.totalQty.total} Total Transaksi</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3.5 rounded-lg bg-[#09090B] text-white flex flex-wrap items-center justify-between gap-2 border border-[#27272A]">
                <span className="font-bold text-xs uppercase tracking-wide">
                  TOTAL AKUMULASI PENDAPATAN JASA &amp; PRODUK SELURUH CAPSTER:
                </span>
                <span className="font-mono text-lg font-extrabold text-[#DCA842]">
                  {formatRupiah(totalGrossCapsters)}
                </span>
              </div>
            </div>
          </div>
        ) : sheetView === 'absensi' ? (
          /* =========================================================
             TAB 2: REKAPITULASI ABSENSI BULANAN
             ========================================================= */
          <div className="p-4 space-y-6 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            {/* Table 1: Attendance Percentage Summary */}
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              <div className="bg-[#18181B] px-4 py-2.5 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Tabel 1: Ringkasan Persentase Kehadiran Capster (27 Hari Kerja Aktif)</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-center font-bold">No</th>
                      <th className="px-3 py-2 text-left font-bold">Nama Karyawan</th>
                      <th className="px-3 py-2 text-left font-bold">Jabatan</th>
                      <th className="px-3 py-2 text-right font-bold">Hari Kerja</th>
                      <th className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">Hadir On-Time</th>
                      <th className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">Terlambat</th>
                      <th className="px-3 py-2 text-right font-bold text-rose-600 dark:text-rose-400">Libur / Off</th>
                      <th className="px-3 py-2 text-right font-bold">Total Masuk</th>
                      <th className="px-3 py-2 text-right font-bold text-[#C5922E]">% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono tabular-nums">
                    {attendanceMatrix.summaries.map((s, idx) => (
                      <tr key={s.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-3 py-2 text-center text-zinc-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold font-sans text-[#09090B] dark:text-white uppercase">{s.name}</td>
                        <td className="px-3 py-2 font-sans text-zinc-500">{s.role}</td>
                        <td className="px-3 py-2 text-right">{s.totalHari} hari</td>
                        <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                          {s.hadir - s.terlambat} hari
                        </td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400 font-semibold">{s.terlambat} hari</td>
                        <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400 font-semibold">{s.libur} hari</td>
                        <td className="px-3 py-2 text-right font-bold">{s.hadir} hari</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-[#DCA842]">
                          <span className="inline-block rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 font-bold">
                            {s.percent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Daily Attendance Matrix (Day 1..31) */}
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              <div className="bg-[#18181B] px-4 py-2.5 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#DCA842]" />
                  <span>Tabel 2: Matriks Presensi Harian (Tanggal 1 s.d. 31)</span>
                </h3>
                <span className="text-[11px] text-zinc-400">Keterangan: Hadir | Terlambat | Libur | Off</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-center font-bold">No</th>
                      <th className="px-3 py-2 text-center font-bold">Tanggal</th>
                      <th className="px-3 py-2 text-left font-bold">Hari</th>
                      <th className="px-3 py-2 text-center font-bold">UDIN</th>
                      <th className="px-3 py-2 text-center font-bold">ATTA</th>
                      <th className="px-3 py-2 text-center font-bold">NOEL</th>
                      <th className="px-3 py-2 text-center font-bold">ASWAR</th>
                      <th className="px-3 py-2 text-center font-bold">ACEL</th>
                      <th className="px-3 py-2 text-left font-bold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                    {attendanceMatrix.days.map((d) => (
                      <tr
                        key={d.date}
                        className={d.dayName === 'Minggu' ? 'bg-zinc-100/70 dark:bg-zinc-800/40 text-zinc-500' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                      >
                        <td className="px-3 py-1.5 text-center font-semibold">{d.no}</td>
                        <td className="px-3 py-1.5 text-center font-medium">{d.date}</td>
                        <td className="px-3 py-1.5 font-sans font-semibold">{d.dayName}</td>
                        {['UDIN', 'ATTA', 'NOEL', 'ASWAR', 'ACEL'].map((capster) => {
                          const status = d.attendanceByCapster[capster];
                          return (
                            <td key={capster} className="px-3 py-1.5 text-center">
                              <span
                                className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                                  status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : status === 'Terlambat'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : status === 'Libur'
                                    ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 font-sans text-zinc-500 text-[10px]">{d.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : sheetView === 'pengeluaran' ? (
          /* =========================================================
             TAB 3: PENGELUARAN OPERASIONAL & KALKULASI LABA BERSIH
             ========================================================= */
          <div className="p-4 space-y-6 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              <div className="bg-[#18181B] px-4 py-2.5 text-white flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-rose-400" />
                  <span>Tabel Pengeluaran Operasional &amp; Belanja Barang (23 Catatan)</span>
                </h3>
                <span className="font-mono text-xs font-bold text-rose-400">
                  Total Biaya: {formatRupiah(totalExpenses)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-center font-bold">No</th>
                      <th className="px-3 py-2 text-center font-bold">Tanggal</th>
                      <th className="px-3 py-2 text-left font-bold">Nama Barang / Keperluan</th>
                      <th className="px-3 py-2 text-left font-bold">Rincian / Satuan</th>
                      <th className="px-3 py-2 text-right font-bold">Harga (K Ribuan)</th>
                      <th className="px-3 py-2 text-right font-bold">Total Rupiah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono tabular-nums">
                    {TEMPLATE_EXPENSES.map((exp, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-3 py-1.5 text-center text-zinc-500">{idx + 1}</td>
                        <td className="px-3 py-1.5 text-center">{exp.date}</td>
                        <td className="px-3 py-1.5 font-bold uppercase font-sans text-[#09090B] dark:text-white">
                          {exp.item}
                        </td>
                        <td className="px-3 py-1.5 font-sans text-zinc-500">{exp.qty}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{exp.price_k}k</td>
                        <td className="px-3 py-1.5 text-right font-bold text-rose-600 dark:text-rose-400">
                          {formatRupiah(exp.price_k * 1000)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-amber-100 dark:bg-amber-950/60 font-bold text-zinc-950 dark:text-amber-200 border-t-2 border-zinc-400">
                      <td colSpan={4} className="px-3 py-2 font-sans uppercase">Total Pengeluaran Operasional</td>
                      <td className="px-3 py-2 text-right font-mono">{TEMPLATE_EXPENSES.reduce((s, e) => s + e.price_k, 0)}k</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-700 dark:text-rose-300 font-extrabold">
                        {formatRupiah(totalExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Reconciliation Summary Box */}
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#C5922E]" />
                <span>Kalkulasi Laba Bersih Operasional Bulanan</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Total Laba Kotor (Pendapatan Jasa + Produk Seluruh Capster)
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatRupiah(totalGrossCapsters)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">Total Pengeluaran Operasional &amp; Belanja Barang</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{formatRupiah(totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 text-sm font-bold bg-zinc-50 dark:bg-zinc-800/80 p-3 rounded-lg">
                  <span className="text-[#09090B] dark:text-white uppercase">LABA BERSIH AKHIR (PROFIT BERSIH CABANG)</span>
                  <span className="font-mono text-base font-extrabold text-[#DCA842]">
                    {formatRupiah(netIncomeCalc)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : sheetView === 'stok' ? (
          /* =========================================================
             TAB 4: STOK & PRODUK (Template Excel Asli)
             ========================================================= */
          <div className="overflow-x-auto bg-white text-zinc-900">
            <table className="w-full border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-zinc-700 bg-white px-2.5 py-2 text-center font-bold text-zinc-900">
                    NO
                  </th>
                  <th rowSpan={2} className="border border-zinc-700 bg-white px-3 py-2 text-center font-bold text-zinc-900 whitespace-nowrap">
                    TANGGAL
                  </th>
                  <th colSpan={3} className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">
                    STOK BARANG JUAL
                  </th>
                  <th colSpan={5} className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">
                    STOK BARANG BARBER
                  </th>
                  <th colSpan={3} className="border border-zinc-700 bg-[#9E6FD6] px-2 py-1.5 text-center font-bold text-zinc-950">
                    PRODUK TERJUAL
                  </th>
                  <th colSpan={4} className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">
                    PRODUK TERPAKAI
                  </th>
                  <th rowSpan={2} className="border border-zinc-700 bg-zinc-100 px-2.5 py-2 text-center font-sans font-bold text-[#09090B]">
                    Aksi
                  </th>
                </tr>
                <tr>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">PM</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">HR</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">PW</th>
                  <th className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">TISU LEHER</th>
                  <th className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">HAIR TONIC</th>
                  <th className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">SHAMPO</th>
                  <th className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">PERMING</th>
                  <th className="border border-zinc-700 bg-[#92D050] px-2 py-1.5 text-center font-bold text-zinc-950">sampo cultusia</th>
                  <th className="border border-zinc-700 bg-[#9E6FD6] px-2 py-1.5 text-center font-bold text-zinc-950">PM</th>
                  <th className="border border-zinc-700 bg-[#9E6FD6] px-2 py-1.5 text-center font-bold text-zinc-950">HR</th>
                  <th className="border border-zinc-700 bg-[#9E6FD6] px-2 py-1.5 text-center font-bold text-zinc-950">PW</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">PM</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">HR</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">PW</th>
                  <th className="border border-zinc-700 bg-[#FFFF00] px-2 py-1.5 text-center font-bold text-zinc-950">tisu leher</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((row) => {
                  const inv = row.inventory;
                  return (
                    <tr key={row.date} className="hover:bg-amber-50/50">
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-center font-bold">{row.no}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-center whitespace-nowrap">{row.date_label}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.stok_jual_pm || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.stok_jual_hr || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.stok_jual_pw || '-'}</td>
                      <td className="border border-zinc-700 bg-[#92D050]/20 px-2 py-1 text-right">{inv.stok_barber_tisu_leher || '-'}</td>
                      <td className="border border-zinc-700 bg-[#92D050]/20 px-2 py-1 text-right">{inv.stok_barber_hair_tonic || '-'}</td>
                      <td className="border border-zinc-700 bg-[#92D050]/20 px-2 py-1 text-right">{inv.stok_barber_shampo || '-'}</td>
                      <td className="border border-zinc-700 bg-[#92D050]/20 px-2 py-1 text-right">{inv.stok_barber_perming || '-'}</td>
                      <td className="border border-zinc-700 bg-[#92D050]/20 px-2 py-1 text-right">{inv.stok_barber_sampo_cultusia || '-'}</td>
                      <td className="border border-zinc-700 bg-[#9E6FD6]/20 px-2 py-1 text-right font-bold">{inv.terjual_pm || '-'}</td>
                      <td className="border border-zinc-700 bg-[#9E6FD6]/20 px-2 py-1 text-right font-bold">{inv.terjual_hr || '-'}</td>
                      <td className="border border-zinc-700 bg-[#9E6FD6]/20 px-2 py-1 text-right font-bold">{inv.terjual_pw || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.terpakai_pm || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.terpakai_hr || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.terpakai_pw || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-right">{inv.terpakai_tisu_leher || '-'}</td>
                      <td className="border border-zinc-700 bg-white px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => openEditRow(row)}
                          className="rounded p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Edit baris stok hari ini"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL SUMMARY ROW */}
                <tr className="font-bold text-zinc-950">
                  <td className="border border-zinc-700 bg-white px-2 py-2" />
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-center uppercase">total</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_jual_pm || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_jual_hr || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_jual_pw || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_barber_tisu_leher || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_barber_hair_tonic || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_barber_shampo || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_barber_perming || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.stok_barber_sampo_cultusia || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terjual_pm}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terjual_hr}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terjual_pw}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terpakai_pm || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terpakai_hr || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terpakai_pw || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2 text-right">{report.totals.terpakai_tisu_leher || '-'}</td>
                  <td className="border border-zinc-700 bg-[#FFFF00] px-2 py-2" />
                </tr>

                {/* NOMINAL RUPIAH ROW UNDER PRODUK TERJUAL */}
                <tr className="font-bold text-zinc-950">
                  <td colSpan={10} className="border border-zinc-200 bg-white px-3 py-2 text-right font-sans text-xs text-zinc-500">
                    Total Nominal Penjualan Produk (Rp)
                  </td>
                  <td className="border border-zinc-700 bg-[#FEF08A] px-2 py-2 text-right whitespace-nowrap">
                    {formatRupiah(report.totals.terjual_pm_rp)}
                  </td>
                  <td className="border border-zinc-700 bg-[#FEF08A] px-2 py-2 text-right whitespace-nowrap">
                    {formatRupiah(report.totals.terjual_hr_rp)}
                  </td>
                  <td className="border border-zinc-700 bg-[#FEF08A] px-2 py-2 text-right whitespace-nowrap">
                    {formatRupiah(report.totals.terjual_pw_rp)}
                  </td>
                  <td colSpan={5} className="border border-zinc-200 bg-white" />
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* =========================================================
             TAB 5: KEUANGAN & PANGKAS
             ========================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#09090B] text-white">
                  <th className="px-3 py-2.5 font-semibold text-center">No</th>
                  <th className="px-3 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Transaksi</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Dipangkas</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Tunai</th>
                  <th className="px-3 py-2.5 font-semibold text-right">QRIS</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Transfer</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Debit</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Omzet Kotor</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Komisi Barber</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Pendapatan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono tabular-nums">
                {report.days.map((d) => (
                  <tr key={d.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">{d.no}</td>
                    <td className="px-3 py-2 font-semibold text-[#09090B] dark:text-white">{d.date_label}</td>
                    <td className="px-3 py-2 text-right">{d.transactions_count}</td>
                    <td className="px-3 py-2 text-right">{d.cuts_count}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(d.tunai)}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(d.qris)}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(d.transfer)}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(d.debit)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#09090B] dark:text-white">
                      {formatRupiah(d.gross_revenue)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#C5922E]">{formatRupiah(d.barber_commission)}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(d.net_income)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold text-[#09090B] dark:text-white border-t-2 border-zinc-300 dark:border-zinc-700">
                  <td className="px-3 py-2.5 text-center" />
                  <td className="px-3 py-2.5 font-sans">TOTAL PERIODE</td>
                  <td className="px-3 py-2.5 text-right">{report.totals.transactions_count}</td>
                  <td className="px-3 py-2.5 text-right">{report.totals.cuts_count}</td>
                  <td className="px-3 py-2.5 text-right">{formatRupiah(report.totals.tunai)}</td>
                  <td className="px-3 py-2.5 text-right">{formatRupiah(report.totals.qris)}</td>
                  <td className="px-3 py-2.5 text-right">{formatRupiah(report.totals.transfer)}</td>
                  <td className="px-3 py-2.5 text-right">{formatRupiah(report.totals.debit)}</td>
                  <td className="px-3 py-2.5 text-right">{formatRupiah(report.totals.gross_revenue)}</td>
                  <td className="px-3 py-2.5 text-right text-[#C5922E]">{formatRupiah(report.totals.barber_commission)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(report.totals.net_income)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL FOR DAILY INVENTORY ROW */}
      {editingRow && editInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="font-bold text-sm text-[#09090B] dark:text-white">
                  Koreksi Stok &amp; Pemakaian Produk — {editingRow.date_label} ({editingRow.date})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Perubahan akan otomatis disimpan ke database dan memperbarui tabel serta unduhan .xlsx
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-[#09090B] dark:text-[#DCA842] mb-2">Stok Barang Jual</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">PM (Pomade)</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_jual_pm}
                      onChange={(e) => setEditInv({...editInv, stok_jual_pm: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">HR (Hair Oil/Serum)</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_jual_hr}
                      onChange={(e) => setEditInv({...editInv, stok_jual_hr: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">PW (Powder)</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_jual_pw}
                      onChange={(e) => setEditInv({...editInv, stok_jual_pw: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#09090B] dark:text-[#DCA842] mb-2">Stok Barang Barber</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Tisu Leher</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_barber_tisu_leher}
                      onChange={(e) => setEditInv({...editInv, stok_barber_tisu_leher: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Hair Tonic</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_barber_hair_tonic}
                      onChange={(e) => setEditInv({...editInv, stok_barber_hair_tonic: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Shampo</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_barber_shampo}
                      onChange={(e) => setEditInv({...editInv, stok_barber_shampo: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Perming</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_barber_perming}
                      onChange={(e) => setEditInv({...editInv, stok_barber_perming: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Sampo Cultusia</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.stok_barber_sampo_cultusia}
                      onChange={(e) => setEditInv({...editInv, stok_barber_sampo_cultusia: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#09090B] dark:text-[#DCA842] mb-2">Produk Terjual (Qty)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Qty PM</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terjual_pm}
                      onChange={(e) => setEditInv({...editInv, terjual_pm: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Qty HR</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terjual_hr}
                      onChange={(e) => setEditInv({...editInv, terjual_hr: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Qty PW</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terjual_pw}
                      onChange={(e) => setEditInv({...editInv, terjual_pw: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#09090B] dark:text-[#DCA842] mb-2">Produk Terpakai Barbershop</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">PM Terpakai</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terpakai_pm}
                      onChange={(e) => setEditInv({...editInv, terpakai_pm: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">HR Terpakai</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terpakai_hr}
                      onChange={(e) => setEditInv({...editInv, terpakai_hr: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">PW Terpakai</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terpakai_pw}
                      onChange={(e) => setEditInv({...editInv, terpakai_pw: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Tisu Leher Terpakai</label>
                    <input
                      type="number"
                      min={0}
                      value={editInv.terpakai_tisu_leher}
                      onChange={(e) => setEditInv({...editInv, terpakai_tisu_leher: Number(e.target.value)})}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveInventoryRow}
                disabled={savingInv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#18181B] dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{savingInv ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
