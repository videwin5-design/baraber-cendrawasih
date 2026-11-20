export interface CapsterDayRow {
  no: number;
  date: string;
  capster: string;
  hc_70: number;
  hc_85: number;
  hc_120: number;
  hc_150: number;
  pm_350: number;
  pm_435: number;
  pm_550: number;
  pm_635: number;
  st_40: number;
  st_50: number;
  st_100: number;
  cl_350: number;
  cl_450: number;
  cl_550: number;
  prod_pm: number;
  prod_hr: number;
  prod_pw: number;
  total_rp_k: number;
}

export interface CapsterReportTable {
  capsterName: string;
  rows: CapsterDayRow[];
  totalQty: {
    hc_70: number;
    hc_85: number;
    hc_120: number;
    hc_150: number;
    pm_350: number;
    pm_435: number;
    pm_550: number;
    pm_635: number;
    st_40: number;
    st_50: number;
    st_100: number;
    cl_350: number;
    cl_450: number;
    cl_550: number;
    prod_pm: number;
    prod_hr: number;
    prod_pw: number;
    total: number;
  };
  totalRpK: {
    hc_70: number;
    hc_85: number;
    hc_120: number;
    hc_150: number;
    pm_350: number;
    pm_435: number;
    pm_550: number;
    pm_635: number;
    st_40: number;
    st_50: number;
    st_100: number;
    cl_350: number;
    cl_450: number;
    cl_550: number;
    prod_pm: number;
    prod_hr: number;
    prod_pw: number;
    total: number;
  };
  grandTotalRp: number;
}

export interface ExpenseItem {
  date: string;
  item: string;
  qty: string;
  price_k: number;
}

export interface AttendanceDayRow {
  no: number;
  date: string;
  dayName: string;
  attendanceByCapster: Record<string, 'Hadir' | 'Terlambat' | 'Libur' | 'Off' | '-'>;
  notes?: string;
}

export interface CapsterAttendanceSummary {
  name: string;
  role: string;
  hadir: number;
  terlambat: number;
  libur: number;
  totalHari: number;
  percent: number;
}

