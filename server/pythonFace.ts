import {spawn} from 'child_process';
import path from 'path';
import type {FaceVerificationResult} from '../src/types.ts';

interface VerifyFaceInput {
  profile_image_b64: string;
  live_image_b64: string;
  schedule?: {
    is_open: number;
    open_time: string;
    close_time: string;
    current_time: string;
    day_name: string;
  };
}

export function verifyFaceWithPython(input: VerifyFaceInput): Promise<FaceVerificationResult> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), 'python/face_verifier.py');
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
        face_detected: false,
        face_match: false,
        similarity_percent: 0,
        operational_allowed: false,
        operational_status: 'ERROR',
        operational_message: 'Gagal menjalankan engine Python',
        error: err.message,
        verified_by: 'python-face-engine-error',
      });
    });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolve({
          valid: false,
          face_detected: false,
          face_match: false,
          similarity_percent: 0,
          operational_allowed: false,
          operational_status: 'ERROR',
          operational_message: 'Engine Python gagal memproses',
          error: stderr.trim() || `Python exited with code ${code}`,
          verified_by: 'python-face-engine-error',
        });
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()) as FaceVerificationResult);
      } catch {
        resolve({
          valid: false,
          face_detected: false,
          face_match: false,
          similarity_percent: 0,
          operational_allowed: false,
          operational_status: 'ERROR',
          operational_message: 'Respons Python tidak valid',
          error: stdout,
          verified_by: 'python-face-engine-error',
        });
      }
    });

    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}
