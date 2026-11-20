/**
 * ESC/POS & Web Bluetooth Thermal Printer & Cash Drawer Utility
 * Mendukung Thermal Printer Bluetooth 58mm & 80mm (RPP02N, Panda, Iware, Eppos, Zywell, dll)
 * Dilengkapi pembuka laci otomatis (kick cash drawer) & browser print fallback.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BluetoothDeviceState {
  connected: boolean;
  name: string;
  device?: any;
  server?: any;
  characteristic?: any;
}

interface WebBluetoothDevice {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<any>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<any>;
    getPrimaryServices(): Promise<any[]>;
  };
}

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

export const ESC_POS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH: [ESC, 0x21, 0x20],
  DOUBLE_SIZE: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  FEED_LINE: [0x0a],
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  CUT_PAPER: [GS, 0x56, 0x41, 0x10], // Cut paper
  // Kick Cash Drawer (Pin 2: 0x00, Pulse ON: 25*2ms=50ms, Pulse OFF: 250*2ms=500ms)
  KICK_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa],
};

// Bluetooth Printer Service UUIDs commonly used by thermal printers
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Print Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posiflex / Common BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Chinese thermal
];

let activeBluetoothDevice: any = null;
let activeCharacteristic: any = null;

/**
 * Cek apakah browser mendukung Web Bluetooth API
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as any);
}

/**
 * Hubungkan ke Thermal Printer Bluetooth via Web Bluetooth
 */
export async function connectBluetoothPrinter(): Promise<{ok: boolean; name: string; error?: string}> {
  if (!isBluetoothSupported()) {
    return {
      ok: false,
      name: '',
      error: 'Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Android/Windows/Mac.',
    };
  }

  try {
    const navBt = (navigator as any).bluetooth;
    const device = await navBt.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    if (!device.gatt) {
      throw new Error('Perangkat tidak memiliki GATT server');
    }

    const server = await device.gatt.connect();
    let foundChar: any = null;

    // Cari characteristic yang mendukung 'write' atau 'writeWithoutResponse'
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
        if (foundChar) break;
      } catch {
        // Lanjut ke service berikutnya jika tidak cocok
      }
    }

    // Jika belum ketemu di primary services, cari di semua services yang ada
    if (!foundChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundChar = char;
              break;
            }
          }
          if (foundChar) break;
        }
      } catch {
        // Fallback
      }
    }

    activeBluetoothDevice = device;
    activeCharacteristic = foundChar;

    localStorage.setItem('cendra_bt_printer_name', device.name || 'Printer Bluetooth');

    return {
      ok: true,
      name: device.name || 'Printer Thermal Bluetooth',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('User cancelled')) {
      return {ok: false, name: '', error: 'Pencarian printer dibatalkan'};
    }
    return {ok: false, name: '', error: msg || 'Gagal menghubungkan printer bluetooth'};
  }
}

/**
 * Putuskan koneksi printer bluetooth
 */
export function disconnectBluetoothPrinter(): void {
  if (activeBluetoothDevice && activeBluetoothDevice.gatt?.connected) {
    activeBluetoothDevice.gatt.disconnect();
  }
  activeBluetoothDevice = null;
  activeCharacteristic = null;
  localStorage.removeItem('cendra_bt_printer_name');
}

/**
 * Status koneksi printer saat ini
 */
export function getBluetoothPrinterStatus(): {connected: boolean; name: string} {
  const isConnected = Boolean(activeBluetoothDevice && activeBluetoothDevice.gatt?.connected);
  const savedName = localStorage.getItem('cendra_bt_printer_name') || '';
  return {
    connected: isConnected,
    name: isConnected ? activeBluetoothDevice?.name || savedName : savedName,
  };
}

/**
 * Kirim raw byte array ke printer Bluetooth
 */
export async function sendBytesToBluetoothPrinter(data: Uint8Array): Promise<boolean> {
  if (!activeCharacteristic) {
    return false;
  }
  try {
    // Bluetooth payload biasanya dibatasi 100-512 bytes per write
    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (activeCharacteristic.properties.writeWithoutResponse) {
        await activeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await activeCharacteristic.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 20)); // Delay antar chunk
    }
    return true;
  } catch (e) {
    console.error('Error sending bytes to bluetooth printer:', e);
    return false;
  }
}

/**
 * Mainkan suara mekanik laci kasir "Ka-Ching!" dengan Web Audio API
 */
export function playCashDrawerChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    // Bell 1 (tinggi)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Bell 2 (harmoni)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1567.98, now + 0.05); // G6
    gain2.gain.setValueAtTime(0.35, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.8);

    // Click / Spring noise laci
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'square';
    osc3.frequency.setValueAtTime(180, now + 0.02);
    osc3.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain3.gain.setValueAtTime(0.3, now + 0.02);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.02);
    osc3.stop(now + 0.2);
  } catch {
    // Abaikan jika audio context diblokir oleh browser
  }
}

