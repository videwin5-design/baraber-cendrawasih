import {BarChart3, PieChart as PieChartIcon} from 'lucide-react';
import React, {useMemo, useState} from 'react';
import type {Branch, Transaction} from '../types.ts';
import {formatRupiah, getTodayISO} from '../utils/format.ts';

interface OwnerAnalyticsChartsProps {
  transactions: Transaction[];
  branches: Branch[];
  selectedBranchId: string;
  onSelectDate?: (dateIso: string) => void;
}

type BarMode = '7d' | '14d' | 'branch' | 'barber';
type PieMode = 'payment' | 'branch' | 'category';

const CHART_PALETTE = [
  {light: '#09090B', dark: '#FAFAFA', dot: 'bg-[#09090B] dark:bg-zinc-100'},
  {light: '#C5922E', dark: '#DCA842', dot: 'bg-[#C5922E] dark:bg-[#DCA842]'},
  {light: '#0F766E', dark: '#2DD4BF', dot: 'bg-teal-700 dark:bg-teal-400'},
  {light: '#52525B', dark: '#A1A1AA', dot: 'bg-zinc-600 dark:bg-zinc-400'},
  {light: '#9F1239', dark: '#FB7185', dot: 'bg-rose-800 dark:bg-rose-400'},
];

function formatCompactRp(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArcSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.9) {
    // Full circle donut path
    const p1 = polarToCartesian(cx, cy, outerR, 0);
    const p2 = polarToCartesian(cx, cy, outerR, 180);
    const i1 = polarToCartesian(cx, cy, innerR, 0);
    const i2 = polarToCartesian(cx, cy, innerR, 180);
    return [
      `M ${p1.x} ${p1.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${p2.x} ${p2.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${p1.x} ${p1.y}`,
      `M ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i2.x} ${i2.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i1.x} ${i1.y}`,
      'Z',
    ].join(' ');
  }
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  if (innerR <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      'Z',
    ].join(' ');
  }
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

