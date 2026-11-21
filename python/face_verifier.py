#!/usr/bin/env python3
"""
Barbershop Cendrawasih - Python Face Recognition & Operational Hours Engine
Uses ImageMagick (`convert`) to decode uploaded profile photo & live camera frame
into 64x64 RGB pixel matrices, extracts luminance, HOG-like Sobel edge gradients,
and YCbCr skin/color descriptors, computes weighted similarity score, and validates
branch operational hours.
"""

import base64
import io
import json
import math
import sys
from datetime import datetime, timezone
from PIL import Image, ImageOps


def decode_base64_image(data_url: str) -> bytes:
    if not data_url:
        raise ValueError("Data gambar kosong")
    if "," in data_url:
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url
    raw_bytes = base64.b64decode(b64)
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB").resize((64, 64), Image.Resampling.BILINEAR)
        return img.tobytes()
    except Exception as exc:
        raise ValueError(f"Gagal memproses gambar dengan PIL: {exc}")


def extract_features(rgb_bytes: bytes) -> dict:
    w, h = 64, 64
    lum = [[0.0] * w for _ in range(h)]
    skin_hits = 0
    center_pixels = 0
    lum_sum = 0.0
    lum_sq_sum = 0.0

    # Color histogram (4x4x4 = 64 bins reduced to 24 channel bins: 8 R, 8 G, 8 B)
    r_hist = [0.0] * 8
    g_hist = [0.0] * 8
    b_hist = [0.0] * 8

    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 3
            r = rgb_bytes[idx]
            g = rgb_bytes[idx + 1]
            b = rgb_bytes[idx + 2]
            y_val = 0.299 * r + 0.587 * g + 0.114 * b
            lum[y][x] = y_val
            lum_sum += y_val
            lum_sq_sum += y_val * y_val

            r_hist[min(7, r // 32)] += 1.0
            g_hist[min(7, g // 32)] += 1.0
            b_hist[min(7, b // 32)] += 1.0

            # Center portrait region (head/face area)
            if 14 <= x <= 49 and 10 <= y <= 53:
                center_pixels += 1
                cb = 128.0 - 0.168736 * r - 0.331264 * g + 0.5 * b
                cr = 128.0 + 0.5 * r - 0.418688 * g - 0.081312 * b
                if 77.0 <= cb <= 127.0 and 133.0 <= cr <= 173.0:
                    skin_hits += 1

    n = w * h
    mean_lum = lum_sum / n
    variance = max(0.0, (lum_sq_sum / n) - (mean_lum * mean_lum))
    std_lum = math.sqrt(variance)

    # 8x8 pooled luminance grid (64 dims)
    grid_lum = []
    # 8x8 pooled Sobel edge magnitude grid (64 dims)
    grid_grad = []
    center_edge_energy = 0.0

    for gy in range(8):
        for gx in range(8):
            l_acc = 0.0
            g_acc = 0.0
            for dy in range(8):
                y = gy * 8 + dy
                ym1 = max(0, y - 1)
                yp1 = min(h - 1, y + 1)
                for dx in range(8):
                    x = gx * 8 + dx
                    xm1 = max(0, x - 1)
                    xp1 = min(w - 1, x + 1)
                    l_acc += lum[y][x]
                    gx_val = lum[y][xp1] - lum[y][xm1]
                    gy_val = lum[yp1][x] - lum[ym1][x]
                    mag = math.sqrt(gx_val * gx_val + gy_val * gy_val)
                    g_acc += mag
                    if 14 <= x <= 49 and 10 <= y <= 53:
                        center_edge_energy += mag
            grid_lum.append(l_acc / 64.0)
            grid_grad.append(g_acc / 64.0)

    # Zero-mean normalize grid_lum for illumination invariance
    mean_gl = sum(grid_lum) / len(grid_lum)
    grid_lum_zm = [v - mean_gl for v in grid_lum]

    color_vec = [v / n for v in (r_hist + g_hist + b_hist)]
    skin_ratio = skin_hits / max(1, center_pixels)
    avg_center_edge = center_edge_energy / max(1, center_pixels)

    return {
        "mean_lum": mean_lum,
        "std_lum": std_lum,
        "skin_ratio": skin_ratio,
        "avg_center_edge": avg_center_edge,
        "grid_lum": grid_lum_zm,
        "grid_grad": grid_grad,
        "color_vec": color_vec,
    }


def cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def parse_minutes(hhmm: str) -> int:
    parts = hhmm.strip().split(":")
    h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
    m = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    return h * 60 + m


def evaluate_operational_hours(schedule: dict) -> dict:
    if not schedule:
        return {
            "operational_allowed": True,
            "operational_status": "DALAM_JAM_OPERASIONAL",
            "operational_message": "Jam operasional standar aktif",
        }
    is_open = int(schedule.get("is_open", 1)) == 1
    open_time = str(schedule.get("open_time", "09:00"))
    close_time = str(schedule.get("close_time", "21:00"))
    current_time = str(schedule.get("current_time", "12:00"))
    day_name = str(schedule.get("day_name", "Hari ini"))

    if not is_open:
        return {
            "operational_allowed": False,
            "operational_status": "CABANG_TUTUP",
            "operational_message": f"Cabang tutup pada hari {day_name}",
        }

    open_min = parse_minutes(open_time)
    close_min = parse_minutes(close_time)
    cur_min = parse_minutes(current_time)

    # Allow 60 minutes early check-in before branch opens
    earliest_min = max(0, open_min - 60)
    if cur_min < earliest_min or cur_min > close_min:
        return {
            "operational_allowed": False,
            "operational_status": "DI_LUAR_JAM",
            "operational_message": f"Di luar jam operasional {day_name} ({open_time}–{close_time}, waktu Anda {current_time})",
        }

    if cur_min > open_min + 15:
        return {
            "operational_allowed": True,
            "operational_status": "TERLAMBAT",
            "operational_message": f"Dalam jam operasional ({open_time}–{close_time}) · Terlambat >15 menit",
        }

    return {
        "operational_allowed": True,
        "operational_status": "TEPAT_WAKTU",
        "operational_message": f"Sesuai jam operasional {day_name} ({open_time}–{close_time})",
    }


def verify_face_and_schedule(payload: dict) -> dict:
    op_check = evaluate_operational_hours(payload.get("schedule") or {})

    profile_b64 = payload.get("profile_image_b64") or ""
    live_b64 = payload.get("live_image_b64") or ""

    if not profile_b64:
        return {
            "valid": False,
            "face_detected": False,
            "face_match": False,
            "similarity_percent": 0.0,
            "error": "Foto profil karyawan belum diunggah. Unggah foto profil terlebih dahulu.",
            **op_check,
            "verified_by": f"Python {sys.version.split()[0]} Face-CV",
        }

    if not live_b64:
        return {
            "valid": False,
            "face_detected": False,
            "face_match": False,
            "similarity_percent": 0.0,
            "error": "Foto wajah langsung dari kamera belum diambil.",
            **op_check,
            "verified_by": f"Python {sys.version.split()[0]} Face-CV",
        }

    try:
        prof_rgb = decode_base64_image(profile_b64)
        live_rgb = decode_base64_image(live_b64)
    except Exception as exc:
        return {
            "valid": False,
            "face_detected": False,
            "face_match": False,
            "similarity_percent": 0.0,
            "error": str(exc),
            **op_check,
            "verified_by": f"Python {sys.version.split()[0]} Face-CV",
        }

    prof_feat = extract_features(prof_rgb)
    live_feat = extract_features(live_rgb)

    # Check live image clarity / anti-blank / facial feature presence
    has_contrast = live_feat["std_lum"] >= 12.0 and 18.0 <= live_feat["mean_lum"] <= 242.0
    has_edges = live_feat["avg_center_edge"] >= 6.0
    face_detected = has_contrast and has_edges

    if not face_detected:
        return {
            "valid": True,
            "face_detected": False,
            "face_match": False,
            "similarity_percent": 0.0,
            "status_label": "Wajah tidak terdeteksi jelas (kamera gelap, buram, atau tertutup)",
            **op_check,
            "verified_by": f"Python {sys.version.split()[0]} Face-CV",
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    lum_sim = cosine_sim(prof_feat["grid_lum"], live_feat["grid_lum"])
    grad_sim = cosine_sim(prof_feat["grid_grad"], live_feat["grid_grad"])
    col_sim = cosine_sim(prof_feat["color_vec"], live_feat["color_vec"])

    # Weighted fusion score
    raw_score = (0.40 * lum_sim) + (0.40 * grad_sim) + (0.20 * col_sim)
    similarity_percent = round(raw_score * 100.0, 1)
    threshold = 65.0
    face_match = similarity_percent >= threshold

    status_label = (
        f"Wajah Terverifikasi Cocok ({similarity_percent}%)"
        if face_match
        else f"Wajah Tidak Cocok dengan Foto Profil ({similarity_percent}% < {threshold}%)"
    )

    return {
        "valid": True,
        "face_detected": True,
        "face_match": face_match,
        "similarity_percent": similarity_percent,
        "threshold_percent": threshold,
        "skin_presence_percent": round(live_feat["skin_ratio"] * 100.0, 1),
        "status_label": status_label,
        **op_check,
        "verified_by": f"Python {sys.version.split()[0]} Face-CV + Schedule",
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"valid": False, "error": "Payload kosong"}))
            sys.exit(1)
        payload = json.loads(raw)
        result = verify_face_and_schedule(payload)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"valid": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
