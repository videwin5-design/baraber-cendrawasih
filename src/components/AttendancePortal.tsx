import {
  AlertCircle,
  Award,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  HelpCircle,
  History,
  Info,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  Upload,
  User,
  Video,
  VideoOff,
  X,
  Zap,
  Fingerprint,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {
  AttendanceRecord,
  Branch,
  Employee,
  FaceVerificationResult,
  GeoVerificationResult,
  OperationalSchedule,
} from '../types.ts';
import {formatDateIndo, getTodayISO} from '../utils/format.ts';
import {captureVideoFrameToDataUrl, compressImageFileToSquareDataUrl} from '../utils/image.ts';

export interface AttendancePortalProps {
  currentUser?: Employee | null;
  employees: Employee[];
  branches: Branch[];
  attendance: AttendanceRecord[];
  schedules?: OperationalSchedule[];
  onAttendanceSuccess?: (record: AttendanceRecord) => void;
}

function getLocalHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getWITDateString(): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  const d = new Date();
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function calcWorkDuration(checkIn: string, checkOut?: string | null): string {
  if (!checkIn) return '-';
  const end = checkOut || getLocalHHMM();
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = end.split(':').map(Number);
  const totalMins = oh * 60 + om - (ih * 60 + im);
  if (totalMins <= 0) return '0 jam';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h} jam${m > 0 ? ` ${m} mnt` : ''}` : `${m} menit`;
}

export const AttendancePortal: React.FC<AttendancePortalProps> = ({
  currentUser,
  employees,
  branches,
  attendance,
  schedules = [],
  onAttendanceSuccess,
}) => {
  const today = getTodayISO();
  const [currentTimeStr, setCurrentTimeStr] = useState(getLocalHHMM());
  const [currentSeconds, setCurrentSeconds] = useState(new Date().getSeconds());
  const [dateStr, setDateStr] = useState(getWITDateString());
  const [scanLine, setScanLine] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      setCurrentSeconds(now.getSeconds());
      setDateStr(getWITDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scan line animation
  useEffect(() => {
    const anim = setInterval(() => {
      setScanLine((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 30);
    return () => clearInterval(anim);
  }, []);

  const staffMembers = useMemo(
    () => employees.filter((e) => e.is_active === 1 && e.role !== 'owner'),
    [employees]
  );

  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (currentUser && currentUser.role !== 'owner') return currentUser.id;
    return staffMembers[0]?.id || '';
  });

  useEffect(() => {
    if (currentUser && currentUser.role !== 'owner') setSelectedEmpId(currentUser.id);
  }, [currentUser]);

  const activeEmployee = useMemo(
    () => staffMembers.find((e) => e.id === selectedEmpId) || staffMembers[0],
    [staffMembers, selectedEmpId]
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (activeEmployee?.branch_id) return activeEmployee.branch_id;
    return branches[0]?.id || '';
  });

  useEffect(() => {
    if (activeEmployee?.branch_id) setSelectedBranchId(activeEmployee.branch_id);
  }, [activeEmployee]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) || branches[0],
    [branches, selectedBranchId]
  );

  const todayDow = new Date().getDay();
  const todaySchedule = useMemo(
    () =>
      activeBranch
        ? schedules.find((s) => s.branch_id === activeBranch.id && s.day_of_week === todayDow)
        : null,
    [schedules, activeBranch, todayDow]
  );

  const myAttendance = useMemo(() => {
    if (!activeEmployee) return [];
    return attendance
      .filter((a) => a.employee_id === activeEmployee.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, activeEmployee]);

  const todayRecord = useMemo(
    () => myAttendance.find((a) => a.date === today),
    [myAttendance, today]
  );

  // GPS State
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{lat: number; lng: number; accuracy: number} | null>(null);
  const [geoResult, setGeoResult] = useState<GeoVerificationResult | null>(null);
  const [geoError, setGeoError] = useState('');

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [liveSnapshot, setLiveSnapshot] = useState<string | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runGeoVerification = async (lat: number, lng: number, accuracy = 15) => {
    if (!activeBranch) return;
    setGeoLoading(true);
    setGeoError('');
    setErrorMessage('');
    try {
      const res = await fetch('/api/geo/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({branch_id: activeBranch.id, user_lat: lat, user_lng: lng, accuracy_meters: accuracy}),
      });
      const data = await res.json();
      if (data.verification) {
        setGeoCoords({lat, lng, accuracy});
        setGeoResult(data.verification);
        if (!data.verification.within_radius) {
          setGeoError(
            `Jarak Anda ${data.verification.distance_meters}m dari ${activeBranch.name}. Batas radius ${data.verification.radius_meters}m.`
          );
        }
      } else {
        setGeoError(data.error || 'Gagal memverifikasi lokasi');
      }
    } catch {
      setGeoError('Gagal terhubung ke engine lokasi server');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleGetBrowserGPS = () => {
    setGeoError('');
    setErrorMessage('');
    if (!navigator.geolocation) {
      setGeoError('Perangkat Anda tidak mendukung akses GPS');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => runGeoVerification(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 15),
      (err) => {
        setGeoLoading(false);
        setGeoError(`Akses GPS belum diizinkan (${err.message}). Gunakan tombol "Lokasi Cabang" untuk pengujian.`);
      },
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
    );
  };

  const handleUseBranchCoordinates = async () => {
    if (!activeBranch) return;
    await runGeoVerification(activeBranch.lat + 0.00003, activeBranch.lng + 0.00002, 10);
  };

  const startCamera = async () => {
    setCameraError('');
    setErrorMessage('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung kamera. Gunakan tombol Unggah Foto.');
      return;
    }
    setCameraLoading(true);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: 'user', width: {ideal: 480}, height: {ideal: 480}},
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      setCameraError('Izin kamera belum diberikan. Klik ikon gembok di browser untuk mengizinkan kamera.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const verifyFace = async (b64Image: string) => {
    if (!activeEmployee || !activeBranch) return;
    setFaceLoading(true);
    setErrorMessage('');
    setLiveSnapshot(b64Image);
    try {
      const res = await fetch('/api/face/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id,
          branch_id: activeBranch.id,
          live_image_b64: b64Image,
          client_time: getLocalHHMM(),
        }),
      });
      const data = await res.json();
      if (data.verification) {
        setFaceResult(data.verification);
        if (!data.verification.face_detected) {
          setErrorMessage('⚠️ Wajah tidak terdeteksi jelas pada kamera. Pastikan pencahayaan cukup dan wajah terlihat utuh.');
        } else if (!data.verification.face_match) {
          setErrorMessage(`❌ Wajah TIDAK COCOK dengan profil karyawan (${data.verification.similarity_percent}% < 65%). Presensi DITOLAK demi keamanan!`);
        }
      } else {
        setErrorMessage(data.error || 'Verifikasi wajah gagal');
      }
    } catch {
      setErrorMessage('Gagal menghubungi engine verifikasi wajah');
    } finally {
      setFaceLoading(false);
    }
  };

  const handleSnapPhoto = async () => {
    if (!videoRef.current) return;
    const snap = captureVideoFrameToDataUrl(videoRef.current, 320);
    if (!snap) { setCameraError('Kamera belum siap, tunggu 1 detik lalu ulangi'); return; }
    stopCamera();
    await verifyFace(snap);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageFileToSquareDataUrl(file, 320);
      stopCamera();
      await verifyFace(b64);
    } catch {
      setCameraError('Gagal memproses file foto');
    }
  };

  const handleQuickAutoPresensi = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!geoResult?.within_radius) {
      if (navigator.geolocation) {
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => { await runGeoVerification(pos.coords.latitude, pos.coords.longitude, 10); startCamera(); },
          async () => { await handleUseBranchCoordinates(); startCamera(); },
          {enableHighAccuracy: true, timeout: 5000}
        );
      } else {
        await handleUseBranchCoordinates();
        startCamera();
      }
    } else if (!cameraActive && !liveSnapshot) {
      startCamera();
    }
  };

  const handleCheckIn = async () => {
    if (!activeEmployee || !activeBranch) return;
    if (!geoCoords || !geoResult?.within_radius) { setErrorMessage('Silakan selesaikan verifikasi lokasi GPS terlebih dahulu.'); return; }
    if (!liveSnapshot) { setErrorMessage('Silakan ambil foto wajah selfie terlebih dahulu.'); return; }
    if (!faceResult || !faceResult.face_detected || !faceResult.face_match) {
      setErrorMessage(`❌ Presensi Ditolak: Wajah Anda (${faceResult?.similarity_percent || 0}%) tidak cocok dengan foto profil karyawan. Hanya karyawan bersangkutan yang dapat melakukan presensi!`);
      return;
    }
    setSubmitting(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id, branch_id: activeBranch.id,
          lat: geoCoords.lat, lng: geoCoords.lng, accuracy: geoCoords.accuracy,
          live_image_b64: liveSnapshot, client_time: getLocalHHMM(),
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMessage(data.error || 'Presensi masuk gagal');
      else {
        setSuccessMessage(`🎉 Presensi masuk berhasil! Tercatat pukul ${data.record.check_in_time} WIT (${data.record.status}). Selamat bekerja!`);
        onAttendanceSuccess?.(data.record);
      }
    } catch { setErrorMessage('Gagal menghubungi server presensi'); }
    finally { setSubmitting(false); }
  };

  const handleCheckOut = async () => {
    if (!activeEmployee || !activeBranch) return;
    if (!geoCoords || !geoResult?.within_radius) { setErrorMessage('Silakan cek lokasi Anda di barbershop sebelum presensi pulang.'); return; }
    if (liveSnapshot && faceResult && (!faceResult.face_detected || !faceResult.face_match)) {
      setErrorMessage(`❌ Presensi Pulang Ditolak: Wajah tidak cocok dengan profil karyawan.`);
      return;
    }
    setSubmitting(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id, branch_id: activeBranch.id,
          lat: geoCoords.lat, lng: geoCoords.lng, accuracy: geoCoords.accuracy,
          live_image_b64: liveSnapshot || undefined, client_time: getLocalHHMM(),
        }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMessage(data.error || 'Presensi pulang gagal');
      else setSuccessMessage(`✅ Presensi pulang tercatat pukul ${data.check_out_time} WIT. Terima kasih atas kerja keras Anda hari ini!`);
    } catch { setErrorMessage('Gagal menghubungi server presensi'); }
    finally { setSubmitting(false); }
  };

  const isIdentityReady = Boolean(activeEmployee);
  const isLocationReady = Boolean(geoResult?.within_radius);
  const isFaceReady = Boolean(liveSnapshot && faceResult && faceResult.face_detected && faceResult.face_match);
  const canCheckIn = isIdentityReady && isLocationReady && isFaceReady && !todayRecord;
  const canCheckOut = isIdentityReady && isLocationReady && Boolean(todayRecord) && !todayRecord?.check_out_time;
  const workDuration = todayRecord ? calcWorkDuration(todayRecord.check_in_time ?? '', todayRecord.check_out_time) : '-';
  const radiusPct = geoResult ? Math.min(100, Math.round(((geoResult.distance_meters ?? 0) / (geoResult.radius_meters || 150)) * 100)) : 0;
  const faceMatch = faceResult?.similarity_percent ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ========== HERO HEADER ========== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-[#0F0F11] to-zinc-950" />
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-[#DCA842]/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-56 w-56 rounded-full bg-emerald-500/8 blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-5 pb-4">
          {/* Brand bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#DCA842] to-[#C5922E] flex items-center justify-center shadow-lg shadow-[#DCA842]/20">
                <Fingerprint className="h-4.5 w-4.5 text-zinc-950" />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">Barbershop Cenderawasih</p>
                <p className="text-xs font-bold text-zinc-300 -mt-0.5">Sistem Presensi Digital</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer backdrop-blur-sm transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#DCA842]" />
              Panduan
            </button>
          </div>

          {/* Live Clock */}
          <div className="text-center mb-5">
            <p className="text-[11px] font-semibold text-zinc-500 mb-2 flex items-center justify-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#DCA842]" />
              {dateStr} &nbsp;·&nbsp; WIT (UTC+9)
            </p>
            <div className="relative inline-block">
              <span className="font-mono font-black tracking-tight tabular-nums leading-none" style={{fontSize: 'clamp(2.5rem, 10vw, 4.5rem)', background: 'linear-gradient(180deg, #fff 40%, #71717a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                {currentTimeStr}
              </span>
              <span className="font-mono font-bold text-zinc-500 tabular-nums" style={{fontSize: 'clamp(1.4rem, 5vw, 2.5rem)'}}>
                :{String(currentSeconds).padStart(2, '0')}
              </span>
              {/* Live dot */}
              <span className="absolute -top-1 -right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>

            {/* Attendance status badge */}
            <div className="mt-3">
              {!todayRecord ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 border border-amber-500/25 px-4 py-1.5 text-xs font-bold text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Belum Presensi Masuk Hari Ini
                </span>
              ) : todayRecord.check_out_time ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 px-4 py-1.5 text-xs font-bold text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Selesai Shift — Pulang: {todayRecord.check_out_time} WIT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-4 py-1.5 text-xs font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sedang Bekerja — Masuk: {todayRecord.check_in_time} WIT
                </span>
              )}
            </div>
          </div>

          {/* Employee Profile Card */}
          {activeEmployee && (
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 px-4 py-3 backdrop-blur-sm">
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-[#DCA842] shrink-0">
                {activeEmployee.photo_url ? (
                  <img src={activeEmployee.photo_url} alt={activeEmployee.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-black text-lg text-[#DCA842]">
                    {activeEmployee.name.slice(0, 1)}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-zinc-800" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white truncate">{activeEmployee.name}</span>
                  <span className="rounded-full bg-[#DCA842]/12 text-[#DCA842] border border-[#DCA842]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {activeEmployee.role === 'kasir' ? 'Kasir' : 'Capster'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {activeBranch?.name || 'Cabang Belum Ditentukan'}
                  {activeEmployee.specialty ? ` · ${activeEmployee.specialty}` : ''}
                </p>
              </div>
              {todayRecord && (
                <div className="hidden sm:flex items-center gap-3 shrink-0 text-center divide-x divide-zinc-700">
                  <div className="pr-3">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Masuk</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">{todayRecord.check_in_time}</p>
                  </div>
                  {todayRecord.check_out_time && (
                    <div className="px-3">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Pulang</p>
                      <p className="text-xs font-mono font-bold text-rose-400">{todayRecord.check_out_time}</p>
                    </div>
                  )}
                  <div className="pl-3">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Durasi</p>
                    <p className="text-xs font-bold text-zinc-200">{workDuration}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========== STATS RIBBON (if checked in) ========== */}
      {todayRecord && (
        <div className="bg-zinc-900/80 border-y border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 py-2.5 grid grid-cols-3 sm:grid-cols-4 gap-3 text-center">
            {[
              {label: 'Jam Masuk', value: `${todayRecord.check_in_time || '-'} WIT`, color: 'text-emerald-400'},
              {label: 'Jam Pulang', value: `${todayRecord.check_out_time || '—'} WIT`, color: 'text-rose-400'},
              {label: 'Total Kerja', value: workDuration, color: 'text-zinc-200'},
              {label: 'Status', value: todayRecord.status || '-', color: todayRecord.status === 'Hadir' ? 'text-emerald-400' : todayRecord.status === 'Terlambat' ? 'text-amber-400' : 'text-zinc-400'},
            ].map((s, i) => (
              <div key={i} className={i === 3 ? 'hidden sm:block' : ''}>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{s.label}</p>
                <p className={`text-sm font-mono font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== NOTIFICATIONS ========== */}
      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-2.5">
        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/8 p-4">
            <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="h-4 w-4 text-white stroke-[3]" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-emerald-300">Presensi Berhasil!</p>
              <p className="text-xs text-emerald-400/80 mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
            <button type="button" onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-400 cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/8 p-4">
            <div className="h-8 w-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0"><AlertCircle className="h-4 w-4 text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-rose-300">Perhatian</p>
              <p className="text-xs text-rose-400/80 mt-0.5">{errorMessage}</p>
            </div>
            <button type="button" onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-400 cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {/* ========== MAIN BODY ========== */}
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {/* Quick Auto Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleQuickAutoPresensi}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C5922E] to-[#DCA842] px-5 py-3.5 text-sm font-extrabold text-zinc-950 shadow-lg shadow-[#DCA842]/15 hover:shadow-[#DCA842]/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer"
          >
            <Zap className="h-4.5 w-4.5 fill-current" />
            Presensi Cepat (Auto 1-Klik)
          </button>
          {(!currentUser || currentUser.role === 'owner') && staffMembers.length > 1 && (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-xs font-semibold text-zinc-200 focus:border-[#DCA842] focus:outline-none cursor-pointer"
            >
              {staffMembers.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          {/* LEFT: Face + GPS (3 cols) */}
          <div className="lg:col-span-3 space-y-5">

            {/* FACE SCAN CARD */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isFaceReady ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                    <ScanFace className={`h-5 w-5 ${isFaceReady ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Verifikasi Wajah</p>
                    <p className="text-[10px] text-zinc-500">Selfie untuk Konfirmasi Identitas</p>
                  </div>
                </div>
                {isFaceReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                    <Check className="h-3 w-3 stroke-[3]" /> Terverifikasi
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full">
                    Belum Scan
                  </span>
                )}
              </div>

              {/* Viewport */}
              <div className="p-5">
                <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-700">
                  {/* VIDEO STREAM */}
                  {cameraActive && (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" />
                      {/* UI Overlay */}
                      <div className="pointer-events-none absolute inset-0">
                        {/* Corner brackets */}
                        <div className="absolute top-3 left-3 h-7 w-7 border-t-2 border-l-2 border-[#DCA842] rounded-tl-lg" />
                        <div className="absolute top-3 right-3 h-7 w-7 border-t-2 border-r-2 border-[#DCA842] rounded-tr-lg" />
                        <div className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-[#DCA842] rounded-bl-lg" />
                        <div className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-[#DCA842] rounded-br-lg" />
                        {/* Face oval */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-44 w-32 rounded-[50%] border-2 border-dashed border-[#DCA842]/60 shadow-[0_0_16px_rgba(220,168,66,0.2)]" />
                        </div>
                        {/* Scanning laser */}
                        <div
                          className="absolute left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#DCA842] to-transparent shadow-[0_0_6px_#DCA842]"
                          style={{top: `${10 + scanLine * 0.8}%`}}
                        />
                        {/* Label */}
                        <div className="absolute bottom-5 inset-x-0 text-center">
                          <span className="text-[9px] font-bold text-[#DCA842] bg-black/60 px-2.5 py-1 rounded-full">
                            Posisikan Wajah di Tengah
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* SNAPSHOT */}
                  {!cameraActive && liveSnapshot && (
                    <div className="relative h-full w-full">
                      <img src={liveSnapshot} alt="Selfie Presensi" className="h-full w-full object-cover" />
                      {faceLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                          <div className="text-center space-y-2">
                            <div className="h-9 w-9 rounded-full border-2 border-[#DCA842] border-t-transparent animate-spin mx-auto" />
                            <p className="text-[11px] font-bold text-[#DCA842]">AI Memproses Wajah...</p>
                          </div>
                        </div>
                      ) : faceResult ? (
                        <div className="absolute inset-x-3 bottom-3">
                          <div className={`rounded-xl border px-3 py-2 text-center backdrop-blur-md ${
                            faceResult.face_match ? 'border-emerald-500/50 bg-emerald-600/80' : 'border-rose-500/50 bg-rose-600/80'
                          }`}>
                            <p className="text-[11px] font-black text-white">
                              {faceResult.face_match ? '✅ Wajah Cocok' : '❌ Wajah Tidak Cocok'}
                            </p>
                            {faceMatch !== null && (
                              <p className="text-[10px] text-white/80 mt-0.5">Akurasi: {faceMatch}%</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* IDLE */}
                  {!cameraActive && !liveSnapshot && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                          <Camera className="h-7 w-7 text-zinc-600" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#DCA842]/15 border border-[#DCA842]/30 flex items-center justify-center">
                          <span className="text-[8px] font-black text-[#DCA842]">AI</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-zinc-500">Kamera Belum Aktif</p>
                      <p className="text-[10px] text-zinc-600 text-center">Buka kamera atau unggah foto wajah</p>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
                      <div className="h-8 w-8 rounded-full border-2 border-[#DCA842] border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>

                {/* Face accuracy bar */}
                {faceResult && faceMatch !== null && (
                  <div className="mt-4 rounded-xl bg-zinc-800/60 border border-zinc-700 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Face Recognition Accuracy</span>
                      <span className={`text-sm font-black ${faceMatch >= 70 ? 'text-emerald-400' : 'text-rose-400'}`}>{faceMatch}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${faceMatch >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`}
                        style={{width: `${faceMatch}%`}}
                      />
                    </div>
                  </div>
                )}

                {/* Camera Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {!cameraActive ? (
                    <button
                      type="button" onClick={startCamera}
                      disabled={cameraLoading || faceLoading}
                      className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 px-5 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                    >
                      <Video className="h-4 w-4 text-[#DCA842]" />
                      {cameraLoading ? 'Menghubungkan...' : '📸 Buka Kamera'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button" onClick={handleSnapPhoto} disabled={faceLoading}
                        className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        <Camera className="h-4 w-4" />
                        {faceLoading ? 'Memverifikasi...' : '⚡ Ambil Foto'}
                      </button>
                      <button
                        type="button" onClick={stopCamera}
                        className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 cursor-pointer"
                      >
                        <VideoOff className="h-3.5 w-3.5" /> Tutup
                      </button>
                    </>
                  )}

                  {liveSnapshot && (
                    <button
                      type="button"
                      onClick={() => { setLiveSnapshot(null); setFaceResult(null); }}
                      className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Foto Ulang
                    </button>
                  )}

                  <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={handleUploadPhoto} className="hidden" />
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()} disabled={faceLoading}
                    className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Unggah
                  </button>
                </div>
                {cameraError && <p className="mt-2 text-center text-xs text-amber-400 font-medium">{cameraError}</p>}
              </div>
            </div>

            {/* GPS / GEOFENCE CARD */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isLocationReady ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                    <MapPin className={`h-5 w-5 ${isLocationReady ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Verifikasi Lokasi GPS</p>
                    <p className="text-[10px] text-zinc-500">
                      Radius {activeBranch?.radius_meters || 150}m · {activeBranch?.name || 'Cabang'}
                    </p>
                  </div>
                </div>
                {isLocationReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                    <Check className="h-3 w-3 stroke-[3]" /> Dalam Radius
                  </span>
                ) : geoResult && !geoResult.within_radius ? (
                  <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">Di Luar Radius</span>
                ) : (
                  <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full">Belum Terdeteksi</span>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Radar + Distance */}
                <div className="flex items-center gap-5">
                  {/* Circle progress */}
                  <div className="relative h-20 w-20 shrink-0">
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#27272A" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke={isLocationReady ? '#10B981' : geoResult ? '#F43F5E' : '#DCA842'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - radiusPct / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`h-3 w-3 rounded-full ${isLocationReady ? 'bg-emerald-500 animate-ping' : geoLoading ? 'bg-[#DCA842] animate-pulse' : 'bg-zinc-600'}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {geoResult ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-3xl font-black text-white">{geoResult.distance_meters}</span>
                          <span className="text-sm font-bold text-zinc-500">meter</span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">dari {activeBranch?.name}</p>
                        <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          geoResult.within_radius
                            ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25'
                            : 'bg-rose-500/12 text-rose-400 border border-rose-500/25'
                        }`}>
                          <Signal className="h-3 w-3" />
                          {geoResult.within_radius ? `✅ Dalam Radius ${geoResult.radius_meters}m` : `❌ Melebihi ${geoResult.radius_meters}m`}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-500">Lokasi Belum Dideteksi</p>
                        <p className="text-xs text-zinc-600 leading-relaxed">Tekan "Cek GPS Saya" di bawah</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* GPS Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button" onClick={handleGetBrowserGPS} disabled={geoLoading}
                    className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 px-4 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                  >
                    {geoLoading
                      ? <div className="h-4 w-4 rounded-full border-2 border-[#DCA842] border-t-transparent animate-spin" />
                      : <Navigation className="h-4 w-4 text-[#DCA842]" />
                    }
                    {geoLoading ? 'Mendeteksi GPS...' : '📍 Cek GPS Saya'}
                  </button>
                  <button
                    type="button" onClick={handleUseBranchCoordinates} disabled={geoLoading}
                    title="Gunakan titik koordinat cabang jika presensi via komputer/laptop tanpa GPS"
                    className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    <Compass className="h-3.5 w-3.5 text-[#C5922E]" />
                    Lokasi Cabang (Uji)
                  </button>
                </div>

                {geoError && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/90 leading-relaxed">{geoError}</p>
                  </div>
                )}

                {/* Branch Info + Jadwal */}
                {activeBranch && (
                  <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-400 truncate">
                      <MapPin className="h-3.5 w-3.5 text-[#C5922E] shrink-0" />
                      <span className="truncate">{activeBranch.name} ({activeBranch.code})</span>
                    </span>
                    {todaySchedule && (
                      <span className="font-mono font-bold text-zinc-300 shrink-0 ml-2">
                        {todaySchedule.is_open ? `${todaySchedule.open_time}–${todaySchedule.close_time}` : 'Tutup'}
                      </span>
                    )}
                  </div>
                )}

                {(!currentUser || currentUser.role === 'owner') && branches.length > 1 && (
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 focus:border-[#DCA842] focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Checklist + Action + History (2 cols) */}
          <div className="lg:col-span-2 space-y-5">

            {/* READINESS CHECKLIST */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#DCA842]" />
                Status Kesiapan
              </p>
              <div className="space-y-2">
                {[
                  {label: 'Identitas Karyawan', ready: isIdentityReady, detail: activeEmployee?.name || 'Belum dipilih'},
                  {label: 'Lokasi GPS', ready: isLocationReady, detail: isLocationReady ? `${geoResult?.distance_meters}m · Aman` : 'Belum terverifikasi'},
                  {label: 'Foto Wajah', ready: isFaceReady, detail: isFaceReady ? (faceMatch ? `Akurasi ${faceMatch}%` : 'Siap') : 'Belum ambil foto'},
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                      item.ready ? 'bg-emerald-500/6 border-emerald-500/20' : 'bg-zinc-800/50 border-zinc-700/50'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${item.ready ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                      {item.ready
                        ? <Check className="h-3 w-3 text-white stroke-[3]" />
                        : <span className="text-[9px] font-bold text-zinc-400">{i + 1}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-300">{item.label}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{item.detail}</p>
                    </div>
                    {item.ready && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.12em] flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#DCA842]" />
                Tombol Presensi
              </p>

              {/* CHECK IN */}
              <button
                type="button" onClick={handleCheckIn}
                disabled={!canCheckIn || submitting}
                className={`w-full rounded-2xl p-4 flex items-center gap-3 text-sm transition-all duration-200 cursor-pointer ${
                  canCheckIn
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.99]'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${canCheckIn ? 'bg-white/20' : 'bg-zinc-700'}`}>
                  <LogIn className={`h-5 w-5 ${canCheckIn ? 'text-white' : 'text-zinc-600'}`} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-extrabold text-base">PRESENSI MASUK</p>
                  <p className={`text-[11px] font-normal mt-0.5 ${canCheckIn ? 'text-emerald-100/80' : 'text-zinc-600'}`}>
                    {submitting ? 'Memproses...' : todayRecord ? `Sudah masuk: ${todayRecord.check_in_time}` : 'Mulai jam kerja hari ini'}
                  </p>
                </div>
                {canCheckIn && (
                  <span className="relative flex h-3 w-3 ml-auto">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative h-3 w-3 rounded-full bg-emerald-300" />
                  </span>
                )}
              </button>

              {/* CHECK OUT */}
              <button
                type="button" onClick={handleCheckOut}
                disabled={!canCheckOut || submitting}
                className={`w-full rounded-2xl p-4 flex items-center gap-3 text-sm transition-all duration-200 cursor-pointer ${
                  canCheckOut
                    ? 'bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-500/15 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.99]'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${canCheckOut ? 'bg-white/20' : 'bg-zinc-700'}`}>
                  <LogOut className={`h-5 w-5 ${canCheckOut ? 'text-white' : 'text-zinc-600'}`} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-extrabold text-base">PRESENSI PULANG</p>
                  <p className={`text-[11px] font-normal mt-0.5 ${canCheckOut ? 'text-rose-100/80' : 'text-zinc-600'}`}>
                    {submitting ? 'Memproses...' :
                     todayRecord?.check_out_time ? `Sudah pulang: ${todayRecord.check_out_time}` :
                     todayRecord ? 'Selesai shift & pulang' : 'Presensi masuk dulu'}
                  </p>
                </div>
              </button>

              {todayRecord?.check_out_time && (
                <div className="rounded-xl bg-blue-500/8 border border-blue-500/15 p-3 text-center">
                  <p className="text-xs font-bold text-blue-300">🎉 Presensi hari ini sudah lengkap!</p>
                  <p className="text-[10px] text-blue-400/70 mt-0.5">Total jam kerja: {workDuration}</p>
                </div>
              )}
            </div>

            {/* ATTENDANCE HISTORY */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#C5922E]" />
                  <p className="text-sm font-bold text-white">Riwayat Kehadiran</p>
                </div>
                <span className="text-[9px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">7 Hari</span>
              </div>

              <div className="p-4">
                {myAttendance.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Award className="h-8 w-8 text-zinc-700 mx-auto" />
                    <p className="text-xs text-zinc-600">Belum ada data presensi</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
                    {myAttendance.slice(0, 7).map((rec) => {
                      const isToday = rec.date === today;
                      return (
                        <div
                          key={rec.id}
                          className={`p-3 rounded-2xl border ${
                            isToday ? 'border-[#DCA842]/30 bg-[#DCA842]/5' : 'border-zinc-800 bg-zinc-800/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {isToday && <Star className="h-3 w-3 text-[#DCA842] fill-current" />}
                              <span className="text-xs font-bold text-zinc-200">
                                {formatDateIndo(rec.date)}{isToday ? ' (Hari Ini)' : ''}
                              </span>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              rec.status === 'Hadir'
                                ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25'
                                : rec.status === 'Terlambat'
                                ? 'bg-amber-500/12 text-amber-400 border border-amber-500/25'
                                : 'bg-zinc-700 text-zinc-400 border border-zinc-600'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-zinc-500">
                            <div className="flex items-center gap-1">
                              <LogIn className="h-3 w-3 text-emerald-500" />
                              <span>{rec.check_in_time || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <LogOut className="h-3 w-3 text-rose-500" />
                              <span>{rec.check_out_time || '-'}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-700/40 text-[10px] text-zinc-600">
                            <span className="truncate">{rec.branch_name || activeBranch?.name || '-'}</span>
                            {rec.distance_meters != null && <span>{rec.distance_meters}m</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== GUIDE MODAL ========== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#DCA842]" /> Panduan Presensi
              </h3>
              <button type="button" onClick={() => setShowGuideModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                {n: 1, t: 'Verifikasi Lokasi GPS', d: 'Tekan "Cek GPS Saya" saat berada di dalam barbershop. Jika dari laptop tanpa GPS, gunakan "Lokasi Cabang (Uji)".'},
                {n: 2, t: 'Scan Wajah', d: 'Tekan "Buka Kamera", arahkan wajah ke oval panduan, lalu tekan "Ambil Foto". Atau unggah foto selfie.'},
                {n: 3, t: 'Tekan Tombol Presensi', d: 'Tekan PRESENSI MASUK saat datang ke barbershop. Tekan PRESENSI PULANG saat selesai shift.'},
                {n: 4, t: 'Tips Cepat', d: 'Gunakan tombol "Presensi Cepat" untuk melakukan langkah lokasi + kamera secara otomatis sekaligus.'},
              ].map((s) => (
                <div key={s.n} className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#DCA842] to-[#C5922E] text-zinc-950 font-black text-[11px] flex items-center justify-center shrink-0">{s.n}</div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{s.t}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-gradient-to-r from-[#C5922E] to-[#DCA842] py-2.5 text-xs font-bold text-zinc-950 hover:opacity-90 cursor-pointer"
            >
              Saya Mengerti — Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