export const OwnerAnalyticsCharts: React.FC<OwnerAnalyticsChartsProps> = ({
  transactions,
  branches,
  selectedBranchId,
  onSelectDate,
}) => {
  const [barMode, setBarMode] = useState<BarMode>('7d');
  const [pieMode, setPieMode] = useState<PieMode>('payment');
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const [activeSliceIdx, setActiveSliceIdx] = useState<number | null>(null);
  const [pieStyle, setPieStyle] = useState<'donut' | 'pie'>('donut');

  const filteredTrx = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === 'ALL') return transactions;
    return transactions.filter((t) => t.branch_id === selectedBranchId);
  }, [transactions, selectedBranchId]);

  const barData = useMemo((): {
    key: string;
    label: string;
    gross: number;
    net: number;
    commission: number;
    count: number;
    clickableDate?: string;
  }[] => {
    if (barMode === '7d' || barMode === '14d') {
      const daysCount = barMode === '7d' ? 7 : 14;
      const today = new Date(`${getTodayISO()}T00:00:00`);
      const list: {
        key: string;
        label: string;
        gross: number;
        net: number;
        commission: number;
        count: number;
        clickableDate?: string;
      }[] = [];
      for (let offset = daysCount - 1; offset >= 0; offset--) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${day}`;
        const dayTrx = filteredTrx.filter((t) => t.created_at.slice(0, 10) === iso);
        const gross = dayTrx.reduce((s, t) => s + t.total_amount, 0);
        const commission = dayTrx.reduce((s, t) => s + t.barber_commission, 0);
        list.push({
          key: iso,
          label: `${day}/${m}`,
          gross,
          net: gross - commission,
          commission,
          count: dayTrx.length,
          clickableDate: iso,
        });
      }
      return list;
    }

    if (barMode === 'branch') {
      return branches.map((b) => {
        const brTrx = transactions.filter((t) => t.branch_id === b.id);
        const gross = brTrx.reduce((s, t) => s + t.total_amount, 0);
        const commission = brTrx.reduce((s, t) => s + t.barber_commission, 0);
        return {
          key: b.id,
          label: b.code,
          gross,
          net: gross - commission,
          commission,
          count: brTrx.length,
        };
      });
    }

    // Per barber
    const map = new Map<
      string,
      {key: string; label: string; gross: number; net: number; commission: number; count: number; clickableDate?: string}
    >();
    for (const t of filteredTrx) {
      const cur = map.get(t.barber_id) ?? {
        key: t.barber_id,
        label: t.barber_name.split(' ')[0],
        gross: 0,
        net: 0,
        commission: 0,
        count: 0,
      };
      cur.gross += t.total_amount;
      cur.commission += t.barber_commission;
      cur.net += t.total_amount - t.barber_commission;
      cur.count += 1;
      map.set(t.barber_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.gross - a.gross);
  }, [barMode, filteredTrx, transactions, branches]);

  const maxBarVal = useMemo(() => {
    const m = Math.max(...barData.map((d) => d.gross), 0);
    return m > 0 ? m : 100000;
  }, [barData]);

  const pieData = useMemo(() => {
    const map = new Map<string, {label: string; value: number; count: number}>();
    if (pieMode === 'payment') {
      for (const t of filteredTrx) {
        const cur = map.get(t.payment_method) ?? {label: t.payment_method, value: 0, count: 0};
        cur.value += t.total_amount;
        cur.count += 1;
        map.set(t.payment_method, cur);
      }
    } else if (pieMode === 'branch') {
      for (const t of transactions) {
        const label = t.branch_name.replace('Cendrawasih ', '');
        const cur = map.get(t.branch_id) ?? {label, value: 0, count: 0};
        cur.value += t.total_amount;
        cur.count += 1;
        map.set(t.branch_id, cur);
      }
    } else {
      for (const t of filteredTrx) {
        for (const item of t.items) {
          const cur = map.get(item.category) ?? {label: item.category, value: 0, count: 0};
          cur.value += item.price * (item.qty || 1);
          cur.count += item.qty || 1;
          map.set(item.category, cur);
        }
      }
    }
    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, d) => s + d.value, 0);
    let cursor = 0;
    return sorted.map((d, idx) => {
      const pct = total > 0 ? (d.value / total) * 100 : 0;
      const startAngle = cursor;
      const sweep = total > 0 ? (d.value / total) * 360 : 0;
      cursor += sweep;
      return {
        ...d,
        pct,
        startAngle,
        endAngle: startAngle + sweep,
        palette: CHART_PALETTE[idx % CHART_PALETTE.length],
      };
    });
  }, [pieMode, filteredTrx, transactions]);

  const pieTotal = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData]);
  const focusedSlice = activeSliceIdx !== null ? pieData[activeSliceIdx] ?? null : null;
  const focusedBar = hoveredBarIdx !== null ? barData[hoveredBarIdx] ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Interactive Bar Chart */}
      <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#09090B]/10 dark:bg-[#DCA842]/15 text-[#09090B] dark:text-[#DCA842]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white">
                Grafik Batang Omzet &amp; Pendapatan Bersih
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Arahkan kursor ke batang untuk detail · Klik tanggal untuk filter laporan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
            {(
              [
                {id: '7d', label: '7 Hari'},
                {id: '14d', label: '14 Hari'},
                {id: 'branch', label: 'Cabang'},
                {id: 'barber', label: 'Barber'},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setBarMode(opt.id);
                  setHoveredBarIdx(null);
                }}
                className={`btn-tactile rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  barMode === opt.id
                    ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-[#09090B] dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Tooltip Readout Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/70 px-4 py-2.5 min-h-[52px]">
          {focusedBar ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-[#09090B] dark:text-white">{focusedBar.label}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-600 dark:text-zinc-300">{focusedBar.count} transaksi</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-mono font-semibold text-[#09090B] dark:text-zinc-100 tabular-nums">
                  Kotor: {formatRupiah(focusedBar.gross)}
                </span>
                <span className="font-mono font-semibold text-[#C5922E] dark:text-[#DCA842] tabular-nums">
                  Bersih: {formatRupiah(focusedBar.net)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Sorot batang grafik untuk melihat rincian nominal</span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#09090B] dark:bg-zinc-100" />
                  Omzet Kotor
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#C5922E] dark:bg-[#DCA842]" />
                  Bersih Usaha
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SVG Bar Chart */}
        <div className="mt-4">
          {barData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
              Belum ada data transaksi untuk grafik ini.
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <svg viewBox="0 0 640 230" className="w-full h-56 min-w-[440px] select-none" role="img" aria-label="Grafik Batang Omzet">
                {/* Y-Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 185 - ratio * 155;
                  const val = Math.round(maxBarVal * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1="54"
                        y1={y}
                        x2="626"
                        y2={y}
                        stroke="currentColor"
                        className="text-zinc-200 dark:text-zinc-800"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x="46"
                        y={y + 4}
                        textAnchor="end"
                        className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px]"
                      >
                        {ratio === 0 ? '0' : formatCompactRp(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {barData.map((d, idx) => {
                  const plotWidth = 572;
                  const slotW = plotWidth / barData.length;
                  const cx = 54 + idx * slotW + slotW / 2;
                  const pairW = Math.min(28, Math.max(10, slotW * 0.62));
                  const singleW = Math.max(5, (pairW - 3) / 2);
                  const grossH = d.gross > 0 ? Math.max(4, (d.gross / maxBarVal) * 155) : 2;
                  const netH = d.net > 0 ? Math.max(4, (d.net / maxBarVal) * 155) : 2;
                  const isHovered = hoveredBarIdx === idx;
                  const isDimmed = hoveredBarIdx !== null && hoveredBarIdx !== idx;

                  return (
                    <g
                      key={d.key}
                      onMouseEnter={() => setHoveredBarIdx(idx)}
                      onMouseLeave={() => setHoveredBarIdx(null)}
                      onClick={() => {
                        if (d.clickableDate && onSelectDate) {
                          onSelectDate(d.clickableDate);
                        }
                      }}
                      className={`${d.clickableDate ? 'cursor-pointer' : 'cursor-default'} transition-opacity duration-150 ${
                        isDimmed ? 'opacity-40' : 'opacity-100'
                      }`}
                    >
                      {/* Invisible full slot hit target for reliable hover */}
                      <rect x={cx - slotW / 2} y="20" width={slotW} height="190" fill="transparent" />

                      {/* Hover column backdrop */}
                      {isHovered && (
                        <rect
                          x={cx - pairW / 2 - 5}
                          y="24"
                          width={pairW + 10}
                          height="161"
                          rx="6"
                          className="fill-zinc-100 dark:fill-zinc-800/80"
                        />
                      )}

                      {/* Gross revenue bar */}
                      <rect
                        x={cx - singleW - 1.5}
                        y={185 - grossH}
                        width={singleW}
                        height={grossH}
                        rx="3"
                        className="fill-[#09090B] dark:fill-zinc-100 transition-all duration-150"
                      />

                      {/* Net income bar */}
                      <rect
                        x={cx + 1.5}
                        y={185 - netH}
                        width={singleW}
                        height={netH}
                        rx="3"
                        className="fill-[#C5922E] dark:fill-[#DCA842] transition-all duration-150"
                      />

                      {/* X-Axis label */}
                      <text
                        x={cx}
                        y="206"
                        textAnchor="middle"
                        className={`font-mono text-[10px] ${
                          isHovered
                            ? 'fill-[#09090B] dark:fill-white font-bold'
                            : 'fill-zinc-500 dark:fill-zinc-400'
                        }`}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Pie / Donut Chart */}
      <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C5922E]/15 text-[#C5922E] dark:text-[#DCA842]">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white">
                Pie Chart Distribusi
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Klik atau sorot segmen untuk komposisi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
            {(
              [
                {id: 'payment', label: 'Bayar'},
                {id: 'branch', label: 'Cabang'},
                {id: 'category', label: 'Layanan'},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPieMode(opt.id);
                  setActiveSliceIdx(null);
                }}
                className={`btn-tactile rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  pieMode === opt.id
                    ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-[#09090B] dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-5 flex-1">
          {pieTotal === 0 || pieData.length === 0 ? (
            <div className="flex w-full h-48 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
              Belum ada data distribusi transaksi.
            </div>
          ) : (
            <>
              <div className="relative flex flex-col items-center shrink-0">
                <svg viewBox="0 0 200 200" className="h-44 w-44 overflow-visible" role="img" aria-label="Pie Chart Distribusi">
                  {pieData.map((slice, idx) => {
                    const isSelected = activeSliceIdx === idx;
                    const midAngle = (slice.startAngle + slice.endAngle) / 2;
                    const rad = ((midAngle - 90) * Math.PI) / 180;
                    const offset = isSelected ? 6 : 0;
                    const tx = Math.cos(rad) * offset;
                    const ty = Math.sin(rad) * offset;
                    const innerR = pieStyle === 'donut' ? 54 : 0;
                    const path = describeArcSlice(100, 100, 86, innerR, slice.startAngle, slice.endAngle);
                    return (
                      <path
                        key={slice.label}
                        d={path}
                        transform={`translate(${tx}, ${ty})`}
                        onMouseEnter={() => setActiveSliceIdx(idx)}
                        onMouseLeave={() => setActiveSliceIdx(null)}
                        onClick={() => setActiveSliceIdx(activeSliceIdx === idx ? null : idx)}
                        style={{
                          fill: `var(--slice-color-${idx % CHART_PALETTE.length})`,
                          opacity: activeSliceIdx !== null && !isSelected ? 0.45 : 1,
                          transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease',
                        }}
                        className="cursor-pointer stroke-white dark:stroke-zinc-900 stroke-[1.5]"
                      />
                    );
                  })}

                  {/* Light/Dark SVG CSS variables */}
                  <style>{`
                    :root {
                      --slice-color-0: ${CHART_PALETTE[0].light};
                      --slice-color-1: ${CHART_PALETTE[1].light};
                      --slice-color-2: ${CHART_PALETTE[2].light};
                      --slice-color-3: ${CHART_PALETTE[3].light};
                      --slice-color-4: ${CHART_PALETTE[4].light};
                    }
                    .dark {
                      --slice-color-0: ${CHART_PALETTE[0].dark};
                      --slice-color-1: ${CHART_PALETTE[1].dark};
                      --slice-color-2: ${CHART_PALETTE[2].dark};
                      --slice-color-3: ${CHART_PALETTE[3].dark};
                      --slice-color-4: ${CHART_PALETTE[4].dark};
                    }
                  `}</style>

                  {pieStyle === 'donut' && (
                    <g className="pointer-events-none">
                      <text
                        x="100"
                        y="93"
                        textAnchor="middle"
                        className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-semibold"
                      >
                        {focusedSlice ? focusedSlice.label.slice(0, 14) : 'Total'}
                      </text>
                      <text
                        x="100"
                        y="112"
                        textAnchor="middle"
                        className="fill-[#09090B] dark:fill-white font-mono text-[13px] font-bold"
                      >
                        {focusedSlice ? `${focusedSlice.pct.toFixed(1)}%` : formatCompactRp(pieTotal)}
                      </text>
                    </g>
                  )}
                </svg>

                <div className="mt-2 inline-flex rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPieStyle('donut')}
                    className={`rounded px-2 py-0.5 font-semibold cursor-pointer transition-colors ${
                      pieStyle === 'donut'
                        ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Donut
                  </button>
                  <button
                    type="button"
                    onClick={() => setPieStyle('pie')}
                    className={`rounded px-2 py-0.5 font-semibold cursor-pointer transition-colors ${
                      pieStyle === 'pie'
                        ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Pie
                  </button>
                </div>
              </div>

              {/* Synchronized Interactive Legend */}
              <div className="w-full space-y-1.5">
                {pieData.map((slice, idx) => {
                  const isActive = activeSliceIdx === idx;
                  return (
                    <button
                      key={slice.label}
                      type="button"
                      onMouseEnter={() => setActiveSliceIdx(idx)}
                      onMouseLeave={() => setActiveSliceIdx(null)}
                      onClick={() => setActiveSliceIdx(isActive ? null : idx)}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-zinc-100 dark:bg-zinc-800 ring-1 ring-[#09090B]/30 dark:ring-[#DCA842]/50'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-xs shrink-0 ${slice.palette.dot}`} />
                        <span className="font-medium text-zinc-700 dark:text-zinc-200 truncate">{slice.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{slice.pct.toFixed(0)}%</span>
                        <span className="font-bold text-[#09090B] dark:text-white">{formatRupiah(slice.value)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
