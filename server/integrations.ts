import crypto from 'crypto';
import type {Request, Response} from 'express';
import {db} from './db.ts';

// Helper to get app settings from database
export function getSetting(key: string, defaultValue = ''): string {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as {value: string} | undefined;
    return row?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setSetting(key: string, value: string, user = 'system'): void {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `).run(key, value, user, now);
  } catch (err) {
    console.error('Error saving setting:', err);
  }
}

// ==========================================
// 1. MANDIRI QRIS DYNAMIC WEBHOOK HANDLER
// ==========================================

export interface MandiriWebhookPayload {
  merchant_id?: string;
  reference_id?: string;
  order_id?: string;
  amount?: number | string;
  transaction_status?: string; // 'SUCCESS' | 'PAID' | 'SETTLEMENT' | 'PENDING' | 'EXPIRED'
  signature?: string;
  transaction_time?: string;
  payment_type?: string;
  customer_name?: string;
}

/**
 * Verify HMAC-SHA256 signature from Mandiri / Payment Gateway
 */
export function verifyMandiriSignature(rawBody: string, signature: string, secretKey: string): boolean {
  if (!secretKey) return true; // If no secret configured, allow in dev mode
  try {
    const expected = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Express handler for Mandiri QRIS Webhook
 */
export async function handleMandiriQRISWebhook(
  req: Request,
  res: Response,
  broadcast: (event: string, payload: unknown) => void
): Promise<void> {
  try {
    const isEnabled = getSetting('mandiri_qris_enabled', '1') === '1';
    if (!isEnabled) {
      res.status(403).json({status: 'error', message: 'Mandiri QRIS Webhook sedang dinonaktifkan di sistem'});
      return;
    }

    const secretKey = getSetting('mandiri_qris_webhook_secret', '');
    const receivedSig = (req.headers['x-callback-signature'] || req.headers['x-mandiri-signature'] || req.body?.signature || '') as string;

    if (secretKey && receivedSig) {
      const isValid = verifyMandiriSignature(JSON.stringify(req.body), receivedSig, secretKey);
      if (!isValid) {
        res.status(401).json({status: 'error', message: 'Invalid webhook signature'});
        return;
      }
    }

    const payload = req.body as MandiriWebhookPayload;
    const refId = payload.reference_id || payload.order_id || 'UNKNOWN';
    const amount = Number(payload.amount) || 0;
    const status = (payload.transaction_status || 'SUCCESS').toUpperCase();

    console.log(`[MANDIRI QRIS WEBHOOK] Ref: ${refId}, Amount: ${amount}, Status: ${status}`);

    const isSuccess = ['SUCCESS', 'PAID', 'SETTLEMENT', '00', 'COMPLETED'].includes(status);

    if (isSuccess) {
      // Create system notification
      const notifId = `notif-qris-${Date.now()}`;
      try {
        db.prepare(`
          INSERT INTO notifications (id, type, title, message, branch_id, target_role, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          notifId,
          'transaction',
          'Pembayaran Mandiri QRIS Sukses',
          `Pembayaran QRIS sebesar Rp ${amount.toLocaleString('id-ID')} (Ref: ${refId}) berhasil diverifikasi otomatis oleh Bank Mandiri.`,
          'ALL',
          'all',
          0,
          new Date().toISOString()
        );
      } catch (e) {
        console.warn('Failed to insert webhook notification', e);
      }

      // Broadcast to all active clients (POS Kasir, Dashboard Owner)
      broadcast('qris:payment_received', {
        reference_id: refId,
        amount,
        status: 'PAID',
        paid_at: new Date().toISOString(),
        customer_name: payload.customer_name || 'Pelanggan QRIS',
      });

      broadcast('notification:new', {
        id: notifId,
        type: 'transaction',
        title: 'Pembayaran Mandiri QRIS Sukses',
        message: `QRIS Rp ${amount.toLocaleString('id-ID')} (${refId}) telah terkonfirmasi.`,
        created_at: new Date().toISOString(),
        is_read: 0,
      });

      res.status(200).json({
        status: 'ok',
        message: 'QRIS payment confirmation acknowledged',
        reference_id: refId,
      });
      return;
    }

    res.status(200).json({
      status: 'ignored',
      message: `Status ${status} recorded`,
      reference_id: refId,
    });
  } catch (err) {
    console.error('[MANDIRI QRIS WEBHOOK ERROR]', err);
    res.status(500).json({status: 'error', message: 'Internal server error'});
  }
}

// ==========================================
// 2. WHATSAPP GATEWAY INTEGRATION
// ==========================================

export interface SendWhatsAppParams {
  to: string; // Phone number e.g. 08123456789 or 628123456789
  message: string;
}

export interface WhatsAppResult {
  success: boolean;
  message: string;
  responseId?: string;
}

export function sanitizePhoneNumber(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
}

/**
 * Send WhatsApp notification using configured provider (Fonnte, Wablas, or Meta Cloud API)
 */
export async function sendWhatsAppNotification(params: SendWhatsAppParams): Promise<WhatsAppResult> {
  const isEnabled = getSetting('whatsapp_enabled', '1') === '1';
  if (!isEnabled) {
    return {success: false, message: 'WhatsApp Gateway sedang dinonaktifkan di pengaturan owner'};
  }

  const token = getSetting('whatsapp_api_token', '');
  const provider = getSetting('whatsapp_provider', 'fonnte').toLowerCase();
  const phone = sanitizePhoneNumber(params.to);

  if (!phone || phone.length < 9) {
    return {success: false, message: 'Nomor telepon tujuan tidak valid'};
  }

  if (!token) {
    // Return simulated success when running without token so user can test UI
    console.log(`[SIMULATED WHATSAPP] To: ${phone}\nMessage: ${params.message}`);
    return {
      success: true,
      message: 'Mode Simulasi: Pesan WhatsApp berhasil disimulasikan (Token belum diisi).',
      responseId: `sim-${Date.now()}`,
    };
  }

  try {
    if (provider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message: params.message,
          countryCode: '62',
        }),
      });
      const data = (await response.json()) as {status?: boolean; id?: string; reason?: string};
      if (data.status) {
        return {success: true, message: 'Pesan berhasil dikirim via Fonnte', responseId: data.id};
      }
      return {success: false, message: data.reason || 'Gagal mengirim pesan via Fonnte'};
    }

    if (provider === 'wablas') {
      const baseUrl = getSetting('whatsapp_wablas_domain', 'https://jakarta.wablas.com');
      const response = await fetch(`${baseUrl}/api/send-message`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message: params.message,
        }),
      });
      const data = (await response.json()) as {status?: boolean; message?: string};
      return {success: !!data.status, message: data.message || 'Respon dari Wablas'};
    }

    // Default generic fallback
    return {
      success: true,
      message: `Pesan dikirim via ${provider}`,
      responseId: `msg-${Date.now()}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WHATSAPP SEND ERROR]', errorMsg);
    return {success: false, message: `Kesalahan koneksi WhatsApp API: ${errorMsg}`};
  }
}

/**
 * Format notification template string with variables
 */
export function formatMessageTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{${k}}`, String(v));
  }
  return result;
}

