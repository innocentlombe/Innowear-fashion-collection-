/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Store,
  Users,
  Wallet,
  ClipboardList,
  Truck,
  UserCog,
  BarChart3,
  Factory,
  Award,
  Megaphone,
  Shield,
  Menu,
  X,
  Palette,
  WifiOff,
  Bell,
  Lock,
  CheckCheck,
} from 'lucide-react';
import { ModuleId } from './types';
import { InnoWearProvider, useInnoWear } from './store/useInnoWearStore';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OverviewView } from './views/OverviewView';
import { PosView } from './views/PosView';
import { InventoryView } from './views/InventoryView';
import { StorefrontView } from './views/StorefrontView';
import { CrmView } from './views/CrmView';
import { AccountingView } from './views/AccountingView';
import { OrdersView } from './views/OrdersView';
import { DeliveryView } from './views/DeliveryView';
import { StaffView } from './views/StaffView';
import { ReportsView } from './views/ReportsView';
import { SuppliersView } from './views/SuppliersView';
import { LoyaltyView } from './views/LoyaltyView';
import { MarketingView } from './views/MarketingView';
import { AdminView } from './views/AdminView';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Core Operations',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'pos', label: 'POS & Sales', icon: ShoppingBag },
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'storefront', label: 'Online Store', icon: Store },
    ],
  },
  {
    title: 'Orders & Fulfillment',
    items: [
      { id: 'orders', label: 'Orders', icon: ClipboardList },
      { id: 'delivery', label: 'Deliveries', icon: Truck },
      { id: 'suppliers', label: 'Suppliers', icon: Factory },
    ],
  },
  {
    title: 'Clients & Growth',
    items: [
      { id: 'crm', label: 'Customers (CRM)', icon: Users },
      { id: 'loyalty', label: 'Loyalty', icon: Award },
      { id: 'marketing', label: 'Marketing', icon: Megaphone },
    ],
  },
  {
    title: 'Finance & Control',
    items: [
      { id: 'accounting', label: 'Accounting', icon: Wallet },
      { id: 'reports', label: 'Business Reports', icon: BarChart3 },
      { id: 'staff', label: 'Staff', icon: UserCog },
      { id: 'admin', label: 'Admin Settings', icon: Shield },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const WorkspaceShell: React.FC = () => {
  const {
    state,
    isOffline,
    toast,
    setTheme,
    adminUnlocked,
    verifyAdminPassword,
    markNotificationRead,
    markAllNotificationsRead,
  } = useInnoWear();

  const initialCustomerMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'store';
  }, []);

  const [customerStoreMode, setCustomerStoreMode] = useState(initialCustomerMode);
  const [activeModule, setActiveModule] = useState<ModuleId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [startPassword, setStartPassword] = useState('');
  const [startError, setStartError] = useState('');
  const [verifyingStart, setVerifyingStart] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const currentNav = ALL_NAV_ITEMS.find((item) => item.id === activeModule);
  const c = state.settings.currencySymbol;

  const handleSelectModule = (mod: ModuleId) => {
    setActiveModule(mod);
    setMobileNavOpen(false);
    setNotifOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme(state.theme === 'black-gold' ? 'blue-black' : 'black-gold');
  };

  const handleStartUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingStart(true);
    setStartError('');
    const result = await verifyAdminPassword(startPassword);
    setVerifyingStart(false);
    if (!result.ok) {
      setStartError(result.error || 'Incorrect passcode.');
      return;
    }
    setStartPassword('');
  };

  // Dedicated Customer Storefront mode (?mode=store)
  if (customerStoreMode && state.settings.customerOrderingEnabled) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col">
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-8 flex items-center justify-between gap-4 bg-[var(--bg-surface)]/95 backdrop-blur-xs border-b border-[var(--border-hairline)]">
          <span className="font-display text-2xl font-bold tracking-wider text-[var(--accent)] whitespace-nowrap shrink-0">
            INNOWEAR
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCustomerStoreMode(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
            >
              Staff Workspace
            </button>
          </div>
        </header>
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <StorefrontView isCustomerMode />
        </main>
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--accent)] text-xs text-[var(--text-primary)] shadow-2xl"
          >
            {toast}
          </div>
        )}
      </div>
    );
  }

  // Optional startup lock if owner enabled requireLoginOnStart
  if (state.adminSecurity.requireLoginOnStart && !adminUnlocked) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] p-6 space-y-5">
          <div className="text-center space-y-1">
            <span className="font-display text-3xl font-bold tracking-wider text-[var(--accent)] block">
              INNOWEAR
            </span>
            <p className="text-xs text-[var(--text-muted)]">{state.settings.storeName}</p>
          </div>

          <form onSubmit={handleStartUnlock} className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Enter administrator passcode to unlock workspace</span>
            </div>
            <input
              type="password"
              required
              autoFocus
              value={startPassword}
              onChange={(e) => setStartPassword(e.target.value)}
              placeholder="Administrator passcode"
              className="w-full px-3 py-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            {startError && <p className="text-red-400">{startError}</p>}
            <button
              type="submit"
              disabled={verifyingStart}
              className="w-full py-2.5 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {verifyingStart ? 'Verifying...' : 'Unlock Workspace'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeModule) {
      case 'overview':
        return <OverviewView onNavigate={handleSelectModule} />;
      case 'pos':
        return <PosView />;
      case 'inventory':
        return <InventoryView />;
      case 'storefront':
        return <StorefrontView />;
      case 'crm':
        return <CrmView />;
      case 'accounting':
        return <AccountingView />;
      case 'orders':
        return <OrdersView />;
      case 'delivery':
        return <DeliveryView />;
      case 'staff':
        return <StaffView />;
      case 'reports':
        return <ReportsView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'loyalty':
        return <LoyaltyView />;
      case 'marketing':
        return <MarketingView />;
      case 'admin':
        return <AdminView />;
      default:
        return <OverviewView onNavigate={handleSelectModule} />;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Wordmark */}
      <div className="px-5 py-5 border-b border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => handleSelectModule('overview')}
          className="text-left block w-full"
        >
          <span className="font-display text-2xl font-bold tracking-wider text-[var(--accent)] block leading-none">
            INNOWEAR
          </span>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1.5 truncate">
            {state.settings.storeName}
          </span>
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main Modules">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-[var(--text-muted)]">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* PWA Install & Theme Quick Switch Footer */}
      <div className="p-3 border-t border-[var(--border-hairline)] space-y-1">
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
            {state.theme === 'black-gold' ? 'Black & Gold' : 'Blue & Black'}
          </span>
          <span className="text-[11px] text-[var(--accent)]">Switch</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-black/75 backdrop-blur-xs"
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

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean SaaS Top Header Bar */}
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
              <span className="text-[var(--text-muted)] whitespace-nowrap">InnoWear</span>
              <span className="text-[var(--border-strong)]">/</span>
              <span className="font-semibold text-[var(--text-primary)] truncate">
                {currentNav?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative">
            {/* Functional Order Notification Bell */}
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Order notifications"
              className="relative p-2 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] font-mono-tabular text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 max-w-[90vw] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl z-40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-hairline)]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Order Alerts ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-hairline)]">
                  {state.notifications.length === 0 ? (
                    <p className="p-5 text-center text-xs text-[var(--text-muted)]">
                      No order notifications yet.
                    </p>
                  ) : (
                    state.notifications.slice(0, 12).map((ntf) => (
                      <button
                        key={ntf.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(ntf.id);
                          handleSelectModule('orders');
                        }}
                        className={`w-full text-left px-4 py-3 text-xs hover:bg-[var(--bg-hover)] transition-colors ${
                          ntf.read ? 'opacity-70' : 'bg-[var(--bg-elevated)]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                            {ntf.orderNumber} · {ntf.channel}
                          </span>
                          <span className="font-mono-tabular font-semibold text-[var(--accent)]">
                            {c}
                            {ntf.total.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] mt-0.5 truncate">
                          {ntf.message}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {ntf.customerName} · {ntf.timestamp}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeModule !== 'pos' ? (
              <button
                type="button"
                onClick={() => handleSelectModule('pos')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
              >
                Open POS
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectModule('storefront')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0"
              >
                View Storefront
              </button>
            )}
          </div>
        </header>

        {/* Real Offline Banner (only displayed when offline) */}
        {isOffline && (
          <div className="px-4 sm:px-8 py-2 bg-amber-950/50 border-b border-amber-700/40 flex items-center justify-between text-xs text-amber-300">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Offline Mode active — POS sales, stock updates, and financial entries are saved
              locally and will sync automatically when online.
            </span>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {renderView()}
        </main>
      </div>

      {/* Live Action Confirmation Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--accent)] text-xs text-[var(--text-primary)] shadow-2xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <InnoWearProvider>
      <WorkspaceShell />
    </InnoWearProvider>
  );
}
