import {
  AlertCircle,
  Award,
  Building2,
  Calculator,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  DollarSign,
  Download,
  Edit3,
  FileSpreadsheet,
  Film,
  Filter,
  ImagePlus,
  MapPin,
  Megaphone,
  Package,
  Percent,
  Pin,
  Plus,
  Receipt,
  RefreshCw,
  ScanFace,
  Scissors,
  Search,
  Sparkles,
  Star,
  Table2,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
  VideoOff,
  Wallet,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import type {
  AttendanceRecord,
  Booking,
  Branch,
  DailyReportSummary,
  Employee,
  OperationalSchedule,
  PostItem,
  SalaryRecord,
  ServiceCategory,
  ServiceItem,
  SiteMedia,
  Transaction,
} from '../types.ts';
import {formatDateIndo, formatRupiah, formatTimeShort, getTodayISO} from '../utils/format.ts';
import {captureVideoFrameToDataUrl, compressImageFileToLandscapeDataUrl, compressImageFileToSquareDataUrl} from '../utils/image.ts';
import {BarberSalarySchemeModal} from './BarberSalarySchemeModal.tsx';
import {ActionConfirmModal, ActionFeedbackModal} from './AppActionModal.tsx';
import {ExcelPeriodReport} from './ExcelPeriodReport.tsx';
import {OwnerAnalyticsCharts} from './OwnerAnalyticsCharts.tsx';
import {OwnerPerformanceMatrixTable} from './OwnerPerformanceMatrixTable.tsx';

interface OwnerPortalProps {
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  serviceCategories?: ServiceCategory[];
  schedules: OperationalSchedule[];
  bookings: Booking[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  transactions: Transaction[];
  posts: PostItem[];
  siteMedia: SiteMedia;
  initialTab?: OwnerTab;
}

type OwnerTab = 'keuangan' | 'excel' | 'konten' | 'cabang' | 'karyawan' | 'gaji' | 'jadwal' | 'presensi' | 'layanan' | 'transaksi';

export const OwnerPortal: React.FC<OwnerPortalProps> = ({
  branches,
  employees,
  services,
  serviceCategories: propCategories,
  schedules,
  bookings,
  attendance,
  salaries,
  transactions,
  posts,
  siteMedia,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>(initialTab || 'keuangan');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Daily financial report state
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [reportBranchId, setReportBranchId] = useState('ALL');
  const [dailyReport, setDailyReport] = useState<DailyReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Branch CRUD modal state
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    lat: '-3.3649',
    lng: '135.4959',
    radius_meters: '150',
    open_time: '10:00',
    close_time: '21:30',
    photo_url: '',
  });

  // Employee CRUD modal state
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    role: 'karyawan' as Employee['role'],
    specialty: '',
    phone: '',
    pin: '',
    branch_id: branches[0]?.id || '',
    base_salary: '2500000',
    commission_rate: '35',
    photo_url: '',
  });

  // Employee photo & camera state
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [empCameraActive, setEmpCameraActive] = useState(false);
  const [empCameraLoading, setEmpCameraLoading] = useState(false);
  const [empCameraFacing, setEmpCameraFacing] = useState<'user' | 'environment'>('user');
  const [empCameraError, setEmpCameraError] = useState('');
  const empVideoRef = useRef<HTMLVideoElement | null>(null);
  const empStreamRef = useRef<MediaStream | null>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (empStreamRef.current) {
        empStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Action Feedback & Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    type?: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [feedbackConfig, setFeedbackConfig] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    autoCloseMs?: number;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  const showConfirm = (opts: {
    type?: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmConfig({
      isOpen: true,
      type: opts.type || 'danger',
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel || 'Ya, Lanjutkan',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await opts.onConfirm();
        } finally {
          setActionLoading(false);
          setConfirmConfig((prev) => ({...prev, isOpen: false}));
        }
      },
    });
  };

  const showFeedback = (opts: {
    type?: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    autoCloseMs?: number;
  }) => {
    setFeedbackConfig({
      isOpen: true,
      type: opts.type || 'success',
      title: opts.title,
      message: opts.message,
      autoCloseMs: opts.autoCloseMs ?? 3000,
    });
  };

  // Salary state
  const [salaryMonth, setSalaryMonth] = useState(getTodayISO().slice(0, 7));
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
  const [salaryAdjust, setSalaryAdjust] = useState({bonus: '0', deduction: '0', notes: ''});
  const [isSalarySchemeModalOpen, setIsSalarySchemeModalOpen] = useState(false);
  const [simCustomers, setSimCustomers] = useState<number>(150);

  // Schedule state
  const [scheduleBranchId, setScheduleBranchId] = useState(branches[0]?.id || '');

  // Service CRUD modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [uploadingServicePhotoId, setUploadingServicePhotoId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'HAIRCUT',
    price: '85000',
    duration_minutes: '45',
    image_url: '',
    description: '',
  });

  // Service Categories state
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(propCategories || []);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [catForm, setCatForm] = useState({name: '', color: '#DCA842', sort_order: '99'});
  const [catSavingError, setCatSavingError] = useState('');

  useEffect(() => {
    // Fetch kategori dari server saat mount dan setiap kali tab layanan aktif
    fetch('/api/service-categories')
      .then((r) => r.json())
      .then((data: ServiceCategory[]) => setServiceCategories(data))
      .catch(() => {/* silent */});
  }, [activeTab]);

  // Transaksi filter state
  const [trxSearch, setTrxSearch] = useState('');
  const [trxBranchFilter, setTrxBranchFilter] = useState('ALL');
  const [trxPayFilter, setTrxPayFilter] = useState('ALL');
  const [trxDateFrom, setTrxDateFrom] = useState('');
  const [trxDateTo, setTrxDateTo] = useState('');
  const [trxVoidLoading, setTrxVoidLoading] = useState<string | null>(null);

  // Service filter & state
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceCat, setSelectedServiceCat] = useState('ALL');
  const [serviceDeletingId, setServiceDeletingId] = useState<string | null>(null);

  // Posts & Promos + Video Showcase state
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    category: 'Promo' as PostItem['category'],
    content: '',
    promo_code: '',
    valid_until: '',
    image_url: '',
    is_pinned: false,
    is_published: true,
  });
  const [videoTitle, setVideoTitle] = useState(siteMedia?.hero_video_title || '');
  const [videoSubtitle, setVideoSubtitle] = useState(siteMedia?.hero_video_subtitle || '');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mediaFeedback, setMediaFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    setVideoTitle(siteMedia?.hero_video_title || '');
    setVideoSubtitle(siteMedia?.hero_video_subtitle || '');
  }, [siteMedia?.hero_video_title, siteMedia?.hero_video_subtitle]);

  const fetchDailyReport = async (d: string, bId: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${encodeURIComponent(d)}&branchId=${encodeURIComponent(bId)}`);
      if (res.ok) {
        setDailyReport(await res.json());
      }
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchDailyReport(reportDate, reportBranchId);
  }, [reportDate, reportBranchId, bookings.length, attendance.length, salaries.length]);

  const exportDailyCsv = () => {
    if (!dailyReport) return;
    const headers = ['Invoice', 'Waktu', 'Cabang', 'Pelanggan', 'Barber', 'Kasir', 'Metode', 'Total', 'Komisi Barber'];
    const rows = dailyReport.transactions.map((t) => [
      t.invoice_no,
      t.created_at,
      `"${t.branch_name}"`,
      `"${t.customer_name}"`,
      `"${t.barber_name}"`,
      `"${t.cashier_name}"`,
      t.payment_method,
      t.total_amount,
      t.barber_commission,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-cendrawasih-${reportDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Branch handlers
  const openCreateBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: `CW-0${branches.length + 1}`,
      address: '',
      phone: '',
      lat: '-3.3649',
      lng: '135.4959',
      radius_meters: '150',
      open_time: '10:00',
      close_time: '21:30',
      photo_url: '/assets/setmore/studio-storefront.jpg',
    });
    setBranchModalOpen(true);
  };

  const openEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      lat: String(b.lat),
      lng: String(b.lng),
      radius_meters: String(b.radius_meters),
      open_time: b.open_time,
      close_time: b.close_time,
      photo_url: b.photo_url || '',
    });
    setBranchModalOpen(true);
  };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...branchForm,
      lat: Number(branchForm.lat),
      lng: Number(branchForm.lng),
      radius_meters: Number(branchForm.radius_meters),
    };
    const isEdit = Boolean(editingBranch);
    const branchName = branchForm.name;
    const res = editingBranch
      ? await fetch(`/api/branches/${editingBranch.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        })
      : await fetch('/api/branches', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
    setBranchModalOpen(false);
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: isEdit ? 'Cabang Berhasil Diperbarui' : 'Cabang Baru Ditambahkan',
        message: `Data cabang ${branchName} berhasil disimpan ke sistem.`,
      });
    } else {
      const err = await res.json().catch(() => ({}));
      showFeedback({type: 'error', title: 'Gagal Menyimpan Cabang', message: err.error || 'Terjadi kesalahan sistem.'});
    }
  };

  const deleteBranch = (bOrId: Branch | string) => {
    const b = typeof bOrId === 'string' ? branches.find((x) => x.id === bOrId) : bOrId;
    const bName = b ? `${b.name} (${b.code})` : 'cabang ini';
    const id = typeof bOrId === 'string' ? bOrId : bOrId.id;
    showConfirm({
      type: 'danger',
      title: 'Hapus Cabang Barbershop?',
      message: `Apakah Anda yakin ingin menghapus ${bName}? Semua data transaksi dan jadwal terkait cabang ini dapat terpengaruh. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Cabang',
      onConfirm: async () => {
        const res = await fetch(`/api/branches/${id}`, {method: 'DELETE'});
        if (res.ok) {
          showFeedback({
            type: 'success',
            title: 'Cabang Berhasil Dihapus',
            message: `Cabang ${bName} telah berhasil dihapus dari sistem.`,
          });
        } else {
          const err = await res.json().catch(() => ({}));
          showFeedback({type: 'error', title: 'Gagal Menghapus Cabang', message: err.error || 'Terjadi kesalahan sistem.'});
        }
      },
    });
  };

  // Employee camera & photo handlers
  const stopEmpCamera = () => {
    if (empStreamRef.current) {
      empStreamRef.current.getTracks().forEach((track) => track.stop());
      empStreamRef.current = null;
    }
    setEmpCameraActive(false);
    setEmpCameraLoading(false);
  };

  const startEmpCamera = async (facing: 'user' | 'environment' = empCameraFacing) => {
    setEmpCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setEmpCameraError('Perangkat tidak mendukung akses kamera browser.');
      return;
    }
    stopEmpCamera();
    setEmpCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {ideal: facing},
          width: {ideal: 640},
          height: {ideal: 640},
        },
        audio: false,
      });
      empStreamRef.current = stream;
      setEmpCameraActive(true);
      setEmpCameraFacing(facing);
      setTimeout(() => {
        if (empVideoRef.current) {
          empVideoRef.current.srcObject = stream;
          empVideoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      setEmpCameraError('Tidak dapat membuka kamera. Pastikan izin kamera telah diberikan di browser.');
    } finally {
      setEmpCameraLoading(false);
    }
  };

  const toggleEmpCameraFacing = async () => {
    const nextFacing = empCameraFacing === 'user' ? 'environment' : 'user';
    await startEmpCamera(nextFacing);
  };

  const handleSnapEmpPhoto = () => {
    if (!empVideoRef.current) return;
    const dataUrl = captureVideoFrameToDataUrl(empVideoRef.current, 360);
    if (!dataUrl) {
      setEmpCameraError('Kamera belum siap, tunggu sebentar lalu ulangi.');
      return;
    }
    stopEmpCamera();
    setEmpForm((prev) => ({...prev, photo_url: dataUrl}));
    setPhotoFeedback({type: 'success', text: 'Foto wajah karyawan berhasil dijepret dan siap disimpan!'});
    if (editingEmp) {
      setEditingEmp({...editingEmp, photo_url: dataUrl});
    }
  };

  const closeEmpModal = () => {
    stopEmpCamera();
    setEmpModalOpen(false);
    setEditingEmp(null);
    setPhotoFeedback(null);
    setEmpCameraError('');
  };

  // Employee handlers
  const openCreateEmp = () => {
    stopEmpCamera();
    setEditingEmp(null);
    setPhotoFeedback(null);
    setEmpCameraError('');
    setEmpForm({
      name: '',
      role: 'karyawan',
      specialty: 'Fade & Classic Cut',
      phone: '',
      pin: '3335',
      branch_id: branches[0]?.id || '',
      base_salary: '2500000',
      commission_rate: '35',
      photo_url: '',
    });
    setEmpModalOpen(true);
  };

  const openEditEmp = (emp: Employee) => {
    stopEmpCamera();
    setEditingEmp(emp);
    setPhotoFeedback(null);
    setEmpCameraError('');
    setEmpForm({
      name: emp.name,
      role: emp.role,
      specialty: emp.specialty,
      phone: emp.phone,
      pin: emp.pin,
      branch_id: emp.branch_id || branches[0]?.id || '',
      base_salary: String(emp.base_salary),
      commission_rate: String(emp.commission_rate),
      photo_url: emp.photo_url || '',
    });
    setEmpModalOpen(true);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    stopEmpCamera();
    const payload = {
      ...empForm,
      base_salary: Number(empForm.base_salary),
      commission_rate: Number(empForm.commission_rate),
      photo_url: empForm.photo_url || '',
    };
    const isEdit = Boolean(editingEmp);
    const empName = empForm.name;
    const res = editingEmp
      ? await fetch(`/api/employees/${editingEmp.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        })
      : await fetch('/api/employees', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
    setEmpModalOpen(false);
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: isEdit ? 'Data Karyawan Diperbarui' : 'Karyawan Baru Terdaftar',
        message: `Akun ${empName} (${payload.role.toUpperCase()}) berhasil disimpan dan foto wajah siap digunakan untuk presensi!`,
      });
    } else {
      const err = await res.json().catch(() => ({}));
      showFeedback({type: 'error', title: 'Gagal Menyimpan Karyawan', message: err.error || 'Terjadi kesalahan sistem.'});
    }
  };

  const deleteEmployee = (empOrId: Employee | string) => {
    const emp = typeof empOrId === 'string' ? employees.find((x) => x.id === empOrId) : empOrId;
    const empName = emp ? `${emp.name} (${emp.role.toUpperCase()})` : 'karyawan ini';
    const id = typeof empOrId === 'string' ? empOrId : empOrId.id;
    showConfirm({
      type: 'danger',
      title: 'Hapus Data Karyawan?',
      message: `Apakah Anda yakin ingin menghapus akun ${empName}? Semua data komisi, gaji, dan riwayat presensi terkait akan dihapus permanen.`,
      confirmLabel: 'Ya, Hapus Karyawan',
      onConfirm: async () => {
        const res = await fetch(`/api/employees/${id}`, {method: 'DELETE'});
        if (res.ok) {
          showFeedback({
            type: 'success',
            title: 'Karyawan Berhasil Dihapus',
            message: `Data karyawan ${empName} telah berhasil dihapus dari sistem.`,
          });
        } else {
          const err = await res.json().catch(() => ({}));
          showFeedback({type: 'error', title: 'Gagal Menghapus Karyawan', message: err.error || 'Terjadi kesalahan sistem.'});
        }
      },
    });
  };

  const handleEmpPhotoUpload = async (emp: Employee, file: File | null) => {
    if (!file) return;
    setUploadingPhotoId(emp.id);
    setPhotoFeedback(null);
    try {
      const dataUrl = await compressImageFileToSquareDataUrl(file, 320);
      const res = await fetch(`/api/employees/${emp.id}/photo`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({photo_url: dataUrl}),
      });
      const json = await res.json();
      if (!res.ok) {
        setPhotoFeedback({type: 'error', text: json.error || `Gagal menyimpan foto ${emp.name}.`});
      } else {
        setPhotoFeedback({type: 'success', text: `Foto profil ${emp.name} diperbarui untuk Face Recognition.`});
        if (editingEmp && editingEmp.id === emp.id) {
          setEditingEmp({...editingEmp, photo_url: dataUrl});
        }
      }
    } catch {
      setPhotoFeedback({type: 'error', text: 'File gambar tidak dapat diproses.'});
    } finally {
      setUploadingPhotoId(null);
    }
  };

  // Salary handlers
  const recalculateSalaries = async () => {
    const res = await fetch('/api/salaries/recalculate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({period_month: salaryMonth}),
    });
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: 'Gaji Berhasil Dihitung Ulang',
        message: `Kalkulasi gaji pokok, komisi pangkas, dan bonus target seluruh staf untuk periode ${salaryMonth} telah diperbarui.`,
      });
    } else {
      showFeedback({type: 'error', title: 'Gagal Menghitung Gaji', message: 'Terjadi kesalahan sistem saat kalkulasi gaji.'});
    }
  };

  const saveSalaryAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary) return;
    const empName = editingSalary.employee_name;
    const res = await fetch(`/api/salaries/${editingSalary.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        bonus: Number(salaryAdjust.bonus),
        deduction: Number(salaryAdjust.deduction),
        notes: salaryAdjust.notes,
      }),
    });
    setEditingSalary(null);
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: 'Penyesuaian Gaji Disimpan',
        message: `Penyesuaian bonus & potongan untuk ${empName} berhasil disimpan.`,
      });
    } else {
      showFeedback({type: 'error', title: 'Gagal Menyimpan', message: 'Gagal menyimpan penyesuaian gaji.'});
    }
  };

  const markSalaryPaid = async (sal: SalaryRecord) => {
    const nextStatus = sal.status === 'Dibayar' ? 'Draft' : 'Dibayar';
    const res = await fetch(`/api/salaries/${sal.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({status: nextStatus}),
    });
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: 'Status Pembayaran Diperbarui',
        message: `Status gaji ${sal.employee_name} diubah menjadi "${nextStatus}".`,
      });
    }
  };

  // Schedule handler
  const updateSchedule = async (sch: OperationalSchedule, patch: Partial<OperationalSchedule>) => {
    await fetch(`/api/schedules/${sch.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
  };

  // Service handlers
  const openCreateService = () => {
    setEditingService(null);
    const firstCat = serviceCategories.find((c) => c.is_active === 1)?.name || 'HAIRCUT';
    setServiceForm({name: '', category: firstCat, price: '85000', duration_minutes: '45', image_url: '', description: ''});
    setServiceModalOpen(true);
  };

  const openEditService = (svc: ServiceItem) => {
    setEditingService(svc);
    setServiceForm({
      name: svc.name,
      category: svc.category,
      price: String(svc.price),
      duration_minutes: String(svc.duration_minutes),
      image_url: svc.image_url || '',
      description: svc.description || '',
    });
    setServiceModalOpen(true);
  };

  // Category handlers
  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({name: '', color: '#DCA842', sort_order: String((serviceCategories.length + 1) * 10)});
    setCatSavingError('');
    setCatModalOpen(true);
  };

  const openEditCat = (cat: ServiceCategory) => {
    setEditingCat(cat);
    setCatForm({name: cat.name, color: cat.color, sort_order: String(cat.sort_order)});
    setCatSavingError('');
    setCatModalOpen(true);
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSavingError('');
    const payload = {name: catForm.name.trim().toUpperCase(), color: catForm.color, sort_order: Number(catForm.sort_order)};
    const isEdit = Boolean(editingCat);
    const r = editingCat
      ? await fetch(`/api/service-categories/${editingCat.id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
      : await fetch('/api/service-categories', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    if (!r.ok) {
      const err = await r.json();
      setCatSavingError(err.error || 'Gagal menyimpan kategori');
      return;
    }
    const updated: ServiceCategory[] = await fetch('/api/service-categories').then((x) => x.json());
    setServiceCategories(updated);
    setCatModalOpen(false);
    showFeedback({
      type: 'success',
      title: isEdit ? 'Kategori Diperbarui' : 'Kategori Baru Ditambahkan',
      message: `Kategori layanan "${payload.name}" berhasil disimpan.`,
    });
  };

  const deleteCat = (cat: ServiceCategory) => {
    showConfirm({
      type: 'danger',
      title: 'Hapus Kategori Layanan?',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"? Pastikan tidak ada layanan aktif yang menggunakan kategori ini.`,
      confirmLabel: 'Ya, Hapus Kategori',
      onConfirm: async () => {
        const r = await fetch(`/api/service-categories/${cat.id}`, {method: 'DELETE'});
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          showFeedback({type: 'error', title: 'Gagal Menghapus Kategori', message: err.error || 'Gagal menghapus kategori'});
          return;
        }
        setServiceCategories((prev) => prev.filter((c) => c.id !== cat.id));
        showFeedback({type: 'success', title: 'Kategori Berhasil Dihapus', message: `Kategori "${cat.name}" telah dihapus.`});
      },
    });
  };

  // Transaksi void (owner bisa void semua)
  const handleVoidTrx = (trxId: string) => {
    const t = transactions.find((x) => x.id === trxId);
    showConfirm({
      type: 'danger',
      title: 'Batalkan / VOID Transaksi?',
      message: `Batalkan / VOID transaksi ${t?.invoice_no || trxId} senilai ${t ? formatRupiah(t.total_amount) : ''}?\n\nTransaksi akan dibatalkan permanen dan komisi barber disesuaikan otomatis.`,
      confirmLabel: 'Ya, VOID Transaksi',
      onConfirm: async () => {
        setTrxVoidLoading(trxId);
        try {
          const res = await fetch(`/api/transactions/${trxId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': 'owner',
            },
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showFeedback({type: 'error', title: 'Gagal VOID Transaksi', message: err.error || 'Gagal membatalkan transaksi'});
          } else {
            showFeedback({
              type: 'success',
              title: 'Transaksi Berhasil Di-VOID',
              message: `Transaksi ${t?.invoice_no || trxId} telah berhasil dibatalkan.`,
            });
          }
        } finally {
          setTrxVoidLoading(null);
        }
      },
    });
  };

  const deleteService = (svc: ServiceItem) => {
    showConfirm({
      type: 'danger',
      title: 'Hapus Layanan Barbershop?',
      message: `Apakah Anda yakin ingin menghapus layanan "${svc.name}" (${formatRupiah(svc.price)})? Layanan ini tidak akan lagi muncul di POS kasir.`,
      confirmLabel: 'Ya, Hapus Layanan',
      onConfirm: async () => {
        setServiceDeletingId(svc.id);
        try {
          const res = await fetch(`/api/services/${svc.id}`, {method: 'DELETE'});
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showFeedback({type: 'error', title: 'Gagal Menghapus Layanan', message: err.error || 'Gagal menghapus layanan'});
          } else {
            showFeedback({
              type: 'success',
              title: 'Layanan Berhasil Dihapus',
              message: `Layanan "${svc.name}" telah berhasil dihapus.`,
            });
          }
        } finally {
          setServiceDeletingId(null);
        }
      },
    });
  };

  const toggleServiceActive = async (svc: ServiceItem) => {
    const nextActive = svc.is_active === 1 ? 0 : 1;
    await fetch(`/api/services/${svc.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({is_active: nextActive}),
    });
    showFeedback({
      type: 'info',
      title: 'Status Layanan Diperbarui',
      message: `Layanan "${svc.name}" sekarang ${nextActive === 1 ? 'Aktif' : 'Nonaktif'}.`,
    });
  };

  const handleServicePhotoFile = async (file: File | null, targetServiceId?: string) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToLandscapeDataUrl(file, 720, 540);
      if (targetServiceId) {
        setUploadingServicePhotoId(targetServiceId);
        await fetch(`/api/services/${targetServiceId}/photo`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({image_url: dataUrl}),
        });
        showFeedback({type: 'success', title: 'Foto Layanan Diperbarui', message: 'Foto katalog layanan berhasil disimpan.'});
      } else {
        setServiceForm((prev) => ({...prev, image_url: dataUrl}));
      }
    } finally {
      setUploadingServicePhotoId(null);
    }
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...serviceForm,
      price: Number(serviceForm.price),
      duration_minutes: Number(serviceForm.duration_minutes),
      description: serviceForm.description || '',
    };
    const isEdit = Boolean(editingService);
    const svcName = serviceForm.name;
    const res = editingService
      ? await fetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        })
      : await fetch('/api/services', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
    setServiceModalOpen(false);
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: isEdit ? 'Layanan Berhasil Diperbarui' : 'Layanan Baru Ditambahkan',
        message: `Layanan "${svcName}" (${formatRupiah(payload.price)}) berhasil disimpan ke menu kasir.`,
      });
    } else {
      const err = await res.json().catch(() => ({}));
      showFeedback({type: 'error', title: 'Gagal Menyimpan Layanan', message: err.error || 'Terjadi kesalahan sistem.'});
    }
  };

  // Posts & Promos handlers
  const openCreatePost = () => {
    setEditingPost(null);
    setPostForm({
      title: '',
      category: 'Promo',
      content: '',
      promo_code: '',
      valid_until: '',
      image_url: '',
      is_pinned: false,
      is_published: true,
    });
    setPostModalOpen(true);
  };

  const openEditPost = (p: PostItem) => {
    setEditingPost(p);
    setPostForm({
      title: p.title,
      category: p.category,
      content: p.content,
      promo_code: p.promo_code,
      valid_until: p.valid_until,
      image_url: p.image_url,
      is_pinned: p.is_pinned === 1,
      is_published: p.is_published === 1,
    });
    setPostModalOpen(true);
  };

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(editingPost);
    const postTitle = postForm.title;
    const res = editingPost
      ? await fetch(`/api/posts/${editingPost.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(postForm),
        })
      : await fetch('/api/posts', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(postForm),
        });
    setPostModalOpen(false);
    if (res.ok) {
      showFeedback({
        type: 'success',
        title: isEdit ? 'Postingan Diperbarui' : 'Postingan Diterbitkan',
        message: `Postingan "${postTitle}" berhasil disimpan ke website publik.`,
      });
    }
  };

  const handlePostImageUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await compressImageFileToLandscapeDataUrl(file, 800, 600);
    setPostForm((prev) => ({...prev, image_url: dataUrl}));
  };

  const togglePostFlag = async (p: PostItem, field: 'is_pinned' | 'is_published') => {
    const nextVal = p[field] === 1 ? false : true;
    await fetch(`/api/posts/${p.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({[field]: nextVal}),
    });
  };

  const deletePost = (postOrId: PostItem | string) => {
    const post = typeof postOrId === 'string' ? posts.find((x) => x.id === postOrId) : postOrId;
    const title = post ? post.title : 'postingan ini';
    const id = typeof postOrId === 'string' ? postOrId : postOrId.id;
    showConfirm({
      type: 'danger',
      title: 'Hapus Postingan Promo?',
      message: `Apakah Anda yakin ingin menghapus postingan "${title}"?`,
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        const res = await fetch(`/api/posts/${id}`, {method: 'DELETE'});
        if (res.ok) {
          showFeedback({type: 'success', title: 'Postingan Dihapus', message: `Postingan "${title}" berhasil dihapus.`});
        }
      },
    });
  };

  const deleteAttendance = (att: AttendanceRecord) => {
    showConfirm({
      type: 'danger',
      title: 'Hapus Catatan Presensi?',
      message: `Apakah Anda yakin ingin menghapus catatan presensi ${att.employee_name} tanggal ${formatDateIndo(att.date)}?`,
      confirmLabel: 'Ya, Hapus Presensi',
      onConfirm: async () => {
        const res = await fetch(`/api/attendance/${att.id}`, {method: 'DELETE'});
        if (res.ok) {
          showFeedback({
            type: 'success',
            title: 'Catatan Presensi Dihapus',
            message: `Data presensi ${att.employee_name} tanggal ${formatDateIndo(att.date)} berhasil dihapus.`,
          });
        }
      },
    });
  };

  const saveVideoMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setMediaFeedback(null);
    const res = await fetch('/api/site-media', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hero_video_title: videoTitle,
        hero_video_subtitle: videoSubtitle,
      }),
    });
    if (res.ok) {
      setMediaFeedback({type: 'success', text: 'Judul & deskripsi video showcase publik diperbarui.'});
    } else {
      setMediaFeedback({type: 'error', text: 'Gagal menyimpan keterangan video.'});
    }
  };

  const handleVideoFileUpload = async (file: File | null) => {
    if (!file) return;
    setMediaFeedback(null);
    if (file.size > 14 * 1024 * 1024) {
      setMediaFeedback({type: 'error', text: 'Ukuran file video maksimal 14 MB (format MP4 / WebM).'});
      return;
    }
    setUploadingVideo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Gagal membaca file video'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/site-media/video', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({filename: file.name, data_b64: dataUrl}),
      });
      if (res.ok) {
        setMediaFeedback({type: 'success', text: 'Video showcase publik berhasil diganti dan langsung tayang autoplay.'});
      } else {
        const errJson = await res.json();
        setMediaFeedback({type: 'error', text: errJson.error || 'Gagal mengunggah video.'});
      }
    } catch {
      setMediaFeedback({type: 'error', text: 'Terjadi kesalahan saat membaca file video.'});
    } finally {
      setUploadingVideo(false);
    }
  };

  const resetDefaultVideo = async () => {
    await fetch('/api/site-media', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({hero_video_url: '/assets/cendrawasih_showcase.mp4'}),
    });
    setMediaFeedback({type: 'success', text: 'Video showcase dikembalikan ke video bawaan Cendrawasih.'});
  };

  const tabs: {id: OwnerTab; label: string; icon: React.ReactNode}[] = [
    {id: 'keuangan', label: 'Laporan & Grafik', icon: <FileSpreadsheet className="h-4 w-4" />},
    {id: 'excel', label: 'Laporan Excel', icon: <Table2 className="h-4 w-4" />},
    {id: 'konten', label: 'Video, Postingan & Promo', icon: <Megaphone className="h-4 w-4" />},
    {id: 'cabang', label: 'Cabang', icon: <Building2 className="h-4 w-4" />},
    {id: 'karyawan', label: 'Karyawan', icon: <Users className="h-4 w-4" />},
    {id: 'gaji', label: 'Gaji', icon: <Wallet className="h-4 w-4" />},
    {id: 'jadwal', label: 'Jadwal', icon: <CalendarClock className="h-4 w-4" />},
    {id: 'presensi', label: 'Presensi & Katalog', icon: <MapPin className="h-4 w-4" />},
  ];

  const monthSalaries = salaries.filter((s) => s.period_month === salaryMonth);
  const branchSchedules = schedules.filter((s) => s.branch_id === (scheduleBranchId || branches[0]?.id));
  const activeBarbers = employees.filter((e) => e.role === 'karyawan' && e.is_active === 1);

  // Derived filtered services
  const filteredServices = services.filter((svc) => {
    if (selectedServiceCat !== 'ALL' && svc.category !== selectedServiceCat) return false;
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      const matchName = svc.name.toLowerCase().includes(q);
      const matchCat = svc.category.toLowerCase().includes(q);
      const matchDesc = (svc.description || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  // Derived filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (trxBranchFilter !== 'ALL' && t.branch_id !== trxBranchFilter) return false;
    if (trxPayFilter !== 'ALL' && t.payment_method !== trxPayFilter) return false;
    if (trxDateFrom && t.created_at.slice(0, 10) < trxDateFrom) return false;
    if (trxDateTo && t.created_at.slice(0, 10) > trxDateTo) return false;
    if (trxSearch.trim()) {
      const q = trxSearch.toLowerCase();
      const matchInv = t.invoice_no.toLowerCase().includes(q);
      const matchCust = t.customer_name.toLowerCase().includes(q);
      const matchBarber = t.barber_name.toLowerCase().includes(q);
      const matchCashier = t.cashier_name.toLowerCase().includes(q);
      const matchItems = t.items.some((i) => i.service_name.toLowerCase().includes(q));
      if (!matchInv && !matchCust && !matchBarber && !matchCashier && !matchItems) return false;
    }
    return true;
  });

  const trxTotalRevenue = filteredTransactions.reduce((acc, t) => acc + t.total_amount, 0);
  const trxTotalCommission = filteredTransactions.reduce((acc, t) => acc + (t.barber_commission || 0), 0);
  const trxAvgTicket = filteredTransactions.length > 0 ? Math.round(trxTotalRevenue / filteredTransactions.length) : 0;

  return (
    <div className="space-y-6">
      {/* TAB: WEEKLY & MONTHLY EXCEL REPORT */}
      {activeTab === 'excel' && (
        <ExcelPeriodReport
          branches={branches}
          employees={employees}
          attendance={attendance}
          transactions={transactions}
        />
      )}

      {/* TAB: PUBLIC VIDEO SHOWCASE, POSTS & PROMOS */}
      {activeTab === 'konten' && (
        <div className="space-y-6">
          {mediaFeedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center justify-between gap-2 ${
                mediaFeedback.type === 'success'
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
              }`}
            >
              <span>{mediaFeedback.text}</span>
              <button
                type="button"
                onClick={() => setMediaFeedback(null)}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Section 1: Public Autoplay Video Showcase Manager */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#09090B]/10 dark:bg-[#DCA842]/15 text-[#09090B] dark:text-[#DCA842]">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                    Video Showcase Website Publik (Autoplay)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Video ini otomatis diputar berulang di halaman utama pelanggan Cendrawasih
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingVideo ? 'Mengunggah Video...' : 'Ganti Video (.mp4 / .webm)'}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    disabled={uploadingVideo}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      void handleVideoFileUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={resetDefaultVideo}
                  className="btn-tactile rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Video Bawaan
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#050507]">
                <div className="aspect-video w-full relative">
                  <video
                    key={siteMedia?.hero_video_url}
                    src={siteMedia?.hero_video_url || '/assets/cendrawasih_showcase.mp4'}
                    poster={siteMedia?.hero_video_poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <form onSubmit={saveVideoMetadata} className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Judul Teks di Atas Video
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#09090B] dark:focus:border-[#DCA842] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Keterangan Singkat Studio
                  </label>
                  <textarea
                    rows={3}
                    value={videoSubtitle}
                    onChange={(e) => setVideoSubtitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#09090B] dark:focus:border-[#DCA842] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sumber aktif: <span className="font-mono">{siteMedia?.hero_video_url}</span>
                  </span>
                  <button
                    type="submit"
                    className="btn-tactile rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
                  >
                    Simpan Keterangan Video
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section 2: Posts, Promos & Branch Announcements */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                  Postingan Terbaru, Info Promo &amp; Pengumuman
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Terbitkan info diskon, model potongan terbaru, atau pengumuman jam cabang ke website publik
                </p>
              </div>
              <button
                type="button"
                onClick={openCreatePost}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Postingan / Promo</span>
              </button>
            </div>

            {posts.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Belum ada postingan. Klik Buat Postingan / Promo untuk menambahkan info baru.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="card-tactile rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full bg-[#09090B] overflow-hidden relative">
                        {post.image_url ? (
                          <img
                            src={post.image_url}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#09090B] to-[#27272A] text-white/70">
                            <Megaphone className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold text-[#C5922E] dark:text-[#DCA842]">
                            {post.category}
                            {post.is_pinned === 1 ? ' · Disematkan' : ''}
                          </span>
                          <span>{post.is_published === 1 ? 'Tayang' : 'Draft'}</span>
                        </div>
                        <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                          {post.content}
                        </p>
                        {(post.promo_code || post.valid_until) && (
                          <p className="pt-1 font-mono text-[11px] text-[#09090B] dark:text-[#DCA842]">
                            {post.promo_code ? `Kode: ${post.promo_code}` : ''}
                            {post.promo_code && post.valid_until ? ' · ' : ''}
                            {post.valid_until ? `s/d ${formatDateIndo(post.valid_until)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-zinc-200 dark:border-zinc-700 px-4 py-2.5 bg-white dark:bg-zinc-900">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => togglePostFlag(post, 'is_pinned')}
                          className={`btn-tactile rounded-md px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                            post.is_pinned === 1
                              ? 'bg-[#C5922E]/20 text-[#9A6B10] dark:text-[#DCA842]'
                              : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                          }`}
                          title="Sematkan di urutan teratas"
                        >
                          <Pin className="inline h-3 w-3 mr-1" />
                          {post.is_pinned === 1 ? 'Dipin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePostFlag(post, 'is_published')}
                          className="btn-tactile rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        >
                          {post.is_published === 1 ? 'Sembunyikan' : 'Terbitkan'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPost(post)}
                          className="btn-tactile rounded-md p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          aria-label="Edit postingan"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="btn-tactile rounded-md p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                          aria-label="Hapus postingan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: DAILY FINANCIAL REPORT */}
      {activeTab === 'keuangan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                Laporan Keuangan Harian Ringkas
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Akurat berdasarkan transaksi kasir realtime di seluruh cabang
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#09090B] dark:focus:border-[#DCA842] focus:outline-none"
              />
              <select
                value={reportBranchId}
                onChange={(e) => setReportBranchId(e.target.value)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-[#09090B] dark:focus:border-[#DCA842] focus:outline-none"
              >
                <option value="ALL">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportDailyCsv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Omzet Kotor Harian</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#09090B] dark:text-white tabular-nums">
                {loadingReport ? '...' : formatRupiah(dailyReport?.total_revenue ?? 0)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Diskon: {formatRupiah(dailyReport?.total_discount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Pelanggan Dipangkas</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#09090B] dark:text-white tabular-nums">
                {dailyReport?.total_cuts ?? 0}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Dari {dailyReport?.total_transactions ?? 0} struk kasir
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Alokasi Komisi Barber</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#C5922E] dark:text-[#DCA842] tabular-nums">
                {formatRupiah(dailyReport?.total_barber_commission ?? 0)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Masuk otomatis ke saldo gaji</p>
            </div>
            <div className="rounded-xl bg-[#09090B] dark:bg-zinc-800 border border-[#09090B] dark:border-zinc-700 p-5 text-white">
              <p className="text-xs text-zinc-300">Pendapatan Bersih Usaha</p>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
                {formatRupiah(dailyReport?.net_barbershop_income ?? 0)}
              </p>
              <p className="mt-1 text-xs text-zinc-300">Setelah dikurangi komisi barber</p>
            </div>
          </div>

          {/* TABEL SPREADSHEET DETAIL KINERJA BARBER (FORMAT EXCEL RESMI CENDRAWASIH) */}
          <OwnerPerformanceMatrixTable
            transactions={transactions}
            employees={employees}
            initialMonth={reportDate ? reportDate.slice(0, 7) : '2026-10'}
          />

          {/* Interactive Bar Chart & Pie Chart for Owner */}
          <OwnerAnalyticsCharts
            transactions={transactions}
            branches={branches}
            selectedBranchId={reportBranchId}
            onSelectDate={(d) => setReportDate(d)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Breakdown */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Rincian Metode Pembayaran
              </h3>
              <div className="mt-3 space-y-2.5">
                {!dailyReport?.payment_breakdown.length ? (
                  <p className="py-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Belum ada transaksi pada tanggal ini.
                  </p>
                ) : (
                  dailyReport.payment_breakdown.map((p) => (
                    <div key={p.method} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {p.method} ({p.count}x)
                      </span>
                      <span className="font-mono font-bold text-[#09090B] dark:text-white tabular-nums">
                        {formatRupiah(p.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Branch Breakdown */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Omzet per Cabang
              </h3>
              <div className="mt-3 space-y-2.5">
                {!dailyReport?.branch_breakdown.length ? (
                  <p className="py-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Belum ada data cabang pada tanggal ini.
                  </p>
                ) : (
                  dailyReport.branch_breakdown.map((b) => (
                    <div key={b.branch_id} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate pr-2">
                        {b.branch_name} ({b.count})
                      </span>
                      <span className="font-mono font-bold text-[#09090B] dark:text-white tabular-nums shrink-0">
                        {formatRupiah(b.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Barber Performance Breakdown */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Produktivitas Barber Harian
              </h3>
              <div className="mt-3 space-y-2.5">
                {!dailyReport?.barber_breakdown.length ? (
                  <p className="py-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Belum ada catatan pangkas pada tanggal ini.
                  </p>
                ) : (
                  dailyReport.barber_breakdown.map((bb) => (
                    <div key={bb.barber_id} className="flex items-center justify-between text-xs py-1">
                      <div>
                        <p className="font-semibold text-[#09090B] dark:text-white">{bb.barber_name}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {bb.cuts} pelanggan · Komisi {formatRupiah(bb.commission)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#09090B] dark:text-white tabular-nums">
                        {formatRupiah(bb.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Daily Transactions Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Rincian Transaksi Kasir ({reportDate})
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Invoice</th>
                    <th className="pb-2.5 font-semibold">Jam</th>
                    <th className="pb-2.5 font-semibold">Cabang</th>
                    <th className="pb-2.5 font-semibold">Pelanggan</th>
                    <th className="pb-2.5 font-semibold">Barber</th>
                    <th className="pb-2.5 font-semibold">Layanan</th>
                    <th className="pb-2.5 font-semibold">Bayar</th>
                    <th className="pb-2.5 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {!dailyReport?.transactions.length ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                        Tidak ada transaksi tercatat pada tanggal {reportDate}.
                      </td>
                    </tr>
                  ) : (
                    dailyReport.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                        <td className="py-3 font-mono font-semibold text-[#09090B] dark:text-zinc-100">
                          {t.invoice_no}
                        </td>
                        <td className="py-3 font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {formatTimeShort(t.created_at)}
                        </td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">{t.branch_name}</td>
                        <td className="py-3 font-medium text-[#09090B] dark:text-white">{t.customer_name}</td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">{t.barber_name}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">
                          {t.items.map((i) => i.service_name).join(', ')}
                        </td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">{t.payment_method}</td>
                        <td className="py-3 text-right font-mono font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums">
                          {formatRupiah(t.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANCHES CRUD */}
      {activeTab === 'cabang' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                Manajemen Cabang Barbershop
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Atur koordinat GPS cabang, radius geofence Python &amp; jam operasional presensi
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateBranch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Cabang</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => {
              const bPhoto =
                b.photo_url ||
                (b.id === 'br-samratulangi'
                  ? '/assets/setmore/studio-storefront.jpg'
                  : '/assets/setmore/gallery-studio.jpg');
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col justify-between shadow-sm"
                >
                  <div>
                    {/* Branch Photo */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                      <img
                        src={bPhoto}
                        alt={b.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#DCA842] bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-[#DCA842]/40">
                          {b.code}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            b.is_active
                              ? 'bg-emerald-500/80 text-white'
                              : 'bg-red-500/80 text-white'
                          }`}
                        >
                          {b.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <h3 className="font-display text-sm font-bold text-white drop-shadow">
                          {b.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">{b.address}</p>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        GPS: {b.lat.toFixed(5)}, {b.lng.toFixed(5)} · Radius: {b.radius_meters}m
                      </p>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        Jam: {b.open_time} – {b.close_time} · Telp: {b.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-800/40">
                    <button
                      type="button"
                      onClick={() => openEditBranch(b)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-[#09090B] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit &amp; Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBranch(b.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES CRUD */}
      {activeTab === 'karyawan' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                Manajemen Karyawan, Kasir &amp; Barber
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kelola foto profil referensi Face Recognition, hak akses PIN, cabang, gaji pokok, dan komisi
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateEmp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Karyawan</span>
            </button>
          </div>

          {photoFeedback && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-2 ${
                photoFeedback.type === 'success'
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
              }`}
            >
              <span>{photoFeedback.text}</span>
              <button
                type="button"
                onClick={() => setPhotoFeedback(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                  <th className="pb-2.5 font-semibold">Foto &amp; Nama</th>
                  <th className="pb-2.5 font-semibold">Role</th>
                  <th className="pb-2.5 font-semibold">Cabang</th>
                  <th className="pb-2.5 font-semibold">PIN</th>
                  <th className="pb-2.5 font-semibold text-right">Gaji Pokok</th>
                  <th className="pb-2.5 font-semibold text-right">Komisi</th>
                  <th className="pb-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt={emp.name} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#09090B] dark:text-white">{emp.name}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{emp.specialty}</p>
                          <span
                            className={`text-[10px] font-semibold ${
                              emp.photo_url
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {emp.photo_url ? 'Wajah Terdaftar' : 'Belum Upload Foto'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-medium capitalize text-zinc-700 dark:text-zinc-300">
                      {emp.role === 'karyawan' ? 'Barber' : emp.role}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{emp.branch_name || 'Seluruh Cabang'}</td>
                    <td className="py-3 font-mono text-zinc-700 dark:text-zinc-200">{emp.pin}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatRupiah(emp.base_salary)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                      {emp.commission_rate}%
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <label className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-medium text-[#09090B] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                          <Upload className="h-3 w-3" />
                          <span>{uploadingPhotoId === emp.id ? '...' : 'Foto'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              void handleEmpPhotoUpload(emp, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => openEditEmp(emp)}
                          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-[#09090B] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Edit
                        </button>
                        {emp.id !== 'emp-owner' && (
                          <button
                            type="button"
                            onClick={() => deleteEmployee(emp.id)}
                            className="rounded-md border border-red-200 dark:border-red-900/60 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SALARIES MANAGEMENT & SKEMA GAJI 2026 */}
      {activeTab === 'gaji' && (() => {
        // Kalkulasi simulasi kalkulator gaji barber
        const baseSalarySim = 2000000;
        const avgCommissionSim = 21250;
        const totalCommissionSim = simCustomers * avgCommissionSim;
        let simBonus = 0;
        let simRank = 'Menuju Target 100';
        let simRankBadge = 'bg-zinc-800 text-zinc-300 border-zinc-700';

        if (simCustomers >= 300) {
          simBonus = 2500000;
          simRank = '👑 LEGEND BARBER (Level 3)';
          simRankBadge = 'bg-amber-500/20 text-[#DCA842] border-amber-500/40';
        } else if (simCustomers >= 200) {
          simBonus = 1000000;
          simRank = '⭐ BARBER SENIOR (Level 2)';
          simRankBadge = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        } else if (simCustomers >= 150) {
          simBonus = 500000;
          simRank = '🎖️ BARBER JUNIOR (Level 1)';
          simRankBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        } else if (simCustomers >= 100) {
          simBonus = 200000;
          simRank = '🎯 TARGET 100 CAPSTER';
          simRankBadge = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        }

        const simTotal = baseSalarySim + totalCommissionSim + simBonus;

        const totalNetSalaries = monthSalaries.reduce((sum, s) => sum + s.net_salary, 0);
        const totalCommissionPaid = monthSalaries.reduce((sum, s) => sum + s.commission_amount, 0);
        const totalBonusPaid = monthSalaries.reduce((sum, s) => sum + s.bonus, 0);
        const totalBasePaid = monthSalaries.reduce((sum, s) => sum + s.base_salary, 0);

        return (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
                    <Award className="h-6 w-6 text-[#C5922E] dark:text-[#DCA842]" />
                    <span>Sistem Penggajian &amp; Pembagian Komisi Skema 2026</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Aturan komisi resmi, bagi hasil per layanan, bonus target akumulasi kepala, simulasi pendapatan, dan rekap penggajian
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold"
                  />
                  <button
                    type="button"
                    onClick={recalculateSalaries}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sinkronkan Komisi Realtime</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSalarySchemeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCA842] bg-[#DCA842]/10 px-3.5 py-2 text-xs font-bold text-[#DCA842] hover:bg-[#DCA842]/20 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Brosur Skema 2026</span>
                  </button>
                </div>
              </div>

              {/* 4 Kartu Ringkasan Aturan Skema 2026 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                    <span>Gaji Pokok Tetap</span>
                    <DollarSign className="h-4 w-4 text-[#DCA842]" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-[#09090B] dark:text-white tabular-nums">
                    Rp2.000.000
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">/ bulan untuk setiap barber aktif</p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                    <span>Komisi Haircut Pangkas</span>
                    <Scissors className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-500 tabular-nums">
                    20% - 30%
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Rp14.000 - Rp45.000 per kepala</p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                    <span>Bonus Target Bulanan</span>
                    <Target className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
                    s/d Rp2.500.000
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Akumulasi 100 - 300 kepala</p>
                </div>

                <div className="rounded-xl border border-[#DCA842]/40 bg-[#DCA842]/10 p-4">
                  <div className="flex items-center justify-between text-[#DCA842] text-xs font-bold">
                    <span>Total Payroll Bulan Ini</span>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <p className="mt-1 font-mono text-xl font-extrabold text-[#DCA842] tabular-nums">
                    {formatRupiah(totalNetSalaries)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Pokok: {formatRupiah(totalBasePaid)} · Komisi: {formatRupiah(totalCommissionPaid)}
                  </p>
                </div>
              </div>
            </div>

            {/* 2 Kolom: Detail Skema Komisi & Bonus Target 2026 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Kolom Kiri: Tabel Pembagian Persentase per Layanan */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <Scissors className="h-4 w-4 text-[#DCA842]" />
                  <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase tracking-wider">
                    1. Pembagian Persentase Komisi per Layanan (2026)
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Setiap transaksi kasir otomatis memotong komisi barber sesuai jenis layanan yang dipangkas:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 text-[11px] font-sans">
                        <th className="text-left pb-2 font-semibold">Jenis Layanan</th>
                        <th className="text-center pb-2 font-semibold">Harga Jual</th>
                        <th className="text-center pb-2 font-semibold">Persentase</th>
                        <th className="text-right pb-2 font-semibold">Komisi Barber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      <tr>
                        <td className="py-2.5 font-sans font-bold text-[#09090B] dark:text-white flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5 text-[#DCA842]" />
                          <span>HAIRCUT PREMIUM</span>
                        </td>
                        <td className="text-center text-zinc-600 dark:text-zinc-300">Rp150.000</td>
                        <td className="text-center font-bold text-amber-500">30%</td>
                        <td className="text-right font-bold text-[#DCA842] tabular-nums">Rp45.000 / org</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-bold text-[#09090B] dark:text-white flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                          <span>HAIRCUT REGULER</span>
                        </td>
                        <td className="text-center text-zinc-600 dark:text-zinc-300">Rp85.000</td>
                        <td className="text-center font-bold text-amber-500">25%</td>
                        <td className="text-right font-bold text-[#DCA842] tabular-nums">Rp21.250 / org</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-bold text-[#09090B] dark:text-white flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-zinc-500" />
                          <span>HAIRCUT BASIC / SCHOOL</span>
                        </td>
                        <td className="text-center text-zinc-600 dark:text-zinc-300">Rp70.000</td>
                        <td className="text-center font-bold text-amber-500">20%</td>
                        <td className="text-right font-bold text-[#DCA842] tabular-nums">Rp14.000 / org</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans font-bold text-[#09090B] dark:text-white flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          <span>HAIR PERMING &amp; COLORING</span>
                        </td>
                        <td className="text-center text-zinc-600 dark:text-zinc-300">Rp350k - Rp550k</td>
                        <td className="text-center font-bold text-purple-400">25% - 40%</td>
                        <td className="text-right font-bold text-[#DCA842] tabular-nums">Bagi hasil paket</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kolom Kanan: 4 Jenjang Bonus Target Bulanan */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <Target className="h-4 w-4 text-[#DCA842]" />
                  <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase tracking-wider">
                    2. Bonus Target Bulanan Berjenjang
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Diberikan otomatis setiap akhir bulan berdasarkan akumulasi kepala pangkas di kasir:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs">
                        1
                      </span>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">🎯 Target 100 Pelanggan</p>
                        <p className="text-[10px] text-zinc-400">100 - 149 kepala pangkas / bulan</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-blue-500 text-sm">+Rp200.000</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-emerald-500/30">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                        2
                      </span>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">🎖️ Barber Junior (Level 1)</p>
                        <p className="text-[10px] text-zinc-400">150 - 199 kepala pangkas / bulan</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-500 text-sm">+Rp500.000</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-amber-500/30">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs">
                        3
                      </span>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">⭐ Barber Senior (Level 2)</p>
                        <p className="text-[10px] text-zinc-400">200 - 299 kepala pangkas / bulan</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-sm">+Rp1.000.000</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#DCA842]/10 border border-[#DCA842]/50 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCA842] text-zinc-950 font-extrabold text-xs">
                        👑
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-[#DCA842]">Legend Barber (Level 3)</p>
                        <p className="text-[10px] text-zinc-400">300+ kepala pangkas / bulan</p>
                      </div>
                    </div>
                    <span className="font-mono font-extrabold text-[#DCA842] text-sm">+Rp2.500.000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Kalkulator Simulasi Interaktif Pendapatan Barber */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase tracking-wider">
                    3. Kalkulator Simulasi Pendapatan Barber Live
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  Geser slider jumlah kepala untuk melihat simulasi pendapatan bersih barber
                </span>
              </div>

              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Simulasi Kepala Pangkas: <span className="font-mono text-base text-[#DCA842]">{simCustomers}</span> Orang / Bulan
                  </label>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${simRankBadge}`}>
                    {simRank}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={350}
                  step={10}
                  value={simCustomers}
                  onChange={(e) => setSimCustomers(Number(e.target.value))}
                  className="w-full accent-[#DCA842] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>50 Orang</span>
                  <span>100 (Target 100)</span>
                  <span>150 (Junior)</span>
                  <span>200 (Senior)</span>
                  <span>300 (Legend)</span>
                  <span>350+</span>
                </div>
              </div>

              {/* Rincian Hasil Simulasi */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] text-zinc-400">Gaji Pokok Tetap</p>
                  <p className="font-mono text-lg font-bold text-zinc-900 dark:text-white mt-1">
                    {formatRupiah(baseSalarySim)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] text-zinc-400">Komisi Pangkas ({simCustomers}x)</p>
                  <p className="font-mono text-lg font-bold text-emerald-500 mt-1">
                    +{formatRupiah(totalCommissionSim)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] text-zinc-400">Bonus Target Bulanan</p>
                  <p className="font-mono text-lg font-bold text-amber-400 mt-1">
                    +{formatRupiah(simBonus)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#DCA842]/50 bg-[#DCA842]/10">
                  <p className="text-[11px] font-bold text-[#DCA842]">Estimasi Gaji Bersih</p>
                  <p className="font-mono text-xl font-extrabold text-[#DCA842] mt-1">
                    {formatRupiah(simTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bagian 3: Pengaturan Persentase & Gaji Per Karyawan */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase tracking-wider">
                    4. Pengaturan Skema Gaji &amp; Persentase Komisi Setiap Karyawan
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  Klik &quot;Edit Skema&quot; untuk mengubah gaji pokok atau persentase komisi per individu
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-2.5 px-3">Karyawan</th>
                      <th className="py-2.5 px-3">Role &amp; Cabang</th>
                      <th className="py-2.5 px-3 text-right">Gaji Pokok</th>
                      <th className="py-2.5 px-3 text-center">Komisi Khusus</th>
                      <th className="py-2.5 px-3 text-center">Pangkas Bulan Ini</th>
                      <th className="py-2.5 px-3 text-center">Jenjang Karir</th>
                      <th className="py-2.5 px-3 text-right">Aksi Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {employees.filter((e) => e.is_active === 1 && e.role !== 'owner').map((emp) => {
                      const empSal = monthSalaries.find((s) => s.employee_id === emp.id);
                      const totalCuts = empSal?.total_cuts || 0;
                      let rankBadge = 'Target 100';
                      if (totalCuts >= 300) rankBadge = '👑 Legend (Lvl 3)';
                      else if (totalCuts >= 200) rankBadge = '⭐ Senior (Lvl 2)';
                      else if (totalCuts >= 150) rankBadge = '🎖️ Junior (Lvl 1)';
                      else if (totalCuts >= 100) rankBadge = '🎯 Target 100';
                      else rankBadge = 'Capster';

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              {emp.photo_url ? (
                                <img src={emp.photo_url} alt={emp.name} className="h-8 w-8 rounded-lg object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                  <User className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-zinc-900 dark:text-white">{emp.name}</p>
                                <p className="text-[10px] text-zinc-400">{emp.specialty || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-[#DCA842]">
                              {emp.role}
                            </span>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{emp.branch_name || 'Semua Cabang'}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {formatRupiah(emp.base_salary || 2000000)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-500">
                            {emp.commission_rate}%
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#DCA842]">
                            {totalCuts}x
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {rankBadge}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEditEmp(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#DCA842] text-[11px] font-bold text-zinc-800 dark:text-zinc-200 hover:text-[#DCA842] cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit Skema</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bagian 4: Rekapitulasi Gaji Bulanan Realtime */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <h3 className="font-bold text-sm text-[#09090B] dark:text-white uppercase tracking-wider">
                    5. Rekapitulasi Gaji Bulanan Realtime ({salaryMonth})
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  Rumus: Gaji Bersih = Pokok + Komisi + Bonus - Potongan
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold">
                      <th className="py-2.5 px-3">Karyawan</th>
                      <th className="py-2.5 px-3 text-right">Pangkas</th>
                      <th className="py-2.5 px-3 text-right">Gaji Pokok</th>
                      <th className="py-2.5 px-3 text-right">Komisi Kasir</th>
                      <th className="py-2.5 px-3 text-right">Bonus Target</th>
                      <th className="py-2.5 px-3 text-right">Potongan</th>
                      <th className="py-2.5 px-3 text-right">Gaji Bersih</th>
                      <th className="py-2.5 px-3 text-right">Status &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {monthSalaries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                          Klik &quot;Sinkronkan Komisi Realtime&quot; untuk membuat rekap gaji bulan {salaryMonth}.
                        </td>
                      </tr>
                    ) : (
                      monthSalaries.map((sal) => (
                        <tr key={sal.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                          <td className="py-3 px-3">
                            <p className="font-semibold text-[#09090B] dark:text-white">{sal.employee_name}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {sal.role} · {sal.branch_name}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                            {sal.total_cuts}x
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatRupiah(sal.base_salary)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 tabular-nums font-bold">
                            +{formatRupiah(sal.commission_amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-500 font-bold">
                            +{formatRupiah(sal.bonus)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-red-600 dark:text-red-400 tabular-nums">
                            -{formatRupiah(sal.deduction)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums text-sm">
                            {formatRupiah(sal.net_salary)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSalary(sal);
                                  setSalaryAdjust({
                                    bonus: String(sal.bonus),
                                    deduction: String(sal.deduction),
                                    notes: sal.notes,
                                  });
                                }}
                                className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-[#09090B] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                Atur
                              </button>
                              <button
                                type="button"
                                onClick={() => markSalaryPaid(sal)}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                                  sal.status === 'Dibayar'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-[#09090B] dark:bg-[#C5922E] text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842]'
                                }`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{sal.status === 'Dibayar' ? 'Lunas' : 'Bayar'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: OPERATIONAL SCHEDULE */}
      {activeTab === 'jadwal' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                Pengaturan Jadwal Operasional Cabang
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Perubahan jadwal langsung berlaku di pemesanan online &amp; validasi jam presensi Python
              </p>
            </div>
            <select
              value={scheduleBranchId || branches[0]?.id || ''}
              onChange={(e) => setScheduleBranchId(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-[#09090B] dark:text-zinc-100"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {branchSchedules.map((sch) => (
              <div
                key={sch.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-24">
                    <p className="font-display text-sm font-bold text-[#09090B] dark:text-white">{sch.day_name}</p>
                    <button
                      type="button"
                      onClick={() => updateSchedule(sch, {is_open: sch.is_open ? 0 : 1})}
                      className={`btn-tactile mt-1 text-xs font-semibold cursor-pointer ${
                        sch.is_open ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {sch.is_open ? 'Status: Buka' : 'Status: Tutup'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={sch.open_time}
                      onChange={(e) => updateSchedule(sch, {open_time: e.target.value})}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                    />
                    <span className="text-xs text-zinc-400">s/d</span>
                    <input
                      type="time"
                      value={sch.close_time}
                      onChange={(e) => updateSchedule(sch, {close_time: e.target.value})}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <input
                    type="text"
                    defaultValue={sch.shift_notes}
                    onBlur={(e) => {
                      if (e.target.value !== sch.shift_notes) {
                        updateSchedule(sch, {shift_notes: e.target.value});
                      }
                    }}
                    placeholder="Catatan shift..."
                    className="w-56 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
                    Barber Shift:
                  </span>
                  {activeBarbers.map((barber) => {
                    const assigned = sch.assigned_barber_ids.includes(barber.id);
                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => {
                          const nextIds = assigned
                            ? sch.assigned_barber_ids.filter((id) => id !== barber.id)
                            : [...sch.assigned_barber_ids, barber.id];
                          updateSchedule(sch, {assigned_barber_ids: nextIds});
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                          assigned
                            ? 'bg-[#09090B] dark:bg-[#C5922E] text-white dark:text-zinc-950'
                            : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {barber.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ATTENDANCE LOG + SERVICES CATALOG CRUD */}
      {activeTab === 'presensi' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <span>Monitoring Presensi Python (GPS Radius, Jam Operasional &amp; Face Recognition)</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Log absensi tervalidasi 3 gerbang: Geofence Haversine, Jadwal Buka-Tutup, dan Kemiripan Wajah
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2.5 font-semibold">Tanggal</th>
                    <th className="pb-2.5 font-semibold">Karyawan</th>
                    <th className="pb-2.5 font-semibold">Cabang</th>
                    <th className="pb-2.5 font-semibold">Masuk / Pulang</th>
                    <th className="pb-2.5 font-semibold">Jarak Radius</th>
                    <th className="pb-2.5 font-semibold">Face Match</th>
                    <th className="pb-2.5 font-semibold">Jam Ops</th>
                    <th className="pb-2.5 font-semibold">Engine</th>
                    <th className="pb-2.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                      <td className="py-2.5 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">{att.date}</td>
                      <td className="py-2.5 font-semibold text-[#09090B] dark:text-white">{att.employee_name}</td>
                      <td className="py-2.5 text-zinc-600 dark:text-zinc-300">{att.branch_name}</td>
                      <td className="py-2.5 font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                        {att.check_in_time || '-'} / {att.check_out_time || '-'}
                      </td>
                      <td className="py-2.5 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                        {att.distance_meters} m
                      </td>
                      <td className="py-2.5 font-mono tabular-nums">
                        {att.face_similarity != null ? (
                          <span
                            className={`font-semibold ${
                              att.face_verified ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {Number(att.face_similarity).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                        {att.operational_status || att.status}
                      </td>
                      <td className="py-2.5 text-zinc-500 dark:text-zinc-400">{att.verified_by}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => deleteAttendance(att)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DAFTAR LAYANAN & HARGA RESMI (DYNAMIC CATEGORIES & CRUD) */}
      {activeTab === 'layanan' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <span>Katalog Layanan &amp; Tarif Resmi Studio</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Kelola daftar harga resmi, kategori dinamis, foto potongan, dan durasi pangkas di seluruh cabang
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateCat}
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#DCA842]/40 bg-[#DCA842]/10 px-3.5 py-2 text-xs font-semibold text-[#DCA842] hover:bg-[#DCA842]/20 cursor-pointer"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>+ Kategori Baru</span>
                </button>
                <button
                  type="button"
                  onClick={openCreateService}
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Tambah Layanan</span>
                </button>
              </div>
            </div>

            {/* Kategori Dinamis Selector & Quick Manage */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Filter Kategori ({serviceCategories.length} kategori aktif):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedServiceCat('ALL')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedServiceCat === 'ALL'
                      ? 'bg-[#09090B] dark:bg-[#C5922E] text-white dark:text-zinc-950 font-bold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span>Semua</span>
                  <span className="rounded-full bg-black/20 dark:bg-black/30 px-1.5 py-0.2 text-[10px]">
                    {services.length}
                  </span>
                </button>

                {serviceCategories.map((cat) => {
                  const count = services.filter((s) => s.category === cat.name).length;
                  const isSelected = selectedServiceCat === cat.name;
                  return (
                    <div
                      key={cat.id}
                      className={`group inline-flex items-center rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-[#DCA842] bg-[#DCA842]/15 text-[#DCA842]'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedServiceCat(cat.name)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{backgroundColor: cat.color || '#DCA842'}}
                        />
                        <span>{cat.name}</span>
                        <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 text-[10px] font-mono">
                          {count}
                        </span>
                      </button>
                      <div className="flex items-center pr-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditCat(cat)}
                          title="Edit nama/warna kategori"
                          className="p-1 hover:text-white"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCat(cat)}
                          title="Hapus kategori"
                          className="p-1 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pencarian Layanan */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari nama layanan, deskripsi, harga..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Menampilkan {filteredServices.length} dari {services.length} Layanan
              </div>
            </div>

            {/* Grid Kartu Layanan */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  <Scissors className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-semibold">Tidak ada layanan yang sesuai filter</p>
                  <p className="text-xs text-zinc-400 mt-1">Coba ubah kata kunci pencarian atau kategori</p>
                </div>
              ) : (
                filteredServices.map((svc) => (
                  <div
                    key={svc.id}
                    className={`card-tactile rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                      svc.is_active === 1
                        ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'
                        : 'border-zinc-300 dark:border-zinc-800/40 bg-zinc-100/60 dark:bg-zinc-900/40 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[#09090B] flex items-center justify-center relative group">
                          {svc.image_url ? (
                            <img
                              src={svc.image_url}
                              alt={svc.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Scissors className="h-6 w-6 text-[#DCA842]" />
                          )}
                          <label
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                            title="Ganti foto"
                          >
                            <ImagePlus className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                void handleServicePhotoFile(f, svc.id);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-[#DCA842] border border-[#DCA842]/30">
                              {svc.category}
                            </span>
                            {svc.is_active === 0 && (
                              <span className="text-[10px] text-red-400 font-semibold">(Nonaktif)</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-[#09090B] dark:text-white mt-1 leading-tight truncate">
                            {svc.name}
                          </p>
                          <p className="font-mono text-base font-extrabold text-[#09090B] dark:text-[#DCA842] mt-1 tabular-nums">
                            {formatRupiah(svc.price)}
                          </p>
                        </div>
                      </div>

                      {svc.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                          {svc.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        ⏱ {svc.duration_minutes} menit
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleServiceActive(svc)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                            svc.is_active === 1
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                          title="Klik untuk ubah status aktif/nonaktif"
                        >
                          {svc.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditService(svc)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Edit Layanan"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteService(svc)}
                          disabled={serviceDeletingId === svc.id}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus Layanan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TRANSAKSI SEMUA CABANG (FILTER MULTI-KRITERIA & KONTROL VOID OWNER) */}
      {activeTab === 'transaksi' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
                  <span>Transaksi Kasir Semua Cabang</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Data transaksi realtime seluruh cabang kasir dengan filter multi-kriteria dan kontrol void resmi Owner
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#DCA842] bg-[#DCA842]/10 border border-[#DCA842]/30 px-3 py-1.5 rounded-xl font-bold">
                  Total Tercatat: {transactions.length} Struk
                </span>
              </div>
            </div>

            {/* Filter Multi-Kriteria Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {/* 1. Search Query */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Pencarian Invoice / Orang / Layanan
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="No. Invoice, Pelanggan, Barber, Kasir..."
                    value={trxSearch}
                    onChange={(e) => setTrxSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Filter Cabang */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Cabang Outlet
                </label>
                <select
                  value={trxBranchFilter}
                  onChange={(e) => setTrxBranchFilter(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="ALL">Semua Cabang ({transactions.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Filter Metode Bayar */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={trxPayFilter}
                  onChange={(e) => setTrxPayFilter(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="ALL">Semua Metode</option>
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Kartu Debit">Kartu Debit / EDC</option>
                </select>
              </div>

              {/* 4. Filter Rentang Tanggal */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Filter Tanggal
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={trxDateFrom}
                    onChange={(e) => setTrxDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-[11px] text-zinc-900 dark:text-zinc-100"
                    title="Dari Tanggal"
                  />
                  {(trxSearch || trxBranchFilter !== 'ALL' || trxPayFilter !== 'ALL' || trxDateFrom || trxDateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrxSearch('');
                        setTrxBranchFilter('ALL');
                        setTrxPayFilter('ALL');
                        setTrxDateFrom('');
                        setTrxDateTo('');
                      }}
                      className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-white"
                      title="Reset Filter"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Metrik Ringkas Transaksi Terfilter */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Total Omzet Terfilter</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#09090B] dark:text-white tabular-nums">
                  {formatRupiah(trxTotalRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Jumlah Struk Terfilter</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#09090B] dark:text-white tabular-nums">
                  {filteredTransactions.length}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Rata-rata per Struk</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#C5922E] dark:text-[#DCA842] tabular-nums">
                  {formatRupiah(trxAvgTicket)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Alokasi Komisi Barber</p>
                <p className="mt-1 font-mono text-xl font-bold text-emerald-500 tabular-nums">
                  {formatRupiah(trxTotalCommission)}
                </p>
              </div>
            </div>

            {/* Tabel Transaksi */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-3 px-3">Invoice</th>
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3">Cabang</th>
                    <th className="py-3 px-3">Pelanggan</th>
                    <th className="py-3 px-3">Barber</th>
                    <th className="py-3 px-3">Kasir</th>
                    <th className="py-3 px-3">Layanan / Item</th>
                    <th className="py-3 px-3">Metode</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-right">Komisi</th>
                    <th className="py-3 px-3 text-center">Aksi Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                        Tidak ada transaksi yang cocok dengan kriteria filter di atas.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-white">
                          {trx.invoice_no}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                          {trx.created_at.slice(0, 10)} {formatTimeShort(trx.created_at)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 whitespace-nowrap">
                            {trx.branch_name}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-zinc-900 dark:text-white">{trx.customer_name}</p>
                          {trx.customer_phone && (
                            <p className="text-[10px] text-zinc-400 font-mono">{trx.customer_phone}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                          {trx.barber_name}
                        </td>
                        <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">
                          {trx.cashier_name}
                        </td>
                        <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 max-w-xs">
                          {trx.items.map((i) => i.service_name).join(', ')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              trx.payment_method === 'Tunai'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : trx.payment_method === 'QRIS'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {trx.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-[#DCA842] tabular-nums whitespace-nowrap">
                          {formatRupiah(trx.total_amount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                          {formatRupiah(trx.barber_commission || 0)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleVoidTrx(trx.id)}
                            disabled={trxVoidLoading === trx.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/30 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                            title="Batalkan (Void) Transaksi ini"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{trxVoidLoading === trx.id ? 'Void...' : 'Void'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BRANCH FORM */}
      {branchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={saveBranch}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                {editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Cabang
                </label>
                <input
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Kode</label>
                <input
                  required
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({...branchForm, code: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Alamat Lengkap
              </label>
              <input
                required
                value={branchForm.address}
                onChange={(e) => setBranchForm({...branchForm, address: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Telepon</label>
                <input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Jam Buka</label>
                <input
                  type="time"
                  value={branchForm.open_time}
                  onChange={(e) => setBranchForm({...branchForm, open_time: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Jam Tutup
                </label>
                <input
                  type="time"
                  value={branchForm.close_time}
                  onChange={(e) => setBranchForm({...branchForm, close_time: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={branchForm.lat}
                  onChange={(e) => setBranchForm({...branchForm, lat: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={branchForm.lng}
                  onChange={(e) => setBranchForm({...branchForm, lng: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Radius (m)
                </label>
                <input
                  type="number"
                  value={branchForm.radius_meters}
                  onChange={(e) => setBranchForm({...branchForm, radius_meters: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            {/* Foto Cabang */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Foto Profil Cabang Barbershop (URL / Preset)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={branchForm.photo_url}
                  onChange={(e) => setBranchForm({...branchForm, photo_url: e.target.value})}
                  placeholder="/assets/setmore/studio-storefront.jpg"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                />
                {branchForm.photo_url && (
                  <img
                    src={branchForm.photo_url}
                    alt="Preview"
                    className="h-9 w-14 rounded object-cover border border-zinc-300 dark:border-zinc-700 shrink-0"
                  />
                )}
              </div>
              {/* Preset buttons */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  {label: 'Tampak Depan (Storefront)', url: '/assets/setmore/studio-storefront.jpg'},
                  {label: 'Studio Interior Oyehe', url: '/assets/setmore/studio-interior.jpg'},
                  {label: 'Galeri Studio Modern', url: '/assets/setmore/gallery-studio.jpg'},
                  {label: 'Area Cuci Rambut', url: '/assets/setmore/studio-wash.jpg'},
                  {label: 'Tim Barber Cenderawasih', url: '/assets/setmore/studio-team.jpg'},
                ].map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setBranchForm({...branchForm, photo_url: preset.url})}
                    className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBranchModalOpen(false)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Cabang
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EMPLOYEE FORM */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={saveEmployee}
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                {editingEmp ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={closeEmpModal}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* SEKSI PENDAFTARAN WAJAH KARYAWAN OLEH OWNER */}
            <div className="rounded-2xl border-2 border-dashed border-[#DCA842]/40 bg-zinc-50/90 dark:bg-zinc-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#DCA842] to-[#C5922E] flex items-center justify-center text-zinc-950 font-bold shadow-sm">
                    <ScanFace className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#09090B] dark:text-white flex items-center gap-1.5">
                      <span>Pendaftaran Wajah Face Recognition</span>
                      <span className="text-[10px] text-[#DCA842] font-semibold bg-[#DCA842]/10 px-2 py-0.2 rounded-full border border-[#DCA842]/20">
                        Acuan Presensi
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Buka kamera untuk memfoto wajah/swafoto karyawan langsung di barbershop
                    </p>
                  </div>
                </div>

                {empForm.photo_url ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    <Check className="h-3 w-3 stroke-[3]" /> Wajah Terdaftar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" /> Belum Ada Foto
                  </span>
                )}
              </div>

              {/* TAMPILAN VIEWPORT KAMERA SAAT AKTIF */}
              {empCameraActive ? (
                <div className="space-y-3 pt-1">
                  <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-zinc-950 border-2 border-[#DCA842] shadow-2xl">
                    <video
                      ref={empVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`h-full w-full object-cover ${empCameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    {/* Frame Target Oval & HUD */}
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute top-3 left-3 h-7 w-7 border-t-2 border-l-2 border-[#DCA842] rounded-tl-lg" />
                      <div className="absolute top-3 right-3 h-7 w-7 border-t-2 border-r-2 border-[#DCA842] rounded-tr-lg" />
                      <div className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-[#DCA842] rounded-bl-lg" />
                      <div className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-[#DCA842] rounded-br-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-44 w-34 rounded-[50%] border-2 border-dashed border-[#DCA842] shadow-[0_0_20px_rgba(220,168,66,0.35)]" />
                      </div>
                      <div className="absolute bottom-4 inset-x-0 text-center">
                        <span className="text-[10px] font-bold text-[#DCA842] bg-black/80 px-3 py-1 rounded-full backdrop-blur-xs">
                          Posisikan Wajah Karyawan di Sini
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kontrol Kamera: Jepret, Putar Kamera, Batal */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleSnapEmpPhoto}
                      className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 cursor-pointer animate-pulse"
                    >
                      <Camera className="h-4 w-4" />
                      <span>⚡ Jepret Foto Wajah Karyawan</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleEmpCameraFacing}
                      className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                      title="Ganti Kamera Depan / Belakang"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-[#DCA842]" />
                      <span>{empCameraFacing === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopEmpCamera}
                      className="btn-tactile inline-flex items-center gap-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Tutup</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* PREVIEW FOTO + TOMBOL BUKA KAMERA */
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  {/* Avatar / Foto Preview */}
                  <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-900 shrink-0 shadow-inner flex items-center justify-center">
                    {empForm.photo_url ? (
                      <img
                        src={empForm.photo_url}
                        alt="Foto Referensi Wajah"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-zinc-400">
                        <User className="h-10 w-10 mx-auto opacity-50" />
                        <span className="text-[9px] block mt-1">Belum Ada</span>
                      </div>
                    )}
                    {empForm.photo_url && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center py-0.5 text-[8px] text-emerald-300 font-bold backdrop-blur-xs">
                        Aktif
                      </div>
                    )}
                  </div>

                  {/* Keterangan & Tombol Aksi */}
                  <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                      {empForm.photo_url
                        ? '✅ Foto wajah telah terdaftar. Wajah ini akan dicocokkan otomatis oleh AI saat karyawan melakukan presensi harian.'
                        : '⚠️ Belum ada foto referensi wajah. Buka kamera untuk mengambil foto langsung pada karyawan saat ini.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => void startEmpCamera()}
                        disabled={empCameraLoading}
                        className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C5922E] to-[#DCA842] px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-[#DCA842]/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="h-4 w-4" />
                        <span>{empCameraLoading ? 'Menghubungkan...' : '📸 Buka Kamera (Ambil Foto Karyawan)'}</span>
                      </button>

                      <label className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer">
                        <Upload className="h-3.5 w-3.5 text-[#C5922E]" />
                        <span>Unggah File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await compressImageFileToSquareDataUrl(file, 320);
                              setEmpForm((prev) => ({...prev, photo_url: dataUrl}));
                              if (editingEmp) {
                                setEditingEmp({...editingEmp, photo_url: dataUrl});
                              }
                              setPhotoFeedback({type: 'success', text: 'Foto profil wajah berhasil diunggah.'});
                            } catch {
                              setPhotoFeedback({type: 'error', text: 'Gagal memproses file foto.'});
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {empForm.photo_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setEmpForm((prev) => ({...prev, photo_url: ''}));
                            if (editingEmp) {
                              setEditingEmp({...editingEmp, photo_url: ''});
                            }
                          }}
                          className="btn-tactile inline-flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {empCameraError && (
                <div className="rounded-xl border border-rose-300 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{empCameraError}</span>
                </div>
              )}

              {photoFeedback && (
                <div className={`rounded-xl p-2.5 text-xs font-medium flex items-center gap-2 ${
                  photoFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  {photoFeedback.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{photoFeedback.text}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  value={empForm.name}
                  onChange={(e) => setEmpForm({...empForm, name: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Peran / Role
                </label>
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({...empForm, role: e.target.value as Employee['role']})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="karyawan">Barber / Karyawan</option>
                  <option value="kasir">Kasir</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Cabang Penempatan
                </label>
                <select
                  value={empForm.branch_id}
                  onChange={(e) => setEmpForm({...empForm, branch_id: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  PIN Login
                </label>
                <input
                  required
                  value={empForm.pin}
                  onChange={(e) => setEmpForm({...empForm, pin: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Spesialisasi
                </label>
                <input
                  value={empForm.specialty}
                  onChange={(e) => setEmpForm({...empForm, specialty: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  No. Telepon
                </label>
                <input
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({...empForm, phone: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            {/* Preset Skema Gaji 2026 */}
            <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#DCA842] uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  <span>Preset Skema Gaji 2026:</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEmpForm({...empForm, base_salary: '2000000', commission_rate: '25'})}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#DCA842] bg-white dark:bg-zinc-900 text-[11px] font-medium text-left hover:text-[#DCA842] transition-colors"
                >
                  <p className="font-bold">⭐ Standar 2026</p>
                  <p className="text-[10px] text-zinc-400">Rp2.000.000 + 25%</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEmpForm({...empForm, base_salary: '2000000', commission_rate: '35'})}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#DCA842] bg-white dark:bg-zinc-900 text-[11px] font-medium text-left hover:text-[#DCA842] transition-colors"
                >
                  <p className="font-bold">👑 Barber Senior</p>
                  <p className="text-[10px] text-zinc-400">Rp2.000.000 + 35%</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEmpForm({...empForm, base_salary: '2000000', commission_rate: '20'})}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#DCA842] bg-white dark:bg-zinc-900 text-[11px] font-medium text-left hover:text-[#DCA842] transition-colors"
                >
                  <p className="font-bold">🎖️ Barber Junior</p>
                  <p className="text-[10px] text-zinc-400">Rp2.000.000 + 20%</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEmpForm({...empForm, base_salary: '2500000', commission_rate: '0', role: 'kasir'})}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#DCA842] bg-white dark:bg-zinc-900 text-[11px] font-medium text-left hover:text-[#DCA842] transition-colors"
                >
                  <p className="font-bold">💼 Kasir Outlet</p>
                  <p className="text-[10px] text-zinc-400">Rp2.500.000 (0% Komisi)</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Gaji Pokok (Rp)
                </label>
                <input
                  type="number"
                  value={empForm.base_salary}
                  onChange={(e) => setEmpForm({...empForm, base_salary: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Komisi Tambahan (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={empForm.commission_rate}
                  onChange={(e) => setEmpForm({...empForm, commission_rate: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              💡 <strong>Aturan Skema 2026:</strong> Komisi Haircut pangkas reguler otomatis terhitung dari POS: Premium (30% = Rp45rb), Reguler (25% = Rp21.250), School (20% = Rp14rb). Bonus target akumulasi kepala (100–300 pelanggan) bertambah otomatis di akhir bulan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEmpModal}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Karyawan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SALARY ADJUSTMENT */}
      {editingSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={saveSalaryAdjustment}
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                Atur Gaji · {editingSalary.employee_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSalary(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Bonus (Rp)
                </label>
                <input
                  type="number"
                  value={salaryAdjust.bonus}
                  onChange={(e) => setSalaryAdjust({...salaryAdjust, bonus: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Potongan (Rp)
                </label>
                <input
                  type="number"
                  value={salaryAdjust.deduction}
                  onChange={(e) => setSalaryAdjust({...salaryAdjust, deduction: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Catatan</label>
              <input
                value={salaryAdjust.notes}
                onChange={(e) => setSalaryAdjust({...salaryAdjust, notes: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSalary(null)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SERVICE FORM */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={saveService}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                {editingService ? 'Edit Layanan & Foto Potongan' : 'Tambah Layanan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
              <div className="flex items-center gap-3">
                <div className="h-14 w-18 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#09090B] flex items-center justify-center">
                  {serviceForm.image_url ? (
                    <img
                      src={serviceForm.image_url}
                      alt="Contoh potongan"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Scissors className="h-5 w-5 text-[#DCA842]" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#09090B] dark:text-white">Foto Contoh Potongan</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Tampil di Daftar Layanan Resmi
                  </p>
                </div>
              </div>
              <label className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer">
                <ImagePlus className="h-3.5 w-3.5" />
                <span>Unggah</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    void handleServicePhotoFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nama Layanan
              </label>
              <input
                required
                value={serviceForm.name}
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Kategori</label>
              <select
                value={serviceForm.category}
                onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              >
                {serviceCategories.length > 0
                  ? serviceCategories.filter((c) => c.is_active === 1).map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  : ['HAIRCUT', 'HAIR PERMING', 'HAIR COLOR', 'STYLING'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                }
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  required
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Durasi (menit)
                </label>
                <input
                  type="number"
                  required
                  value={serviceForm.duration_minutes}
                  onChange={(e) => setServiceForm({...serviceForm, duration_minutes: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Deskripsi / Keterangan (Opsional)
              </label>
              <textarea
                rows={2}
                value={serviceForm.description}
                onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                placeholder="Contoh: Potongan rambut presisi dengan keramas dan hot towel"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="btn-tactile rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-tactile rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Layanan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CATEGORY FORM */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={saveCat}
            className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                {editingCat ? 'Edit Kategori Layanan' : 'Tambah Kategori Layanan'}
              </h3>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {catSavingError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-500">
                {catSavingError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nama Kategori (Huruf Besar)
              </label>
              <input
                required
                value={catForm.name}
                onChange={(e) => setCatForm({...catForm, name: e.target.value.toUpperCase()})}
                placeholder="Contoh: TREATMENT, SHAVING, PRODUK"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm uppercase text-zinc-900 dark:text-zinc-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Warna Tag
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm({...catForm, color: e.target.value})}
                  className="h-9 w-12 rounded cursor-pointer border border-zinc-300 dark:border-zinc-700 bg-transparent p-1"
                />
                <input
                  type="text"
                  value={catForm.color}
                  onChange={(e) => setCatForm({...catForm, color: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['#DCA842', '#7C3AED', '#DC2626', '#059669', '#2563EB', '#EA580C', '#EC4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatForm({...catForm, color: c})}
                    className="h-5 w-5 rounded-full border border-white/20 transition-transform hover:scale-110"
                    style={{backgroundColor: c}}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Urutan Tampilan
              </label>
              <input
                type="number"
                value={catForm.sort_order}
                onChange={(e) => setCatForm({...catForm, sort_order: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="btn-tactile rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-tactile rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Kategori
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: POST / PROMO FORM */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={savePost}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                {editingPost ? 'Edit Postingan / Info Promo' : 'Buat Postingan / Promo Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
              <div className="flex items-center gap-3">
                <div className="h-14 w-20 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#09090B] flex items-center justify-center">
                  {postForm.image_url ? (
                    <img
                      src={postForm.image_url}
                      alt="Gambar postingan"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Megaphone className="h-5 w-5 text-[#DCA842]" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#09090B] dark:text-white">Foto Banner Postingan</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Rasio 4:3 disarankan</p>
                </div>
              </div>
              <label className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Pilih Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    void handlePostImageUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Judul Postingan
                </label>
                <input
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                  placeholder="Contoh: Promo Akhir Pekan Diskon 20%"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Kategori</label>
                <select
                  value={postForm.category}
                  onChange={(e) => setPostForm({...postForm, category: e.target.value as PostItem['category']})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="Promo">Promo</option>
                  <option value="Gaya Rambut">Gaya Rambut</option>
                  <option value="Info Cabang">Info Cabang</option>
                  <option value="Pengumuman">Pengumuman</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Isi Informasi / Syarat Promo
              </label>
              <textarea
                required
                rows={3}
                value={postForm.content}
                onChange={(e) => setPostForm({...postForm, content: e.target.value})}
                placeholder="Tuliskan detail promo, jadwal khusus, atau pengumuman terbaru..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Kode Promo (Opsional)
                </label>
                <input
                  value={postForm.promo_code}
                  onChange={(e) => setPostForm({...postForm, promo_code: e.target.value.toUpperCase()})}
                  placeholder="Contoh: CENDRA20"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm uppercase text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Berlaku Sampai
                </label>
                <input
                  type="date"
                  value={postForm.valid_until}
                  onChange={(e) => setPostForm({...postForm, valid_until: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-700 dark:text-zinc-300">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postForm.is_pinned}
                  onChange={(e) => setPostForm({...postForm, is_pinned: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-[#09090B]"
                />
                <span>Sematkan paling atas (Pin)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={postForm.is_published}
                  onChange={(e) => setPostForm({...postForm, is_published: e.target.checked})}
                  className="h-4 w-4 rounded border-zinc-300 text-[#09090B]"
                />
                <span>Langsung terbitkan ke website publik</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                className="btn-tactile rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-tactile rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer"
              >
                Simpan Postingan
              </button>
            </div>
          </form>
        </div>
      )}

      <BarberSalarySchemeModal
        isOpen={isSalarySchemeModalOpen}
        onClose={() => setIsSalarySchemeModalOpen(false)}
      />

      {/* MODAL KONFIRMASI TINDAKAN (HAPUS, VOID, DLL) */}
      <ActionConfirmModal
        isOpen={confirmConfig.isOpen}
        type={confirmConfig.type}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({...prev, isOpen: false}))}
        loading={actionLoading}
      />

      {/* MODAL FEEDBACK HASIL AKSI (SUKSES, ERROR, INFO) */}
      <ActionFeedbackModal
        isOpen={feedbackConfig.isOpen}
        type={feedbackConfig.type}
        title={feedbackConfig.title}
        message={feedbackConfig.message}
        autoCloseMs={feedbackConfig.autoCloseMs}
        onClose={() => setFeedbackConfig((prev) => ({...prev, isOpen: false}))}
      />
    </div>
  );
};
