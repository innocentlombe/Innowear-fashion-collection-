import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Receipt,
  Search,
  Shield,
  Lock,
  Palette,
  WifiOff,
  Banknote,
  CreditCard,
  Smartphone,
  Eye,
  EyeOff,
  Share2,
  UserCheck,
  Menu,
  X,
} from 'lucide-react';
import { Order, ThemePalette } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { PosView } from './PosView';
import { AdvancedReceiptModal } from '../components/AdvancedReceiptModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Modal } from '../components/Modal';
import { OwnerAvatar } from '../components/OwnerAvatar';
import { OrderNotificationBell } from '../components/OrderNotificationBell';
import { OrderNotificationBanner } from '../components/OrderNotificationBanner';

type CashierTab = 'register' | 'receipts';

interface CashierDashboardShellProps {
  onSwitchToAdmin: () => void;
  onOpenCustomerAccess: () => void;
}

const NEXT_THEME: Record<ThemePalette, ThemePalette> = {
  standard: 'black-gold',
  'black-gold': 'blue-black',
  'blue-black': 'standard',
};

const THEME_LABEL: Record<ThemePalette, string> = {
  standard: 'Standard Light',
  'black-gold': 'Black & Gold',
  'blue-black': 'Blue & Black',
};

export const CashierDashboardShell: React.FC<CashierDashboardShellProps> = ({
  onSwitchToAdmin,
  onOpenCustomerAccess,
}) => {
  const {
    state,
    isOffline,
    toast,
    setTheme,
    isAdminUnlocked,
    unlockAdmin,
  } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [activeTab, setActiveTab] = useState<CashierTab>('register');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeCashier, setActiveCashier] = useState<string>(
    state.staff[1]?.name || state.staff[0]?.name || 'Store Cashier'
  );

  // Receipts tab state
  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);

  // Protected Admin switch modal state
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);

  const posOrders = useMemo(
    () => state.orders.filter((o) => o.channel === 'POS'),
    [state.orders]
  );

  const shiftStats = useMemo(() => {
    const totalSales = posOrders.reduce((s, o) => s + o.total, 0);
    const cashTotal = posOrders
      .filter((o) => o.paymentMethod === 'Cash')
      .reduce((s, o) => s + o.total, 0);
    const cardTotal = posOrders
      .filter((o) => o.paymentMethod === 'Card')
      .reduce((s, o) => s + o.total, 0);
    const momoTotal = posOrders
      .filter((o) => o.paymentMethod === 'Mobile Money')
      .reduce((s, o) => s + o.total, 0);
    return { totalSales, cashTotal, cardTotal, momoTotal, count: posOrders.length };
  }, [posOrders]);

  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return posOrders;
    return posOrders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.staffName && o.staffName.toLowerCase().includes(q)) ||
        o.paymentMethod.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [posOrders, receiptSearch]);

  const handleRequestAdminSwitch = () => {
    setMobileNavOpen(false);
    if (isAdminUnlocked) {
      onSwitchToAdmin();
      return;
    }
    setAdminPwd('');
    setAdminError('');
    setAdminGateOpen(true);
  };

  const handleAdminUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setVerifyingAdmin(true);
    const ok = await unlockAdmin(adminPwd);
    setVerifyingAdmin(false);
    if (ok) {
      setAdminGateOpen(false);
      setAdminPwd('');
      onSwitchToAdmin();
    } else {
      setAdminError('Incorrect admin password. Please try again.');
    }
  };

  const cashierTabs: Array<{
    id: CashierTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'register', label: 'POS Register', icon: ShoppingBag },
    { id: 'receipts', label: 'Shift Receipts', icon: Receipt },
  ];

  const activeTabLabel = cashierTabs.find((t) => t.id === activeTab)?.label || 'POS Register';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Wordmark */}
      <div className="px-5 py-5 border-b border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => {
            setActiveTab('register');
            setMobileNavOpen(false);
          }}
          className="text-left block w-full"
        >
          <span className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] block leading-none">
            InnoWear
          </span>
          <span className="text-xs text-[var(--text-muted)] block mt-1">
            Cashier Dashboard
          </span>
        </button>
      </div>

      {/* Cashier Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Cashier Navigation">
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            Counter Terminal
          </p>
          <div className="space-y-0.5">
            {cashierTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileNavOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {tab.id === 'receipts' && (
                    <span className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                      {shiftStats.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Shift Summary */}
        <div className="px-3 pt-4 border-t border-[var(--border-hairline)] space-y-2.5 text-xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)]">Shift Totals (ZMW)</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Total Sales</span>
              <span className="font-mono-tabular font-semibold text-[var(--accent)]">
                {c}
                {shiftStats.totalSales.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Cash</span>
              <span className="font-mono-tabular text-[var(--text-primary)]">
                {c}
                {shiftStats.cashTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Card</span>
              <span className="font-mono-tabular text-[var(--text-primary)]">
                {c}
                {shiftStats.cardTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Mobile Money</span>
              <span className="font-mono-tabular text-[var(--text-primary)]">
                {c}
                {shiftStats.momoTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Admin-Only Restricted Modules Notice */}
        <div className="px-3 pt-4 border-t border-[var(--border-hairline)] space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
            <span>Admin-Only Modules</span>
            <Lock className="w-3 h-3 text-[var(--text-muted)]" />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Inventory, Business Reports, Accounting, Document Keeper, Orders, Staff &amp; Settings
            are restricted to Admin password sign-in.
          </p>
        </div>
      </nav>

      {/* Cashier Footer: Active Staff, Admin Switch & Utilities */}
      <div className="p-3 border-t border-[var(--border-hairline)] space-y-1.5">
        <div className="px-2.5 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
          <label
            htmlFor="cashier-shift-select"
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            Active Cashier
          </label>
          <select
            id="cashier-shift-select"
            value={activeCashier}
            onChange={(e) => setActiveCashier(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none"
          >
            {state.staff.map((s) => (
              <option key={s.id} value={s.name} className="bg-[var(--bg-surface)]">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRequestAdminSwitch}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Shield className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            Admin Dashboard
          </span>
          {!isAdminUnlocked && (
            <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          )}
        </button>

        <PWAInstallButton variant="sidebar" label="Download App" />

        <button
          type="button"
          onClick={() => setTheme(NEXT_THEME[state.theme])}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
            {THEME_LABEL[state.theme]}
          </span>
          <span className="text-[11px] text-[var(--accent)]">Switch</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Fixed Cashier Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-black/60 backdrop-blur-xs"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="w-64 max-w-[82vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-strong)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-4 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Cashier Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Standard Single-Row Top Header */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[var(--bg-surface)]/95 backdrop-blur-xs border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="text-[var(--text-muted)] whitespace-nowrap">Cashier Dashboard</span>
              <span className="text-[var(--border-strong)]">/</span>
              <span className="font-semibold text-[var(--text-primary)] truncate">
                {activeTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <OrderNotificationBell onSelectOrder={() => setActiveTab('receipts')} />

            <button
              type="button"
              onClick={onOpenCustomerAccess}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              Customer Shop
            </button>

            <button
              type="button"
              onClick={handleRequestAdminSwitch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Dashboard
              {!isAdminUnlocked && (
                <Lock className="w-3 h-3 opacity-80" />
              )}
            </button>
          </div>
        </header>

        {/* Offline Banner */}
        {isOffline && (
          <div className="px-4 sm:px-8 py-2 bg-[var(--status-warning-soft)] border-b border-[var(--status-warning-border)] flex items-center justify-center text-xs text-[var(--status-warning)]">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Offline Mode — Cashier POS sales and receipts are saving locally to this terminal.
            </span>
          </div>
        )}

        {/* Main Cashier Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'register' && (
            <PosView
              activeCashier={activeCashier}
              onActiveCashierChange={setActiveCashier}
            />
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                    Cashier Shift Sales &amp; Receipts
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Reprint or share POS customer receipts and review payment drawer totals in
                    Kwacha (ZMW)
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    placeholder="Search receipt #, item, or cashier..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Cashier Drawer Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <p className="text-xs text-[var(--text-muted)]">Total POS Sales</p>
                  <p className="font-mono-tabular text-2xl font-semibold text-[var(--accent)] mt-1">
                    {c}
                    {shiftStats.totalSales.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {shiftStats.count} completed sale(s)
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Cash Drawer</span>
                    <Banknote className="w-4 h-4 text-[var(--status-positive)]" />
                  </div>
                  <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
                    {c}
                    {shiftStats.cashTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Zambian Kwacha cash
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Card Terminal</span>
                    <CreditCard className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
                    {c}
                    {shiftStats.cardTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Debit / Credit POS</p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Mobile Money</span>
                    <Smartphone className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
                    {c}
                    {shiftStats.momoTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">MTN / Airtel MoMo</p>
                </div>
              </div>

              {/* POS Receipts Table */}
              <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                      <th className="py-3 px-4 font-medium">Receipt #</th>
                      <th className="py-3 px-4 font-medium">Cashier</th>
                      <th className="py-3 px-4 font-medium">Items</th>
                      <th className="py-3 px-4 font-medium">Payment</th>
                      <th className="py-3 px-4 font-medium text-right">Total</th>
                      <th className="py-3 px-4 font-medium text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)] text-xs">
                    {filteredReceipts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                          No POS receipts match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredReceipts.map((ord) => (
                        <tr
                          key={ord.id}
                          className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono-tabular">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {ord.orderNumber}
                            </div>
                            <div className="text-[var(--text-muted)]">{ord.date}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-primary)]">
                            {ord.staffName || 'Store Cashier'}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            {ord.items.map((i) => `${i.qty}× ${i.name} (${i.size})`).join(', ')}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-primary)]">
                            {ord.paymentMethod}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--accent)]">
                            {c}
                            {ord.total.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(ord)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] whitespace-nowrap"
                            >
                              <Receipt className="w-3.5 h-3.5 text-[var(--accent)]" />
                              View / Print
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Advanced Receipt Studio Modal */}
      <AdvancedReceiptModal
        order={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        primaryActionLabel="Done"
      />

      {/* Password-Protected Switch to Admin Dashboard Modal */}
      <Modal
        open={adminGateOpen}
        onClose={() => setAdminGateOpen(false)}
        title="Admin Access Only"
        subtitle="Enter the Admin password to access Inventory, Business Reports, Accounting, and all management modules"
      >
        <form onSubmit={handleAdminUnlockSubmit} className="space-y-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
            <OwnerAvatar
              src={state.settings.ownerPhoto}
              name={state.settings.ownerName}
              size="md"
            />
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {state.settings.ownerName}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {state.settings.ownerTitle} · Full Admin Access
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="cashier-to-admin-password"
              className="block text-[var(--text-secondary)] mb-1"
            >
              Admin Password
            </label>
            <div className="relative">
              <input
                id="cashier-to-admin-password"
                type={showAdminPwd ? 'text' : 'password'}
                required
                autoFocus
                value={adminPwd}
                onChange={(e) => {
                  setAdminPwd(e.target.value);
                  if (adminError) setAdminError('');
                }}
                placeholder="Enter admin password"
                className="w-full pl-3 pr-10 py-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowAdminPwd((v) => !v)}
                aria-label={showAdminPwd ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {adminError && <p className="text-[var(--status-danger)] mt-1.5">{adminError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAdminGateOpen(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifyingAdmin || !adminPwd}
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
            >
              {verifyingAdmin ? 'Verifying...' : 'Open Admin Dashboard'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Order Notification Banner */}
      <OrderNotificationBanner
        onViewOrder={() => setActiveTab('receipts')}
        actionLabel="View Shift Receipts"
      />

      {/* Live Action Confirmation Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-md bg-[var(--bg-surface)] border border-[var(--accent)] text-xs text-[var(--text-primary)] shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
};