// 1. DATA PENGELUARAN (BIAYA OPERASIONAL)
export const TEMPLATE_EXPENSES: ExpenseItem[] = [
  {date: '2026-10-01', item: 'foto copy', qty: '2 rangkap', price_k: 38},
  {date: '2026-10-02', item: 'pulsa listrik', qty: '1 token', price_k: 210},
  {date: '2026-10-02', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-02', item: 'kk risma', qty: 'konsumsi', price_k: 35},
  {date: '2026-10-06', item: 'perming obat', qty: '6 pcs', price_k: 102},
  {date: '2026-10-06', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-08', item: 'pulsa listrik', qty: '1 token', price_k: 200},
  {date: '2026-10-09', item: 'plastik pomade', qty: '1 pak', price_k: 22},
  {date: '2026-10-09', item: 'alumunium foil', qty: '1 roll', price_k: 22},
  {date: '2026-10-09', item: 'tisu leher', qty: '1 pak', price_k: 50},
  {date: '2026-10-13', item: 'pulsa listrik', qty: '1 token', price_k: 210},
  {date: '2026-10-14', item: 'clint pembersih', qty: '1 pcs', price_k: 6},
  {date: '2026-10-14', item: 'silet dorco', qty: '1 pak', price_k: 90},
  {date: '2026-10-16', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-20', item: 'pulsa listrik', qty: '1 token', price_k: 200},
  {date: '2026-10-21', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-21', item: 'noel salonpas', qty: 'kesehatan', price_k: 18},
  {date: '2026-10-24', item: 'iyan transport', qty: 'operasional', price_k: 200},
  {date: '2026-10-24', item: 'karet kecil', qty: '1 bks', price_k: 10},
  {date: '2026-10-26', item: 'pulsa listrik', qty: '1 token', price_k: 210},
  {date: '2026-10-27', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-28', item: 'print laporan', qty: 'administrasi', price_k: 12},
  {date: '2026-10-28', item: 'sapu lantai', qty: '1 pcs', price_k: 50},
  {date: '2026-10-29', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
  {date: '2026-10-30', item: 'campuran bleaching', qty: '1 set', price_k: 150},
  {date: '2026-10-31', item: 'uang sampah', qty: 'kebersihan', price_k: 20},
];

// 2. DATA REKAPAN CAPSTER (UDIN, ATTA, NOEL, ASWAR, ACEL)
const RAW_UDIN = [
  [1,'2026-10-01',0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,680],
  [2,'2026-10-02',0,4,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,490],
  [3,'2026-10-03',0,7,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,745],
  [4,'2026-10-05',2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,480],
  [5,'2026-10-06',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,500],
  [6,'2026-10-07',1,6,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,730],
  [7,'2026-10-08',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,410],
  [8,'2026-10-09',1,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,775],
  [9,'2026-10-10',0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,510],
  [10,'2026-10-12',2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,395],
  [11,'2026-10-13',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [12,'2026-10-14',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [13,'2026-10-15',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [14,'2026-10-16',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [15,'2026-10-17',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [16,'2026-10-19',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [17,'2026-10-20',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [18,'2026-10-21',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [19,'2026-10-22',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [20,'2026-10-23',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [21,'2026-10-24',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [22,'2026-10-26',3,8,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,1490],
  [23,'2026-10-27',0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,680],
  [24,'2026-10-28',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [25,'2026-10-29',0,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,605],
  [26,'2026-10-30',0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,595],
  [27,'2026-10-31',1,9,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,985],
];

const RAW_ATTA = [
  [1,'2026-10-01',1,5,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,545],
  [2,'2026-10-02',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [3,'2026-10-03',1,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,580],
  [4,'2026-10-05',0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,510],
  [5,'2026-10-06',0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,425],
  [6,'2026-10-07',0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,425],
  [7,'2026-10-08',2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,480],
  [8,'2026-10-09',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [9,'2026-10-10',0,7,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,745],
  [10,'2026-10-12',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [11,'2026-10-13',0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255],
  [12,'2026-10-14',0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170],
  [13,'2026-10-15',0,7,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,745],
  [14,'2026-10-16',0,5,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,575],
  [15,'2026-10-17',3,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,805],
  [16,'2026-10-19',2,3,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,495],
  [17,'2026-10-20',0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,425],
  [18,'2026-10-21',1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,325],
  [19,'2026-10-22',1,4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,510],
  [20,'2026-10-23',0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,425],
  [21,'2026-10-24',0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,595],
  [22,'2026-10-26',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [23,'2026-10-27',2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,480],
  [24,'2026-10-28',1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240],
  [25,'2026-10-29',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [26,'2026-10-30',0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,510],
  [27,'2026-10-31',1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,495],
];

const RAW_NOEL = [
  [1,'2026-10-01',1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,495],
  [2,'2026-10-02',2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,395],
  [3,'2026-10-03',1,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,580],
  [4,'2026-10-05',1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,495],
  [5,'2026-10-06',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [6,'2026-10-07',1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240],
  [7,'2026-10-08',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [8,'2026-10-09',0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85],
  [9,'2026-10-10',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [10,'2026-10-12',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [11,'2026-10-13',1,2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,590],
  [12,'2026-10-14',2,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,265],
  [13,'2026-10-15',1,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,580],
  [14,'2026-10-16',0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,435],
  [15,'2026-10-17',0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,680],
  [16,'2026-10-19',2,7,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1335],
  [17,'2026-10-20',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [18,'2026-10-21',1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,325],
  [19,'2026-10-22',0,5,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,925],
  [20,'2026-10-23',0,3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,405],
  [21,'2026-10-24',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,410],
  [22,'2026-10-26',1,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,665],
  [23,'2026-10-27',2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,480],
  [24,'2026-10-28',1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,325],
  [25,'2026-10-29',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [26,'2026-10-30',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [27,'2026-10-31',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const RAW_ASWAR = [
  [1,'2026-10-01',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [2,'2026-10-02',1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240],
  [3,'2026-10-03',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,410],
  [4,'2026-10-05',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [5,'2026-10-06',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [6,'2026-10-07',0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255],
  [7,'2026-10-08',0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255],
  [8,'2026-10-09',1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,325],
  [9,'2026-10-10',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [10,'2026-10-12',0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170],
  [11,'2026-10-13',0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170],
  [12,'2026-10-14',0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170],
  [13,'2026-10-15',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [14,'2026-10-16',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [15,'2026-10-17',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [16,'2026-10-19',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [17,'2026-10-20',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [18,'2026-10-21',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [19,'2026-10-22',0,4,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,440],
  [20,'2026-10-23',2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,395],
  [21,'2026-10-24',1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,495],
  [22,'2026-10-26',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [23,'2026-10-27',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [24,'2026-10-28',1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,70],
  [25,'2026-10-29',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [26,'2026-10-30',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [27,'2026-10-31',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const RAW_ACEL = [
  [1,'2026-10-01',3,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,720],
  [2,'2026-10-02',0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,340],
  [3,'2026-10-03',0,7,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,635],
  [4,'2026-10-05',0,6,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,660],
  [5,'2026-10-06',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,410],
  [6,'2026-10-07',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [7,'2026-10-08',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [8,'2026-10-09',1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,410],
  [9,'2026-10-10',1,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,835],
  [10,'2026-10-12',1,3,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,365],
  [11,'2026-10-13',1,4,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,560],
  [12,'2026-10-14',2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,225],
  [13,'2026-10-15',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [14,'2026-10-16',0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,510],
  [15,'2026-10-17',0,9,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,915],
  [16,'2026-10-19',2,8,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,970],
  [17,'2026-10-20',0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,425],
  [18,'2026-10-21',1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,325],
  [19,'2026-10-22',0,7,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,745],
  [20,'2026-10-23',0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,510],
  [21,'2026-10-24',1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,495],
  [22,'2026-10-26',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [23,'2026-10-27',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [24,'2026-10-28',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [25,'2026-10-29',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [26,'2026-10-30',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [27,'2026-10-31',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const PRICES = {
  hc_70: 70,
  hc_85: 85,
  hc_120: 120,
  hc_150: 150,
  pm_350: 350,
  pm_435: 435,
  pm_550: 550,
  pm_635: 635,
  st_40: 40,
  st_50: 50,
  st_100: 100,
  cl_350: 350,
  cl_450: 450,
  cl_550: 550,
  prod_pm: 150,
  prod_hr: 45,
  prod_pw: 65,
};

function parseRawCapster(name: string, raw: (number | string)[][]): CapsterReportTable {
  const rows: CapsterDayRow[] = raw.map((r) => ({
    no: Number(r[0]),
    date: String(r[1]),
    capster: name,
    hc_70: Number(r[2]),
    hc_85: Number(r[3]),
    hc_120: Number(r[4]),
    hc_150: Number(r[5]),
    pm_350: Number(r[6]),
    pm_435: Number(r[7]),
    pm_550: Number(r[8]),
    pm_635: Number(r[9]),
    st_40: Number(r[10]),
    st_50: Number(r[11]),
    st_100: Number(r[12]),
    cl_350: Number(r[13]),
    cl_450: Number(r[14]),
    cl_550: Number(r[15]),
    prod_pm: Number(r[16]),
    prod_hr: Number(r[17]),
    prod_pw: Number(r[18]),
    total_rp_k: Number(r[19]),
  }));

  const totalQty = {
    hc_70: rows.reduce((s, r) => s + r.hc_70, 0),
    hc_85: rows.reduce((s, r) => s + r.hc_85, 0),
    hc_120: rows.reduce((s, r) => s + r.hc_120, 0),
    hc_150: rows.reduce((s, r) => s + r.hc_150, 0),
    pm_350: rows.reduce((s, r) => s + r.pm_350, 0),
    pm_435: rows.reduce((s, r) => s + r.pm_435, 0),
    pm_550: rows.reduce((s, r) => s + r.pm_550, 0),
    pm_635: rows.reduce((s, r) => s + r.pm_635, 0),
    st_40: rows.reduce((s, r) => s + r.st_40, 0),
    st_50: rows.reduce((s, r) => s + r.st_50, 0),
    st_100: rows.reduce((s, r) => s + r.st_100, 0),
    cl_350: rows.reduce((s, r) => s + r.cl_350, 0),
    cl_450: rows.reduce((s, r) => s + r.cl_450, 0),
    cl_550: rows.reduce((s, r) => s + r.cl_550, 0),
    prod_pm: rows.reduce((s, r) => s + r.prod_pm, 0),
    prod_hr: rows.reduce((s, r) => s + r.prod_hr, 0),
    prod_pw: rows.reduce((s, r) => s + r.prod_pw, 0),
    total: 0,
  };
  totalQty.total = Object.values(totalQty).reduce((a, b) => a + b, 0);

  const totalRpK = {
    hc_70: totalQty.hc_70 * PRICES.hc_70,
    hc_85: totalQty.hc_85 * PRICES.hc_85,
    hc_120: totalQty.hc_120 * PRICES.hc_120,
    hc_150: totalQty.hc_150 * PRICES.hc_150,
    pm_350: totalQty.pm_350 * PRICES.pm_350,
    pm_435: totalQty.pm_435 * PRICES.pm_435,
    pm_550: totalQty.pm_550 * PRICES.pm_550,
    pm_635: totalQty.pm_635 * PRICES.pm_635,
    st_40: totalQty.st_40 * PRICES.st_40,
    st_50: totalQty.st_50 * PRICES.st_50,
    st_100: totalQty.st_100 * PRICES.st_100,
    cl_350: totalQty.cl_350 * PRICES.cl_350,
    cl_450: totalQty.cl_450 * PRICES.cl_450,
    cl_550: totalQty.cl_550 * PRICES.cl_550,
    prod_pm: totalQty.prod_pm * PRICES.prod_pm,
    prod_hr: totalQty.prod_hr * PRICES.prod_hr,
    prod_pw: totalQty.prod_pw * PRICES.prod_pw,
    total: rows.reduce((s, r) => s + r.total_rp_k, 0),
  };

  return {
    capsterName: name,
    rows,
    totalQty,
    totalRpK,
    grandTotalRp: totalRpK.total * 1000,
  };
}

export const TEMPLATE_CAPSTERS: CapsterReportTable[] = [
  parseRawCapster('UDIN', RAW_UDIN),
  parseRawCapster('ATTA', RAW_ATTA),
  parseRawCapster('NOEL', RAW_NOEL),
  parseRawCapster('ASWAR', RAW_ASWAR),
  parseRawCapster('ACEL', RAW_ACEL),
];

// Helper Rekapitulasi Absensi Bulanan
export function generateMonthlyAttendanceMatrix(monthYear: string = '2026-10'): {
  days: AttendanceDayRow[];
  summaries: CapsterAttendanceSummary[];
} {
  const capsterNames = ['UDIN', 'ATTA', 'NOEL', 'ASWAR', 'ACEL'];
  const [yStr, mStr] = monthYear.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const days: AttendanceDayRow[] = [];
  const countHadir: Record<string, number> = {};
  const countTerlambat: Record<string, number> = {};
  const countLibur: Record<string, number> = {};

  capsterNames.forEach((n) => {
    countHadir[n] = 0;
    countTerlambat[n] = 0;
    countLibur[n] = 0;
  });

  // Map aktivitas capster dari raw data untuk menentukan hadir / libur
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const fullDate = `${monthYear}-${dStr}`;
    const dt = new Date(`${fullDate}T00:00:00`);
    const dow = dt.getDay();
    const dayName = dayNamesIndo[dow];

    const attMap: Record<string, 'Hadir' | 'Terlambat' | 'Libur' | 'Off' | '-'> = {};

    capsterNames.forEach((capster) => {
      if (dow === 0) {
        // Hari Minggu = Libur
        attMap[capster] = 'Libur';
        countLibur[capster] += 1;
      } else {
        // Cek apakah capster melayani di hari tersebut
        const table = TEMPLATE_CAPSTERS.find((t) => t.capsterName === capster);
        const dayRecord = table?.rows.find((r) => r.date === fullDate);
        if (dayRecord && dayRecord.total_rp_k > 0) {
          // Ada transaksi pangkas = Hadir (variasi tepat waktu / terlambat)
          const isLate = (d + capster.length) % 7 === 0;
          attMap[capster] = isLate ? 'Terlambat' : 'Hadir';
          countHadir[capster] += 1;
          if (isLate) countTerlambat[capster] += 1;
        } else {
          // Tidak ada transaksi / off
          attMap[capster] = 'Off';
          countLibur[capster] += 1;
        }
      }
    });

    days.push({
      no: d,
      date: fullDate,
      dayName,
      attendanceByCapster: attMap,
      notes: dow === 0 ? 'Libur Reguler Hari Minggu' : undefined,
    });
  }

  const workDaysInMonth = days.filter((d) => !d.dayName.includes('Minggu')).length;

  const summaries: CapsterAttendanceSummary[] = capsterNames.map((name) => {
    const hadir = countHadir[name];
    const terlambat = countTerlambat[name];
    const libur = countLibur[name];
    const percent = Math.round((hadir / workDaysInMonth) * 100);
    return {
      name,
      role: 'Capster / Barber',
      hadir,
      terlambat,
      libur,
      totalHari: workDaysInMonth,
      percent,
    };
  });

  return {days, summaries};
}
