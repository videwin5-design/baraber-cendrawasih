export type UserRole = 'owner' | 'kasir' | 'karyawan' | 'pelanggan';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  radius_meters: number;
  open_time: string;
  close_time: string;
  is_active: number;
  created_at: string;
  photo_url?: string;
  gallery_urls?: string[];
}

export interface Employee {
  id: string;
  name: string;
  role: 'owner' | 'kasir' | 'karyawan';
  specialty: string;
  phone: string;
  pin: string;
  branch_id: string | null;
  branch_name?: string;
  base_salary: number;
  commission_rate: number;
  is_active: number;
  joined_at: string;
  photo_url?: string | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string; // Dinamis — diatur Owner dari DB (tidak lagi hardcode)
  price: number;
  duration_minutes: number;
  is_active: number;
  image_url?: string | null;
  description?: string | null;
}

export interface PostItem {
  id: string;
  title: string;
  category: 'Promo' | 'Gaya Rambut' | 'Info Cabang' | 'Pengumuman';
  content: string;
  promo_code: string;
  valid_until: string;
  image_url: string;
  is_pinned: number;
  is_published: number;
  created_at: string;
}

export interface SiteMedia {
  hero_video_url: string;
  hero_video_title: string;
  hero_video_subtitle: string;
  hero_video_poster: string;
  // Tata Letak Tampilan Card vs List
  services_layout?: 'card' | 'list';
  barbers_layout?: 'card' | 'list';
  posts_layout?: 'card' | 'list';
  // Konten Teks & Judul Dinamis
  about_title?: string;
  about_description?: string;
  services_title?: string;
  services_subtitle?: string;
  barbers_title?: string;
  barbers_subtitle?: string;
  posts_title?: string;
  posts_subtitle?: string;
  // Toggle Visibilitas Section
  show_about?: boolean;
  show_barbers?: boolean;
  show_services?: boolean;
  show_promo?: boolean;
  show_lokasi?: boolean;
  show_medsos?: boolean;
}

export interface OperationalSchedule {
  id: string;
  branch_id: string;
  day_of_week: number; // 0 = Minggu ... 6 = Sabtu
  day_name: string;
  is_open: number;
  open_time: string;
  close_time: string;
  shift_notes: string;
  assigned_barber_ids: string[];
}

export interface TransactionItem {
  service_id: string;
  service_name: string;
  category: string;
  price: number;
  qty: number;
}

export interface Transaction {
  id: string;
  invoice_no: string;
  branch_id: string;
  branch_name: string;
  barber_id: string;
  barber_name: string;
  cashier_id: string;
  cashier_name: string;
  customer_name: string;
  customer_phone: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  barber_commission: number;
  payment_method: 'Tunai' | 'QRIS' | 'Transfer' | 'Debit';
  booking_id: string | null;
  notes: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  branch_id: string;
  branch_name: string;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
  service_price: number;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  status: 'Menunggu' | 'Dikonfirmasi' | 'Selesai' | 'Dibatalkan';
  notes: string;
  created_at: string;
}

export interface GeoVerificationResult {
  valid: boolean;
  within_radius?: boolean;
  geofence_status?: 'DALAM_RADIUS' | 'TOLERANSI_GPS' | 'LUAR_RADIUS';
  status_label?: string;
  distance_meters?: number;
  radius_meters?: number;
  effective_limit_meters?: number;
  gps_accuracy_meters?: number;
  bearing_degrees?: number;
  direction_from_branch?: string;
  verified_by: string;
  verified_at?: string;
  error?: string;
}

export interface FaceVerificationResult {
  valid: boolean;
  face_detected: boolean;
  face_match: boolean;
  similarity_percent: number;
  threshold_percent?: number;
  skin_presence_percent?: number;
  status_label?: string;
  operational_allowed: boolean;
  operational_status: string;
  operational_message: string;
  verified_by: string;
  verified_at?: string;
  error?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  branch_id: string;
  branch_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  lat: number;
  lng: number;
  distance_meters: number;
  geofence_status: string;
  face_similarity?: number | null;
  face_verified?: number;
  operational_status?: string;
  photo_url?: string;
  verified_by: string;
  status: 'Hadir' | 'Terlambat' | 'Selesai' | 'Ditolak';
  notes: string;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  branch_name: string;
  period_month: string; // YYYY-MM
  base_salary: number;
  total_cuts: number;
  total_revenue_generated: number;
  commission_rate: number;
  commission_amount: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  status: 'Draft' | 'Dibayar';
  paid_at: string | null;
  notes: string;
}