/**
 * Buka laci kasir otomatis (ESC/POS Kick Drawer command + Sound)
 */
export async function triggerOpenCashDrawer(): Promise<{success: boolean; method: string}> {
  // Mainkan efek audio laci kasir
  playCashDrawerChime();

  // Jika printer bluetooth terhubung, kirim sinyal ESC/POS kick drawer
  if (activeCharacteristic) {
    const kickCommand = new Uint8Array(ESC_POS.KICK_DRAWER);
    const sent = await sendBytesToBluetoothPrinter(kickCommand);
    if (sent) {
      return {success: true, method: 'bluetooth_esc_pos'};
    }
  }

  return {success: true, method: 'audio_software'};
}

export interface ReceiptData {
  invoiceNo: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  dateTimeStr: string;
  cashierName: string;
  barberName: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashGiven?: number;
  change?: number;
  notes?: string;
}

/**
 * Generate formatted text bytes untuk thermal printer 58mm (32 kolom) / 80mm (48 kolom)
 */
export function buildEscPosReceipt(data: ReceiptData, is80mm = false): Uint8Array {
  const width = is80mm ? 48 : 32;
  const bytes: number[] = [];

  const add = (arr: number[]) => bytes.push(...arr);
  const addText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 0xff);
    }
  };
  const addLine = (text: string) => {
    addText(text);
    add(ESC_POS.FEED_LINE);
  };
  const addDivider = (char = '-') => {
    addLine(char.repeat(width));
  };
  const addTwoCol = (left: string, right: string) => {
    const spaceCount = Math.max(1, width - left.length - right.length);
    addLine(left + ' '.repeat(spaceCount) + right);
  };

  // Init printer
  add(ESC_POS.INIT);

  // Header
  add(ESC_POS.ALIGN_CENTER);
  add(ESC_POS.BOLD_ON);
  add(ESC_POS.DOUBLE_HEIGHT);
  addLine('BARBERSHOP CENDERAWASIH');
  add(ESC_POS.NORMAL_SIZE);
  add(ESC_POS.BOLD_OFF);
  addLine(data.branchName);
  addLine(data.branchAddress);
  addLine(`Telp: ${data.branchPhone}`);
  addDivider('=');

  // Metadata
  add(ESC_POS.ALIGN_LEFT);
  addTwoCol(`No: ${data.invoiceNo}`, data.dateTimeStr.slice(0, 10));
  addTwoCol(`Kasir : ${data.cashierName}`, `Jam: ${data.dateTimeStr.slice(11, 16)}`);
  addTwoCol(`Barber: ${data.barberName}`, `Bayar: ${data.paymentMethod}`);
  addLine(`Pelanggan: ${data.customerName}`);
  addDivider('-');

  // Items
  data.items.forEach((item) => {
    addLine(item.name);
    const qtyPrice = `  ${item.qty}x Rp ${item.price.toLocaleString('id-ID')}`;
    const itemTotal = `Rp ${(item.qty * item.price).toLocaleString('id-ID')}`;
    addTwoCol(qtyPrice, itemTotal);
  });
  addDivider('-');

  // Subtotal & Total
  addTwoCol('Subtotal', `Rp ${data.subtotal.toLocaleString('id-ID')}`);
  if (data.discount > 0) {
    addTwoCol('Diskon', `-Rp ${data.discount.toLocaleString('id-ID')}`);
  }

  add(ESC_POS.BOLD_ON);
  add(ESC_POS.DOUBLE_HEIGHT);
  addTwoCol('TOTAL', `Rp ${data.total.toLocaleString('id-ID')}`);
  add(ESC_POS.NORMAL_SIZE);
  add(ESC_POS.BOLD_OFF);

  if (data.paymentMethod === 'Tunai' && data.cashGiven) {
    addTwoCol('Bayar (Tunai)', `Rp ${data.cashGiven.toLocaleString('id-ID')}`);
    addTwoCol('Kembalian', `Rp ${(data.change || 0).toLocaleString('id-ID')}`);
  }
  addDivider('=');

  // Footer
  add(ESC_POS.ALIGN_CENTER);
  addLine('TERIMA KASIH ATAS KUNJUNGAN ANDA');
  addLine('Potongan Rapi, Tampil Percaya Diri!');
  addLine('IG: @cendrawasih_barbershop');
  addLine('Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso');
  addLine('Oyehe, Nabire - Papua Tengah');

  // Feed & Cut
  add(ESC_POS.FEED_LINES(3));
  add(ESC_POS.CUT_PAPER);

  return new Uint8Array(bytes);
}

/**
 * Cetak struk: Coba kirim via Bluetooth, jika tidak terhubung fallback ke browser print dialog
 */
