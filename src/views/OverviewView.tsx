import React, { useState } from 'react';
import {
  ArrowUpRight,
  AlertTriangle,
  ShoppingBag,
  Store,
  Truck,
  Package,
  Users,
  Wallet,
  Lock,
  Link2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ModuleId } from '../types';
import { useInnoWear, getProductTotalStock } from '../store/useInnoWearStore';
import { buildBusinessAppLinks } from '../utils/appLinks';

interface OverviewViewProps {
  onNavigate: (mod: ModuleId) => void;
  onOpenCustomerAccess?: () => void;
  onSwitchToCashier?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenCustomerAccess,
  onSwitchToCashier,
}) => {
  const { state, isAdminUnlocked, notify } = useInnoWear();
  const [copiedBiz, setCopiedBiz] = useState(false);
  const [copiedShop, setCopiedShop] = useState(false);
  const { businessAppUrl, customerOrderAppUrl } = buildBusinessAppLinks(state.settings);
  const c = state.settings.currencySymbol;
  const adminProtectedIds: ModuleId[] = [
    'inventory',
    'orders',
    'accounting',
    'reports',
    'storefront',
    'crm',
    'delivery',
    'staff',
    'suppliers',
    'loyalty',
    'marketing',
    'documents',
    'admin',
  ];
  const isAdminLocked = !isAdminUnlocked;

  const totalRevenue = state.transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = state.transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const totalUnits = state.products.reduce((sum, p) => sum + getProductTotalStock(p), 0);
  const lowStockProducts = state.products.filter(
    (p) => getProductTotalStock(p) <= p.reorderLevel * 2
  );

  const pendingDeliveries = state.deliveries.filter(
    (d) => d.status !== 'Delivered' && d.status !== 'Collected'
  );

  const activeStaffCount = state.staff.filter((s) => s.attendance === 'Present').length;

  // Build 6-day revenue trend from orders + realistic baseline for earlier days
  const dailySeries = [
    { label: 'Nov 13', amount: 480 },
    { label: 'Nov 14', amount: 640 },
    { label: 'Nov 15', amount: 232 },
    { label: 'Nov 16', amount: 281 },
    { label: 'Nov 17', amount: 551 },
    {
      label: 'Today',
      amount: Math.round(
        state.orders
          .filter((o) => o.date.startsWith('2026-11-18') || o.date.startsWith(new Date().toISOString().slice(0, 10)))
          .reduce((s, o) => s + o.total, 0)
      ) || 583,
    },
  ];
  const maxVal = Math.max(...dailySeries.map((d) => d.amount), 100);

  const systemDirectory: Array<{
    id: ModuleId;
    title: string;
    metric: string;
    detail: string;
  }> = [
    {
      id: 'pos',
      title: 'Cashier Dashboard (POS)',
      metric: `${state.orders.filter((o) => o.channel === 'POS').length} sales`,
      detail: 'Dedicated cashier register & shift receipts (POS only)',
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      metric: `${totalUnits} units`,
      detail: `${state.products.length} styles across sizes & colours`,
    },
    {
      id: 'storefront',
      title: 'Online Shopping Store',
      metric: `${state.orders.filter((o) => o.channel === 'Online' || o.channel === 'WhatsApp').length} orders`,
      detail: 'Customer catalog, WhatsApp & COD checkout',
    },
    {
      id: 'crm',
      title: 'Customer CRM',
      metric: `${state.customers.length} profiles`,
      detail: 'History, size preferences & lifetime spend',
    },
    {
      id: 'accounting',
      title: 'Accounting & Ledger',
      metric: `${c}${netProfit.toFixed(0)} net`,
      detail: 'Income, expenses, debts & payables',
    },
    {
      id: 'orders',
      title: 'Order Management',
      metric: `${state.orders.length} total`,
      detail: 'Payment to packing & dispatch pipeline',
    },
    {
      id: 'delivery',
      title: 'Delivery Management',
      metric: `${pendingDeliveries.length} active`,
      detail: 'Courier tracking, fees & collection',
    },
    {
      id: 'staff',
      title: 'Staff Management',
      metric: `${activeStaffCount}/${state.staff.length} on duty`,
      detail: 'Attendance, shifts & sales targets',
    },
    {
      id: 'reports',
      title: 'Business Reports',
      metric: 'Daily / Weekly / Monthly',
      detail: 'Performance analytics & CSV exports',
    },
    {
      id: 'suppliers',
      title: 'Supplier Management',
      metric: `${state.purchaseOrders.filter((p) => p.status !== 'Received').length} open POs`,
      detail: 'Wholesalers, costs & stock replenishment',
    },
    {
      id: 'loyalty',
      title: 'Customer Loyalty',
      metric: `${state.customers.reduce((s, x) => s + x.points, 0).toLocaleString()} pts`,
      detail: 'Tier rewards & voucher redemptions',
    },
    {
      id: 'marketing',
      title: 'Marketing Campaigns',
      metric: `${state.campaigns.filter((x) => x.status === 'Active').length} live`,
      detail: 'Promo codes, social reach & ROI',
    },
    {
      id: 'documents',
      title: 'Document Keeper',
      metric: `${state.documents.length} stored`,
      detail: 'Licenses, leases, contracts & certificates (Admin only)',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Executive Hero Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[var(--border-hairline)]">
        <div>
          <p className="text-xs text-[var(--accent)] font-medium tracking-wider mb-1">
            {state.settings.storeName}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight text-balance">
            {state.settings.tagline}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-2xl">
            Central command uniting point of sale, fashion inventory, online orders, finance,
            fulfillment, staff, and customer loyalty in one synchronized workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (onSwitchToCashier ? onSwitchToCashier() : onNavigate('pos'))}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            Open Cashier Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('storefront')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0"
          >
            <Store className="w-4 h-4" />
            Open Online Store
          </button>
        </div>
      </div>

      {/* Live Business Application Link Strip */}
      <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {state.settings.storeName} · Business Application Link
            </p>
            <p className="font-mono-tabular text-[11px] text-[var(--accent)] truncate mt-0.5">
              {businessAppUrl}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(businessAppUrl);
                setCopiedBiz(true);
                notify('Business application link copied.');
                setTimeout(() => setCopiedBiz(false), 2000);
              } catch {
                notify('Could not copy link.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors whitespace-nowrap"
          >
            {copiedBiz ? (
              <Check className="w-3.5 h-3.5 text-[var(--status-positive)]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
            )}
            {copiedBiz ? 'App Link Copied' : 'Copy App Link'}
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(customerOrderAppUrl);
                setCopiedShop(true);
                notify('Customer ordering app link copied.');
                setTimeout(() => setCopiedShop(false), 2000);
              } catch {
                notify('Could not copy customer link.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors whitespace-nowrap"
          >
            {copiedShop ? (
              <Check className="w-3.5 h-3.5 text-[var(--status-positive)]" />
            ) : (
              <Store className="w-3.5 h-3.5 text-[var(--accent)]" />
            )}
            {copiedShop ? 'Order Link Copied' : 'Copy Customer Link'}
          </button>

          {onOpenCustomerAccess && (
            <button
              type="button"
              onClick={onOpenCustomerAccess}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
            >
              Share & Open
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Primary 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Settled Revenue</span>
            <Wallet className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {c}
            {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Net profit {c}
            {netProfit.toFixed(2)} · {state.orders.length} orders logged
          </p>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Stock On Hand</span>
            <Package className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {totalUnits} units
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {state.products.length} active styles ·{' '}
            <span className={lowStockProducts.length > 0 ? 'text-[var(--status-warning)] font-medium' : ''}>
              {lowStockProducts.length} need restock
            </span>
          </p>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Active Deliveries</span>
            <Truck className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {pendingDeliveries.length} parcels
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {state.deliveries.filter((d) => d.type === 'Courier Dispatch').length} courier ·{' '}
            {state.deliveries.filter((d) => d.type === 'Store Collection').length} collection
          </p>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Clientele & Loyalty</span>
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-2">
            {state.customers.length} members
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {state.customers.filter((x) => x.tier === 'Obsidian' || x.tier === 'Gold').length}{' '}
            VIP members · {activeStaffCount} staff on duty
          </p>
        </div>
      </div>

      {/* Main Analytics + Operational Queues */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="xl:col-span-2 p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Daily Sales Revenue
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Combined POS boutique and online storefront intake
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
            >
              Full Reports
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-48 pt-4">
            {dailySeries.map((day, idx) => {
              const pct = Math.max(12, Math.round((day.amount / maxVal) * 100));
              const isToday = idx === dailySeries.length - 1;
              return (
                <div key={day.label} className="flex flex-col items-center h-full justify-end">
                  <span className="font-mono-tabular text-xs text-[var(--text-secondary)] mb-2">
                    {c}
                    {day.amount}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-200"
                      style={{
                        height: `${pct}%`,
                        backgroundColor: isToday ? 'var(--accent)' : 'var(--chart-secondary)',
                      }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] mt-2 whitespace-nowrap">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Attention Queue */}
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Operational Alerts
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-5">
              Items requiring immediate store attention
            </p>

            <div className="space-y-4">
              {lowStockProducts.slice(0, 3).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-hairline)] last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Low Stock</span>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                      {prod.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-mono-tabular mt-0.5">
                      {getProductTotalStock(prod)} left · SKU {prod.sku}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('suppliers')}
                    className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0 mt-1"
                  >
                    Restock
                  </button>
                </div>
              ))}

              {pendingDeliveries.slice(0, 2).map((del) => (
                <div
                  key={del.id}
                  className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-hairline)] last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">
                      {del.type} · {del.status}
                    </p>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                      {del.orderNumber} — {del.customerName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {del.destination}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('delivery')}
                    className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0 mt-1"
                  >
                    Track
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="mt-4 w-full py-2 px-3 text-xs font-medium text-center rounded-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            View All Orders & Dispatch
          </button>
        </div>
      </div>

      {/* Unified 12-System Hub Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Connected Business Modules
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Every module shares real-time inventory, customer, and accounting records
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
          >
            Admin & Permissions
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {systemDirectory.map((mod) => {
            const locked = isAdminLocked && adminProtectedIds.includes(mod.id);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="group text-left p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                    {mod.title}
                  </span>
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
                  )}
                </div>
                <p className="font-mono-tabular text-xs text-[var(--accent)] mt-1.5">
                  {mod.metric}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                  {locked ? `Admin password required · ${mod.detail}` : mod.detail}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
