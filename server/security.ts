import crypto from 'crypto';
import type {NextFunction, Request, Response} from 'express';
import {db} from './db.ts';

// ==========================================
// 1. ANTI-SQL INJECTION & SPAM QUERY SHIELD
// ==========================================

const SUSPICIOUS_SQL_PATTERNS = [
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  /\bDROP\s+(TABLE|DATABASE)\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bINSERT\s+INTO\b.*VALUES/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+.*SET\b/i,
  /;\s*SHUTDOWN\b/i,
  /\bOR\s+['"]?1['"]?\s*=\s*['"]?1/i,
  /\bAND\s+['"]?1['"]?\s*=\s*['"]?1/i,
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  /javascript:/i,
  /onload\s*=/i,
  /onerror\s*=/i,
];

function containsMaliciousPayload(value: unknown): boolean {
  if (typeof value === 'string') {
    return SUSPICIOUS_SQL_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((v) => containsMaliciousPayload(v));
  }
  return false;
}

/**
 * Express middleware to detect and block SQL injection and spam exploit payloads
 */
export function antiSqlInjection(req: Request, res: Response, next: NextFunction): void {
  // Cek query parameters, body, dan params
  if (
    containsMaliciousPayload(req.query) ||
    containsMaliciousPayload(req.body) ||
    containsMaliciousPayload(req.params)
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    console.warn(`[SECURITY ALERT] Malicious query/payload blocked from IP: ${ip} on path ${req.path}`);
    res.status(403).json({
      error: 'Permintaan diblokir oleh Security Shield Cendrawasih: Terdeteksi pola kueri mencurigakan.',
      code: 'BLOCKED_BY_WAF',
    });
    return;
  }
  next();
}

// ==========================================
// 2. BRUTE FORCE LOGIN PROTECTION (MAX 3 ATTEMPTS)
// ==========================================

export function initSecurityTables(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        ip TEXT NOT NULL,
        failed_count INTEGER DEFAULT 0,
        locked_until TEXT,
        last_attempt_at TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error creating login_attempts table', err);
  }
}

/**
 * Check if the given identifier (employeeId/username) or IP is currently locked out
 */
export function checkLoginLockout(identifier: string, ip: string): {isLocked: boolean; remainingMinutes: number; attemptsLeft: number} {
  try {
    const row = db
      .prepare(
        'SELECT failed_count, locked_until FROM login_attempts WHERE identifier = ? OR ip = ? ORDER BY last_attempt_at DESC LIMIT 1'
      )
      .get(identifier, ip) as {failed_count: number; locked_until?: string | null} | undefined;

    if (!row) {
      return {isLocked: false, remainingMinutes: 0, attemptsLeft: 3};
    }

    if (row.locked_until) {
      const lockTime = new Date(row.locked_until).getTime();
      const now = Date.now();
      if (now < lockTime) {
        const remainingMinutes = Math.ceil((lockTime - now) / 60000);
        return {isLocked: true, remainingMinutes, attemptsLeft: 0};
      } else {
        // Lock expired, reset
        db.prepare('DELETE FROM login_attempts WHERE identifier = ? OR ip = ?').run(identifier, ip);
        return {isLocked: false, remainingMinutes: 0, attemptsLeft: 3};
      }
    }

    const attemptsLeft = Math.max(0, 3 - (row.failed_count || 0));
    return {isLocked: false, remainingMinutes: 0, attemptsLeft};
  } catch {
    return {isLocked: false, remainingMinutes: 0, attemptsLeft: 3};
  }
}

/**
 * Record a failed login attempt; locks account if attempts >= 3
 */
export function recordFailedLogin(identifier: string, ip: string): {isLocked: boolean; attemptsLeft: number} {
  try {
    const now = new Date();
    const existing = db
      .prepare('SELECT id, failed_count FROM login_attempts WHERE identifier = ? OR ip = ?')
      .get(identifier, ip) as {id: string; failed_count: number} | undefined;

    const newCount = (existing?.failed_count || 0) + 1;
    const isLocked = newCount >= 3;
    // Lock for 15 minutes if 3 attempts reached
    const lockedUntil = isLocked ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;

    if (existing) {
      db.prepare(`
        UPDATE login_attempts
        SET failed_count = ?, locked_until = ?, last_attempt_at = ?
        WHERE id = ?
      `).run(newCount, lockedUntil, now.toISOString(), existing.id);
    } else {
      const id = `att-${crypto.randomBytes(4).toString('hex')}`;
      db.prepare(`
        INSERT INTO login_attempts (id, identifier, ip, failed_count, locked_until, last_attempt_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, identifier, ip, newCount, lockedUntil, now.toISOString());
    }

    return {isLocked, attemptsLeft: Math.max(0, 3 - newCount)};
  } catch (err) {
    console.error('Failed to record failed login', err);
    return {isLocked: false, attemptsLeft: 2};
  }
}

/**
 * Reset failed login attempts on successful login
 */
export function resetLoginAttempts(identifier: string, ip: string): void {
  try {
    db.prepare('DELETE FROM login_attempts WHERE identifier = ? OR ip = ?').run(identifier, ip);
  } catch (err) {
    console.error('Failed to reset login attempts', err);
  }
}

// ==========================================
// 3. SECURE PASSWORD RESET & GOOGLE AUTH VERIFICATION
// ==========================================

export interface ResetTokenRecord {
  token: string;
  employee_id: string;
  email: string;
  expires_at: number;
}

const activeResetTokens = new Map<string, ResetTokenRecord>();

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(employeeId: string, email: string): string {
  const token = crypto.randomBytes(24).toString('hex');
  activeResetTokens.set(token, {
    token,
    employee_id: employeeId,
    email,
    expires_at: Date.now() + 15 * 60 * 1000, // 15 mins
  });
  return token;
}

/**
 * Verify and consume reset token
 */
export function verifyAndConsumeResetToken(token: string): ResetTokenRecord | null {
  const record = activeResetTokens.get(token);
  if (!record) return null;
  if (Date.now() > record.expires_at) {
    activeResetTokens.delete(token);
    return null;
  }
  activeResetTokens.delete(token);
  return record;
}

