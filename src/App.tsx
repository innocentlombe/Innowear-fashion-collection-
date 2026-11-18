/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
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
  Lock,
  Eye,
  EyeOff,
  Camera,
  Share2,
} from 'lucide-react';
import { ModuleId } from './types';
import { InnoWearProvider, useInnoWear } from './store/useInnoWearStore';
import { OwnerAvatar } from './components/OwnerAvatar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { CustomerAccessModal } from './components/CustomerAccessModal';
import { DEFAULT_ADMIN_PASSWORD } from './utils/auth';
import { processUploadedImage } from './utils/imageUpload';
import { slugifyBusinessName } from './utils/appLinks';
import { OverviewView } from './views/OverviewView';
import { PosView } from './views/PosView';
import { StorefrontView } from './views/StorefrontView';
import { CrmView } from './views/CrmView';
import { DeliveryView } from './views/DeliveryView';
import { StaffView } from './views/StaffView';
import { SuppliersView } from './views/SuppliersView';
import { LoyaltyView } from './views/LoyaltyView';
import { MarketingView } from './views/MarketingView';
import { AdminView, AdminTabId } from './views/AdminView';
import { CustomerPortalShell } from './views/CustomerPortalShell';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_MODULE_TO_TAB: Partial<Record<ModuleId, AdminTabId>> = {
  inventory: 'inventory',
  orders: 'orders',
  accounting: 'accounting',
  reports: 'reports',
  admin: 'settings',
};

