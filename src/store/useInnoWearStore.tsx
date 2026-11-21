import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  AppState,
  ThemePalette,
  Product,
  Customer,
  Order,
  OrderItem,
  OrderChannel,
  PaymentMethod,
  OrderStatus,
  Delivery,
  DeliveryStatus,
  Transaction,
  StaffMember,
  AttendanceStatus,
  Supplier,
  PurchaseOrder,
  PromoCampaign,
  AdminUser,
  StoreSettings,
  LoyaltyTier,
  BusinessDocument,
  AdminSecurity,
  AppNotification,
} from '../types';
import { INITIAL_STATE } from '../data/seedData';
import {
  playOrderNotificationChime,
  triggerBrowserOrderNotification,
} from '../utils/sound';

const STORAGE_KEY = 'innowear_bms_state_v2';

export function getProductTotalStock(product: Product): number {
  return Object.values(product.stockBySize).reduce((sum, n) => sum + n, 0);
}

export function computeTier(totalSpent: number): LoyaltyTier {
  if (totalSpent >= 1500) return 'Obsidian';
  if (totalSpent >= 800) return 'Gold';
  if (totalSpent >= 400) return 'Silver';
  return 'Bronze';
}

export function computePaymentCharge(
  taxableAmount: number,
  settings: StoreSettings,
  applyCharge: boolean
): number {
  if (!applyCharge || !settings.paymentChargeEnabled || taxableAmount <= 0) return 0;
  if (settings.paymentChargeType === 'percent') {
    return Number(((taxableAmount * settings.paymentChargeValue) / 100).toFixed(2));
  }
  return Number((settings.paymentChargeValue || 0).toFixed(2));
}

function nowTimestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function todayDate(): string {
  return nowTimestamp().slice(0, 10);
}

function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  if (!raw || typeof raw !== 'object') return INITIAL_STATE;
  return {
    ...INITIAL_STATE,
    ...raw,
    settings: {
      ...INITIAL_STATE.settings,
      ...(raw.settings || {}),
    },
    adminSecurity: {
      ...INITIAL_STATE.adminSecurity,
      ...(raw.adminSecurity || {}),
    },
    products: Array.isArray(raw.products) ? raw.products : INITIAL_STATE.products,
    customers: Array.isArray(raw.customers) ? raw.customers : INITIAL_STATE.customers,
    orders: Array.isArray(raw.orders) ? raw.orders : INITIAL_STATE.orders,
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    deliveries: Array.isArray(raw.deliveries) ? raw.deliveries : INITIAL_STATE.deliveries,
    transactions: Array.isArray(raw.transactions) ? raw.transactions : INITIAL_STATE.transactions,
    staff: Array.isArray(raw.staff) ? raw.staff : INITIAL_STATE.staff,
    suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : INITIAL_STATE.suppliers,
    purchaseOrders: Array.isArray(raw.purchaseOrders)
      ? raw.purchaseOrders
      : INITIAL_STATE.purchaseOrders,
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : INITIAL_STATE.campaigns,
    loyaltyRewards: Array.isArray(raw.loyaltyRewards)
      ? raw.loyaltyRewards
      : INITIAL_STATE.loyaltyRewards,
    adminUsers: Array.isArray(raw.adminUsers) ? raw.adminUsers : INITIAL_STATE.adminUsers,
    documents: Array.isArray(raw.documents) ? raw.documents : INITIAL_STATE.documents,
  };
}

export interface CompleteSalePayload {
  items: OrderItem[];
  channel: OrderChannel;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  deliveryType?: 'Courier Dispatch' | 'Store Collection';
  promoCode?: string;
  pointsRedeemed?: number;
  staffName?: string;
  applyPaymentCharge?: boolean;
}

