export type ThemePalette = 'black-gold' | 'blue-black';

export type ModuleId =
  | 'overview'
  | 'pos'
  | 'inventory'
  | 'storefront'
  | 'crm'
  | 'accounting'
  | 'orders'
  | 'delivery'
  | 'staff'
  | 'reports'
  | 'suppliers'
  | 'loyalty'
  | 'marketing'
  | 'admin';

export type ProductCategory =
  | 'Outerwear'
  | 'Tailoring'
  | 'Dresses'
  | 'Footwear'
  | 'Accessories';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  sizes: string[];
  colours: string[];
  stockBySize: Record<string, number>;
  reorderLevel: number;
  isNewArrival: boolean;
  image: string;
  description: string;
  supplierId: string;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Obsidian';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  preferredSize: string;
  preferredStyle: string;
  totalSpent: number;
  ordersCount: number;
  points: number;
  tier: LoyaltyTier;
  joinedDate: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  size: string;
  colour: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export type OrderChannel = 'POS' | 'Online';
export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Money' | 'Cash on Delivery';
export type OrderStatus = 'Confirmed' | 'Packing' | 'Dispatched' | 'Delivered' | 'Collected';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  channel: OrderChannel;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Paid' | 'Pending COD';
  fulfillmentStatus: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  deliveryFee: number;
  tax: number;
  paymentCharge?: number;
  paymentChargeLabel?: string;
  total: number;
  staffName?: string;
  deliveryAddress?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
}

export type DeliveryType = 'Courier Dispatch' | 'Store Collection';
export type DeliveryStatus =
  | 'Awaiting Pickup'
  | 'In Transit'
  | 'Ready for Collection'
  | 'Delivered'
  | 'Collected';

export interface Delivery {
  id: string;
  trackingCode: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  destination: string;
  type: DeliveryType;
  courierName: string;
  fee: number;
  status: DeliveryStatus;
  dispatchedAt: string;
  eta: string;
}

export type TransactionType =
  | 'Income'
  | 'Expense'
  | 'Debt Receivable'
  | 'Supplier Payable';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  reference: string;
  status: 'Settled' | 'Pending';
}

export type AttendanceStatus = 'Present' | 'Off Shift' | 'On Leave';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  shift: string;
  attendance: AttendanceStatus;
  checkInTime?: string;
  monthlyTarget: number;
  salesAchieved: number;
  commissionRate: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  leadTimeDays: number;
  balanceOwed: number;
}

export type PurchaseOrderStatus = 'Ordered' | 'In Transit' | 'Received';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: PurchaseOrderStatus;
  createdDate: string;
}

export interface PromoCampaign {
  id: string;
  name: string;
  channel: 'Instagram & TikTok' | 'Email & SMS' | 'In-Store Event' | 'Paid Search';
  promoCode: string;
  discountPercent: number;
  budget: number;
  spend: number;
  reach: number;
  conversions: number;
  status: 'Active' | 'Scheduled' | 'Paused';
}

export interface LoyaltyReward {
  id: string;
  title: string;
  pointsCost: number;
  discountValue: number;
  description: string;
  redemptions: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Store Manager' | 'Cashier' | 'Logistics Lead' | 'Accountant';
  active: boolean;
  lastActive: string;
  permissions: string[];
}

export interface AppNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  channel: OrderChannel;
  customerName: string;
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface BusinessDocument {
  id: string;
  title: string;
  category: 'Business License' | 'Tax & TPIN' | 'Lease & Property' | 'Supplier Contract' | 'Other';
  referenceNumber: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  uploadedAt: string;
  uploadedBy: string;
  fileDataUrl?: string;
  fileName?: string;
}

export interface AdminSecurity {
  isDefaultPassword: boolean;
  protectAdminPanel: boolean;
  requireLoginOnStart: boolean;
  passwordUpdatedAt: string;
  hasPassword?: boolean;
  envOverrideActive?: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  currencySymbol: string;
  taxRate: number;
  deliveryFeeStandard: number;
  freeDeliveryThreshold: number;
  pointsPerDollar: number;
  pointValueDollars: number;
  lowStockAlerts: boolean;
  orderNotifications: boolean;
  notificationSoundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  offlineSyncEnabled: boolean;
  storeAddress: string;
  storePhone: string;
  taxId: string;
  receiptFooter: string;
  showReceiptQr: boolean;
  defaultReceiptFormat: 'thermal' | 'invoice';
  ownerName: string;
  ownerTitle: string;
  ownerPhoto: string;
  customerOrderingEnabled: boolean;
  businessSlug: string;
  businessAppUrl: string;
  whatsappOrderPhone: string;
  whatsappOrdersEnabled: boolean;
  paymentChargeEnabled: boolean;
  paymentChargeType: 'fixed' | 'percent';
  paymentChargeValue: number;
  paymentChargeLabel: string;
}

export interface AppState {
  theme: ThemePalette;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  notifications: AppNotification[];
  deliveries: Delivery[];
  transactions: Transaction[];
  staff: StaffMember[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  campaigns: PromoCampaign[];
  loyaltyRewards: LoyaltyReward[];
  adminUsers: AdminUser[];
  documents: BusinessDocument[];
  adminSecurity: AdminSecurity;
  settings: StoreSettings;
  lastSyncedAt: string;
}
