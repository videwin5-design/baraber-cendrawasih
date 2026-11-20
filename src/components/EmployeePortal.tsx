import {
  Award,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  ScanFace,
  Scissors,
  ShieldAlert,
  TrendingUp,
  Upload,
  User,
  Video,
  VideoOff,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {
  AttendanceRecord,
  Branch,
  Employee,
  FaceVerificationResult,
  GeoVerificationResult,
  OperationalSchedule,
  SalaryRecord,
  Transaction,
} from '../types.ts';
import {formatDateIndo, formatRupiah, formatTimeShort, getTodayISO} from '../utils/format.ts';
import {captureVideoFrameToDataUrl, compressImageFileToSquareDataUrl} from '../utils/image.ts';
import {BarberSalarySchemeModal} from './BarberSalarySchemeModal.tsx';

interface EmployeePortalProps {
  currentUser: Employee;
  employees: Employee[];
  branches: Branch[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  schedules: OperationalSchedule[];
}

function getLocalHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  currentUser,
  employees,
  branches,
  transactions,
  attendance,
  salaries,
  schedules,
}) => {
  const barbers = employees.filter((e) => e.role === 'karyawan' && e.is_active === 1);
  const [viewedEmployeeId, setViewedEmployeeId] = useState(
    currentUser.role === 'owner' ? barbers[0]?.id || currentUser.id : currentUser.id
  );
  const [isSalarySchemeOpen, setIsSalarySchemeOpen] = useState(false);

  const activeEmployee = employees.find((e) => e.id === viewedEmployeeId) || currentUser;
  const assignedBranch = branches.find((b) => b.id === activeEmployee.branch_id) || branches[0];

  // Profile Photo Upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState('');
  const [photoErr, setPhotoErr] = useState('');
  const profileInputRef = useRef<HTMLInputElement | null>(null);

  // Location Geo state
  const [geoCoords, setGeoCoords] = useState<{lat: number; lng: number; accuracy: number} | null>(null);
  const [geoResult, setGeoResult] = useState<GeoVerificationResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Camera & Python Face Recognition state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selfieUploadRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [liveSnapshot, setLiveSnapshot] = useState<string>('');
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);

  // Live clock for operational hours
  const [clientTime, setClientTime] = useState(getLocalHHMM());
  useEffect(() => {
    const t = window.setInterval(() => setClientTime(getLocalHHMM()), 15000);
    return () => window.clearInterval(t);
  }, []);

  // Stop camera stream on unmount or employee switch
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState('');
  const [attSuccess, setAttSuccess] = useState('');

  const today = getTodayISO();
  const currentMonth = today.slice(0, 7);

  // Transactions specifically attributed to this barber by the Cashier!
  const myTransactions = useMemo(
    () => transactions.filter((t) => t.barber_id === activeEmployee.id),
    [transactions, activeEmployee.id]
  );
  const myTodayTrx = useMemo(
    () => myTransactions.filter((t) => t.created_at.slice(0, 10) === today),
    [myTransactions, today]
  );
  const myMonthTrx = useMemo(
    () => myTransactions.filter((t) => t.created_at.slice(0, 7) === currentMonth),
    [myTransactions, currentMonth]
  );

  const monthCommission = myMonthTrx.reduce((s, t) => s + t.barber_commission, 0);
  const monthRevenue = myMonthTrx.reduce((s, t) => s + t.total_amount, 0);
  const currentSalaryRecord = salaries.find(
    (s) => s.employee_id === activeEmployee.id && s.period_month === currentMonth
  );

  const myAttendance = attendance.filter((a) => a.employee_id === activeEmployee.id);
  const todayAttendance = myAttendance.find((a) => a.date === today);

  const branchSchedules = schedules.filter((s) => s.branch_id === assignedBranch?.id);
  const todayDow = new Date().getDay();
  const todaySchedule = branchSchedules.find((s) => s.day_of_week === todayDow);

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true);
    setPhotoErr('');
    setPhotoMsg('');
    try {
      const dataUrl = await compressImageFileToSquareDataUrl(file, 320);
      const res = await fetch(`/api/employees/${activeEmployee.id}/photo`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({photo_url: dataUrl}),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoErr(data.error || 'Gagal mengunggah foto profil');
      } else {
        setPhotoMsg('Foto profil berhasil disimpan sebagai referensi verifikasi wajah.');
        setFaceResult(null);
      }
    } catch {
      setPhotoErr('Gagal memproses file foto. Pastikan file berupa gambar JPG/PNG.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const runPythonGeoVerification = async (lat: number, lng: number, accuracy: number) => {
    if (!assignedBranch) return;
    setGeoCoords({lat, lng, accuracy});
    setAttError('');
    try {
      const res = await fetch('/api/geo/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          branch_id: assignedBranch.id,
          lat,
          lng,
          accuracy,
        }),
      });
      const data = await res.json();
      if (data.verification) {
        setGeoResult(data.verification);
      }
    } catch {
      setAttError('Gagal menghubungi engine lokasi Python di server');
    }
  };

  const handleCaptureBrowserGPS = () => {
    setAttError('');
    setAttSuccess('');
    if (!navigator.geolocation) {
      setAttError('Browser tidak mendukung akses GPS Geolocation');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await runPythonGeoVerification(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 15);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setAttError(
          `Izin GPS ditolak atau tidak tersedia (${err.message}). Gunakan tombol Uji Titik Cabang jika sedang mengakses jarak jauh.`
        );
      },
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
    );
  };

  const handleSimulateNearbyGPS = async () => {
    if (!assignedBranch) return;
    setGeoLoading(true);
    setAttError('');
    setAttSuccess('');
    await runPythonGeoVerification(assignedBranch.lat + 0.00005, assignedBranch.lng + 0.00004, 10);
    setGeoLoading(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setAttError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera langsung. Gunakan tombol Unggah Selfie.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: 'user', width: {ideal: 480}, height: {ideal: 480}},
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Izin kamera ditolak atau kamera tidak terdeteksi. Gunakan tombol Unggah Selfie sebagai alternatif.');
    }
  };

  const runPythonFaceVerification = async (imageB64: string) => {
    if (!assignedBranch) return;
    setFaceLoading(true);
    setAttError('');
    setLiveSnapshot(imageB64);
    try {
      const nowHHMM = getLocalHHMM();
      setClientTime(nowHHMM);
      const res = await fetch('/api/face/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id,
          branch_id: assignedBranch.id,
          live_image_b64: imageB64,
          client_time: nowHHMM,
        }),
      });
      const data = await res.json();
      if (data.verification) {
        setFaceResult(data.verification);
      } else {
        setAttError(data.error || 'Gagal menjalankan engine face recognition Python');
      }
    } catch {
      setAttError('Gagal menghubungi engine face recognition Python');
    } finally {
      setFaceLoading(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const frame = captureVideoFrameToDataUrl(videoRef.current, 320);
    if (!frame) {
      setCameraError('Kamera belum siap. Coba ulangi beberapa detik lagi.');
      return;
    }
    stopCamera();
    await runPythonFaceVerification(frame);
  };

  const handleSelfieFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToSquareDataUrl(file, 320);
      stopCamera();
      await runPythonFaceVerification(dataUrl);
    } catch {
      setCameraError('Gagal membaca file foto selfie.');
    }
  };

  const handleCheckIn = async () => {
    if (!geoCoords || !assignedBranch) {
      setAttError('Ambil lokasi GPS Anda terlebih dahulu untuk verifikasi Python.');
      return;
    }
    if (!liveSnapshot) {
      setAttError('Ambil foto wajah Anda terlebih dahulu untuk verifikasi Face Recognition Python.');
      return;
    }
    setAttLoading(true);
    setAttError('');
    setAttSuccess('');
    try {
      const nowHHMM = getLocalHHMM();
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id,
          branch_id: assignedBranch.id,
          lat: geoCoords.lat,
          lng: geoCoords.lng,
          accuracy: geoCoords.accuracy,
          live_image_b64: liveSnapshot,
          client_time: nowHHMM,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttError(data.error || 'Presensi masuk gagal');
      } else {
        setAttSuccess(
          `Presensi masuk tercatat (${data.record.check_in_time}) · Jarak ${data.verification.distance_meters}m · Wajah cocok ${data.faceVerification.similarity_percent}%`
        );
      }
    } catch {
      setAttError('Gagal menghubungi server presensi');
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!geoCoords || !assignedBranch) {
      setAttError('Verifikasi lokasi GPS terlebih dahulu sebelum presensi pulang.');
      return;
    }
    setAttLoading(true);
    setAttError('');
    setAttSuccess('');
    try {
      const nowHHMM = getLocalHHMM();
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          employee_id: activeEmployee.id,
          branch_id: assignedBranch.id,
          lat: geoCoords.lat,
          lng: geoCoords.lng,
          accuracy: geoCoords.accuracy,
          live_image_b64: liveSnapshot || undefined,
          client_time: nowHHMM,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttError(data.error || 'Presensi pulang gagal');
      } else {
        setAttSuccess(`Presensi pulang berhasil dicatat pukul ${data.check_out_time}`);
      }
    } catch {
      setAttError('Gagal menghubungi server presensi');
    } finally {
      setAttLoading(false);
    }
  };

  const canCheckIn =
    !attLoading &&
    !todayAttendance &&
    !!geoResult?.within_radius &&
    !!faceResult?.face_match &&
    !!faceResult?.operational_allowed;

  return (
    <div className="space-y-6">
      {/* Header Banner + Profile Photo Upload + Owner Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Profile Avatar & Upload Trigger */}
          <div className="relative shrink-0 flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-[#09090B] dark:border-[#DCA842] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {activeEmployee.photo_url ? (
                <img
                  src={activeEmployee.photo_url}
                  alt={activeEmployee.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-9 w-9 text-zinc-400" />
              )}
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className="hidden"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-[#C5922E]">Dashboard Kinerja &amp; Presensi Karyawan</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#09090B] dark:text-white">{activeEmployee.name}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {activeEmployee.specialty} · Penempatan: {assignedBranch?.name || 'Pusat'} · Komisi {activeEmployee.commission_rate}%
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                disabled={photoUploading}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-[#C5922E]" />
                <span>
                  {photoUploading
                    ? 'Mengunggah...'
                    : activeEmployee.photo_url
                      ? 'Ganti Foto Profil'
                      : 'Upload Foto Profil (Wajib Face ID)'}
                </span>
              </button>
              {photoMsg && <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{photoMsg}</span>}
              {photoErr && <span className="text-xs font-medium text-red-600 dark:text-red-400">{photoErr}</span>}
            </div>
          </div>
        </div>

        {currentUser.role === 'owner' && (
          <div className="w-full md:w-64">
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Pantau Karyawan (Mode Owner)
            </label>
            <select
              value={activeEmployee.id}
              onChange={(e) => {
                stopCamera();
                setViewedEmployeeId(e.target.value);
                setGeoResult(null);
                setGeoCoords(null);
                setFaceResult(null);
                setLiveSnapshot('');
                setAttError('');
                setAttSuccess('');
                setPhotoMsg('');
                setPhotoErr('');
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
            >
              {employees
                .filter((e) => e.role !== 'owner' && e.is_active === 1)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role === 'karyawan' ? 'Barber' : 'Kasir'})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Banner Skema Gaji Barber 2026 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#DCA842]/40 bg-gradient-to-r from-[#DCA842]/10 via-[#09090B] to-[#DCA842]/5 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DCA842]/20 text-[#DCA842]">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#DCA842] uppercase tracking-wider">Sistem Gaji Barber 2026</p>
            <p className="text-xs text-zinc-300">
              Gaji Pokok Rp2.000.000 + Komisi Pangkas (20%-30%) + Bonus Target Bulanan hingga Rp2.500.000 (Junior → Senior → Legend)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSalarySchemeOpen(true)}
          className="rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 px-4 py-2 text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
        >
          Lihat Skema Lengkap 2026
        </button>
      </div>

      {/* KPI Metrics (Realtime from Kasir Input) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Pelanggan Dipangkas Hari Ini</span>
            <Scissors className="h-4 w-4 text-[#09090B] dark:text-[#DCA842]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#09090B] dark:text-white tabular-nums">{myTodayTrx.length}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Diinput oleh kasir cabang</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Total Pangkas Bulan Ini</span>
            <TrendingUp className="h-4 w-4 text-[#C5922E]" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#09090B] dark:text-white tabular-nums">{myMonthTrx.length}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Omzet jasa: {formatRupiah(monthRevenue)}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Komisi Terkumpul ({activeEmployee.commission_rate}%)</span>
            <span className="font-mono text-xs font-semibold text-[#C5922E]">BULAN INI</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-[#09090B] dark:text-white tabular-nums">
            {formatRupiah(monthCommission)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Gaji pokok: {formatRupiah(activeEmployee.base_salary)}</p>
        </div>

        <div className="rounded-xl bg-[#09090B] p-5 text-white border border-[#27272A]">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Estimasi Total Gaji</span>
            <span className="font-mono text-xs text-[#DCA842]">{currentSalaryRecord?.status || 'Draft'}</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
            {formatRupiah(currentSalaryRecord?.net_salary ?? activeEmployee.base_salary + monthCommission)}
          </p>
          <p className="mt-1 text-xs text-zinc-300">Pokok + Komisi + Bonus/Potongan</p>
        </div>
      </div>

      {/* Main Split: 3-Gate Python Attendance + Barber Performance History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Python Location + Operational Hours + Face Recognition Attendance */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                Presensi Wajah, Lokasi &amp; Jam Operasional
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Validasi 3 lapis oleh Python Geo-Engine &amp; Face Recognition
              </p>
            </div>
            <ScanFace className="h-5 w-5 text-[#C5922E] shrink-0" />
          </div>

          {/* Gate 2 Info: Branch + Operational Hours */}
          {assignedBranch && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/70 dark:border-zinc-700 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#09090B] dark:text-white">{assignedBranch.name}</span>
                <span className="font-mono font-semibold text-[#C5922E] tabular-nums">Jam: {clientTime}</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300">{assignedBranch.address}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                <span>Radius Maks: {assignedBranch.radius_meters}m</span>
                <span>
                  Operasional Hari Ini:{' '}
                  {todaySchedule
                    ? todaySchedule.is_open
                      ? `${todaySchedule.open_time}–${todaySchedule.close_time}`
                      : 'Tutup'
                    : `${assignedBranch.open_time}–${assignedBranch.close_time}`}
                </span>
              </div>
            </div>
          )}

          {/* Gate 1: Location Capture Controls */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#09090B] dark:text-zinc-200 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#C5922E]" />
              <span>1. Validasi Radius Lokasi (Python Haversine)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCaptureBrowserGPS}
                disabled={geoLoading}
                className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#09090B] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#18181B] dark:bg-[#18181B] dark:hover:bg-[#27272A] disabled:opacity-50 cursor-pointer"
              >
                <Navigation className="h-4 w-4" />
                <span>{geoLoading ? 'Mengukur GPS...' : 'Ambil Lokasi GPS'}</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateNearbyGPS}
                disabled={geoLoading}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                title="Uji presensi di titik koordinat cabang saat akses jarak jauh"
              >
                <Compass className="h-3.5 w-3.5 text-[#C5922E]" />
                <span>Uji Titik Cabang</span>
              </button>
            </div>

            {geoResult && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                  geoResult.within_radius
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    {geoResult.within_radius ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-red-700 dark:text-red-400" />
                    )}
                    {geoResult.status_label}
                  </span>
                  <span className="font-mono font-bold tabular-nums">{geoResult.distance_meters} m</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] opacity-90">
                  <div>Arah: {geoResult.direction_from_branch} ({geoResult.bearing_degrees}°)</div>
                  <div>Batas Radius: {geoResult.radius_meters} m</div>
                </div>
              </div>
            )}
          </div>

          {/* Gate 3: Face Recognition Python */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-[#09090B] dark:text-zinc-200 flex items-center gap-1.5">
              <ScanFace className="h-3.5 w-3.5 text-[#C5922E]" />
              <span>2. Verifikasi Wajah (Python Face Recognition)</span>
            </p>

            {!activeEmployee.photo_url && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                Belum ada foto profil referensi. Klik <strong>Upload Foto Profil</strong> di kartu atas terlebih dahulu.
              </div>
            )}

            {/* Camera / Snapshot Preview */}
            {(cameraActive || liveSnapshot) && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3">
                <div className="text-center">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Foto Profil</p>
                  <div className="aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                    {activeEmployee.photo_url ? (
                      <img src={activeEmployee.photo_url} alt="Profil" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-zinc-400" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                    {cameraActive ? 'Kamera Langsung' : 'Foto Presensi'}
                  </p>
                  <div className="aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-900 flex items-center justify-center">
                    {cameraActive ? (
                      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
                    ) : (
                      <img src={liveSnapshot} alt="Live Capture" className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              </div>
            )}

            <input
              ref={selfieUploadRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieFileUpload}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={faceLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#09090B] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#18181B] dark:bg-[#18181B] dark:hover:bg-[#27272A] cursor-pointer"
                >
                  <Video className="h-3.5 w-3.5 text-[#DCA842]" />
                  <span>Buka Kamera Wajah</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    disabled={faceLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C5922E] px-3.5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-[#DCA842] cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{faceLoading ? 'Memverifikasi...' : 'Ambil & Verifikasi Wajah'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
                    aria-label="Tutup kamera"
                  >
                    <VideoOff className="h-4 w-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => selfieUploadRef.current?.click()}
                disabled={faceLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-[#C5922E]" />
                <span>{faceLoading ? 'Cek...' : 'Unggah Selfie'}</span>
              </button>
            </div>

            {cameraError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                {cameraError}
              </div>
            )}

            {faceResult && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                  faceResult.face_match && faceResult.operational_allowed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    {faceResult.face_match ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-red-700 dark:text-red-400" />
                    )}
                    {faceResult.status_label || (faceResult.face_match ? 'Wajah Terverifikasi' : 'Wajah Tidak Cocok')}
                  </span>
                  <span className="font-mono font-bold tabular-nums">{faceResult.similarity_percent}%</span>
                </div>
                <p className="text-[11px] opacity-90">{faceResult.operational_message}</p>
                <p className="font-mono text-[10px] opacity-75">Engine: {faceResult.verified_by}</p>
              </div>
            )}
          </div>

          {attError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {attError}
            </div>
          )}
          {attSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {attSuccess}
            </div>
          )}

          {/* Today Status & Check-in / Check-out */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Status Presensi ({formatDateIndo(today)})
              </span>
              <span className="font-semibold text-[#09090B] dark:text-[#DCA842]">
                {todayAttendance ? todayAttendance.status : 'Belum Presensi'}
              </span>
            </div>
            {todayAttendance && (
              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300 font-mono tabular-nums">
                <div>Masuk: {todayAttendance.check_in_time || '-'}</div>
                <div>Pulang: {todayAttendance.check_out_time || '-'}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!canCheckIn}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#09090B] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#18181B] dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] disabled:opacity-45 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Presensi Masuk</span>
              </button>
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={attLoading || !todayAttendance || !!todayAttendance?.check_out_time || !geoResult?.within_radius}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#09090B] bg-white px-3 py-2.5 text-xs font-semibold text-[#09090B] hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-45 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Presensi Pulang</span>
              </button>
            </div>
          </div>

          {/* Operational Schedule Preview */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="font-display text-xs font-bold text-[#09090B] dark:text-white mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#C5922E]" />
              <span>Jadwal Operasional Cabang Anda</span>
            </h3>
            <div className="space-y-1.5">
              {branchSchedules.map((sch) => (
                <div
                  key={sch.id}
                  className={`flex items-center justify-between text-xs py-1 border-b border-zinc-50 dark:border-zinc-800 ${
                    sch.day_of_week === todayDow ? 'font-bold text-[#09090B] dark:text-[#DCA842]' : ''
                  }`}
                >
                  <span>{sch.day_name}</span>
                  <span className="font-mono tabular-nums">
                    {sch.is_open ? `${sch.open_time} – ${sch.close_time}` : 'Tutup'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Customers Cut (from Kasir) + Attendance Log */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                  Riwayat Pelanggan Dipangkas
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Data otomatis masuk saat Kasir memilih nama Anda pada transaksi
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums">
                {myTransactions.length} Transaksi
              </span>
            </div>

            {myTransactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Belum ada transaksi pangkas yang tercatat oleh kasir untuk {activeEmployee.name}.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                      <th className="pb-2.5 font-semibold">Waktu</th>
                      <th className="pb-2.5 font-semibold">Pelanggan</th>
                      <th className="pb-2.5 font-semibold">Layanan</th>
                      <th className="pb-2.5 font-semibold text-right">Nilai</th>
                      <th className="pb-2.5 font-semibold text-right">Komisi Anda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {myTransactions.slice(0, 20).map((trx) => (
                      <tr key={trx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 font-mono text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                          {trx.created_at.slice(0, 10)} {formatTimeShort(trx.created_at)}
                        </td>
                        <td className="py-3 font-semibold text-[#09090B] dark:text-white">{trx.customer_name}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-300">
                          {trx.items.map((i) => i.service_name).join(', ')}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums">{formatRupiah(trx.total_amount)}</td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          +{formatRupiah(trx.barber_commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
            <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Riwayat Presensi Wajah &amp; Lokasi Python
            </h3>
            {myAttendance.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">Belum ada riwayat presensi.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                      <th className="pb-2 font-semibold">Tanggal</th>
                      <th className="pb-2 font-semibold">Masuk / Pulang</th>
                      <th className="pb-2 font-semibold">Jarak</th>
                      <th className="pb-2 font-semibold">Wajah</th>
                      <th className="pb-2 font-semibold">Verifikasi</th>
                      <th className="pb-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {myAttendance.map((att) => (
                      <tr key={att.id}>
                        <td className="py-2.5 font-mono tabular-nums">{att.date}</td>
                        <td className="py-2.5 font-mono tabular-nums">
                          {att.check_in_time || '-'} / {att.check_out_time || '-'}
                        </td>
                        <td className="py-2.5 font-mono tabular-nums">{att.distance_meters} m</td>
                        <td className="py-2.5 font-mono tabular-nums">
                          {att.face_similarity !== null && att.face_similarity !== undefined
                            ? `${att.face_similarity}%`
                            : '-'}
                        </td>
                        <td className="py-2.5 text-zinc-500 dark:text-zinc-400">{att.verified_by}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {att.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <BarberSalarySchemeModal
        isOpen={isSalarySchemeOpen}
        onClose={() => setIsSalarySchemeOpen(false)}
      />
    </div>
  );
};