interface InnoWearContextValue {
  state: AppState;
  isHydrated: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  pendingSync: boolean;
  serverRevision: number;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  toast: string | null;
  notify: (msg: string) => void;
  adminUnlocked: boolean;
  hasAdminSession: boolean;
  verifyAdminPassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  lockAdminPanel: () => void;
  updateAdminSecurity: (partial: Partial<AdminSecurity>) => void;
  setTheme: (theme: ThemePalette) => void;
  completeSale: (payload: CompleteSalePayload) => Order;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (productId: string, partial: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  adjustStock: (productId: string, size: string, delta: number) => void;
  addCustomer: (
    customer: Omit<
      Customer,
      'id' | 'totalSpent' | 'ordersCount' | 'points' | 'tier' | 'joinedDate'
    >
  ) => Customer;
  advanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  advanceDeliveryStatus: (deliveryId: string, nextStatus: DeliveryStatus) => void;
  addDelivery: (delivery: Omit<Delivery, 'id' | 'trackingCode' | 'dispatchedAt'>) => void;
  addTransaction: (txn: Omit<Transaction, 'id'>) => void;
  settleTransaction: (txnId: string) => void;
  updateStaffAttendance: (staffId: string, status: AttendanceStatus) => void;
  addStaffMember: (member: Omit<StaffMember, 'id' | 'salesAchieved'>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'balanceOwed'>) => void;
  createPurchaseOrder: (
    po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'createdDate' | 'totalCost'>
  ) => void;
  receivePurchaseOrder: (poId: string) => void;
  redeemLoyaltyReward: (customerId: string, rewardId: string) => boolean;
  awardBonusPoints: (customerId: string, points: number, reason: string) => void;
  addCampaign: (campaign: Omit<PromoCampaign, 'id' | 'spend' | 'reach' | 'conversions'>) => void;
  toggleCampaignStatus: (campaignId: string) => void;
  addAdminUser: (user: Omit<AdminUser, 'id' | 'lastActive'>) => void;
  toggleAdminUserActive: (userId: string) => void;
  addDocument: (doc: Omit<BusinessDocument, 'id' | 'uploadedAt'>) => void;
  deleteDocument: (docId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (partial: Partial<StoreSettings>) => void;
  resetDemoData: () => void;
}

const InnoWearContext = createContext<InnoWearContextValue | null>(null);

export const InnoWearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return normalizeState(JSON.parse(raw) as Partial<AppState>);
      }
    } catch {
      // Ignore storage read error
    }
    return INITIAL_STATE;
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [serverRevision, setServerRevision] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  const [browserOffline, setBrowserOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Admin session token held strictly in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const isOffline = browserOffline || simulatedOffline;
  const skipNextSyncRef = useRef(true);
  const syncTimerRef = useRef<number | null>(null);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Persist locally on every state update
  useEffect(() => {
    if (!state.settings.offlineSyncEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Handle quota error silently
    }
  }, [state]);

  const pushStateToServer = useCallback(
    async (targetState: AppState, tokenOverride?: string | null) => {
      if (isOffline) {
        setPendingSync(true);
        return;
      }
      setIsSyncing(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const effectiveToken = tokenOverride ?? adminToken;
        if (effectiveToken) {
          headers.Authorization = `Bearer ${effectiveToken}`;
        }
        const res = await fetch('/api/store', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ state: targetState }),
        });
        if (res.ok) {
          const data = (await res.json()) as { revision?: number };
          if (typeof data.revision === 'number') setServerRevision(data.revision);
          setPendingSync(false);
        } else {
          setPendingSync(true);
        }
      } catch {
        setPendingSync(true);
      } finally {
        setIsSyncing(false);
      }
    },
    [isOffline, adminToken]
  );

  // Initial load from server-backed persistent JSON store
  useEffect(() => {
    let active = true;
    const loadFromServer = async () => {
      try {
        const res = await fetch('/api/store');
        if (!res.ok) {
          if (active) setIsHydrated(true);
          return;
        }
        const data = (await res.json()) as {
          exists: boolean;
          revision: number;
          state?: Partial<AppState>;
        };
        if (!active) return;
        if (data.exists && data.state) {
          skipNextSyncRef.current = true;
          const hydrated = normalizeState(data.state);
          setState(hydrated);
          setServerRevision(data.revision || 0);
        } else {
          // Seed server store with initial state on first run
          void pushStateToServer(latestStateRef.current);
        }
      } catch {
        // Offline or server unavailable; keep localStorage copy
      } finally {
        if (active) setIsHydrated(true);
      }
    };
    void loadFromServer();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server sync after local state edits
  useEffect(() => {
    if (!isHydrated) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (isOffline) {
      setPendingSync(true);
      return;
    }
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      void pushStateToServer(state);
    }, 350);

    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [state, isHydrated, isOffline, pushStateToServer]);

  // Flush pending sync when connectivity returns
  useEffect(() => {
    if (!isOffline && pendingSync && isHydrated) {
      void pushStateToServer(latestStateRef.current);
    }
  }, [isOffline, pendingSync, isHydrated, pushStateToServer]);

  useEffect(() => {
    const onOnline = () => setBrowserOffline(false);
    const onOffline = () => setBrowserOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const hasAdminSession = Boolean(adminToken);
  const adminUnlocked = !state.adminSecurity.protectAdminPanel || hasAdminSession;

  const verifyAdminPassword = useCallback(async (password: string) => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !data.ok || !data.token) {
        return { ok: false, error: data.error || 'Verification failed.' };
      }
      setAdminToken(data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to reach verification server.' };
    }
  }, []);

  const changeAdminPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
        const res = await fetch('/api/admin/password', {
          method: 'POST',
          headers,
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          token?: string;
          passwordUpdatedAt?: string;
          revision?: number;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Could not update passcode.' };
        }
        if (data.token) setAdminToken(data.token);
        if (typeof data.revision === 'number') setServerRevision(data.revision);
        skipNextSyncRef.current = true;
        setState((prev) => ({
          ...prev,
          adminSecurity: {
            ...prev.adminSecurity,
            isDefaultPassword: false,
            hasPassword: true,
            passwordUpdatedAt: data.passwordUpdatedAt || nowTimestamp(),
          },
        }));
        notify('Administrator passcode updated securely.');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Unable to reach server while updating passcode.' };
      }
    },
    [adminToken, notify]
  );

  const lockAdminPanel = useCallback(() => {
    setAdminToken(null);
    notify('Admin panel locked.');
  }, [notify]);

  const updateAdminSecurity = useCallback(
    (partial: Partial<AdminSecurity>) => {
      setState((prev) => ({
        ...prev,
        adminSecurity: { ...prev.adminSecurity, ...partial },
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Admin security preferences saved.');
    },
    [notify]
  );

  const setTheme = useCallback((theme: ThemePalette) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const completeSale = useCallback(
    (payload: CompleteSalePayload): Order => {
      const subtotal = payload.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

      let promoDiscount = 0;
      let appliedPromo: PromoCampaign | undefined;
      if (payload.promoCode) {
        const code = payload.promoCode.trim().toUpperCase();
        appliedPromo = state.campaigns.find(
          (c) => c.promoCode.toUpperCase() === code && c.status === 'Active'
        );
        if (appliedPromo) {
          promoDiscount = Number(((subtotal * appliedPromo.discountPercent) / 100).toFixed(2));
        }
      }

      const pointsDiscount = payload.pointsRedeemed
        ? Number((payload.pointsRedeemed * state.settings.pointValueDollars).toFixed(2))
        : 0;
      const discount = Math.min(subtotal, Number((promoDiscount + pointsDiscount).toFixed(2)));
      const taxable = Math.max(0, subtotal - discount);
      const tax = Number(((taxable * state.settings.taxRate) / 100).toFixed(2));
      const needsCourier =
        payload.channel === 'Online' && payload.deliveryType !== 'Store Collection';
      const deliveryFee =
        needsCourier &&
        (state.settings.freeDeliveryThreshold <= 0 ||
          subtotal < state.settings.freeDeliveryThreshold)
          ? state.settings.deliveryFeeStandard
          : 0;

      const applyCharge =
        payload.applyPaymentCharge ??
        (state.settings.paymentChargeEnabled &&
          (payload.paymentMethod === 'Mobile Money' || payload.paymentMethod === 'Card'));
      const paymentCharge = computePaymentCharge(taxable, state.settings, applyCharge);
      const paymentChargeLabel =
        paymentCharge > 0 ? state.settings.paymentChargeLabel || 'Payment Charge' : undefined;

      const total = Number((taxable + tax + deliveryFee + paymentCharge).toFixed(2));

      const orderNumber = `INW-2026-${1049 + state.orders.length}`;
      const orderId = `ord-${Date.now()}`;
      const timestamp = nowTimestamp();
      const earnedPoints = Math.round(total * state.settings.pointsPerDollar);

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        date: timestamp,
        customerId: payload.customerId,
        customerName: payload.customerName || 'Walk-in Guest',
        channel: payload.channel,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentMethod === 'Cash on Delivery' ? 'Pending COD' : 'Paid',
        fulfillmentStatus: payload.channel === 'POS' ? 'Collected' : 'Confirmed',
        items: payload.items,
        subtotal,
        discount,
        promoCode: appliedPromo ? appliedPromo.promoCode : undefined,
        deliveryFee,
        tax,
        paymentCharge: paymentCharge > 0 ? paymentCharge : undefined,
        paymentChargeLabel,
        total,
        staffName: payload.staffName,
        deliveryAddress: payload.deliveryAddress,
        pointsEarned: earnedPoints,
        pointsRedeemed: payload.pointsRedeemed || 0,
      };

      const itemCount = payload.items.reduce((sum, i) => sum + i.qty, 0);
      const newNotification: AppNotification = {
        id: `ntf-${Date.now()}`,
        orderId,
        orderNumber,
        channel: payload.channel,
        customerName: newOrder.customerName,
        total,
        itemCount,
        paymentMethod: payload.paymentMethod,
        message:
          payload.channel === 'POS'
            ? `New POS sale recorded by ${payload.staffName || 'POS Terminal'}`
            : `New online storefront order placed by ${newOrder.customerName}`,
        timestamp,
        read: false,
      };

      setState((prev) => {
        const products = prev.products.map((p) => {
          const matching = payload.items.filter((i) => i.productId === p.id);
          if (matching.length === 0) return p;
          const nextStock = { ...p.stockBySize };
          for (const item of matching) {
            nextStock[item.size] = Math.max(0, (nextStock[item.size] ?? 0) - item.qty);
          }
          return { ...p, stockBySize: nextStock };
        });

        let customers = [...prev.customers];
        const existingIdx = payload.customerId
          ? customers.findIndex((c) => c.id === payload.customerId)
          : payload.customerEmail
          ? customers.findIndex(
              (c) => c.email.toLowerCase() === payload.customerEmail!.toLowerCase()
            )
          : -1;

        if (existingIdx >= 0) {
          const cur = customers[existingIdx];
          const nextSpent = Number((cur.totalSpent + total).toFixed(2));
          const nextPoints = Math.max(
            0,
            cur.points - (payload.pointsRedeemed || 0) + earnedPoints
          );
          customers[existingIdx] = {
            ...cur,
            totalSpent: nextSpent,
            ordersCount: cur.ordersCount + 1,
            points: nextPoints,
            tier: computeTier(nextSpent),
          };
        } else if (payload.customerName && payload.customerName !== 'Walk-in Guest') {
          const newCust: Customer = {
            id: `cus-${Date.now()}`,
            name: payload.customerName,
            phone: payload.customerPhone || 'Not provided',
            email: payload.customerEmail || 'guest@innowear.co',
            address: payload.deliveryAddress || 'Boutique Pickup',
            preferredSize: payload.items[0]?.size || 'M',
            preferredStyle: payload.items[0]?.name.split(' ')[0] || 'Contemporary',
            totalSpent: total,
            ordersCount: 1,
            points: earnedPoints,
            tier: computeTier(total),
            joinedDate: todayDate(),
          };
          customers = [newCust, ...customers];
          newOrder.customerId = newCust.id;
        }

        const chargeNote =
          paymentCharge > 0
            ? ` (incl. ${prev.settings.currencySymbol}${paymentCharge.toFixed(2)} ${paymentChargeLabel})`
            : '';
        const newTxn: Transaction = {
          id: `txn-${Date.now()}`,
          date: todayDate(),
          type: payload.paymentMethod === 'Cash on Delivery' ? 'Debt Receivable' : 'Income',
          category:
            payload.channel === 'POS' ? 'POS Boutique Sales' : 'Online Store Sales',
          description: `Order ${orderNumber} — ${newOrder.customerName}${chargeNote}`,
          amount: total,
          reference: orderNumber,
          status: payload.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Settled',
        };

        const deliveries = [...prev.deliveries];
        if (payload.channel === 'Online') {
          const isCollection = payload.deliveryType === 'Store Collection';
          deliveries.unshift({
            id: `del-${Date.now()}`,
            trackingCode: `${isCollection ? 'COL' : 'TRK'}-${Math.floor(
              10000 + Math.random() * 89999
            )}`,
            orderNumber,
            customerName: newOrder.customerName,
            phone: payload.customerPhone || '+260 97 000 0000',
            destination: isCollection
              ? 'InnoWear Flagship Boutique'
              : payload.deliveryAddress || 'Lusaka City Center',
            type: isCollection ? 'Store Collection' : 'Courier Dispatch',
            courierName: isCollection ? 'Front Desk Concierge' : 'SwiftLine Express',
            fee: deliveryFee,
            status: isCollection ? 'Ready for Collection' : 'Awaiting Pickup',
            dispatchedAt: timestamp,
            eta: isCollection ? 'Ready within 2 hrs' : 'Within 24 hrs',
          });
        }

        const campaigns = prev.campaigns.map((c) =>
          appliedPromo && c.id === appliedPromo.id
            ? { ...c, conversions: c.conversions + 1 }
            : c
        );

        const staff = prev.staff.map((s) =>
          payload.staffName && s.name === payload.staffName
            ? { ...s, salesAchieved: Number((s.salesAchieved + total).toFixed(2)) }
            : s
        );

        return {
          ...prev,
          products,
          customers,
          orders: [newOrder, ...prev.orders],
          notifications: [newNotification, ...prev.notifications].slice(0, 50),
          deliveries,
          transactions: [newTxn, ...prev.transactions],
          campaigns,
          staff,
          lastSyncedAt: timestamp,
        };
      });

      if (state.settings.orderNotifications) {
        if (state.settings.notificationSoundEnabled) {
          playOrderNotificationChime();
        }
        if (state.settings.browserNotificationsEnabled) {
          triggerBrowserOrderNotification(
            `${orderNumber} (${payload.channel})`,
            `${newOrder.customerName} · ${state.settings.currencySymbol}${total.toFixed(2)}`
          );
        }
      }

      notify(`Order ${orderNumber} saved and synced across Inventory, CRM, and Accounting.`);
      return newOrder;
    },
    [state.campaigns, state.orders.length, state.settings, notify]
  );

  const addProduct = useCallback(
    (product: Omit<Product, 'id'>) => {
      const created: Product = { ...product, id: `prod-${Date.now()}` };
      setState((prev) => ({
        ...prev,
        products: [created, ...prev.products],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Added "${product.name}" to Inventory and Online Store.`);
    },
    [notify]
  );

  const updateProduct = useCallback(
    (productId: string, partial: Partial<Product>) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === productId ? { ...p, ...partial } : p)),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Product details updated.');
    },
    [notify]
  );

  const deleteProduct = useCallback(
    (productId: string) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Product removed from catalog.');
    },
    [notify]
  );

  const adjustStock = useCallback((productId: string, size: string, delta: number) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        if (p.id !== productId) return p;
        const nextQty = Math.max(0, (p.stockBySize[size] ?? 0) + delta);
        return { ...p, stockBySize: { ...p.stockBySize, [size]: nextQty } };
      }),
      lastSyncedAt: nowTimestamp(),
    }));
  }, []);

  const addCustomer = useCallback(
    (
      customer: Omit<
        Customer,
        'id' | 'totalSpent' | 'ordersCount' | 'points' | 'tier' | 'joinedDate'
      >
    ): Customer => {
      const created: Customer = {
        ...customer,
        id: `cus-${Date.now()}`,
        totalSpent: 0,
        ordersCount: 0,
        points: 50,
        tier: 'Bronze',
        joinedDate: todayDate(),
      };
      setState((prev) => ({
        ...prev,
        customers: [created, ...prev.customers],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Added ${customer.name} to CRM with 50 welcome points.`);
      return created;
    },
    [notify]
  );

  const advanceOrderStatus = useCallback(
    (orderId: string, nextStatus: OrderStatus) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        const orders = prev.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillmentStatus: nextStatus,
                paymentStatus:
                  nextStatus === 'Delivered' || nextStatus === 'Collected'
                    ? ('Paid' as const)
                    : o.paymentStatus,
              }
            : o
        );

        const deliveries = target
          ? prev.deliveries.map((d) => {
              if (d.orderNumber !== target.orderNumber) return d;
              if (nextStatus === 'Dispatched') return { ...d, status: 'In Transit' as const };
              if (nextStatus === 'Delivered') return { ...d, status: 'Delivered' as const };
              if (nextStatus === 'Collected') return { ...d, status: 'Collected' as const };
              return d;
            })
          : prev.deliveries;

        const transactions =
          target && (nextStatus === 'Delivered' || nextStatus === 'Collected')
            ? prev.transactions.map((t) =>
                t.reference === target.orderNumber && t.status === 'Pending'
                  ? { ...t, type: 'Income' as const, status: 'Settled' as const }
                  : t
              )
            : prev.transactions;

        return { ...prev, orders, deliveries, transactions, lastSyncedAt: nowTimestamp() };
      });
      notify(`Order updated to ${nextStatus}.`);
    },
    [notify]
  );

  const advanceDeliveryStatus = useCallback(
    (deliveryId: string, nextStatus: DeliveryStatus) => {
      setState((prev) => {
        const target = prev.deliveries.find((d) => d.id === deliveryId);
        const deliveries = prev.deliveries.map((d) =>
          d.id === deliveryId ? { ...d, status: nextStatus } : d
        );
        const orders = target
          ? prev.orders.map((o) => {
              if (o.orderNumber !== target.orderNumber) return o;
              if (nextStatus === 'In Transit')
                return { ...o, fulfillmentStatus: 'Dispatched' as const };
              if (nextStatus === 'Delivered')
                return {
                  ...o,
                  fulfillmentStatus: 'Delivered' as const,
                  paymentStatus: 'Paid' as const,
                };
              if (nextStatus === 'Collected')
                return {
                  ...o,
                  fulfillmentStatus: 'Collected' as const,
                  paymentStatus: 'Paid' as const,
                };
              return o;
            })
          : prev.orders;
        return { ...prev, deliveries, orders, lastSyncedAt: nowTimestamp() };
      });
      notify(`Delivery parcel updated to ${nextStatus}.`);
    },
    [notify]
  );

  const addDelivery = useCallback(
    (delivery: Omit<Delivery, 'id' | 'trackingCode' | 'dispatchedAt'>) => {
      const created: Delivery = {
        ...delivery,
        id: `del-${Date.now()}`,
        trackingCode: `${delivery.type === 'Store Collection' ? 'COL' : 'TRK'}-${Math.floor(
          10000 + Math.random() * 89999
        )}`,
        dispatchedAt: nowTimestamp(),
      };
      setState((prev) => ({
        ...prev,
        deliveries: [created, ...prev.deliveries],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Scheduled dispatch ${created.trackingCode}.`);
    },
    [notify]
  );

  const addTransaction = useCallback(
    (txn: Omit<Transaction, 'id'>) => {
      const created: Transaction = { ...txn, id: `txn-${Date.now()}` };
      setState((prev) => ({
        ...prev,
        transactions: [created, ...prev.transactions],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Recorded ${txn.type} entry (${txn.reference}).`);
    },
    [notify]
  );

  const settleTransaction = useCallback(
    (txnId: string) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === txnId
            ? {
                ...t,
                status: 'Settled',
                type:
                  t.type === 'Debt Receivable'
                    ? 'Income'
                    : t.type === 'Supplier Payable'
                    ? 'Expense'
                    : t.type,
              }
            : t
        ),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Financial entry marked as Settled.');
    },
    [notify]
  );

  const updateStaffAttendance = useCallback(
    (staffId: string, attendance: AttendanceStatus) => {
      const timeNow = nowTimestamp().slice(11, 16);
      setState((prev) => ({
        ...prev,
        staff: prev.staff.map((s) =>
          s.id === staffId
            ? {
                ...s,
                attendance,
                checkInTime: attendance === 'Present' ? timeNow : undefined,
              }
            : s
        ),
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Staff attendance updated to ${attendance}.`);
    },
    [notify]
  );

  const addStaffMember = useCallback(
    (member: Omit<StaffMember, 'id' | 'salesAchieved'>) => {
      const created: StaffMember = { ...member, id: `stf-${Date.now()}`, salesAchieved: 0 };
      setState((prev) => ({
        ...prev,
        staff: [...prev.staff, created],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Added ${member.name} to Staff Directory.`);
    },
    [notify]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, 'id' | 'balanceOwed'>) => {
      const created: Supplier = { ...supplier, id: `sup-${Date.now()}`, balanceOwed: 0 };
      setState((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, created],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Added supplier ${supplier.name}.`);
    },
    [notify]
  );

  const createPurchaseOrder = useCallback(
    (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'createdDate' | 'totalCost'>) => {
      const totalCost = Number((po.quantity * po.unitCost).toFixed(2));
      const poNumber = `PO-2026-0${93 + state.purchaseOrders.length}`;
      const created: PurchaseOrder = {
        ...po,
        id: `po-${Date.now()}`,
        poNumber,
        totalCost,
        status: 'Ordered',
        createdDate: todayDate(),
      };
      setState((prev) => ({
        ...prev,
        purchaseOrders: [created, ...prev.purchaseOrders],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Created Purchase Order ${poNumber} for ${po.supplierName}.`);
    },
    [state.purchaseOrders.length, notify]
  );

  const receivePurchaseOrder = useCallback(
    (poId: string) => {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po || po.status === 'Received') return;

      setState((prev) => {
        const purchaseOrders = prev.purchaseOrders.map((p) =>
          p.id === poId ? { ...p, status: 'Received' as const } : p
        );
        const products = prev.products.map((prod) => {
          if (prod.id !== po.productId) return prod;
          return {
            ...prod,
            stockBySize: {
              ...prod.stockBySize,
              [po.size]: (prod.stockBySize[po.size] ?? 0) + po.quantity,
            },
          };
        });
        const newExpense: Transaction = {
          id: `txn-${Date.now()}`,
          date: todayDate(),
          type: 'Expense',
          category: 'Wholesale Restock',
          description: `${po.supplierName} — ${po.quantity}x ${po.productName} (${po.size})`,
          amount: po.totalCost,
          reference: po.poNumber,
          status: 'Settled',
        };
        return {
          ...prev,
          purchaseOrders,
          products,
          transactions: [newExpense, ...prev.transactions],
          lastSyncedAt: nowTimestamp(),
        };
      });
      notify(
        `Received ${po.poNumber}: +${po.quantity} units added to Inventory & logged in Accounting.`
      );
    },
    [state.purchaseOrders, notify]
  );

  const redeemLoyaltyReward = useCallback(
    (customerId: string, rewardId: string): boolean => {
      const cust = state.customers.find((c) => c.id === customerId);
      const reward = state.loyaltyRewards.find((r) => r.id === rewardId);
      if (!cust || !reward || cust.points < reward.pointsCost) {
        notify('Insufficient loyalty points for this reward.');
        return false;
      }
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, points: c.points - reward.pointsCost } : c
        ),
        loyaltyRewards: prev.loyaltyRewards.map((r) =>
          r.id === rewardId ? { ...r, redemptions: r.redemptions + 1 } : r
        ),
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Redeemed "${reward.title}" for ${cust.name}.`);
      return true;
    },
    [state.customers, state.loyaltyRewards, notify]
  );

  const awardBonusPoints = useCallback(
    (customerId: string, points: number, reason: string) => {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, points: c.points + points } : c
        ),
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Awarded +${points} loyalty points (${reason}).`);
    },
    [notify]
  );

  const addCampaign = useCallback(
    (campaign: Omit<PromoCampaign, 'id' | 'spend' | 'reach' | 'conversions'>) => {
      const created: PromoCampaign = {
        ...campaign,
        id: `cmp-${Date.now()}`,
        promoCode: campaign.promoCode.toUpperCase().trim(),
        spend: 0,
        reach: 0,
        conversions: 0,
      };
      setState((prev) => ({
        ...prev,
        campaigns: [created, ...prev.campaigns],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Created campaign "${campaign.name}" with code ${created.promoCode}.`);
    },
    [notify]
  );

  const toggleCampaignStatus = useCallback(
    (campaignId: string) => {
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === campaignId
            ? { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' }
            : c
        ),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Campaign status updated.');
    },
    [notify]
  );

  const addAdminUser = useCallback(
    (user: Omit<AdminUser, 'id' | 'lastActive'>) => {
      const created: AdminUser = {
        ...user,
        id: `usr-${Date.now()}`,
        lastActive: 'Invited just now',
      };
      setState((prev) => ({
        ...prev,
        adminUsers: [...prev.adminUsers, created],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Added ${user.name} (${user.role}) to Admin Access.`);
    },
    [notify]
  );

  const toggleAdminUserActive = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      adminUsers: prev.adminUsers.map((u) =>
        u.id === userId ? { ...u, active: !u.active } : u
      ),
      lastSyncedAt: nowTimestamp(),
    }));
  }, []);

  const addDocument = useCallback(
    (doc: Omit<BusinessDocument, 'id' | 'uploadedAt'>) => {
      const created: BusinessDocument = {
        ...doc,
        id: `doc-${Date.now()}`,
        uploadedAt: nowTimestamp(),
      };
      setState((prev) => ({
        ...prev,
        documents: [created, ...prev.documents],
        lastSyncedAt: nowTimestamp(),
      }));
      notify(`Saved "${doc.title}" to Business Documents Vault.`);
    },
    [notify]
  );

  const deleteDocument = useCallback(
    (docId: string) => {
      setState((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== docId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Document removed from archive.');
    },
    [notify]
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<StoreSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
        lastSyncedAt: nowTimestamp(),
      }));
      notify('System settings updated.');
    },
    [notify]
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    notify('Workspace restored to initial InnoWear Fashion Collection dataset.');
  }, [notify]);

  return (
    <InnoWearContext.Provider
      value={{
        state,
        isHydrated,
        isOffline,
        isSyncing,
        pendingSync,
        serverRevision,
        simulatedOffline,
        setSimulatedOffline,
        toast,
        notify,
        adminUnlocked,
        hasAdminSession,
        verifyAdminPassword,
        changeAdminPassword,
        lockAdminPanel,
        updateAdminSecurity,
        setTheme,
        completeSale,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addCustomer,
        advanceOrderStatus,
        advanceDeliveryStatus,
        addDelivery,
        addTransaction,
        settleTransaction,
        updateStaffAttendance,
        addStaffMember,
        addSupplier,
        createPurchaseOrder,
        receivePurchaseOrder,
        redeemLoyaltyReward,
        awardBonusPoints,
        addCampaign,
        toggleCampaignStatus,
        addAdminUser,
        toggleAdminUserActive,
        addDocument,
        deleteDocument,
        markNotificationRead,
        markAllNotificationsRead,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </InnoWearContext.Provider>
  );
};

export function useInnoWear() {
  const ctx = useContext(InnoWearContext);
  if (!ctx) throw new Error('useInnoWear must be used inside InnoWearProvider');
  return ctx;
}
