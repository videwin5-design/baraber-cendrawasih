#!/usr/bin/env python3
"""
Barbershop Cendrawasih - Python Geolocation & Geofence Verification Engine
Calculates exact geodesic distance (Haversine formula on WGS84 sphere),
bearing direction, GPS accuracy tolerance, and geofence validation.
"""

import json
import math
import sys
from datetime import datetime, timezone

EARTH_RADIUS_METERS = 6371000.0


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute great-circle distance in meters between two WGS84 coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def compute_bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> tuple[float, str]:
    """Compute initial compass bearing from branch to user."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lng2 - lng1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    bearing = (math.degrees(theta) + 360.0) % 360.0

    directions = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"]
    idx = int((bearing + 22.5) // 45) % 8
    return round(bearing, 1), directions[idx]


def validate_coordinates(lat: float, lng: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def verify_location(payload: dict) -> dict:
    user_lat = float(payload["user_lat"])
    user_lng = float(payload["user_lng"])
    branch_lat = float(payload["branch_lat"])
    branch_lng = float(payload["branch_lng"])
    radius_meters = float(payload.get("radius_meters", 150))
    gps_accuracy = float(payload.get("accuracy_meters", 20))

    if not validate_coordinates(user_lat, user_lng) or not validate_coordinates(branch_lat, branch_lng):
        return {
            "valid": False,
            "error": "Koordinat GPS tidak valid",
            "verified_by": "python-geo-engine-v1"
        }

    distance = haversine_distance(branch_lat, branch_lng, user_lat, user_lng)
    bearing_deg, direction_label = compute_bearing(branch_lat, branch_lng, user_lat, user_lng)

    # Allow slight GPS jitter buffer capped at 25m if accuracy is reported
    effective_buffer = min(max(gps_accuracy * 0.25, 0.0), 25.0)
    within_radius = distance <= (radius_meters + effective_buffer)

    if distance <= radius_meters:
        status = "DALAM_RADIUS"
        status_label = "Terverifikasi di Lokasi Cabang"
    elif within_radius:
        status = "TOLERANSI_GPS"
        status_label = "Terverifikasi (Toleransi Akurasi GPS)"
    else:
        status = "LUAR_RADIUS"
        status_label = f"Di Luar Radius ({round(distance - radius_meters, 1)}m melebihi batas)"

    return {
        "valid": True,
        "within_radius": within_radius,
        "geofence_status": status,
        "status_label": status_label,
        "distance_meters": round(distance, 2),
        "radius_meters": round(radius_meters, 2),
        "effective_limit_meters": round(radius_meters + effective_buffer, 2),
        "gps_accuracy_meters": round(gps_accuracy, 1),
        "bearing_degrees": bearing_deg,
        "direction_from_branch": direction_label,
        "verified_by": f"Python {sys.version.split()[0]} Haversine WGS84",
        "verified_at": datetime.now(timezone.utc).isoformat()
    }


def main():
    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            print(json.dumps({"valid": False, "error": "Payload kosong"}))
            sys.exit(1)
        payload = json.loads(raw_input)
        result = verify_location(payload)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"valid": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
