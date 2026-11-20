/**
 * PDF Export Utility — Barbershop Cendrawasih
 * Menggunakan browser print dialog (window.print) dengan CSS khusus
 * sehingga laporan tercetak rapi tanpa perlu server tambahan.
 */

export interface PdfExportOptions {
  elementId: string;
  filename?: string;
  title?: string;
}

/**
 * Ekspor elemen HTML ke PDF menggunakan print dialog browser.
 * Metode ini 100% client-side, tanpa upload ke server, support semua browser.
 */
export function downloadPeriodPdf(options: PdfExportOptions): void {
  const { elementId, filename = 'laporan-cendrawasih', title = 'Laporan Barbershop Cendrawasih' } = options;

  const el = document.getElementById(elementId);
  if (!el) {
    alert('Elemen laporan tidak ditemukan. Pastikan halaman sudah termuat.');
    return;
  }

  const printContent = el.innerHTML;

  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    alert('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
    return;
  }

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 10pt;
      color: #0f172a;
      background: #fff;
      padding: 12mm 15mm;
    }

    @page {
      size: A4 landscape;
      margin: 12mm 15mm;
    }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }

    /* ---- Header ---- */
    .pdf-header {
      text-align: center;
      border-bottom: 2px solid #09090B;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .pdf-header h1 {
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #09090B;
    }
    .pdf-header p {
      font-size: 9pt;
      color: #52525B;
      margin-top: 2px;
    }
    .pdf-header .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 8pt;
      color: #71717A;
    }

    /* ---- Tables ---- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid #CBD5E1;
      padding: 3px 6px;
      vertical-align: middle;
    }
    th {
      background: #1E293B;
      color: #fff;
      font-weight: 700;
      text-align: center;
    }
    tr:nth-child(even) td { background: #F8FAFC; }
    tr:hover td { background: #FEF9EE; }

    /* ---- Color badges ---- */
    .badge-hadir    { background: #DCFCE7; color: #166534; border-radius: 4px; padding: 1px 4px; font-weight: 700; }
    .badge-terlambat { background: #FEF3C7; color: #92400E; border-radius: 4px; padding: 1px 4px; font-weight: 700; }
    .badge-libur    { background: #FEE2E2; color: #991B1B; border-radius: 4px; padding: 1px 4px; font-weight: 700; }

    /* ---- Section titles ---- */
    .section-title {
      background: #09090B;
      color: #fff;
      font-size: 10pt;
      font-weight: 700;
      padding: 5px 10px;
      margin: 14px 0 6px;
      border-radius: 4px;
    }

    /* ---- Summary cards ---- */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .summary-card {
      border: 1px solid #E4E4E7;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .summary-card .label { font-size: 8pt; color: #71717A; }
    .summary-card .value { font-size: 13pt; font-weight: 800; color: #09090B; margin-top: 2px; }
    .summary-card.highlight { background: #09090B; border-color: #09090B; }
    .summary-card.highlight .label { color: #A1A1AA; }
    .summary-card.highlight .value { color: #DCA842; }

    /* ---- Capster tables ---- */
    .capster-block { margin-bottom: 20px; page-break-inside: avoid; }
    .capster-header {
      background: #1F2937;
      color: #fff;
      padding: 5px 10px;
      font-weight: 700;
      font-size: 9.5pt;
      display: flex;
      justify-content: space-between;
      border-radius: 4px 4px 0 0;
    }
    .capster-header .total { color: #DCA842; }

    /* ---- Color fills for capster columns ---- */
    .col-haircut { background: #FEFCE8 !important; }
    .col-perming { background: #F0FDF4 !important; }
    .col-styling { background: #FFF7ED !important; }
    .col-color   { background: #FAF5FF !important; }
    .col-produk  { background: #EFF6FF !important; }
    .col-total   { background: #FEFCE8 !important; font-weight: 700; }

    .row-total { background: #E4E4E7 !important; font-weight: 700; }
    .row-nominal { background: #FEF9C3 !important; font-weight: 700; }

    .footer {
      margin-top: 16px;
      border-top: 1px solid #E4E4E7;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #71717A;
      display: flex;
      justify-content: space-between;
    }

    /* hide layout switcher buttons and other UI */
    button, .no-print, [role="tablist"], nav { display: none !important; }
    input, select { display: none !important; }
  </style>
</head>
<body>

  <div class="pdf-header">
    <h1>Barbershop Cendrawasih — ${title}</h1>
    <p>Oyehe, Nabire, Papua Tengah · Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso</p>
    <div class="meta">
      <span>Dicetak: ${new Date().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
      <span>Dokumen ini digenerate otomatis oleh Sistem Manajemen Cendrawasih</span>
    </div>
  </div>

  <div id="pdf-content">
    ${printContent}
  </div>

  <div class="footer">
    <span>© Barbershop Cendrawasih — Dokumen Rahasia Internal</span>
    <span>File: ${filename}.pdf</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        document.title = '${filename}';
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `);

  printWindow.document.close();
}

/**
 * Generate nama file laporan otomatis berdasarkan periode
 */
export function generateReportFilename(prefix: string, period: string): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${prefix}_${period}_${ts}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}
