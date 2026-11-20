import {
  Award,
  Barcode,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  HelpCircle,
  History,
  LayoutDashboard,
  Layers,
  Minus,
  Package,
  PauseCircle,
  Play,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Scissors,
  Search,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Volume2,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useState} from 'react';
import type {
  AttendanceRecord,
  Booking,
  Branch,
  Employee,
  OperationalSchedule,
  ServiceItem,
  Transaction,
  TransactionItem,
} from '../types.ts';
import {formatDateIndo, formatRupiah, formatTimeShort, getTodayISO} from '../utils/format.ts';
import {createDynamicQRIS, generateQRISReference, type DynamicQRISResult} from '../utils/qris.ts';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothPrinterStatus,
  isBluetoothSupported,
  printReceipt,
  printReceiptViaBrowser,
  triggerOpenCashDrawer,
  type ReceiptData,
} from '../utils/thermalPrinter.ts';
import {AttendancePortal} from './AttendancePortal.tsx';

interface CashierPortalProps {
  currentUser: Employee;
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  bookings: Booking[];
  transactions: Transaction[];
  attendance?: AttendanceRecord[];
  schedules?: OperationalSchedule[];
  initialTab?: CashierSubTab;
  onTransactionCreated: (trx: {invoice_no: string; total_amount: number}) => void;
}

// Item in active POS Cart
interface CartItem {
  id: string; // unique cart row id
  service_id: string;
  name: string;
  price: number;
  qty: number;
  category: string;
  barber_id: string;
  barber_name: string;
}

// Held Transaction State
interface HeldOrder {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  notes: string;
  barberId: string;
}

// Retail product items for 'PRODAK' tab
interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {id: 'prod-1', name: 'Pomade Water Based Cenderawasih', price: 85000, category: 'PRODUK', stock: 24},
  {id: 'prod-2', name: 'Pomade Oil Based Heavy Hold', price: 80000, category: 'PRODUK', stock: 18},
  {id: 'prod-3', name: 'Styling Matte Hair Powder 10g', price: 65000, category: 'PRODUK', stock: 32},
  {id: 'prod-4', name: 'Hair Tonic Herbal Nabire 100ml', price: 75000, category: 'PRODUK', stock: 15},
  {id: 'prod-5', name: 'After Shave Cooling Lotion', price: 55000, category: 'PRODUK', stock: 12},
  {id: 'prod-6', name: 'Beard & Mustache Serum 30ml', price: 70000, category: 'PRODUK', stock: 10},
  {id: 'prod-7', name: 'Hair Clay Natural Texture', price: 90000, category: 'PRODUK', stock: 20},
  {id: 'prod-8', name: 'Shampoo Anti-Dandruff Menthol', price: 60000, category: 'PRODUK', stock: 16},
];

type CashierSubTab = 'pos_grid' | 'riwayat' | 'dashboard' | 'presensi_saya' | 'printer_settings';