export async function printReceipt(data: ReceiptData, autoOpenDrawer = true): Promise<{method: string; success: boolean}> {
  // Buka laci jika pembayaran tunai
  if (autoOpenDrawer && data.paymentMethod === 'Tunai') {
    await triggerOpenCashDrawer();
  }

  // Coba Bluetooth jika terhubung
  if (activeCharacteristic) {
    try {
      const bytes = buildEscPosReceipt(data);
      const sent = await sendBytesToBluetoothPrinter(bytes);
      if (sent) {
        return {method: 'bluetooth', success: true};
      }
    } catch (e) {
      console.warn('Bluetooth print failed, falling back to browser print:', e);
    }
  }

  // Fallback: Browser Print Window khusus ukuran thermal 58mm/80mm
  printReceiptViaBrowser(data);
  return {method: 'browser_fallback', success: true};
}

/**
 * Cetak struk via popup browser dialog yang diformat presisi untuk kertas struk thermal 58mm
 */
export function printReceiptViaBrowser(data: ReceiptData): void {
  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) {
    alert('Popup diblokir browser. Izinkan popup untuk mencetak struk.');
    return;
  }

  const itemsHtml = data.items
    .map(
      (it) => `
    <tr>
      <td colspan="2" style="font-weight: 600; padding-top: 4px;">${it.name}</td>
    </tr>
    <tr>
      <td style="color: #555; padding-bottom: 4px;">${it.qty} x Rp ${it.price.toLocaleString('id-ID')}</td>
      <td style="text-align: right; font-weight: 600; padding-bottom: 4px;">Rp ${(it.qty * it.price).toLocaleString('id-ID')}</td>
    </tr>
  `
    )
    .join('');

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk ${data.invoiceNo}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 2mm 3mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
    }
    body {
      width: 58mm;
      max-width: 58mm;
      padding: 6px 4px;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .title { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .divider-double { border-top: 1px solid #000; border-bottom: 1px solid #000; height: 3px; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .row-meta td { font-size: 10px; color: #333; }
    .total-row td { font-size: 13px; font-weight: 900; padding: 4px 0; }
    @media print {
      body { width: 58mm; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">BARBERSHOP CENDERAWASIH</div>
    <div style="font-size: 10px; margin-top: 2px;">${data.branchName}</div>
    <div style="font-size: 9px; color: #444;">${data.branchAddress}</div>
    <div style="font-size: 9px; color: #444;">Telp: ${data.branchPhone}</div>
  </div>

  <div class="divider-double"></div>

  <table>
    <tr class="row-meta">
      <td>No: ${data.invoiceNo}</td>
      <td class="text-right">${data.dateTimeStr.slice(0, 10)}</td>
    </tr>
    <tr class="row-meta">
      <td>Kasir: ${data.cashierName}</td>
      <td class="text-right">${data.dateTimeStr.slice(11, 16)} WIT</td>
    </tr>
    <tr class="row-meta">
      <td>Barber: <strong>${data.barberName}</strong></td>
      <td class="text-right"><strong>${data.paymentMethod}</strong></td>
    </tr>
    <tr class="row-meta">
      <td colspan="2">Pelanggan: ${data.customerName}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table>
    ${itemsHtml}
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td>Subtotal:</td>
      <td class="text-right">Rp ${data.subtotal.toLocaleString('id-ID')}</td>
    </tr>
    ${
      data.discount > 0
        ? `<tr>
      <td>Diskon:</td>
      <td class="text-right">-Rp ${data.discount.toLocaleString('id-ID')}</td>
    </tr>`
        : ''
    }
    <tr class="total-row">
      <td>TOTAL:</td>
      <td class="text-right">Rp ${data.total.toLocaleString('id-ID')}</td>
    </tr>
    ${
      data.paymentMethod === 'Tunai' && data.cashGiven
        ? `<tr>
      <td>Bayar Tunai:</td>
      <td class="text-right">Rp ${data.cashGiven.toLocaleString('id-ID')}</td>
    </tr>
    <tr>
      <td>Kembalian:</td>
      <td class="text-right">Rp ${(data.change || 0).toLocaleString('id-ID')}</td>
    </tr>`
        : ''
    }
  </table>

  <div class="divider-double"></div>

  <div class="text-center" style="font-size: 9.5px; line-height: 1.35; margin-top: 4px;">
    <div><strong>TERIMA KASIH ATAS KUNJUNGAN ANDA</strong></div>
    <div>Potongan Presisi, Tampil Percaya Diri!</div>
    <div style="margin-top: 4px; font-size: 8.5px; color: #555;">Cabang Sam Ratulangi & Yos Sudarso</div>
    <div style="font-size: 8.5px; color: #555;">Oyehe, Nabire - Papua Tengah</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 250);
    };
  </script>
</body>
</html>
  `);
  printWindow.document.close();
}
