import QRCode from 'qrcode';

function tlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) required by EMVCo / QRIS spec (Tag 63).
 */
export function computeCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface DynamicQRISInput {
  amount: number;
  branchCode: string;
  branchName: string;
  customerName: string;
  referenceId: string;
}

export interface DynamicQRISResult {
  referenceId: string;
  payload: string;
  dataUrl: string;
  amount: number;
  generatedAt: string;
  expiresAt: string;
}

export function generateQRISReference(branchCode = 'CW01'): string {
  const cleanCode = branchCode.replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'CW01';
  const now = new Date();
  const hhmmss =
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QRIS-${cleanCode}-${hhmmss}-${rand}`;
}

export function buildDynamicQRISPayload(input: DynamicQRISInput): string {
  const cleanAmount = Math.max(0, Math.round(input.amount));
  const merchantName = 'CENDRAWASIH BARBER'.slice(0, 25);
  const merchantCity = 'JAYAPURA';

  // Tag 26: Merchant Account Info (QRIS Domestic)
  const merchantAccount =
    tlv('00', 'ID.CO.QRIS.WWW') +
    tlv('01', `936009140000${input.branchCode.replace(/\D/g, '').padStart(4, '0')}`) +
    tlv('02', `ID${input.branchCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()}001`) +
    tlv('03', 'UMI');

  // Tag 62: Additional Data (Unique Reference ID + Customer Label)
  const customerTag = input.customerName.trim().slice(0, 20) || 'WALKIN';
  const additionalData = tlv('01', input.referenceId) + tlv('05', customerTag);

  const rawWithoutCrc =
    tlv('00', '01') + // Payload Format Indicator
    tlv('01', '12') + // 12 = Dynamic QRIS
    tlv('26', merchantAccount) +
    tlv('52', '7230') + // MCC 7230: Barber and Beauty Shops
    tlv('53', '360') + // IDR Currency
    tlv('54', String(cleanAmount)) + // Dynamic Amount
    tlv('58', 'ID') +
    tlv('59', merchantName) +
    tlv('60', merchantCity) +
    tlv('61', '99112') +
    tlv('62', additionalData) +
    '6304';

  const crc = computeCRC16(rawWithoutCrc);
  return `${rawWithoutCrc}${crc}`;
}

export async function createDynamicQRIS(input: DynamicQRISInput): Promise<DynamicQRISResult> {
  const payload = buildDynamicQRISPayload(input);
  const dataUrl = await QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#09090B',
      light: '#FFFFFF',
    },
  });

  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);

  return {
    referenceId: input.referenceId,
    payload,
    dataUrl,
    amount: Math.max(0, Math.round(input.amount)),
    generatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}
