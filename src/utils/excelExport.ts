import type ExcelJS from 'exceljs';
import type {AttendanceRecord, Employee, PeriodReportSummary, Transaction} from '../types.ts';
import {
  generateMonthlyAttendanceMatrix,
  TEMPLATE_CAPSTERS,
  TEMPLATE_EXPENSES,
} from './barberTemplateData.ts';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: {style: 'thin', color: {argb: 'FF1E293B'}},
  left: {style: 'thin', color: {argb: 'FF1E293B'}},
  bottom: {style: 'thin', color: {argb: 'FF1E293B'}},
  right: {style: 'thin', color: {argb: 'FF1E293B'}},
};

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  top: {style: 'thin', color: {argb: 'FF1E293B'}},
  left: {style: 'thin', color: {argb: 'FF1E293B'}},
  bottom: {style: 'double', color: {argb: 'FF1E293B'}},
  right: {style: 'thin', color: {argb: 'FF1E293B'}},
};

export interface ExcelExportOptions {
  report: PeriodReportSummary;
  monthYear?: string;
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  transactions?: Transaction[];
}

export async function downloadPeriodExcel(
  reportOrOptions: PeriodReportSummary | ExcelExportOptions
) {
  const options: ExcelExportOptions =
    'report' in reportOrOptions
      ? reportOrOptions
      : {report: reportOrOptions};

  const {report, employees, attendance} = options;
  const monthYear =
    options.monthYear ||
    (report.mode === 'monthly' ? report.start_date.slice(0, 7) : '2026-10');

  const ExcelJSModule = (await import('exceljs')).default;
  const workbook = new ExcelJSModule.Workbook();
  workbook.creator = 'Barbershop Cendrawasih';
  workbook.created = new Date();

  const periodTitle =
    report.mode === 'monthly'
      ? `BULAN ${monthYear}`
      : `MINGGUAN ${report.start_date} s.d. ${report.end_date}`;

  const yellowFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFFFF00'}};
  const greenFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF92D050'}};
  const orangeFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFFA500'}};
  const purpleFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF9E6FD6'}};
  const blueFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF70AD47'}};
  const lightBlueFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFBDD7EE'}};
  const lightYellowFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFEF08A'}};
  const darkFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF09090B'}};
  const grayFill: ExcelJS.Fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFE2E8F0'}};

  // =========================================================================
  // SHEET 1: REKAP CAPSTER (UDIN, ATTA, NOEL, ASWAR, ACEL - Sesuai Template)
  // =========================================================================
  const wsCapster = workbook.addWorksheet('Rekap Capster', {
    views: [{state: 'frozen', ySplit: 3}],
  });

  // Title
  wsCapster.mergeCells('A1:T1');
  const capsterTitle = wsCapster.getCell('A1');
  capsterTitle.value = `LAPORAN REKAPITULASI PENDAPATAN PER-CAPSTER — ${periodTitle} (${report.branch_name.toUpperCase()})`;
  capsterTitle.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FFFFFFFF'}};
  capsterTitle.fill = darkFill;
  capsterTitle.alignment = {horizontal: 'center', vertical: 'middle'};
  wsCapster.getRow(1).height = 25;

  let currentRow = 2;

  // Let's render all 5 capsters sequentially
  TEMPLATE_CAPSTERS.forEach((capsterTable) => {
    // Capster Section Header
    const capsterHeaderRow = wsCapster.getRow(currentRow);
    wsCapster.mergeCells(`A${currentRow}:T${currentRow}`);
    const sectionCell = wsCapster.getCell(`A${currentRow}`);
    sectionCell.value = `CAPSTER: ${capsterTable.capsterName}  |  TOTAL OMZET: Rp ${(capsterTable.totalRpK.total * 1000).toLocaleString('id-ID')}`;
    sectionCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: 'FFFFFFFF'}};
    sectionCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF1F2937'}};
    sectionCell.alignment = {horizontal: 'left', vertical: 'middle', indent: 1};
    capsterHeaderRow.height = 22;
    currentRow++;

    // Two header rows: Group Header and Price Sub-headers
    const rGroup = currentRow;
    const rSub = currentRow + 1;

    wsCapster.mergeCells(`A${rGroup}:A${rSub}`);
    wsCapster.mergeCells(`B${rGroup}:B${rSub}`);
    wsCapster.mergeCells(`C${rGroup}:F${rGroup}`);
    wsCapster.mergeCells(`G${rGroup}:J${rGroup}`);
    wsCapster.mergeCells(`K${rGroup}:M${rGroup}`);
    wsCapster.mergeCells(`N${rGroup}:P${rGroup}`);
    wsCapster.mergeCells(`Q${rGroup}:S${rGroup}`);
    wsCapster.mergeCells(`T${rGroup}:T${rSub}`);

    wsCapster.getCell(`A${rGroup}`).value = 'NO';
    wsCapster.getCell(`B${rGroup}`).value = 'TANGGAL';
    wsCapster.getCell(`C${rGroup}`).value = 'HAIRCUT';
    wsCapster.getCell(`G${rGroup}`).value = 'HAIR PERMING';
    wsCapster.getCell(`K${rGroup}`).value = 'STAYLING';
    wsCapster.getCell(`N${rGroup}`).value = 'HAIR COLOR';
    wsCapster.getCell(`Q${rGroup}`).value = 'PRODUK';
    wsCapster.getCell(`T${rGroup}`).value = 'TOTAL (K)';

    const subCols = [
      '', '', // NO, TGL
      '70', '85', '120', '150', // Haircut
      '350', '435', '550', '635', // Perming
      '40', '50', '100', // Styling
      '350', '450', '550', // Hair Color
      'PM', 'HR', 'PW', // Produk
      '' // Total
    ];

    subCols.forEach((label, idx) => {
      if (idx >= 2 && idx < 19) {
        wsCapster.getCell(rSub, idx + 1).value = label;
      }
    });

    // Style Header Cells
    for (let r = rGroup; r <= rSub; r++) {
      wsCapster.getRow(r).height = 19;
      for (let c = 1; c <= 20; c++) {
        const cell = wsCapster.getCell(r, c);
        cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: 'FF000000'}};
        cell.border = THIN_BORDER;
        cell.alignment = {horizontal: 'center', vertical: 'middle'};

        if (c >= 3 && c <= 6) cell.fill = yellowFill;
        else if (c >= 7 && c <= 10) cell.fill = greenFill;
        else if (c >= 11 && c <= 13) cell.fill = orangeFill;
        else if (c >= 14 && c <= 16) cell.fill = purpleFill;
        else if (c >= 17 && c <= 19) cell.fill = lightBlueFill;
        else if (c === 20) cell.fill = lightYellowFill;
        else cell.fill = grayFill;
      }
    }

    currentRow += 2;
    const startDataRow = currentRow;

    // Data rows
    capsterTable.rows.forEach((row) => {
      const dataRow = wsCapster.getRow(currentRow);
      dataRow.height = 17;
      const values = [
        row.no,
        row.date,
        row.hc_70,
        row.hc_85,
        row.hc_120,
        row.hc_150,
        row.pm_350,
        row.pm_435,
        row.pm_550,
        row.pm_635,
        row.st_40,
        row.st_50,
        row.st_100,
        row.cl_350,
        row.cl_450,
        row.cl_550,
        row.prod_pm,
        row.prod_hr,
        row.prod_pw,
        row.total_rp_k,
      ];

      values.forEach((v, idx) => {
        const c = idx + 1;
        const cell = dataRow.getCell(c);
        cell.value = v === 0 && c >= 3 && c < 20 ? '' : v;
        cell.font = {name: 'Calibri', size: 9};
        cell.border = THIN_BORDER;
        cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
        if (c === 20) {
          cell.font = {name: 'Calibri', size: 9, bold: true};
          cell.numFmt = '#,##0';
        }
      });
      currentRow++;
    });

    const endDataRow = currentRow - 1;

    // Row: Total Qty
    const rQty = currentRow;
    const qtyRow = wsCapster.getRow(rQty);
    qtyRow.height = 18;
    wsCapster.getCell(`B${rQty}`).value = 'Total Qty';
    wsCapster.getCell(`B${rQty}`).font = {name: 'Calibri', size: 9, bold: true};

    const colLetters = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'
    ];

    for (let c = 1; c <= 20; c++) {
      const cell = qtyRow.getCell(c);
      cell.border = THIN_BORDER;
      cell.font = {name: 'Calibri', size: 9, bold: true};
      cell.fill = grayFill;
      cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
      if (c >= 3 && c <= 19) {
        const col = colLetters[c - 1];
        cell.value = {formula: `SUM(${col}${startDataRow}:${col}${endDataRow})`};
      }
    }
    currentRow++;

    // Row: Total Nominal (Rp Ribuan)
    const rNominal = currentRow;
    const nomRow = wsCapster.getRow(rNominal);
    nomRow.height = 20;
    wsCapster.getCell(`B${rNominal}`).value = 'Total (Rp)';
    wsCapster.getCell(`B${rNominal}`).font = {name: 'Calibri', size: 9, bold: true};

    const multiplier = [
      0, 0,
      70, 85, 120, 150,
      350, 435, 550, 635,
      40, 50, 100,
      350, 450, 550,
      150, 45, 65,
      0
    ];

    for (let c = 1; c <= 20; c++) {
      const cell = nomRow.getCell(c);
      cell.border = DOUBLE_BOTTOM_BORDER;
      cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: 'FF000000'}};
      cell.fill = lightYellowFill;
      cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};

      if (c >= 3 && c <= 19) {
        const col = colLetters[c - 1];
        cell.value = {formula: `${col}${rQty}*${multiplier[c - 1]}`};
        cell.numFmt = '#,##0';
      } else if (c === 20) {
        cell.value = {formula: `SUM(T${startDataRow}:T${endDataRow})`};
        cell.numFmt = '#,##0';
      }
    }
    currentRow += 2; // Space before next capster
  });

  // Grand Summary of all Capsters
  const rGrandTitle = currentRow;
  wsCapster.mergeCells(`A${rGrandTitle}:T${rGrandTitle}`);
  const gTitleCell = wsCapster.getCell(`A${rGrandTitle}`);
  gTitleCell.value = 'RINGKASAN LABA KOTOR SELURUH CAPSTER (OKTOBER 2026)';
  gTitleCell.font = {name: 'Calibri', size: 11, bold: true, color: {argb: 'FFFFFFFF'}};
  gTitleCell.fill = darkFill;
  gTitleCell.alignment = {horizontal: 'center', vertical: 'middle'};
  wsCapster.getRow(rGrandTitle).height = 22;
  currentRow++;

  TEMPLATE_CAPSTERS.forEach((c) => {
    const r = currentRow;
    const row = wsCapster.getRow(r);
    row.height = 18;
    wsCapster.mergeCells(`B${r}:H${r}`);
    wsCapster.mergeCells(`I${r}:T${r}`);

    const labelCell = wsCapster.getCell(`B${r}`);
    labelCell.value = `Capster ${c.capsterName}`;
    labelCell.font = {name: 'Calibri', size: 10, bold: true};
    labelCell.border = THIN_BORDER;

    const valCell = wsCapster.getCell(`I${r}`);
    valCell.value = c.totalRpK.total * 1000;
    valCell.font = {name: 'Calibri', size: 10, bold: true};
    valCell.numFmt = '"Rp"#,##0';
    valCell.alignment = {horizontal: 'right', vertical: 'middle'};
    valCell.border = THIN_BORDER;
    currentRow++;
  });

  // Total Laba Kotor
  const rTotalAll = currentRow;
  const totRow = wsCapster.getRow(rTotalAll);
  totRow.height = 24;
  wsCapster.mergeCells(`B${rTotalAll}:H${rTotalAll}`);
  wsCapster.mergeCells(`I${rTotalAll}:T${rTotalAll}`);

  const totLabel = wsCapster.getCell(`B${rTotalAll}`);
  totLabel.value = 'TOTAL LABA KOTOR (JASA & PRODUK)';
  totLabel.font = {name: 'Calibri', size: 11, bold: true, color: {argb: 'FFFFFFFF'}};
  totLabel.fill = darkFill;
  totLabel.border = THIN_BORDER;

  const grandSum = TEMPLATE_CAPSTERS.reduce((s, c) => s + c.totalRpK.total * 1000, 0);
  const totVal = wsCapster.getCell(`I${rTotalAll}`);
  totVal.value = grandSum;
  totVal.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FF000000'}};
  totVal.numFmt = '"Rp"#,##0';
  totVal.fill = yellowFill;
  totVal.alignment = {horizontal: 'right', vertical: 'middle'};
  totVal.border = DOUBLE_BOTTOM_BORDER;

  // Set widths for wsCapster
  const capsterWidths = [
    5, 12, 6, 6, 6, 6, 7, 7, 7, 7, 6, 6, 6, 7, 7, 7, 6, 6, 6, 12
  ];
  capsterWidths.forEach((w, i) => {
    wsCapster.getColumn(i + 1).width = w;
  });

  // =========================================================================
  // SHEET 2: REKAP ABSENSI BULANAN (Matriks Kehadiran Capster & Karyawan)
  // =========================================================================
  const wsAtt = workbook.addWorksheet('Rekap Absensi Bulanan', {
    views: [{state: 'frozen', ySplit: 3}],
  });

  wsAtt.mergeCells('A1:I1');
  const attTitle = wsAtt.getCell('A1');
  attTitle.value = `REKAPITULASI ABSENSI & KEHADIRAN KARYAWAN — ${periodTitle}`;
  attTitle.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FFFFFFFF'}};
  attTitle.fill = darkFill;
  attTitle.alignment = {horizontal: 'center', vertical: 'middle'};
  wsAtt.getRow(1).height = 25;

  // Header Table 1: Ringkasan Persentase Kehadiran
  wsAtt.mergeCells('A2:I2');
  const attSub1 = wsAtt.getCell('A2');
  attSub1.value = 'TABEL 1: RINGKASAN PERSENTASE KEHADIRAN CAPSTER (HARI KERJA)';
  attSub1.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FFFFFFFF'}};
  attSub1.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF334155'}};
  attSub1.alignment = {horizontal: 'left', vertical: 'middle', indent: 1};

  const attMatrix = generateMonthlyAttendanceMatrix(monthYear);

  const attSummaryHeaders = [
    'NO',
    'NAMA KARYAWAN',
    'JABATAN',
    'HARI KERJA',
    'HADIR (ON-TIME)',
    'TERLAMBAT',
    'LIBUR / OFF',
    'TOTAL MASUK',
    '% KEHADIRAN',
  ];

  const rAttHead = 3;
  const attHeadRow = wsAtt.getRow(rAttHead);
  attHeadRow.height = 20;
  attSummaryHeaders.forEach((h, idx) => {
    const cell = attHeadRow.getCell(idx + 1);
    cell.value = h;
    cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: 'FFFFFFFF'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF1E293B'}};
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: 'center', vertical: 'middle'};
  });

  let attCurRow = 4;
  attMatrix.summaries.forEach((s, idx) => {
    const row = wsAtt.getRow(attCurRow);
    row.height = 18;
    const vals = [
      idx + 1,
      s.name,
      s.role,
      s.totalHari,
      s.hadir - s.terlambat,
      s.terlambat,
      s.libur,
      s.hadir,
      `${s.percent}%`,
    ];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = {name: 'Calibri', size: 9};
      cell.border = THIN_BORDER;
      cell.alignment = {horizontal: cIdx <= 2 ? 'center' : 'right', vertical: 'middle'};
      if (cIdx === 1) cell.alignment = {horizontal: 'left', vertical: 'middle'};
      if (cIdx === 8) {
        cell.font = {name: 'Calibri', size: 9, bold: true};
        cell.fill = lightYellowFill;
      }
    });
    attCurRow++;
  });

  // Table 2: Matriks Kehadiran Harian (Day 1..31)
  attCurRow += 2;
  wsAtt.mergeCells(`A${attCurRow}:I${attCurRow}`);
  const attSub2 = wsAtt.getCell(`A${attCurRow}`);
  attSub2.value = 'TABEL 2: MATRIKS STATUS KEHADIRAN HARIAN (1 S.D. 31)';
  attSub2.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FFFFFFFF'}};
  attSub2.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF334155'}};
  attSub2.alignment = {horizontal: 'left', vertical: 'middle', indent: 1};
  wsAtt.getRow(attCurRow).height = 22;
  attCurRow++;

  const dayMatrixHeaders = ['NO', 'TANGGAL', 'HARI', 'UDIN', 'ATTA', 'NOEL', 'ASWAR', 'ACEL', 'KETERANGAN'];
  const dayHeadRow = wsAtt.getRow(attCurRow);
  dayHeadRow.height = 20;
  dayMatrixHeaders.forEach((h, idx) => {
    const cell = dayHeadRow.getCell(idx + 1);
    cell.value = h;
    cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: 'FFFFFFFF'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF1E293B'}};
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: 'center', vertical: 'middle'};
  });
  attCurRow++;

  attMatrix.days.forEach((d) => {
    const row = wsAtt.getRow(attCurRow);
    row.height = 17;
    const vals = [
      d.no,
      d.date,
      d.dayName,
      d.attendanceByCapster['UDIN'],
      d.attendanceByCapster['ATTA'],
      d.attendanceByCapster['NOEL'],
      d.attendanceByCapster['ASWAR'],
      d.attendanceByCapster['ACEL'],
      d.notes || '',
    ];

    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = {name: 'Calibri', size: 9};
      cell.border = THIN_BORDER;
      cell.alignment = {horizontal: cIdx <= 2 ? 'center' : 'center', vertical: 'middle'};

      // Status color highlighting
      if (v === 'Hadir') {
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFE2F0D9'}};
        cell.font = {name: 'Calibri', size: 9, color: {argb: 'FF385723'}};
      } else if (v === 'Terlambat') {
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFFF2CC'}};
        cell.font = {name: 'Calibri', size: 9, color: {argb: 'FFB25900'}};
      } else if (v === 'Libur' || v === 'Off') {
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFCE4D6'}};
        cell.font = {name: 'Calibri', size: 9, color: {argb: 'FFC00000'}};
      }
    });
    attCurRow++;
  });

  const wsAttWidths = [5, 13, 11, 10, 10, 10, 10, 10, 24];
  wsAttWidths.forEach((w, i) => {
    wsAtt.getColumn(i + 1).width = w;
  });

  // =========================================================================
  // SHEET 3: PENGELUARAN (Operasional & Belanja Barang - Sesuai Template)
  // =========================================================================
  const wsExp = workbook.addWorksheet('Pengeluaran Operasional', {
    views: [{state: 'frozen', ySplit: 2}],
  });

  wsExp.mergeCells('A1:F1');
  const expTitle = wsExp.getCell('A1');
  expTitle.value = `LAPORAN PENGELUARAN OPERASIONAL & BIAYA BARBER — ${periodTitle}`;
  expTitle.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FFFFFFFF'}};
  expTitle.fill = darkFill;
  expTitle.alignment = {horizontal: 'center', vertical: 'middle'};
  wsExp.getRow(1).height = 25;

  const expHeaders = ['NO', 'TANGGAL', 'NAMA BARANG / KEPERLUAN', 'RINCIAN / QTY', 'HARGA (Rp Ribuan)', 'TOTAL (Rp)'];
  const expHeadRow = wsExp.getRow(2);
  expHeadRow.height = 20;
  expHeaders.forEach((h, idx) => {
    const cell = expHeadRow.getCell(idx + 1);
    cell.value = h;
    cell.font = {name: 'Calibri', size: 9, bold: true, color: {argb: 'FFFFFFFF'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF1E293B'}};
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: 'center', vertical: 'middle'};
  });

  let expRowIdx = 3;
  TEMPLATE_EXPENSES.forEach((exp, idx) => {
    const row = wsExp.getRow(expRowIdx);
    row.height = 18;
    const vals = [
      idx + 1,
      exp.date,
      exp.item.toUpperCase(),
      exp.qty,
      exp.price_k,
      exp.price_k * 1000,
    ];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = {name: 'Calibri', size: 9};
      cell.border = THIN_BORDER;
      cell.alignment = {horizontal: cIdx <= 1 ? 'center' : cIdx === 2 || cIdx === 3 ? 'left' : 'right', vertical: 'middle'};
      if (cIdx === 4) cell.numFmt = '#,##0';
      if (cIdx === 5) cell.numFmt = '"Rp"#,##0';
    });
    expRowIdx++;
  });

  const expTotalRow = wsExp.getRow(expRowIdx);
  expTotalRow.height = 22;
  wsExp.mergeCells(`A${expRowIdx}:D${expRowIdx}`);
  const expTotLabel = wsExp.getCell(`A${expRowIdx}`);
  expTotLabel.value = 'TOTAL PENGELUARAN OPERASIONAL';
  expTotLabel.font = {name: 'Calibri', size: 10, bold: true};
  expTotLabel.alignment = {horizontal: 'center', vertical: 'middle'};
  expTotLabel.border = THIN_BORDER;
  expTotLabel.fill = grayFill;

  const totalExpK = TEMPLATE_EXPENSES.reduce((s, e) => s + e.price_k, 0);
  const expCell5 = expTotalRow.getCell(5);
  expCell5.value = totalExpK;
  expCell5.numFmt = '#,##0';
  expCell5.font = {name: 'Calibri', size: 10, bold: true};
  expCell5.border = THIN_BORDER;
  expCell5.fill = yellowFill;
  expCell5.alignment = {horizontal: 'right', vertical: 'middle'};

  const expCell6 = expTotalRow.getCell(6);
  expCell6.value = totalExpK * 1000;
  expCell6.numFmt = '"Rp"#,##0';
  expCell6.font = {name: 'Calibri', size: 10, bold: true};
  expCell6.border = DOUBLE_BOTTOM_BORDER;
  expCell6.fill = yellowFill;
  expCell6.alignment = {horizontal: 'right', vertical: 'middle'};

  // Financial summary block on Pengeluaran sheet
  expRowIdx += 3;
  wsExp.mergeCells(`B${expRowIdx}:E${expRowIdx}`);
  const finTitle = wsExp.getCell(`B${expRowIdx}`);
  finTitle.value = 'KALKULASI LABA BERSIH BULANAN';
  finTitle.font = {name: 'Calibri', size: 11, bold: true, color: {argb: 'FFFFFFFF'}};
  finTitle.fill = darkFill;
  finTitle.alignment = {horizontal: 'center', vertical: 'middle'};
  expRowIdx++;

  const finLines = [
    {label: 'Total Laba Kotor (Pendapatan Jasa + Produk Seluruh Capster)', val: grandSum, isNeg: false},
    {label: 'Total Pengeluaran Operasional & Belanja Barang', val: totalExpK * 1000, isNeg: true},
    {label: 'LABA BERSIH AKHIR (PROFIT BERSIH CABANG)', val: grandSum - totalExpK * 1000, isNeg: false, isFinal: true},
  ];

  finLines.forEach((l) => {
    const r = wsExp.getRow(expRowIdx);
    r.height = l.isFinal ? 24 : 20;
    wsExp.mergeCells(`B${expRowIdx}:D${expRowIdx}`);
    const lbl = wsExp.getCell(`B${expRowIdx}`);
    lbl.value = l.label;
    lbl.font = {name: 'Calibri', size: l.isFinal ? 10 : 9, bold: l.isFinal};
    lbl.border = THIN_BORDER;

    const vCell = wsExp.getCell(`E${expRowIdx}`);
    vCell.value = l.isNeg ? -l.val : l.val;
    vCell.numFmt = '"Rp"#,##0;[Red]("-Rp"#,##0)';
    vCell.font = {name: 'Calibri', size: l.isFinal ? 11 : 9, bold: l.isFinal};
    vCell.alignment = {horizontal: 'right', vertical: 'middle'};
    vCell.border = l.isFinal ? DOUBLE_BOTTOM_BORDER : THIN_BORDER;
    if (l.isFinal) vCell.fill = yellowFill;
    expRowIdx++;
  });

  const wsExpWidths = [6, 13, 30, 16, 18, 20];
  wsExpWidths.forEach((w, i) => {
    wsExp.getColumn(i + 1).width = w;
  });

  // =========================================================================
  // SHEET 4: STOK & PRODUK (Matches uploaded Excel template)
  // =========================================================================
  const ws1 = workbook.addWorksheet('Stok & Produk', {
    views: [{state: 'frozen', ySplit: 3}],
  });

  // Title Row (Row 1)
  ws1.mergeCells('A1:Q1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `LAPORAN BARBERSHOP CENDRAWASIH — ${periodTitle} (${report.branch_name.toUpperCase()})`;
  titleCell.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FFFFFFFF'}};
  titleCell.fill = darkFill;
  titleCell.alignment = {horizontal: 'center', vertical: 'middle'};
  ws1.getRow(1).height = 24;

  // Group Header Row (Row 2)
  ws1.mergeCells('A2:A3');
  ws1.mergeCells('B2:B3');
  ws1.mergeCells('C2:E2');
  ws1.mergeCells('F2:J2');
  ws1.mergeCells('K2:M2');
  ws1.mergeCells('N2:Q2');

  ws1.getCell('A2').value = 'NO';
  ws1.getCell('B2').value = 'TANGGAL';
  ws1.getCell('C2').value = 'STOK BARANG JUAL';
  ws1.getCell('F2').value = 'STOK BARANG BARBER';
  ws1.getCell('K2').value = 'PRODUK TERJUAL';
  ws1.getCell('N2').value = 'PRODUK TERPAKAI';

  const subHeaders = [
    '', // A3 merged
    '', // B3 merged
    'PM',
    'HR',
    'PW',
    'TISU LEHER',
    'HAIR TONIC',
    'SHAMPO',
    'PERMING',
    'sampo cultusia',
    'PM',
    'HR',
    'PW',
    'PM',
    'HR',
    'PW',
    'tisu leher',
  ];

  subHeaders.forEach((label, idx) => {
    if (idx >= 2) {
      ws1.getCell(3, idx + 1).value = label;
    }
  });

  for (let r = 2; r <= 3; r++) {
    ws1.getRow(r).height = 20;
    for (let c = 1; c <= 17; c++) {
      const cell = ws1.getCell(r, c);
      cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FF000000'}};
      cell.alignment = {horizontal: 'center', vertical: 'middle'};
      cell.border = THIN_BORDER;

      if (c >= 3 && c <= 5) cell.fill = yellowFill;
      else if (c >= 6 && c <= 10) cell.fill = greenFill;
      else if (c >= 11 && c <= 13) cell.fill = purpleFill;
      else if (c >= 14 && c <= 17) cell.fill = yellowFill;
      else cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFF8FAFC'}};
    }
  }

  const startInvRow = 4;
  report.days.forEach((day, idx) => {
    const rowIdx = startInvRow + idx;
    const inv = day.inventory;
    const values: (number | string)[] = [
      day.no,
      day.date_label,
      inv.stok_jual_pm,
      inv.stok_jual_hr,
      inv.stok_jual_pw,
      inv.stok_barber_tisu_leher,
      inv.stok_barber_hair_tonic,
      inv.stok_barber_shampo,
      inv.stok_barber_perming,
      inv.stok_barber_sampo_cultusia,
      inv.terjual_pm,
      inv.terjual_hr,
      inv.terjual_pw,
      inv.terpakai_pm,
      inv.terpakai_hr,
      inv.terpakai_pw,
      inv.terpakai_tisu_leher,
    ];

    const row = ws1.getRow(rowIdx);
    row.height = 18;
    values.forEach((val, colIdx) => {
      const c = colIdx + 1;
      const cell = row.getCell(c);
      cell.value = val === 0 && c > 2 ? 0 : val;
      cell.font = {name: 'Calibri', size: 10, color: {argb: 'FF0F172A'}};
      cell.border = THIN_BORDER;
      cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
      if (c >= 6 && c <= 10) cell.fill = greenFill;
      else if (c >= 11 && c <= 13) cell.fill = purpleFill;
    });
  });

  const endInvRow = startInvRow + report.days.length - 1;
  const totalInvRowIdx = endInvRow + 1;
  const totalRow = ws1.getRow(totalInvRowIdx);
  totalRow.height = 20;

  ws1.getCell(totalInvRowIdx, 1).value = '';
  ws1.getCell(totalInvRowIdx, 2).value = 'total';

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  for (let c = 1; c <= 17; c++) {
    const cell = totalRow.getCell(c);
    if (c >= 3) {
      const col = colLetters[c - 1];
      cell.value = {formula: `SUM(${col}${startInvRow}:${col}${endInvRow})`};
      cell.numFmt = '#,##0';
    }
    cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FF000000'}};
    cell.fill = yellowFill;
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
  }

  // Rp Nominal Row under PRODUK TERJUAL (Cols K, L, M)
  const rpRowIdx = totalInvRowIdx + 1;
  const rpRow = ws1.getRow(rpRowIdx);
  rpRow.height = 20;
  ws1.getCell(rpRowIdx, 2).value = 'Nominal Penjualan (Rp)';
  ws1.getCell(rpRowIdx, 2).font = {name: 'Calibri', size: 9, bold: true};
  ws1.getCell(rpRowIdx, 11).value = report.totals.terjual_pm_rp;
  ws1.getCell(rpRowIdx, 12).value = report.totals.terjual_hr_rp;
  ws1.getCell(rpRowIdx, 13).value = report.totals.terjual_pw_rp;
  for (let c = 11; c <= 13; c++) {
    const cell = rpRow.getCell(c);
    cell.numFmt = '"Rp"#,##0.00';
    cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FF000000'}};
    cell.fill = lightYellowFill;
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: 'right', vertical: 'middle'};
  }

  const ws1Widths = [6, 14, 7, 7, 7, 13, 13, 11, 11, 16, 8, 8, 8, 8, 8, 8, 12];
  ws1Widths.forEach((w, i) => {
    ws1.getColumn(i + 1).width = w;
  });

  // =========================================================================
  // SHEET 5: KEUANGAN & PANGKAS (Weekly / Monthly Revenue)
  // =========================================================================
  const ws2 = workbook.addWorksheet('Keuangan & Pangkas', {
    views: [{state: 'frozen', ySplit: 2}],
  });

  ws2.mergeCells('A1:K1');
  const ws2Title = ws2.getCell('A1');
  ws2Title.value = `REKAP KEUANGAN & PANGKAS CENDRAWASIH — ${periodTitle} (${report.branch_name.toUpperCase()})`;
  ws2Title.font = {name: 'Calibri', size: 12, bold: true, color: {argb: 'FFFFFFFF'}};
  ws2Title.fill = darkFill;
  ws2Title.alignment = {horizontal: 'center', vertical: 'middle'};
  ws2.getRow(1).height = 24;

  const finHeaders = [
    'NO',
    'TANGGAL',
    'TRANSAKSI',
    'DIPANGKAS',
    'TUNAI',
    'QRIS',
    'TRANSFER',
    'DEBIT',
    'OMZET KOTOR',
    'KOMISI BARBER',
    'PENDAPATAN BERSIH',
  ];
  const headerRow2 = ws2.getRow(2);
  headerRow2.height = 22;
  finHeaders.forEach((h, i) => {
    const cell = headerRow2.getCell(i + 1);
    cell.value = h;
    cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FFFFFFFF'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF18181B'}};
    cell.alignment = {horizontal: 'center', vertical: 'middle'};
    cell.border = THIN_BORDER;
  });

  const finStart = 3;
  report.days.forEach((d, idx) => {
    const row = ws2.getRow(finStart + idx);
    row.height = 19;
    const vals = [
      d.no,
      d.date_label,
      d.transactions_count,
      d.cuts_count,
      d.tunai,
      d.qris,
      d.transfer,
      d.debit,
      d.gross_revenue,
      d.barber_commission,
      d.net_income,
    ];
    vals.forEach((v, colIdx) => {
      const c = colIdx + 1;
      const cell = row.getCell(c);
      cell.value = v;
      cell.font = {name: 'Calibri', size: 10};
      cell.border = THIN_BORDER;
      cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
      if (c >= 5) cell.numFmt = '"Rp"#,##0';
    });
  });

  const finEnd = finStart + report.days.length - 1;
  const finTotalRow = ws2.getRow(finEnd + 1);
  finTotalRow.height = 22;
  finTotalRow.getCell(2).value = 'TOTAL';
  for (let c = 1; c <= 11; c++) {
    const cell = finTotalRow.getCell(c);
    if (c >= 3) {
      const col = colLetters[c - 1];
      cell.value = {formula: `SUM(${col}${finStart}:${col}${finEnd})`};
      cell.numFmt = c >= 5 ? '"Rp"#,##0' : '#,##0';
    }
    cell.font = {name: 'Calibri', size: 10, bold: true, color: {argb: 'FF09090B'}};
    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFE4E4E7'}};
    cell.border = THIN_BORDER;
    cell.alignment = {horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle'};
  }

  const ws2Widths = [6, 14, 12, 12, 16, 16, 16, 16, 18, 18, 20];
  ws2Widths.forEach((w, i) => {
    ws2.getColumn(i + 1).width = w;
  });

  // Write and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const tag =
    report.mode === 'monthly'
      ? monthYear
      : `${report.start_date}_${report.end_date}`;
  a.href = url;
  a.download = `LAPORAN_CENDRAWASIH_LENGKAP_${report.mode.toUpperCase()}_${tag}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
