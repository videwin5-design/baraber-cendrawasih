import {spawn} from 'child_process';
import path from 'path';
import type {GeoVerificationResult} from '../src/types.ts';

interface VerifyGeoInput {
  user_lat: number;
  user_lng: number;
  branch_lat: number;
  branch_lng: number;
  radius_meters: number;
  accuracy_meters?: number;
}

export function verifyLocationWithPython(input: VerifyGeoInput): Promise<GeoVerificationResult> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), 'python/geo_verifier.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      resolve({
        valid: false,
        error: `Gagal menjalankan engine Python: ${err.message}`,
        verified_by: 'python-geo-engine-error',
      });
    });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolve({
          valid: false,
          error: stderr.trim() || `Python exited with code ${code}`,
          verified_by: 'python-geo-engine-error',
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as GeoVerificationResult;
        resolve(parsed);
      } catch {
        resolve({
          valid: false,
          error: `Output Python tidak valid: ${stdout}`,
          verified_by: 'python-geo-engine-error',
        });
      }
    });

    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}