const ADMIN_TAB_TO_MODULE: Record<AdminTabId, ModuleId> = {
  inventory: 'inventory',
  orders: 'orders',
  accounting: 'accounting',
  reports: 'reports',
  settings: 'admin',
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Store Operations',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'pos', label: 'POS & Sales', icon: ShoppingBag },
      { id: 'storefront', label: 'Online Store', icon: Store },
      { id: 'delivery', label: 'Deliveries', icon: Truck },
    ],
  },
  {
    title: 'Clients, Staff & Supply',
    items: [
      { id: 'crm', label: 'Customers (CRM)', icon: Users },
      { id: 'loyalty', label: 'Loyalty', icon: Award },
      { id: 'marketing', label: 'Marketing', icon: Megaphone },
      { id: 'staff', label: 'Staff', icon: UserCog },
      { id: 'suppliers', label: 'Suppliers', icon: Factory },
    ],
  },
  {
    title: 'Admin Dashboard',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'orders', label: 'Orders', icon: ClipboardList },
      { id: 'accounting', label: 'Accounting', icon: Wallet },
      { id: 'reports', label: 'Business Reports', icon: BarChart3 },
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
    notify,
    setTheme,
    updateOwnerProfile,
    isAdminUnlocked,
    isWorkspaceLocked,
    unlockWorkspace,
    lockWorkspace,
  } = useInnoWear();
  const [activeModule, setActiveModule] = useState<ModuleId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [customerAccessOpen, setCustomerAccessOpen] = useState(false);
  const [isCustomerPortal, setIsCustomerPortal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'customer' || params.get('shop') === '1';
  });
  const [lockInput, setLockInput] = useState('');
  const [showLockPwd, setShowLockPwd] = useState(false);
  const [lockError, setLockError] = useState('');
  const sidebarOwnerFileRef = useRef<HTMLInputElement | null>(null);

  const businessSlug = slugifyBusinessName(
    state.settings.businessSlug || state.settings.storeName
  );

  useEffect(() => {
    document.title = isCustomerPortal
      ? `${state.settings.storeName} — Customer Ordering App`
      : `${state.settings.storeName} — Business Management Application`;
  }, [isCustomerPortal, state.settings.storeName]);

  const enterCustomerPortal = () => {
    setIsCustomerPortal(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('app', businessSlug);
      url.searchParams.set('mode', 'customer');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history errors in restricted sandboxes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitCustomerPortal = () => {
    setIsCustomerPortal(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('app', businessSlug);
      url.searchParams.delete('mode');
      url.searchParams.delete('shop');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history errors
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await processUploadedImage(file, { maxDimension: 360, quality: 0.85 });
      updateOwnerProfile({ ownerPhoto: dataUrl });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not upload owner picture.');
    }
  };

  const currentNav = ALL_NAV_ITEMS.find((item) => item.id === activeModule);

  const handleSelectModule = (mod: ModuleId) => {
    setActiveModule(mod);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme(state.theme === 'black-gold' ? 'blue-black' : 'black-gold');
  };

  const handleUnlockSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError('');
    const ok = await unlockWorkspace(lockInput);
    if (ok) {
      setLockInput('');
    } else {
      setLockError('Incorrect admin password. Please try again.');
    }
  };

  // Isolated customer-facing ordering portal (no internal BMS sidebar or staff lock gate)
  if (isCustomerPortal) {
    return <CustomerPortalShell onExitToStaff={exitCustomerPortal} />;
  }

  if (isWorkspaceLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <div className="w-full max-w-md p-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex justify-center pb-1">
              <OwnerAvatar
                src={state.settings.ownerPhoto}
                name={state.settings.ownerName}
                size="lg"
              />
            </div>
            <span className="font-display text-3xl font-bold tracking-wider text-[var(--accent)] block">
              INNOWEAR
            </span>
            <p className="text-xs text-[var(--text-muted)]">
              {state.settings.storeName} · {state.settings.ownerName}
            </p>
          </div>

          <form onSubmit={handleUnlockSystem} className="space-y-4">
            <div>
              <label
                htmlFor="workspace-lock-password"
                className="block text-xs text-[var(--text-secondary)] mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="workspace-lock-password"
                  type={showLockPwd ? 'text' : 'password'}
                  required
                  autoFocus
                  value={lockInput}
                  onChange={(e) => {
                    setLockInput(e.target.value);
                    if (lockError) setLockError('');
                  }}
                  placeholder="Enter admin password"
                  className="w-full pl-3 pr-10 py-2.5 text-sm rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowLockPwd((v) => !v)}
                  aria-label={showLockPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showLockPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {lockError && <p className="text-xs text-red-400 mt-1.5">{lockError}</p>}
            </div>

            <button
              type="submit"
              disabled={!lockInput}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-45 transition-colors"
            >
              Unlock System
            </button>
          </form>

          {state.adminSecurity.isDefaultPassword && (
            <p className="text-center text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)]">
              Default password:{' '}
              <span className="font-mono-tabular text-[var(--accent)]">
                {DEFAULT_ADMIN_PASSWORD}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }

  const renderView = () => {
    const adminTab = ADMIN_MODULE_TO_TAB[activeModule];
    if (adminTab) {
      return (
        <AdminView
          activeTab={adminTab}
          onTabChange={(nextTab) => handleSelectModule(ADMIN_TAB_TO_MODULE[nextTab])}
          onOpenCustomerAccess={() => setCustomerAccessOpen(true)}
        />
      );
    }

    switch (activeModule) {
      case 'overview':
        return (
          <OverviewView
            onNavigate={handleSelectModule}
            onOpenCustomerAccess={() => setCustomerAccessOpen(true)}
          />
        );
      case 'pos':
        return <PosView />;
      case 'storefront':
        return <StorefrontView onOpenCustomerAccess={() => setCustomerAccessOpen(true)} />;
      case 'crm':
        return <CrmView />;
      case 'delivery':
        return <DeliveryView />;
      case 'staff':
        return <StaffView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'loyalty':
        return <LoyaltyView />;
      case 'marketing':
        return <MarketingView />;
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
          <span className="text-[11px] text-[var(--text-muted)] block mt-1.5">
            Business Management System
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
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {Boolean(ADMIN_MODULE_TO_TAB[item.id]) &&
                      state.adminSecurity.protectAdminPanel &&
                      !isAdminUnlocked && (
                        <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Owner Portrait & Quick Upload + Theme Switch & Lock Footer */}
      <div className="p-3 border-t border-[var(--border-hairline)] space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-md bg-[var(--bg-elevated)]/70 border border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => sidebarOwnerFileRef.current?.click()}
            title="Upload owner picture"
            aria-label="Upload owner picture"
            className="group relative rounded-full shrink-0 focus:outline-none"
          >
            <OwnerAvatar
              src={state.settings.ownerPhoto}
              name={state.settings.ownerName}
              size="md"
            />
            <span className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-3.5 h-3.5" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectModule('admin')}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {state.settings.ownerName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {state.settings.ownerTitle}
            </p>
          </button>
          <button
            type="button"
            onClick={() => sidebarOwnerFileRef.current?.click()}
            title="Upload or change owner picture"
            aria-label="Change owner picture"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] shrink-0 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <PWAInstallButton variant="sidebar" label="Download App" />

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
        <button
          type="button"
          onClick={lockWorkspace}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
        >
          <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          Lock System
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Hidden input for quick sidebar owner picture upload */}
      <input
        ref={sidebarOwnerFileRef}
        type="file"
        accept="image/*"
        onChange={handleQuickOwnerPhotoUpload}
        className="hidden"
        aria-label="Upload owner picture"
      />

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
              {Boolean(ADMIN_MODULE_TO_TAB[activeModule]) && (
                <>
                  <span className="text-[var(--border-strong)]">/</span>
                  <span className="text-[var(--accent)] whitespace-nowrap">Admin Dashboard</span>
                </>
              )}
              <span className="text-[var(--border-strong)]">/</span>
              <span className="font-semibold text-[var(--text-primary)] truncate">
                {currentNav?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCustomerAccessOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden md:inline">Customer Access</span>
              <span className="md:hidden">Shop Link</span>
            </button>

            <PWAInstallButton variant="header" label="Download App" />

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
              Offline Mode active — all POS sales, stock updates, and financial entries are being
              saved locally to this device.
            </span>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {renderView()}
        </main>
      </div>

      {/* Share Customer Ordering Portal Access Modal */}
      <CustomerAccessModal
        open={customerAccessOpen}
        onClose={() => setCustomerAccessOpen(false)}
        onLaunchCustomerMode={enterCustomerPortal}
      />

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