export interface NotificationItem {
  id: string;
  type: 'transaction' | 'booking' | 'attendance' | 'system';
  title: string;
  message: string;
  amount: number | null;
  branch_name: string;
  actor_name: string;
  is_read: number;
  created_at: string;
}

export interface DailyReportSummary {
  date: string;
  branch_id: string;
  total_revenue: number;
  total_discount: number;
  total_transactions: number;
  total_cuts: number;
  total_barber_commission: number;
  net_barbershop_income: number;
  payment_breakdown: { method: string; count: number; total: number }[];
  branch_breakdown: { branch_id: string; branch_name: string; count: number; total: number }[];
  barber_breakdown: { barber_id: string; barber_name: string; cuts: number; revenue: number; commission: number }[];
  transactions: Transaction[];
}

export interface InventoryDailyLog {
  id: string;
  branch_id: string;
  date: string;
  stok_jual_pm: number;
  stok_jual_hr: number;
  stok_jual_pw: number;
  stok_barber_tisu_leher: number;
  stok_barber_hair_tonic: number;
  stok_barber_shampo: number;
  stok_barber_perming: number;
  stok_barber_sampo_cultusia: number;
  terjual_pm: number;
  terjual_hr: number;
  terjual_pw: number;
  terjual_pm_rp: number;
  terjual_hr_rp: number;
  terjual_pw_rp: number;
  terpakai_pm: number;
  terpakai_hr: number;
  terpakai_pw: number;
  terpakai_tisu_leher: number;
}

export interface PeriodDayRow {
  no: number;
  date: string;
  date_label: string;
  transactions_count: number;
  cuts_count: number;
  tunai: number;
  qris: number;
  transfer: number;
  debit: number;
  gross_revenue: number;
  barber_commission: number;
  net_income: number;
  inventory: InventoryDailyLog;
}

export interface PeriodReportSummary {
  mode: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  branch_id: string;
  branch_name: string;
  days: PeriodDayRow[];
  totals: {
    transactions_count: number;
    cuts_count: number;
    tunai: number;
    qris: number;
    transfer: number;
    debit: number;
    gross_revenue: number;
    barber_commission: number;
    net_income: number;
    stok_jual_pm: number;
    stok_jual_hr: number;
    stok_jual_pw: number;
    stok_barber_tisu_leher: number;
    stok_barber_hair_tonic: number;
    stok_barber_shampo: number;
    stok_barber_perming: number;
    stok_barber_sampo_cultusia: number;
    terjual_pm: number;
    terjual_hr: number;
    terjual_pw: number;
    terjual_pm_rp: number;
    terjual_hr_rp: number;
    terjual_pw_rp: number;
    terpakai_pm: number;
    terpakai_hr: number;
    terpakai_pw: number;
    terpakai_tisu_leher: number;
  };
}

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  is_system: number;
  is_active: number;
}

export interface FeatureItem {
  id: string;
  menu_group: string;
  menu_name: string;
  route: string;
}

export interface RolePermissionItem {
  id: string;
  role_id: string;
  feature_id: string;
  can_view: number;
  can_create: number;
  can_edit: number;
  can_delete: number;
  can_export: number;
  can_void: number;
  data_scope: 'self' | 'branch' | 'all';
}

export interface AppSettingItem {
  key: string;
  value: string;
  updated_by?: string;
  updated_at?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  sort_order: number;
  color: string;
  is_active: number;
}

export interface AppStatePayload {
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  serviceCategories?: ServiceCategory[];
  schedules: OperationalSchedule[];
  transactions: Transaction[];
  bookings: Booking[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  notifications: NotificationItem[];
  posts: PostItem[];
  siteMedia: SiteMedia;
  roles?: RoleItem[];
  features?: FeatureItem[];
  rolePermissions?: RolePermissionItem[];
  appSettings?: Record<string, string>;
}
