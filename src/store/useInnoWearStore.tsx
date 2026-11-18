import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  AdminSecurity,
  StoreSettings,
  LoyaltyTier,
} from '../types';
import { INITIAL_STATE } from '../data/seedData';
import { DEFAULT_ADMIN_PASSWORD, hashPassword } from '../utils/auth';

const STORAGE_KEY = 'innowear_bms_state_v1';

export function getProductTotalStock(product: Product): number {
  return Object.values(product.stockBySize).reduce((sum, n) => sum + n, 0);
}

export function computeTier(totalSpent: number): LoyaltyTier {
  if (totalSpent >= 1500) return 'Obsidian';
  if (totalSpent >= 800) return 'Gold';
  if (totalSpent >= 400) return 'Silver';
  return 'Bronze';
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
  cashTendered?: number;
  changeDue?: number;
  receiptNotes?: string;
}

interface InnoWearContextValue {
  state: AppState;
  isOffline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  toast: string | null;
  notify: (msg: string) => void;
  setTheme: (theme: ThemePalette) => void;
  completeSale: (payload: CompleteSalePayload) => Order;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProductImage: (productId: string, image: string) => void;
  deleteProduct: (productId: string) => void;
  adjustStock: (productId: string, size: string, delta: number) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'ordersCount' | 'points' | 'tier' | 'joinedDate'>) => Customer;
  deleteCustomer: (customerId: string) => void;
  advanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  deleteOrder: (orderId: string) => void;
  advanceDeliveryStatus: (deliveryId: string, nextStatus: DeliveryStatus) => void;
  addDelivery: (delivery: Omit<Delivery, 'id' | 'trackingCode' | 'dispatchedAt'>) => void;
  deleteDelivery: (deliveryId: string) => void;
  addTransaction: (txn: Omit<Transaction, 'id'>) => void;
  settleTransaction: (txnId: string) => void;
  deleteTransaction: (txnId: string) => void;
  updateStaffAttendance: (staffId: string, status: AttendanceStatus) => void;
  addStaffMember: (member: Omit<StaffMember, 'id' | 'salesAchieved'>) => void;
  deleteStaffMember: (staffId: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'balanceOwed'>) => void;
  deleteSupplier: (supplierId: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'createdDate' | 'totalCost'>) => void;
  receivePurchaseOrder: (poId: string) => void;
  deletePurchaseOrder: (poId: string) => void;
  redeemLoyaltyReward: (customerId: string, rewardId: string) => boolean;
  awardBonusPoints: (customerId: string, points: number, reason: string) => void;
  deleteLoyaltyReward: (rewardId: string) => void;
  addCampaign: (campaign: Omit<PromoCampaign, 'id' | 'spend' | 'reach' | 'conversions'>) => void;
  toggleCampaignStatus: (campaignId: string) => void;
  deleteCampaign: (campaignId: string) => void;
  addAdminUser: (user: Omit<AdminUser, 'id' | 'lastActive'>) => void;
  toggleAdminUserActive: (userId: string) => void;
  deleteAdminUser: (userId: string) => void;
  updateSettings: (partial: Partial<StoreSettings>) => void;
  updateOwnerProfile: (partial: {
    ownerName?: string;
    ownerTitle?: string;
    ownerPhoto?: string;
  }) => void;
  isAdminUnlocked: boolean;
  isWorkspaceLocked: boolean;
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin: () => void;
  unlockWorkspace: (password: string) => Promise<boolean>;
  lockWorkspace: () => void;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateAdminSecurity: (
    partial: Partial<Pick<AdminSecurity, 'protectAdminPanel' | 'requireLoginOnStart'>>
  ) => void;
  resetDemoData: () => void;
}

const InnoWearContext = createContext<InnoWearContextValue | null>(null);

