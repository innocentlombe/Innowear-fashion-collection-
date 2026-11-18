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
  StoreSettings,
  LoyaltyTier,
} from '../types';
import { INITIAL_STATE } from '../data/seedData';

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
  adjustStock: (productId: string, size: string, delta: number) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalSpent' | 'ordersCount' | 'points' | 'tier' | 'joinedDate'>) => Customer;
  advanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  advanceDeliveryStatus: (deliveryId: string, nextStatus: DeliveryStatus) => void;
  addDelivery: (delivery: Omit<Delivery, 'id' | 'trackingCode' | 'dispatchedAt'>) => void;
  addTransaction: (txn: Omit<Transaction, 'id'>) => void;
  settleTransaction: (txnId: string) => void;
  updateStaffAttendance: (staffId: string, status: AttendanceStatus) => void;
  addStaffMember: (member: Omit<StaffMember, 'id' | 'salesAchieved'>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'balanceOwed'>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'createdDate' | 'totalCost'>) => void;
  receivePurchaseOrder: (poId: string) => void;
  redeemLoyaltyReward: (customerId: string, rewardId: string) => boolean;
  awardBonusPoints: (customerId: string, points: number, reason: string) => void;
  addCampaign: (campaign: Omit<PromoCampaign, 'id' | 'spend' | 'reach' | 'conversions'>) => void;
  toggleCampaignStatus: (campaignId: string) => void;
  addAdminUser: (user: Omit<AdminUser, 'id' | 'lastActive'>) => void;
  toggleAdminUserActive: (userId: string) => void;
  updateSettings: (partial: Partial<StoreSettings>) => void;
  resetDemoData: () => void;
}

const InnoWearContext = createContext<InnoWearContextValue | null>(null);

export const InnoWearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed && Array.isArray(parsed.products) && parsed.settings) {
          return parsed;
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

  const isOffline = browserOffline || simulatedOffline;

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
      notify(`Received ${po.poNumber}: +${po.quantity} units added to Inventory & logged in Accounting.`);
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
        isOffline,
        simulatedOffline,
        setSimulatedOffline,
        toast,
        notify,
        setTheme,
        completeSale,
        addProduct,
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