export const CashierPortal: React.FC<CashierPortalProps> = ({
  currentUser,
  branches,
  employees,
  services,
  bookings,
  transactions,
  attendance = [],
  schedules = [],
  initialTab,
  onTransactionCreated,
}) => {
  const activeBranches = branches.filter((b) => b.is_active === 1);
  const barbers = employees.filter((e) => e.role === 'karyawan' && e.is_active === 1);
  const activeServices = services.filter((s) => s.is_active === 1);

  // Sub Tab Navigation
  const [activeTab, setActiveTab] = useState<CashierSubTab>(initialTab || 'pos_grid');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Branch determination:
  // If currentUser is kasir, branchId is locked to currentUser.branch_id.
  // If currentUser is owner, owner can toggle branch or default to active branch.
  const [branchId, setBranchId] = useState(currentUser.branch_id || activeBranches[0]?.id || '');

  const effectiveBranchId = currentUser.role === 'kasir'
    ? (currentUser.branch_id || activeBranches[0]?.id || '')
    : (branchId || currentUser.branch_id || activeBranches[0]?.id || '');

  const currentBranch = useMemo(
    () => activeBranches.find((b) => b.id === effectiveBranchId) || activeBranches[0],
    [activeBranches, effectiveBranchId]
  );

  // Filter ONLY capsters/barbers belonging to this cashier's branch
  const branchBarbers = useMemo(() => {
    return barbers.filter((b) => b.branch_id === effectiveBranchId);
  }, [barbers, effectiveBranchId]);

  // Master Barber tabs for this branch: only capsters assigned to this branch + PRODAK
  const barberTabList = useMemo(() => {
    const list: string[] = [];
    branchBarbers.forEach((b) => {
      const uname = b.name.trim().toUpperCase();
      if (!list.includes(uname)) {
        list.push(uname);
      }
    });
    // Always include PRODAK tab for retail pomade/powder
    if (!list.includes('PRODAK')) {
      list.push('PRODAK');
    }
    return list;
  }, [branchBarbers]);

  const [activeBarberTab, setActiveBarberTab] = useState<string>(() => {
    return barberTabList[0] || 'PRODAK';
  });

  // Ensure activeBarberTab stays synchronized if branch or barber list changes
  useEffect(() => {
    if (!barberTabList.includes(activeBarberTab)) {
      setActiveBarberTab(barberTabList[0] || 'PRODAK');
    }
  }, [barberTabList, activeBarberTab]);

  // Effective Barber ID resolved from activeBarberTab
  const effectiveBarber = useMemo(() => {
    if (activeBarberTab === 'PRODAK') {
      return branchBarbers[0] || barbers[0] || employees[0];
    }
    const match = branchBarbers.find((b) => b.name.trim().toUpperCase() === activeBarberTab);
    return match || branchBarbers[0] || barbers[0] || employees[0];
  }, [activeBarberTab, branchBarbers, barbers, employees]);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan Walk-In');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [linkedBookingId, setLinkedBookingId] = useState<string | null>(null);

  // Held Orders State
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const saved = localStorage.getItem('cendra_held_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cendra_held_orders', JSON.stringify(heldOrders));
    } catch {
      // Ignore localStorage quotas
    }
  }, [heldOrders]);

  // Modal Controls
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<Transaction['payment_method']>('Tunai');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState<boolean>(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [drawerAlert, setDrawerAlert] = useState<string | null>(null);

  // Bluetooth Printer State
  const [btStatus, setBtStatus] = useState(() => getBluetoothPrinterStatus());
  const [isConnectingBt, setIsConnectingBt] = useState(false);

  // Dynamic QRIS State
  const [qrisData, setQrisData] = useState<DynamicQRISResult | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [qrisCopied, setQrisCopied] = useState(false);
  const [qrisRemainingSec, setQrisRemainingSec] = useState(900);

  // Floating Cash Drawer (Modal Awal)
  const [floatingCash, setFloatingCash] = useState<number>(() => {
    try {
      const val = localStorage.getItem('cendra_floating_cash');
      return val ? Number(val) : 500000;
    } catch {
      return 500000;
    }
  });

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<'today' | 'yesterday' | '7days' | 'month' | 'all'>('today');
  const [historyBarberFilter, setHistoryBarberFilter] = useState<string>('all');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<string>('all');

  // Daily Dashboard Date
  const [dashboardDate, setDashboardDate] = useState<string>(getTodayISO());

  // Check Bluetooth on mount
  useEffect(() => {
    setBtStatus(getBluetoothPrinterStatus());
  }, []);

  // Timer QRIS
  useEffect(() => {
    if (!qrisData) return;
    setQrisRemainingSec(900);
    const timer = window.setInterval(() => {
      setQrisRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qrisData]);

  // Calculations
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const discountNum = Math.max(0, Number(discount) || 0);
  const totalAmount = Math.max(0, subtotal - discountNum);
  const cashChange = Math.max(0, cashGiven - totalAmount);

  // When payment modal opens, default cashGiven to exact amount
  useEffect(() => {
    if (isPaymentModalOpen) {
      setCashGiven(totalAmount);
      setQrisData(null);
      setSubmitError('');
    }
  }, [isPaymentModalOpen, totalAmount]);

  // Add Item to POS Cart
  const addToCart = (item: {id: string; name: string; price: number; category: string}) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.service_id === item.id && x.barber_name === activeBarberTab);
      if (existing) {
        return prev.map((x) =>
          x.id === existing.id ? {...x, qty: x.qty + 1} : x
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          service_id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          category: item.category,
          barber_id: effectiveBarber?.id || 'emp-barber-1',
          barber_name: activeBarberTab === 'PRODAK' ? 'PRODUK' : activeBarberTab,
        },
      ];
    });
  };

  // Stepper quantity
  const updateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) => {
          if (x.id === cartItemId) {
            const newQty = x.qty + delta;
            return newQty > 0 ? {...x, qty: newQty} : null;
          }
          return x;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((x) => x.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('0');
    setNotes('');
    setLinkedBookingId(null);
  };

  // Barcode / Text search quick add
  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;

    // Search in services first
    const foundSvc = activeServices.find(
      (s) => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)
    );
    if (foundSvc) {
      addToCart({id: foundSvc.id, name: foundSvc.name, price: foundSvc.price, category: foundSvc.category});
      setBarcodeInput('');
      return;
    }

    // Search in products
    const foundProd = DEFAULT_PRODUCTS.find((p) => p.name.toLowerCase().includes(query));
    if (foundProd) {
      addToCart({id: foundProd.id, name: foundProd.name, price: foundProd.price, category: foundProd.category});
      setBarcodeInput('');
      return;
    }

    setDrawerAlert(`Item "${barcodeInput}" tidak ditemukan.`);
    setTimeout(() => setDrawerAlert(null), 3000);
  };

  // Hold Transaction
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHold: HeldOrder = {
      id: `hold-${Date.now()}`,
      heldAt: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}),
      customerName: customerName || 'Pelanggan',
      customerPhone,
      items: [...cart],
      notes,
      barberId: effectiveBarber?.id || '',
    };
    setHeldOrders((prev) => [newHold, ...prev]);
    clearCart();
    setCustomerName('Pelanggan Walk-In');
    setCustomerPhone('');
    setDrawerAlert('Transaksi berhasil ditahan!');
    setTimeout(() => setDrawerAlert(null), 2500);
  };

  // Restore Held Order
  const handleRestoreOrder = (hold: HeldOrder) => {
    setCart(hold.items);
    setCustomerName(hold.customerName);
    setCustomerPhone(hold.customerPhone);
    setNotes(hold.notes);
    setHeldOrders((prev) => prev.filter((h) => h.id !== hold.id));
    setIsHeldModalOpen(false);
  };

  // Manual Kick Cash Drawer
  const handleKickDrawer = async () => {
    const res = await triggerOpenCashDrawer();
    setDrawerAlert(
      res.method === 'bluetooth_esc_pos'
        ? 'Laci Kasir Berhasil Dibuka (Sinyal Bluetooth ESC/POS)!'
        : 'Laci Kasir Dibuka! (Audio Bell Ka-Ching)'
    );
    setTimeout(() => setDrawerAlert(null), 3000);
  };

  // Connect Bluetooth
  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    try {
      const res = await connectBluetoothPrinter();
      if (res.ok) {
        setBtStatus({connected: true, name: res.name});
        setDrawerAlert(`Printer Bluetooth Terhubung: ${res.name}`);
      } else {
        setDrawerAlert(res.error || 'Gagal menyambungkan Bluetooth printer.');
      }
    } finally {
      setIsConnectingBt(false);
      setTimeout(() => setDrawerAlert(null), 4000);
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothPrinter();
    setBtStatus({connected: false, name: ''});
    setDrawerAlert('Printer Bluetooth diputuskan.');
    setTimeout(() => setDrawerAlert(null), 2500);
  };

  // Generate QRIS
  const handleGenerateQRIS = async () => {
    setSubmitError('');
    if (totalAmount <= 0) {
      setSubmitError('Total tagihan harus lebih dari Rp 0 untuk membuat QRIS.');
      return;
    }
    const activeBranch = activeBranches.find((b) => b.id === branchId) || activeBranches[0];
    setQrisLoading(true);
    setQrisCopied(false);
    try {
      setPaymentMethod('QRIS');
      const refId = generateQRISReference(activeBranch?.code || 'CW01');
      const result = await createDynamicQRIS({
        amount: totalAmount,
        branchCode: activeBranch?.code || 'CW01',
        branchName: activeBranch?.name || 'Barbershop Cenderawasih',
        customerName: customerName.trim() || 'Pelanggan Walk-In',
        referenceId: refId,
      });
      setQrisData(result);
    } catch {
      setSubmitError('Gagal membuat kode QRIS dinamis.');
    } finally {
      setQrisLoading(false);
    }
  };

  const handleCopyQRISPayload = async () => {
    if (!qrisData) return;
    try {
      await navigator.clipboard.writeText(qrisData.payload);
      setQrisCopied(true);
      setTimeout(() => setQrisCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Submit and Finish Transaction
  const handleCompleteTransaction = async () => {
    setSubmitError('');
    if (cart.length === 0) {
      setSubmitError('Keranjang masih kosong.');
      return;
    }
    if (!customerName.trim()) {
      setSubmitError('Nama pelanggan wajib diisi.');
      return;
    }

    const currentBranch = activeBranches.find((b) => b.id === branchId) || activeBranches[0];

    setIsSubmitting(true);
    try {
      // Build items payload
      const customItems = cart.map((c) => ({
        service_id: c.service_id,
        name: c.name,
        category: c.category,
        price: c.price,
        qty: c.qty,
      }));

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          branch_id: effectiveBranchId,
          barber_id: effectiveBarber?.id || barbers[0]?.id || 'emp-barber-1',
          cashier_id: currentUser.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          custom_items: customItems,
          discount: discountNum,
          payment_method: paymentMethod,
          booking_id: linkedBookingId,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Gagal menyimpan transaksi.');
        return;
      }

      // Format receipt data
      const receiptPayload: ReceiptData = {
        invoiceNo: data.invoice_no,
        branchName: currentBranch?.name || 'Barbershop Cenderawasih',
        branchAddress: currentBranch?.address || 'Jl. Dr. Sam Ratulangi, Oyehe, Nabire',
        branchPhone: currentBranch?.phone || '0822-3963-7235',
        dateTimeStr: new Date().toISOString(),
        cashierName: currentUser.name,
        barberName: effectiveBarber?.name || 'Barber Cenderawasih',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.map((c) => ({
          name: c.name,
          qty: c.qty,
          price: c.price,
        })),
        subtotal,
        discount: discountNum,
        total: totalAmount,
        paymentMethod,
        cashGiven: paymentMethod === 'Tunai' ? cashGiven : undefined,
        change: paymentMethod === 'Tunai' ? cashChange : undefined,
        notes: notes.trim(),
      };

      // 1. Kick Cash Drawer if Tunai or checked
      if (autoOpenDrawer || paymentMethod === 'Tunai') {
        await triggerOpenCashDrawer();
      }

      // 2. Auto Print Receipt
      if (autoPrintReceipt) {
        await printReceipt(receiptPayload, false);
      }

      // 3. Callback parent & update state
      onTransactionCreated(data);

      // Create dummy transaction object for Receipt Preview modal
      const newTrx: Transaction = {
        id: data.id || `trx-${Date.now()}`,
        invoice_no: data.invoice_no,
        branch_id: effectiveBranchId,
        branch_name: currentBranch?.name || 'Barbershop Cenderawasih',
        barber_id: effectiveBarber?.id || 'emp-barber-1',
        barber_name: effectiveBarber?.name || 'Barber Cenderawasih',
        cashier_id: currentUser.id,
        cashier_name: currentUser.name,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: customItems.map((ci) => ({
          service_id: ci.service_id,
          service_name: ci.name,
          category: ci.category,
          price: ci.price,
          qty: ci.qty,
        })),
        subtotal,
        discount: discountNum,
        total_amount: totalAmount,
        barber_commission: data.barber_commission || 0,
        payment_method: paymentMethod,
        booking_id: linkedBookingId,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
      };

      setReceiptTrx(newTrx);
      setIsPaymentModalOpen(false);
      clearCart();
      setCustomerName('Pelanggan Walk-In');
      setCustomerPhone('');
      setDrawerAlert(`Transaksi ${data.invoice_no} Berhasil Disimpan & Dicetak!`);
      setTimeout(() => setDrawerAlert(null), 4000);
    } catch {
      setSubmitError('Terjadi kesalahan koneksi ke server kasir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Void Transaction (RBAC: Kasir hanya hari ini, Owner semua)
  const handleDeleteTransaction = async (id: string) => {
    const trx = transactions.find((t) => t.id === id);
    if (currentUser.role === 'kasir' && trx && !trx.created_at?.startsWith(getTodayISO())) {
      alert('Sesuai aturan hak akses RBAC, Kasir hanya diperbolehkan membatalkan (void) transaksi hari ini.');
      return;
    }
    if (!confirm('Yakin ingin membatalkan dan menghapus transaksi ini?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal menghapus transaksi.');
        return;
      }
      setDrawerAlert('Transaksi berhasil dibatalkan (void)');
      setTimeout(() => setDrawerAlert(null), 2500);
    } catch {
      alert('Gagal menghapus transaksi.');
    }
  };

  // Reprint Receipt helper
  const handleReprintReceipt = async (t: Transaction) => {
    const receiptPayload: ReceiptData = {
      invoiceNo: t.invoice_no,
      branchName: t.branch_name,
      branchAddress: activeBranches.find((b) => b.id === t.branch_id)?.address || 'Jl. Dr. Sam Ratulangi, Oyehe, Nabire',
      branchPhone: activeBranches.find((b) => b.id === t.branch_id)?.phone || '0822-3963-7235',
      dateTimeStr: t.created_at,
      cashierName: t.cashier_name,
      barberName: t.barber_name,
      customerName: t.customer_name,
      customerPhone: t.customer_phone,
      items: t.items.map((i) => ({
        name: i.service_name,
        qty: i.qty || 1,
        price: i.price,
      })),
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total_amount,
      paymentMethod: t.payment_method,
      notes: t.notes,
    };

    const res = await printReceipt(receiptPayload, false);
    if (!res.success && res.method === 'browser_window') {
      printReceiptViaBrowser(receiptPayload);
    }
    setDrawerAlert(`Mencetak ulang struk ${t.invoice_no}...`);
    setTimeout(() => setDrawerAlert(null), 2500);
  };

  // Filtered Transactions for History Tab
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const today = getTodayISO();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    return transactions.filter((t) => {
      const tDate = t.created_at.slice(0, 10);

      // Branch Filter for cashier (Kasir hanya melihat data cabang tempatnya bertugas)
      if (currentUser.role === 'kasir' && t.branch_id && t.branch_id !== effectiveBranchId) return false;

      // Date Filter
      if (historyDateFilter === 'today' && tDate !== today) return false;
      if (historyDateFilter === 'yesterday' && tDate !== yesterday) return false;
      if (historyDateFilter === '7days' && tDate < sevenDaysAgo) return false;
      if (historyDateFilter === 'month' && !tDate.startsWith(thisMonth)) return false;

      // Barber Filter
      if (historyBarberFilter !== 'all' && t.barber_id !== historyBarberFilter) return false;

      // Method Filter
      if (historyMethodFilter !== 'all' && t.payment_method !== historyMethodFilter) return false;

      // Search Filter
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchInvoice = t.invoice_no.toLowerCase().includes(q);
        const matchCust = t.customer_name.toLowerCase().includes(q);
        const matchPhone = t.customer_phone.includes(q);
        if (!matchInvoice && !matchCust && !matchPhone) return false;
      }

      return true;
    });
  }, [transactions, historyDateFilter, historyBarberFilter, historyMethodFilter, historySearch, currentUser.role, effectiveBranchId]);

  const historyTotalRevenue = useMemo(
    () => filteredHistory.reduce((sum, t) => sum + t.total_amount, 0),
    [filteredHistory]
  );

  // Daily Dashboard Computations (Filtered per Cabang Kasir)
  const dailyTrx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.created_at.slice(0, 10) === dashboardDate &&
          (!t.branch_id || t.branch_id === effectiveBranchId)
      ),
    [transactions, dashboardDate, effectiveBranchId]
  );

  const dailyOmset = useMemo(() => dailyTrx.reduce((s, t) => s + t.total_amount, 0), [dailyTrx]);
  const dailyCash = useMemo(
    () => dailyTrx.filter((t) => t.payment_method === 'Tunai').reduce((s, t) => s + t.total_amount, 0),
    [dailyTrx]
  );
  const dailyNonCash = useMemo(
    () => dailyTrx.filter((t) => t.payment_method !== 'Tunai').reduce((s, t) => s + t.total_amount, 0),
    [dailyTrx]
  );
  const dailyCommission = useMemo(
    () => dailyTrx.reduce((s, t) => s + (t.barber_commission || 0), 0),
    [dailyTrx]
  );
  const currentCashInDrawer = floatingCash + dailyCash;

  // Barber Performance Today (Leaderboard Capster Khusus Cabang Ini)
  const dailyBarberStats = useMemo(() => {
    return branchBarbers
      .map((b) => {
        const bTrx = dailyTrx.filter(
          (t) => t.barber_id === b.id || t.barber_name.toLowerCase() === b.name.toLowerCase()
        );
        const cutsCount = bTrx.length;
        const totalRev = bTrx.reduce((sum, t) => sum + t.total_amount, 0);
        const totalComm = bTrx.reduce((sum, t) => sum + (t.barber_commission || 0), 0);
        return {
          id: b.id,
          name: b.name,
          cutsCount,
          totalRev,
          totalComm,
        };
      })
      .sort((a, b) => b.cutsCount - a.cutsCount);
  }, [branchBarbers, dailyTrx]);

  return (
    <div className="space-y-4">
      {/* Drawer & Print Notification Alert Toast */}
      {drawerAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full border border-[#DCA842] bg-[#09090B]/95 px-6 py-2.5 text-xs sm:text-sm font-semibold text-[#DCA842] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4 shrink-0 text-[#DCA842]" />
          <span>{drawerAlert}</span>
        </div>
      )}

      {/* Status Bar: Cabang Aktif & Bluetooth (compact, tanpa tab navigasi) */}
      <div className="flex items-center justify-between gap-2 px-1 py-1.5 mb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          {currentUser.role === 'owner' ? (
            <select
              value={effectiveBranchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DCA842]/40 bg-[#DCA842]/10 text-xs font-bold text-[#DCA842]">
              <span className="h-2 w-2 rounded-full bg-[#DCA842] animate-pulse" />
              <span>{currentBranch?.code}: {currentBranch?.name}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={btStatus.connected ? handleDisconnectBluetooth : handleConnectBluetooth}
          disabled={isConnectingBt}
          title={btStatus.connected ? `Terhubung: ${btStatus.name}` : 'Klik untuk hubungkan printer Bluetooth'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            btStatus.connected
              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'
          }`}
        >
          {btStatus.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="max-w-[120px] truncate">
            {isConnectingBt ? 'Mencari...' : btStatus.connected ? btStatus.name || 'BT Siap' : 'BT Terputus'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW: POS KASIR (GRID TABLET MATCHING USER'S IMAGE) */}
      {/* ========================================================================= */}
      {activeTab === 'pos_grid' && (
        <div className="space-y-2">
          {/* Top Tablet Action Bar (Matching Image 2: Laci Kasir, Tahan Transaksi, Stok, Pelanggan, Hapus, Barcode) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {/* 1. Laci Kasir (Red) */}
            <button
              type="button"
              onClick={handleKickDrawer}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#E05344] hover:bg-[#D43D2D] active:scale-98 text-white px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              <span>Laci Kasir</span>
            </button>

            {/* 2. Tahan transaksi (Orange/Gold) */}
            <button
              type="button"
              onClick={cart.length > 0 ? handleHoldOrder : () => setIsHeldModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EBA834] hover:bg-[#DC9823] active:scale-98 text-zinc-950 px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer relative"
            >
              <PauseCircle className="h-4 w-4" />
              <span>Tahan transaksi</span>
              {heldOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow">
                  {heldOrders.length}
                </span>
              )}
            </button>

            {/* 3. Stok Persediaan (Yellow/Lime) */}
            <button
              type="button"
              onClick={() => setIsStockModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#D6CE40] hover:bg-[#C5BD2F] active:scale-98 text-zinc-950 px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer"
            >
              <Package className="h-4 w-4" />
              <span>Stok Persediaan</span>
            </button>

            {/* 4. Pelanggan (Green) */}
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#A4C639] hover:bg-[#93B528] active:scale-98 text-zinc-950 px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer truncate"
            >
              <User className="h-4 w-4" />
              <span className="truncate">{customerName || 'Pelanggan'}</span>
            </button>

            {/* 5. Hapus (Orange/Red) */}
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className={`flex items-center justify-center gap-1.5 rounded-lg bg-[#E06A3B] hover:bg-[#CF5829] active:scale-98 text-white px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer ${
                cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span>Hapus</span>
            </button>

            {/* 6. Quick Action / Held List Drawer */}
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#26A69A] hover:bg-[#1E8E83] active:scale-98 text-white px-3 py-2.5 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              <span>Daftar Tahan ({heldOrders.length})</span>
            </button>
          </div>

          {/* Barcode Search Bar (Matching Search bar on tablet) */}
          <form onSubmit={handleBarcodeSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Masukan barcode atau cari nama layanan / produk..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#DCA842]"
              />
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              search
            </button>
          </form>

          {/* Main POS Split Screen: Left Cart & Right Barber Tabs + Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
            {/* LEFT COLUMN: Cart Area (4 cols on lg, full width on small) */}
            <div className="lg:col-span-4 flex flex-col rounded-xl border border-zinc-300 dark:border-zinc-800 bg-[#2A2B30] text-white shadow-lg overflow-hidden">
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3 bg-[#232428]">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-[#DCA842]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Order Pelanggan
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[11px] font-semibold text-[#DCA842] hover:underline truncate max-w-[150px]"
                >
                  {customerName}
                </button>
              </div>

              {/* Cart Items Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[320px]">
                {cart.length === 0 ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-zinc-400">
                    <p className="text-base sm:text-lg font-bold tracking-wide text-zinc-400">
                      Tidak ada data
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Pilih layanan di sebelah kanan untuk menambahkan
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-[#34353B] p-2.5 border border-zinc-700/60 shadow-sm flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-300">
                              {item.barber_name}
                            </span>
                            <span>@{formatRupiah(item.price)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          className="text-zinc-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Stepper & Item Subtotal */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-700/40">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-white font-bold"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[24px] text-center font-mono text-xs font-bold text-zinc-100">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-white font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#DCA842]">
                          {formatRupiah(item.price * item.qty)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer: Total & Big Red "Pembayaran" Button (Matching Image 2) */}
              <div className="mt-auto border-t border-zinc-700 bg-[#232428]">
                {/* Total Strip */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-bold text-zinc-200">Total:</span>
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-white">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>

                {/* Big Red "Pembayaran" Button */}
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={cart.length === 0}
                  className={`w-full bg-[#E53935] hover:bg-[#D32F2F] active:scale-98 text-white font-bold py-3.5 text-center text-sm sm:text-base tracking-wide shadow-md transition-all cursor-pointer ${
                    cart.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  Pembayaran
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Barber Tabs & Services Grid (8 cols on lg) */}
            <div className="lg:col-span-8 flex flex-col space-y-2">
              {/* Barber Tabs Row (Exact match to Image 2: HAIKAL, UDIN, ACEL, ASWAR, PRODAK, NOEL, ATTA) */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-300 dark:border-zinc-800 pb-2">
                {barberTabList.map((tab) => {
                  const isActive = activeBarberTab === tab;
                  const isProductTab = tab === 'PRODAK';
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveBarberTab(tab)}
                      className={`px-4 py-2 text-xs sm:text-sm font-bold tracking-wider rounded-md uppercase transition-all ${
                        isActive
                          ? 'border-2 border-[#EBA834] bg-white dark:bg-zinc-800 text-[#EBA834] shadow-sm font-extrabold'
                          : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                      } ${isProductTab ? 'text-amber-500 font-black' : ''}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Service & Product Items Grid (Clean bordered cards matching Image 2) */}
              <div className="flex-1 overflow-y-auto">
                {activeBarberTab === 'PRODAK' ? (
                  // PRODUCTS GRID
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEFAULT_PRODUCTS.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="group flex flex-col justify-between rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-left hover:border-[#DCA842] hover:shadow-md transition-all active:scale-98 min-h-[105px]"
                      >
                        <div>
                          <p className="text-xs font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-[#DCA842] transition-colors line-clamp-2">
                            {prod.name}
                          </p>
                          <span className="inline-block mt-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            Stok: {prod.stock}
                          </span>
                        </div>
                        <p className="mt-2 font-mono text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {formatRupiah(prod.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  // SERVICES GRID (Matching exact 16 cards from Image 2)
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeServices.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => addToCart(svc)}
                        className="group flex flex-col justify-between rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-3.5 text-center hover:border-[#EBA834] hover:bg-amber-50/20 dark:hover:bg-zinc-800/60 hover:shadow-md transition-all active:scale-98 min-h-[100px]"
                      >
                        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-[#DCA842] transition-colors">
                          {svc.name}
                        </p>
                        <p className="mt-2 font-mono text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {formatRupiah(svc.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW: RIWAYAT TRANSAKSI (DEDICATED TRANSACTION HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Riwayat Transaksi Kasir
                </h3>
                <p className="text-xs text-zinc-500">
                  Daftar transaksi, reprint struk thermal Bluetooth, dan void/pembatalan
                </p>
              </div>

              {/* Total Omset Ringkasan */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[11px] text-zinc-500">Total Transaksi</p>
                  <p className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {filteredHistory.length} Transaksi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-zinc-500">Total Pendapatan</p>
                  <p className="font-mono text-base font-bold text-[#DCA842]">
                    {formatRupiah(historyTotalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari No. Invoice / Pelanggan..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 pl-9 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              </div>

              {/* Date Filter */}
              <select
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value as any)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="today">Hari Ini</option>
                <option value="yesterday">Kemarin</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="month">Bulan Ini</option>
                <option value="all">Semua Riwayat</option>
              </select>

              {/* Barber Filter */}
              <select
                value={historyBarberFilter}
                onChange={(e) => setHistoryBarberFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="all">Semua Barber Capster ({currentBranch?.code || 'Cabang'})</option>
                {branchBarbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={historyMethodFilter}
                onChange={(e) => setHistoryMethodFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
              >
                <option value="all">Semua Metode Pembayaran</option>
                <option value="Tunai">Tunai (Cash)</option>
                <option value="QRIS">QRIS Dinamis</option>
                <option value="Transfer">Transfer Bank</option>
                <option value="Debit">Debit / EDC</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <Receipt className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm font-semibold">Tidak ada transaksi yang cocok dengan filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 font-bold text-zinc-500 dark:text-zinc-400">
                    <tr>
                      <th className="py-3 px-4">Invoice / Waktu</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Barber</th>
                      <th className="py-3 px-4">Rincian Layanan</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                    {filteredHistory.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{t.invoice_no}</p>
                          <p className="text-[10px] text-zinc-400">{formatTimeShort(t.created_at)} · {t.created_at.slice(0, 10)}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                          {t.customer_name}
                          {t.customer_phone ? (
                            <p className="text-[10px] text-zinc-400">{t.customer_phone}</p>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-bold text-zinc-700 dark:text-zinc-300">
                            {t.barber_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="truncate text-zinc-600 dark:text-zinc-300">
                            {t.items.map((i) => `${i.service_name} (${i.qty || 1}x)`).join(', ')}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              t.payment_method === 'Tunai'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : t.payment_method === 'QRIS'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {t.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatRupiah(t.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReprintReceipt(t)}
                              title="Cetak Ulang Struk (Bluetooth / Print)"
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptTrx(t)}
                              title="Lihat Struk Digital"
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <Receipt className="h-4 w-4" />
                            </button>
                            {t.created_at?.startsWith(getTodayISO()) || currentUser.role === 'owner' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(t.id)}
                                title="Batalkan / Void Transaksi Hari Ini"
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span
                                title="Kasir hanya boleh void transaksi hari ini. Hubungi Owner untuk transaksi lampau."
                                className="rounded-lg p-1.5 text-zinc-300 dark:text-zinc-700 cursor-not-allowed inline-flex"
                              >
                                <Trash2 className="h-4 w-4 opacity-30" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW: DASHBOARD KASIR TRANSAKSI HARIAN (DAILY CASHIER DASHBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Date Selector Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Dashboard Kasir Transaksi Harian
              </h3>
              <p className="text-xs text-zinc-500">
                Laporan pergeseran kas, rekonsiliasi laci kasir, dan produktivitas barber
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Pilih Tanggal:</span>
              <input
                type="date"
                value={dashboardDate}
                onChange={(e) => setDashboardDate(e.target.value)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Total Omset Hari Ini</p>
              <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-[#DCA842]">
                {formatRupiah(dailyOmset)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">{dailyTrx.length} Transaksi Selesai</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Penjualan Tunai (Cash)</p>
              <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatRupiah(dailyCash)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">Masuk ke fisik laci kasir</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Non-Tunai (QRIS &amp; Transfer)</p>
              <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {formatRupiah(dailyNonCash)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">Langsung masuk ke rekening bank</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Komisi Barber Hari Ini</p>
              <p className="mt-1 font-mono text-xl sm:text-2xl font-black text-amber-500">
                {formatRupiah(dailyCommission)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">Hak komisi capster pangkas</p>
            </div>
          </div>

          {/* Cash Drawer Float & Reconciliation Strip */}
          <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-900 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#DCA842]" />
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Rekonsiliasi Fisik Uang di Laci Kasir
                  </h4>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Perhitungan uang fisik kasir: Modal Awal Kasir + Total Penjualan Tunai
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Modal Awal:</span>
                  <input
                    type="number"
                    value={floatingCash}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setFloatingCash(val);
                      localStorage.setItem('cendra_floating_cash', String(val));
                    }}
                    className="w-28 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 px-4 py-2 text-right">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Total Fisik Laci</p>
                  <p className="font-mono text-lg font-black text-[#DCA842]">
                    {formatRupiah(currentCashInDrawer)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleKickDrawer}
                  className="rounded-xl bg-[#E05344] hover:bg-[#D43D2D] text-white px-4 py-2.5 text-xs font-bold shadow transition-all flex items-center gap-1.5"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Buka Laci Kasir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barber Performance Today Leaderboard */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#DCA842]" />
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Produktivitas Barber Hari Ini ({dashboardDate})
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dailyBarberStats.map((stat, idx) => (
                <div
                  key={stat.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 p-3.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DCA842]/20 font-mono text-xs font-bold text-[#DCA842]">
                        #{idx + 1}
                      </span>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{stat.name}</p>
                    </div>
                    <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 font-mono text-xs font-black text-zinc-800 dark:text-zinc-200">
                      {stat.cutsCount} Kepala
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-zinc-400">Total Omset</p>
                      <p className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatRupiah(stat.totalRev)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400">Komisi Hari Ini</p>
                      <p className="font-mono font-bold text-[#DCA842]">{formatRupiah(stat.totalComm)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW: PRESENSI SAYA (ABSEN MASUK & PULANG KASIR) */}
      {/* ========================================================================= */}
      {activeTab === 'presensi_saya' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCA842]/10 text-[#DCA842]">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Presensi Saya — {currentUser.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verifikasi Wajah (Face Match Python) &amp; Lokasi GPS Cabang (Maks 150m)
                </p>
              </div>
            </div>

            <AttendancePortal
              currentUser={currentUser}
              employees={employees}
              branches={branches}
              attendance={attendance}
              schedules={schedules}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW: PENGATURAN PRINTER BLUETOOTH & LACI KASIR */}
      {/* ========================================================================= */}
      {activeTab === 'printer_settings' && (
        <div className="max-w-3xl space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCA842]/10 text-[#DCA842]">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Pengaturan Thermal Printer &amp; Laci Kasir
                </h3>
                <p className="text-xs text-zinc-500">
                  Konfigurasi Web Bluetooth, cetak struk otomatis, dan pembuka laci otomatis (Kick Drawer)
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">Status Koneksi Bluetooth</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {btStatus.connected ? btStatus.name : 'Belum Terhubung ke Thermal Printer'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    btStatus.connected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {btStatus.connected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                {btStatus.connected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectBluetooth}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow transition-all"
                  >
                    Putuskan Koneksi Bluetooth
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectBluetooth}
                    disabled={isConnectingBt}
                    className="rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 px-4 py-2 text-xs font-bold shadow transition-all flex items-center gap-1.5"
                  >
                    <Wifi className="h-4 w-4" />
                    <span>{isConnectingBt ? 'Menyambungkan...' : 'Hubungkan Thermal Printer Bluetooth'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleKickDrawer}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-1.5"
                >
                  <Wallet className="h-4 w-4 text-[#E05344]" />
                  <span>Uji Coba Kick Drawer (Buka Laci)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const samplePayload: ReceiptData = {
                      invoiceNo: 'TEST-STRUK-01',
                      branchName: 'Barbershop Cenderawasih',
                      branchAddress: 'Jl. Dr. Sam Ratulangi, Oyehe, Nabire',
                      branchPhone: '0822-3963-7235',
                      dateTimeStr: new Date().toISOString(),
                      cashierName: currentUser.name,
                      barberName: 'Barber Cenderawasih',
                      customerName: 'Pelanggan Uji Coba',
                      items: [
                        {name: 'Haircut Premium', qty: 1, price: 150000},
                        {name: 'Pomade Water Based', qty: 1, price: 85000},
                      ],
                      subtotal: 235000,
                      discount: 0,
                      total: 235000,
                      paymentMethod: 'Tunai',
                      cashGiven: 250000,
                      change: 15000,
                      notes: 'Uji coba cetak thermal ESC/POS',
                    };
                    const res = await printReceipt(samplePayload, false);
                    if (!res.success && res.method === 'browser_window') {
                      printReceiptViaBrowser(samplePayload);
                    }
                  }}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4 text-[#DCA842]" />
                  <span>Uji Coba Cetak Struk</span>
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Buka Laci Otomatis Saat Transaksi</p>
                  <p className="text-[11px] text-zinc-500">Memicu sinyal ESC/POS kick drawer dan lonceng kasir setiap transaksi pembayaran selesai</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoOpenDrawer}
                  onChange={(e) => setAutoOpenDrawer(e.target.checked)}
                  className="h-5 w-5 rounded text-[#DCA842] focus:ring-[#DCA842]"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Cetak Struk Otomatis Selesai Bayar</p>
                  <p className="text-[11px] text-zinc-500">Otomatis mengirim data struk ke printer Bluetooth atau membuka jendela thermal print</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrintReceipt}
                  onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                  className="h-5 w-5 rounded text-[#DCA842] focus:ring-[#DCA842]"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PEMBAYARAN KASIR (CHECKOUT & PAYMENT MODAL) */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#DCA842]" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Pembayaran Kasir
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
              {submitError && (
                <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/60 p-3 text-red-600 dark:text-red-300 font-semibold">
                  {submitError}
                </div>
              )}

              {/* Total Summary */}
              <div className="rounded-xl bg-zinc-900 text-white p-4 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[11px] text-zinc-400 uppercase font-semibold">Total Tagihan</p>
                  <p className="font-mono text-2xl font-black text-[#DCA842]">{formatRupiah(totalAmount)}</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>{cart.reduce((s, i) => s + i.qty, 0)} Item Layanan/Produk</p>
                  <p className="text-zinc-300 font-semibold">{effectiveBarber?.name || 'Barber'}</p>
                </div>
              </div>

              {/* Customer Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nama Pelanggan
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan..."
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DCA842]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#DCA842]"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Tunai', 'QRIS', 'Transfer', 'Debit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border p-2.5 text-center font-bold text-xs transition-all ${
                        paymentMethod === method
                          ? 'border-[#DCA842] bg-[#DCA842]/15 text-[#DCA842] shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* TUNAI MODE: Quick Cash Buttons & Kembalian */}
              {paymentMethod === 'Tunai' && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Uang Tunai Diterima:</span>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-36 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Quick Rupiah buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashGiven(totalAmount)}
                      className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300"
                    >
                      Uang Pas
                    </button>
                    {[50000, 100000, 150000, 200000, 300000, 500000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashGiven(nominal)}
                        className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-2.5 py-1 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300"
                      >
                        {formatRupiah(nominal)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Kembalian:</span>
                    <span
                      className={`font-mono text-base font-black ${
                        cashGiven < totalAmount
                          ? 'text-red-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {cashGiven < totalAmount
                        ? `Kurang ${formatRupiah(totalAmount - cashGiven)}`
                        : formatRupiah(cashChange)}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS MODE: Dynamic Generator */}
              {paymentMethod === 'QRIS' && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4 text-center space-y-3">
                  {!qrisData ? (
                    <button
                      type="button"
                      onClick={handleGenerateQRIS}
                      disabled={qrisLoading}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 text-xs font-bold shadow transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>{qrisLoading ? 'Membuat QRIS...' : 'Tampilkan Kode QRIS Dinamis'}</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <img
                        src={qrisData.dataUrl}
                        alt="QRIS Dinamis"
                        className="mx-auto h-48 w-48 rounded-xl border-4 border-white shadow-md bg-white object-contain"
                      />
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Scan QRIS untuk bayar <span className="text-purple-600 dark:text-purple-400 font-mono">{formatRupiah(totalAmount)}</span>
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleCopyQRISPayload}
                          className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-1 font-semibold text-zinc-700 dark:text-zinc-300"
                        >
                          {qrisCopied ? 'Tersalin!' : 'Salin String QRIS'}
                        </button>
                        <span className="font-mono text-zinc-500">
                          {Math.floor(qrisRemainingSec / 60)}:{(qrisRemainingSec % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checkboxes for Auto-drawer & Auto-print */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoOpenDrawer}
                    onChange={(e) => setAutoOpenDrawer(e.target.checked)}
                    className="h-4 w-4 rounded text-[#DCA842] focus:ring-[#DCA842]"
                  />
                  <span>Buka laci otomatis (Kick Drawer)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="h-4 w-4 rounded text-[#DCA842] focus:ring-[#DCA842]"
                  />
                  <span>Cetak struk otomatis</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCompleteTransaction}
                disabled={isSubmitting || (paymentMethod === 'Tunai' && cashGiven < totalAmount)}
                className={`rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white px-6 py-2.5 text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${
                  isSubmitting || (paymentMethod === 'Tunai' && cashGiven < totalAmount)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'Memproses Transaksi...' : 'Konfirmasi & Selesaikan Pembayaran'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DAFTAR TRANSAKSI DITAHAN (HELD ORDERS) */}
      {/* ========================================================================= */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <PauseCircle className="h-5 w-5 text-[#EBA834]" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Daftar Transaksi Ditahan ({heldOrders.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {heldOrders.length === 0 ? (
              <p className="text-center py-8 text-xs text-zinc-400 font-medium">
                Tidak ada transaksi yang sedang ditahan.
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {heldOrders.map((h) => {
                  const hTotal = h.items.reduce((s, i) => s + i.price * i.qty, 0);
                  return (
                    <div
                      key={h.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {h.customerName} · <span className="font-mono text-[#DCA842]">{formatRupiah(hTotal)}</span>
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Ditahan jam {h.heldAt} · {h.items.length} Layanan
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreOrder(h)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold"
                        >
                          Lanjutkan
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeldOrders((prev) => prev.filter((x) => x.id !== h.id))}
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STOK PERSEDIAAN PRODUK RETAIL */}
      {/* ========================================================================= */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#D6CE40]" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Stok Persediaan Produk Retail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto">
              {DEFAULT_PRODUCTS.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{prod.name}</p>
                    <p className="font-mono text-xs font-bold text-[#DCA842] mt-0.5">{formatRupiah(prod.price)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      Sisa: {prod.stock} Pcs
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(prod);
                        setIsStockModalOpen(false);
                      }}
                      className="rounded-lg bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 px-2.5 py-1 text-xs font-bold"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT PELANGGAN CEPAT */}
      {/* ========================================================================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#A4C639]" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Data Pelanggan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Hendrik Yoku"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Contoh: 081248112233"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {['Pelanggan Walk-In', 'Pelanggan Reguler', 'Pelanggan Member'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomerName(preset)}
                    className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-full rounded-xl bg-[#A4C639] hover:bg-[#93B528] text-zinc-950 font-bold py-2.5 text-xs sm:text-sm mt-3"
              >
                Simpan &amp; Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW STRUK THERMAL (DIGITAL RECEIPT MODAL) */}
      {/* ========================================================================= */}
      {receiptTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl bg-white text-zinc-900 shadow-2xl p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm">Struk Transaksi Selesai</span>
              <button
                type="button"
                onClick={() => setReceiptTrx(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thermal Print Receipt Paper Styling */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-zinc-800">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-sm">BARBERSHOP CENDERAWASIH</p>
                <p className="text-[10px] text-zinc-500">{receiptTrx.branch_name}</p>
                <p className="text-[10px] text-zinc-400">Nabire, Papua Tengah</p>
              </div>

              <div className="text-[11px] space-y-0.5 border-b pb-2">
                <div className="flex justify-between">
                  <span>No: {receiptTrx.invoice_no}</span>
                  <span>{receiptTrx.created_at.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {receiptTrx.cashier_name}</span>
                  <span>Jam: {receiptTrx.created_at.slice(11, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Barber: {receiptTrx.barber_name}</span>
                  <span>Bayar: {receiptTrx.payment_method}</span>
                </div>
                <p>Pelanggan: {receiptTrx.customer_name}</p>
              </div>

              <div className="space-y-1.5 border-b pb-2">
                {receiptTrx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div>
                      <p className="font-bold">{it.service_name}</p>
                      <p className="text-[10px] text-zinc-500">{it.qty || 1}x @{formatRupiah(it.price)}</p>
                    </div>
                    <span className="font-bold">{formatRupiah(it.price * (it.qty || 1))}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 font-bold">
                <div className="flex justify-between text-xs">
                  <span>TOTAL</span>
                  <span>{formatRupiah(receiptTrx.total_amount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-zinc-500">
                <p>Terima kasih atas kunjungan Anda!</p>
                <p>Potongan Rapi, Tampil Percaya Diri</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReprintReceipt(receiptTrx)}
                className="flex-1 rounded-xl bg-[#DCA842] hover:bg-[#C5922E] text-zinc-950 font-bold py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptTrx(null)}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