export const InnoWearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        if (parsed && Array.isArray(parsed.products) && parsed.settings) {
          const hydratedCurrency =
            !parsed.settings.currencySymbol || parsed.settings.currencySymbol === '$'
              ? 'K'
              : parsed.settings.currencySymbol;
          const hydratedRewards = Array.isArray(parsed.loyaltyRewards)
            ? parsed.loyaltyRewards.map((r) => ({
                ...r,
                title: r.title.replace(/\$(\d)/g, 'K$1'),
              }))
            : INITIAL_STATE.loyaltyRewards;
          return {
            ...INITIAL_STATE,
            ...parsed,
            loyaltyRewards: hydratedRewards,
            settings: {
              ...INITIAL_STATE.settings,
              ...(parsed.settings || {}),
              currencySymbol: hydratedCurrency,
            },
            adminSecurity: {
              ...INITIAL_STATE.adminSecurity,
              ...(parsed.adminSecurity || {}),
            },
          } as AppState;
        }
      }
    } catch {
      // Ignore storage errors and use initial seed
    }
    return INITIAL_STATE;
  });

  const [browserOffline, setBrowserOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(
    () => !state.adminSecurity.protectAdminPanel
  );
  const [isWorkspaceLocked, setIsWorkspaceLocked] = useState<boolean>(
    () => state.adminSecurity.requireLoginOnStart
  );

  const isOffline = browserOffline || simulatedOffline;

  // Initialize hashed default password once if empty
  useEffect(() => {
    if (state.adminSecurity.passwordHash) return;
    let active = true;
    hashPassword(DEFAULT_ADMIN_PASSWORD).then((digest) => {
      if (!active) return;
      setState((prev) =>
        prev.adminSecurity.passwordHash
          ? prev
          : {
              ...prev,
              adminSecurity: {
                ...prev.adminSecurity,
                passwordHash: digest,
              },
            }
      );
    });
    return () => {
      active = false;
    };
  }, [state.adminSecurity.passwordHash]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Handle quota error silently
    }
  }, [state]);

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

  const setTheme = useCallback((theme: ThemePalette) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const completeSale = useCallback(
    (payload: CompleteSalePayload): Order => {
      const subtotal = payload.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

      // Validate promo code
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
        needsCourier && subtotal < state.settings.freeDeliveryThreshold
          ? state.settings.deliveryFeeStandard
          : 0;
      const total = Number((taxable + tax + deliveryFee).toFixed(2));

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
        total,
        staffName: payload.staffName,
        deliveryAddress: payload.deliveryAddress,
        cashTendered: payload.cashTendered,
        changeDue: payload.changeDue,
        pointsEarned: earnedPoints,
        pointsRedeemed: payload.pointsRedeemed || 0,
        receiptNotes: payload.receiptNotes?.trim() || undefined,
      };

      setState((prev) => {
        // 1. Deduct inventory stock
        const products = prev.products.map((p) => {
          const matching = payload.items.filter((i) => i.productId === p.id);
          if (matching.length === 0) return p;
          const nextStock = { ...p.stockBySize };
          for (const item of matching) {
            nextStock[item.size] = Math.max(0, (nextStock[item.size] ?? 0) - item.qty);
          }
          return { ...p, stockBySize: nextStock };
        });

        // 2. Update or create CRM customer & Loyalty points
        let customers = [...prev.customers];
        const earnedPoints = Math.round(total * prev.settings.pointsPerDollar);
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

        // 3. Record Accounting transaction
        const newTxn: Transaction = {
          id: `txn-${Date.now()}`,
          date: todayDate(),
          type: payload.paymentMethod === 'Cash on Delivery' ? 'Debt Receivable' : 'Income',
          category:
            payload.channel === 'POS' ? 'POS Boutique Sales' : 'Online Store Sales',
          description: `Order ${orderNumber} — ${newOrder.customerName}`,
          amount: total,
          reference: orderNumber,
          status: payload.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Settled',
        };

        // 4. Create Delivery record if Online order
        const deliveries = [...prev.deliveries];
        if (payload.channel === 'Online') {
          const isCollection = payload.deliveryType === 'Store Collection';
          deliveries.unshift({
            id: `del-${Date.now()}`,
            trackingCode: `${isCollection ? 'COL' : 'TRK'}-${Math.floor(10000 + Math.random() * 89999)}`,
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

        // 5. Update Marketing campaign conversions if promo applied
        const campaigns = prev.campaigns.map((c) =>
          appliedPromo && c.id === appliedPromo.id
            ? { ...c, conversions: c.conversions + 1 }
            : c
        );

        // 6. Credit Staff member sales if POS
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
          deliveries,
          transactions: [newTxn, ...prev.transactions],
          campaigns,
          staff,
          lastSyncedAt: timestamp,
        };
      });

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

  const updateProductImage = useCallback(
    (productId: string, image: string) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === productId ? { ...p, image } : p)),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Product picture updated across Inventory, POS, and Online Store.');
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
      notify('Product removed from Inventory and Online Store.');
    },
    [notify]
  );

  const adjustStock = useCallback(
    (productId: string, size: string, delta: number) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          if (p.id !== productId) return p;
          const nextQty = Math.max(0, (p.stockBySize[size] ?? 0) + delta);
          return { ...p, stockBySize: { ...p.stockBySize, [size]: nextQty } };
        }),
        lastSyncedAt: nowTimestamp(),
      }));
    },
    []
  );

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
        points: 50, // Welcome bonus points
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

  const deleteCustomer = useCallback(
    (customerId: string) => {
      setState((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== customerId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Customer profile deleted from CRM.');
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

        // Sync matching delivery & COD accounting entry
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

  const deleteOrder = useCallback(
    (orderId: string) => {
      setState((prev) => ({
        ...prev,
        orders: prev.orders.filter((o) => o.id !== orderId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Order deleted from order records.');
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
              if (nextStatus === 'In Transit') return { ...o, fulfillmentStatus: 'Dispatched' as const };
              if (nextStatus === 'Delivered')
                return { ...o, fulfillmentStatus: 'Delivered' as const, paymentStatus: 'Paid' as const };
              if (nextStatus === 'Collected')
                return { ...o, fulfillmentStatus: 'Collected' as const, paymentStatus: 'Paid' as const };
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

  const deleteDelivery = useCallback(
    (deliveryId: string) => {
      setState((prev) => ({
        ...prev,
        deliveries: prev.deliveries.filter((d) => d.id !== deliveryId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Delivery dispatch record deleted.');
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

  const deleteTransaction = useCallback(
    (txnId: string) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txnId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Financial entry deleted from ledger.');
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

  const deleteStaffMember = useCallback(
    (staffId: string) => {
      setState((prev) => ({
        ...prev,
        staff: prev.staff.filter((s) => s.id !== staffId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Staff member removed from directory.');
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

  const deleteSupplier = useCallback(
    (supplierId: string) => {
      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.filter((s) => s.id !== supplierId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Supplier removed from directory.');
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
      notify(`Received ${po.poNumber}: +${po.quantity} units added to Inventory & logged in Accounting.`);
    },
    [state.purchaseOrders, notify]
  );

  const deletePurchaseOrder = useCallback(
    (poId: string) => {
      setState((prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.filter((p) => p.id !== poId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Purchase order deleted.');
    },
    [notify]
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

  const deleteLoyaltyReward = useCallback(
    (rewardId: string) => {
      setState((prev) => ({
        ...prev,
        loyaltyRewards: prev.loyaltyRewards.filter((r) => r.id !== rewardId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Loyalty reward voucher deleted.');
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

  const deleteCampaign = useCallback(
    (campaignId: string) => {
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('Marketing campaign deleted.');
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

  const deleteAdminUser = useCallback(
    (userId: string) => {
      setState((prev) => ({
        ...prev,
        adminUsers: prev.adminUsers.filter((u) => u.id !== userId || u.role === 'Owner'),
        lastSyncedAt: nowTimestamp(),
      }));
      notify('User removed from Admin Access.');
    },
    [notify]
  );

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

  const updateOwnerProfile = useCallback(
    (partial: { ownerName?: string; ownerTitle?: string; ownerPhoto?: string }) => {
      setState((prev) => {
        const nextOwnerName =
          partial.ownerName !== undefined
            ? partial.ownerName.trim() || prev.settings.ownerName
            : prev.settings.ownerName;
        const nextOwnerTitle =
          partial.ownerTitle !== undefined
            ? partial.ownerTitle.trim() || prev.settings.ownerTitle
            : prev.settings.ownerTitle;
        const nextOwnerPhoto =
          partial.ownerPhoto !== undefined ? partial.ownerPhoto : prev.settings.ownerPhoto;

        const adminUsers = prev.adminUsers.map((u) =>
          u.role === 'Owner' ? { ...u, name: nextOwnerName } : u
        );

        return {
          ...prev,
          adminUsers,
          settings: {
            ...prev.settings,
            ownerName: nextOwnerName,
            ownerTitle: nextOwnerTitle,
            ownerPhoto: nextOwnerPhoto,
          },
          lastSyncedAt: nowTimestamp(),
        };
      });
      notify(
        partial.ownerPhoto !== undefined
          ? partial.ownerPhoto
            ? 'Owner picture uploaded and saved.'
            : 'Owner picture removed.'
          : 'Owner profile updated.'
      );
    },
    [notify]
  );

  const verifyPassword = useCallback(
    async (candidate: string): Promise<boolean> => {
      const candidateHash = await hashPassword(candidate);
      const expectedHash =
        state.adminSecurity.passwordHash || (await hashPassword(DEFAULT_ADMIN_PASSWORD));
      return candidateHash === expectedHash;
    },
    [state.adminSecurity.passwordHash]
  );

  const unlockAdmin = useCallback(
    async (password: string): Promise<boolean> => {
      const ok = await verifyPassword(password);
      if (ok) {
        setIsAdminUnlocked(true);
        notify('Admin Control unlocked for this session.');
      }
      return ok;
    },
    [verifyPassword, notify]
  );

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
    notify('Admin Control locked.');
  }, [notify]);

  const unlockWorkspace = useCallback(
    async (password: string): Promise<boolean> => {
      const ok = await verifyPassword(password);
      if (ok) {
        setIsWorkspaceLocked(false);
        setIsAdminUnlocked(true);
        notify('InnoWear workspace unlocked.');
      }
      return ok;
    },
    [verifyPassword, notify]
  );

  const lockWorkspace = useCallback(() => {
    setIsAdminUnlocked(false);
    setIsWorkspaceLocked(true);
  }, []);

  const changeAdminPassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const matches = await verifyPassword(currentPassword);
      if (!matches) {
        return { ok: false, error: 'Current admin password is incorrect.' };
      }
      if (newPassword.trim().length < 4) {
        return { ok: false, error: 'New password must be at least 4 characters.' };
      }
      const nextHash = await hashPassword(newPassword);
      const timestamp = nowTimestamp();
      setState((prev) => ({
        ...prev,
        adminSecurity: {
          ...prev.adminSecurity,
          passwordHash: nextHash,
          isDefaultPassword: false,
          passwordUpdatedAt: timestamp,
        },
        lastSyncedAt: timestamp,
      }));
      notify('Admin password updated and encrypted locally.');
      return { ok: true };
    },
    [verifyPassword, notify]
  );

  const updateAdminSecurity = useCallback(
    (partial: Partial<Pick<AdminSecurity, 'protectAdminPanel' | 'requireLoginOnStart'>>) => {
      setState((prev) => ({
        ...prev,
        adminSecurity: {
          ...prev.adminSecurity,
          ...partial,
        },
        lastSyncedAt: nowTimestamp(),
      }));
      if (partial.protectAdminPanel === false) {
        setIsAdminUnlocked(true);
      }
      notify('Security preferences updated.');
    },
    [notify]
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    setIsAdminUnlocked(false);
    setIsWorkspaceLocked(false);
    notify('Workspace restored to initial InnoWear Fashion Collection dataset.');
  }, [notify]);

  return (
    <InnoWearContext.Provider
      value={{
        state,
        isOffline,
        simulatedOffline,
        setSimulatedOffline,
        toast,
        notify,
        setTheme,
        completeSale,
        addProduct,
        updateProductImage,
        deleteProduct,
        adjustStock,
        addCustomer,
        deleteCustomer,
        advanceOrderStatus,
        deleteOrder,
        advanceDeliveryStatus,
        addDelivery,
        deleteDelivery,
        addTransaction,
        settleTransaction,
        deleteTransaction,
        updateStaffAttendance,
        addStaffMember,
        deleteStaffMember,
        addSupplier,
        deleteSupplier,
        createPurchaseOrder,
        receivePurchaseOrder,
        deletePurchaseOrder,
        redeemLoyaltyReward,
        awardBonusPoints,
        deleteLoyaltyReward,
        addCampaign,
        toggleCampaignStatus,
        deleteCampaign,
        addAdminUser,
        toggleAdminUserActive,
        deleteAdminUser,
        updateSettings,
        updateOwnerProfile,
        isAdminUnlocked,
        isWorkspaceLocked,
        unlockAdmin,
        lockAdmin,
        unlockWorkspace,
        lockWorkspace,
        changeAdminPassword,
        updateAdminSecurity,
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
