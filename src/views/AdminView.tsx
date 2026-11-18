import React, { useRef, useState } from 'react';
import {
  Download,
  RotateCcw,
  Plus,
  ShieldCheck,
  WifiOff,
  Wifi,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Receipt,
  Boxes,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
  Camera,
  Upload,
  Trash2,
  Link2,
  Copy,
  Check,
  FileDown,
} from 'lucide-react';
import { AdminUser } from '../types';
import { useInnoWear, getProductTotalStock } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';
import { OwnerAvatar } from '../components/OwnerAvatar';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { DEFAULT_ADMIN_PASSWORD } from '../utils/auth';
import { processUploadedImage } from '../utils/imageUpload';
import {
  buildBusinessAppLinks,
  downloadBusinessAppShortcut,
  slugifyBusinessName,
} from '../utils/appLinks';
import { InventoryView } from './InventoryView';
import { OrdersView } from './OrdersView';
import { AccountingView } from './AccountingView';
import { ReportsView } from './ReportsView';

export type AdminTabId = 'inventory' | 'orders' | 'accounting' | 'reports' | 'settings';

interface AdminViewProps {
  activeTab?: AdminTabId;
  onTabChange?: (tab: AdminTabId) => void;
  onOpenCustomerAccess?: () => void;
}

const ADMIN_TABS: Array<{
  id: AdminTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'accounting', label: 'Accounting', icon: Wallet },
  { id: 'reports', label: 'Business Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings & Security', icon: Settings },
];

const ROLE_PERMISSIONS: Record<AdminUser['role'], string[]> = {
  Owner: ['All Modules', 'Financial Ledger', 'User Roles', 'Price Overrides', 'Export Data'],
  'Store Manager': ['POS & Sales', 'Inventory', 'CRM', 'Orders', 'Staff Shifts'],
  Cashier: ['POS & Sales', 'Inventory View', 'Customer Lookup'],
  'Logistics Lead': ['Orders', 'Delivery Dispatch', 'Suppliers & POs'],
  Accountant: ['Accounting Ledger', 'Business Reports', 'Supplier Payables'],
};

export const AdminView: React.FC<AdminViewProps> = ({
  activeTab,
  onTabChange,
  onOpenCustomerAccess,
}) => {
  const [internalTab, setInternalTab] = useState<AdminTabId>(activeTab || 'inventory');
  const currentTab: AdminTabId = activeTab ?? internalTab;

  const handleSelectTab = (tab: AdminTabId) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const {
    state,
    isOffline,
    simulatedOffline,
    setSimulatedOffline,
    setTheme,
    addAdminUser,
    toggleAdminUserActive,
    deleteAdminUser,
    updateSettings,
    updateOwnerProfile,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
    lockWorkspace,
    changeAdminPassword,
    updateAdminSecurity,
    resetDemoData,
    notify,
  } = useInnoWear();

  // Admin unlock gate state
  const [gatePassword, setGatePassword] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);
  const [gateError, setGateError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Change password form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<AdminUser['role']>('Store Manager');

  const [storeName, setStoreName] = useState(state.settings.storeName);
  const [taxRate, setTaxRate] = useState(String(state.settings.taxRate));
  const [deliveryFee, setDeliveryFee] = useState(String(state.settings.deliveryFeeStandard));
  const [freeThreshold, setFreeThreshold] = useState(String(state.settings.freeDeliveryThreshold));
  const [storeAddress, setStoreAddress] = useState(state.settings.storeAddress);
  const [storePhone, setStorePhone] = useState(state.settings.storePhone);
  const [taxId, setTaxId] = useState(state.settings.taxId);
  const [receiptFooter, setReceiptFooter] = useState(state.settings.receiptFooter);
  const [defaultReceiptFormat, setDefaultReceiptFormat] = useState<'thermal' | 'invoice'>(
    state.settings.defaultReceiptFormat
  );

  // Owner profile & picture upload state
  const [ownerNameInput, setOwnerNameInput] = useState(state.settings.ownerName);
  const [ownerTitleInput, setOwnerTitleInput] = useState(state.settings.ownerTitle);
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const ownerPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Business Application Link settings
  const [businessSlugInput, setBusinessSlugInput] = useState(
    state.settings.businessSlug || slugifyBusinessName(state.settings.storeName)
  );
  const [businessAppUrlInput, setBusinessAppUrlInput] = useState(state.settings.businessAppUrl || '');
  const [copiedBizUrl, setCopiedBizUrl] = useState(false);

  const liveAppLinks = buildBusinessAppLinks({
    storeName: state.settings.storeName,
    businessSlug: businessSlugInput,
    businessAppUrl: businessAppUrlInput,
  });

  const handleSaveBusinessAppLink = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slugifyBusinessName(businessSlugInput || state.settings.storeName);
    setBusinessSlugInput(cleanSlug);
    updateSettings({
      businessSlug: cleanSlug,
      businessAppUrl: businessAppUrlInput.trim(),
    });
  };

  const handleOwnerPhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingOwnerPhoto(true);
    try {
      const dataUrl = await processUploadedImage(file, { maxDimension: 360, quality: 0.85 });
      updateOwnerProfile({ ownerPhoto: dataUrl });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not upload owner picture.');
    } finally {
      setUploadingOwnerPhoto(false);
    }
  };

  const handleSaveOwnerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerProfile({
      ownerName: ownerNameInput,
      ownerTitle: ownerTitleInput,
    });
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    setUnlocking(true);
    const ok = await unlockAdmin(gatePassword);
    setUnlocking(false);
    if (ok) {
      setGatePassword('');
    } else {
      setGateError('Incorrect admin password. Please try again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);
    if (newPwd !== confirmPwd) {
      setPwdFeedback({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    const result = await changeAdminPassword(currentPwd, newPwd);
    if (!result.ok) {
      setPwdFeedback({ type: 'error', text: result.error || 'Could not update password.' });
      return;
    }
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdFeedback({ type: 'success', text: 'Admin password changed successfully.' });
  };

  if (state.adminSecurity.protectAdminPanel && !isAdminUnlocked) {
    const requestedLabel =
      ADMIN_TABS.find((t) => t.id === currentTab)?.label || 'Admin Dashboard';
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-md p-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-md bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
              <Lock className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-[var(--accent)] pt-1">
              Protected Admin Dashboard · {requestedLabel}
            </p>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Admin Password Required
            </h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Enter the owner admin password to access Inventory, Orders, Accounting, Business
              Reports, and Admin Settings.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label
                htmlFor="admin-gate-password"
                className="block text-xs text-[var(--text-secondary)] mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-gate-password"
                  type={showGatePassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={gatePassword}
                  onChange={(e) => {
                    setGatePassword(e.target.value);
                    if (gateError) setGateError('');
                  }}
                  placeholder="Enter admin password"
                  className="w-full pl-3 pr-10 py-2.5 text-sm rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowGatePassword((v) => !v)}
                  aria-label={showGatePassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showGatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {gateError && <p className="text-xs text-red-400 mt-1.5">{gateError}</p>}
            </div>

            <button
              type="submit"
              disabled={unlocking || !gatePassword}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-45 transition-colors"
            >
              {unlocking ? 'Verifying...' : `Unlock ${requestedLabel}`}
            </button>
          </form>

          {state.adminSecurity.isDefaultPassword && (
            <div className="pt-4 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              Initial owner password:{' '}
              <span className="font-mono-tabular text-[var(--accent)]">
                {DEFAULT_ADMIN_PASSWORD}
              </span>
              . You can change it immediately after unlocking.
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'InnoWear Fashion Collection',
      taxRate: Math.max(0, parseFloat(taxRate) || 0),
      deliveryFeeStandard: Math.max(0, parseFloat(deliveryFee) || 0),
      freeDeliveryThreshold: Math.max(0, parseFloat(freeThreshold) || 0),
      storeAddress: storeAddress.trim() || state.settings.storeAddress,
      storePhone: storePhone.trim() || state.settings.storePhone,
      taxId: taxId.trim() || state.settings.taxId,
      receiptFooter: receiptFooter.trim() || state.settings.receiptFooter,
      defaultReceiptFormat,
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;
    addAdminUser({
      name: userName.trim(),
      email: userEmail.trim(),
      role: userRole,
      active: true,
      permissions: ROLE_PERMISSIONS[userRole],
    });
    setUserName('');
    setUserEmail('');
    setShowUserModal(false);
  };

  const handleExportBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `innowear-bms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Downloaded full InnoWear BMS JSON backup.');
  };

  const c = state.settings.currencySymbol;
  const totalUnits = state.products.reduce((sum, p) => sum + getProductTotalStock(p), 0);
  const lowStockCount = state.products.filter(
    (p) => getProductTotalStock(p) <= p.reorderLevel * 2
  ).length;
  const totalIncome = state.transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = state.transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const openOrdersCount = state.orders.filter(
    (o) => o.fulfillmentStatus !== 'Delivered' && o.fulfillmentStatus !== 'Collected'
  ).length;

  return (
    <div className="space-y-6">
      {/* Hidden file input for Owner Photo uploads */}
      <input
        ref={ownerPhotoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleOwnerPhotoUpload(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="hidden"
        aria-label="Upload owner picture"
      />

      {/* Unified Admin Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => ownerPhotoInputRef.current?.click()}
            title="Upload or change owner picture"
            aria-label="Upload owner picture"
            className="group relative rounded-full shrink-0 focus:outline-none"
          >
            <OwnerAvatar
              src={state.settings.ownerPhoto}
              name={state.settings.ownerName}
              size="lg"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] border-2 border-[var(--bg-canvas)] flex items-center justify-center shadow">
              <Camera className="w-3 h-3" />
            </span>
          </button>
          <div>
            <p className="text-xs font-medium text-[var(--accent)]">
              {state.settings.ownerName} · {state.settings.ownerTitle}
            </p>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-0.5">
              Admin Dashboard
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Centralized owner access to Inventory, Orders, Accounting, Business Reports, and System
              Security
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.adminSecurity.protectAdminPanel && (
            <button
              type="button"
              onClick={lockAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
              Lock Admin
            </button>
          )}
          <button
            type="button"
            onClick={lockWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock System
          </button>
        </div>
      </div>

      {/* Admin Quick KPI Navigation Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => handleSelectTab('inventory')}
          className={`text-left p-4 rounded-lg border transition-colors ${
            currentTab === 'inventory'
              ? 'bg-[var(--bg-elevated)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Inventory Stock</span>
            <Boxes className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1.5">
            {totalUnits} units
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {state.products.length} styles · {lowStockCount} low stock
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('orders')}
          className={`text-left p-4 rounded-lg border transition-colors ${
            currentTab === 'orders'
              ? 'bg-[var(--bg-elevated)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Order Pipeline</span>
            <ClipboardList className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1.5">
            {state.orders.length} orders
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {openOrdersCount} active fulfillment
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('accounting')}
          className={`text-left p-4 rounded-lg border transition-colors ${
            currentTab === 'accounting'
              ? 'bg-[var(--bg-elevated)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Net Profit</span>
            <Wallet className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-xl font-semibold text-emerald-400 mt-1.5">
            {c}
            {netProfit.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {state.transactions.length} ledger entries
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('reports')}
          className={`text-left p-4 rounded-lg border transition-colors ${
            currentTab === 'reports'
              ? 'bg-[var(--bg-elevated)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Settled Revenue</span>
            <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--accent)] mt-1.5">
            {c}
            {totalIncome.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Daily, weekly & monthly CSV
          </p>
        </button>
      </div>

      {/* Admin Dashboard Module Tabs */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border-hairline)]"
        role="tablist"
        aria-label="Admin Dashboard Sections"
      >
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Admin Dashboard Module */}
      {currentTab === 'inventory' && <InventoryView />}
      {currentTab === 'orders' && <OrdersView />}
      {currentTab === 'accounting' && <AccountingView />}
      {currentTab === 'reports' && <ReportsView />}

      {currentTab === 'settings' && (
        <div className="space-y-8">
      {/* Owner Profile & Picture Upload */}
      <form
        onSubmit={handleSaveOwnerProfile}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleOwnerPhotoUpload(e.dataTransfer.files?.[0]);
        }}
        className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Owner Profile & Picture
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Upload the owner portrait displayed in the sidebar, Admin Dashboard, and system lock
              screen
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Save Owner Profile
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => ownerPhotoInputRef.current?.click()}
              className="group relative rounded-full focus:outline-none"
              aria-label="Choose owner picture"
            >
              <OwnerAvatar
                src={state.settings.ownerPhoto}
                name={ownerNameInput || state.settings.ownerName}
                size="xl"
              />
              <span className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploadingOwnerPhoto}
                onClick={() => ownerPhotoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingOwnerPhoto
                  ? 'Uploading...'
                  : state.settings.ownerPhoto
                  ? 'Change Picture'
                  : 'Upload Picture'}
              </button>
              {state.settings.ownerPhoto && (
                <button
                  type="button"
                  onClick={() => updateOwnerProfile({ ownerPhoto: '' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-red-400 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Owner Full Name</label>
              <input
                value={ownerNameInput}
                onChange={(e) => setOwnerNameInput(e.target.value)}
                placeholder="e.g. Innocent Lombe"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Title / Position</label>
              <input
                value={ownerTitleInput}
                onChange={(e) => setOwnerTitleInput(e.target.value)}
                placeholder="e.g. Founder & Owner"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-[var(--text-muted)]">
              Tip: You can click Upload Picture or drag and drop a JPG, PNG, or WebP photo directly
              onto this card.
            </p>
          </div>
        </div>
      </form>

      {/* Admin Password & Access Security */}
      <form
        onSubmit={handleChangePassword}
        className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Admin Password & Security
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {state.adminSecurity.isDefaultPassword
                  ? 'Default password is still active — set a custom owner password below.'
                  : `Custom SHA-256 encrypted password active · Last updated ${state.adminSecurity.passwordUpdatedAt}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPwdFields((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap self-start sm:self-auto"
          >
            {showPwdFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPwdFields ? 'Hide Passwords' : 'Show Passwords'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Current Password</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Current admin password"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">New Password</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              minLength={4}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Confirm New Password</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              minLength={4}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {pwdFeedback && (
          <p
            className={`text-xs ${
              pwdFeedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {pwdFeedback.text}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap gap-6 text-xs text-[var(--text-secondary)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.adminSecurity.protectAdminPanel}
                onChange={(e) =>
                  updateAdminSecurity({ protectAdminPanel: e.target.checked })
                }
                className="accent-[var(--accent)]"
              />
              <span>
                Require password to open Admin Dashboard (Inventory, Orders, Accounting, Reports &
                Settings)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.adminSecurity.requireLoginOnStart}
                onChange={(e) =>
                  updateAdminSecurity({ requireLoginOnStart: e.target.checked })
                }
                className="accent-[var(--accent)]"
              />
              <span>Require password on app startup</span>
            </label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            Update Admin Password
          </button>
        </div>
      </form>

      {/* Business Application Link, App Download & Customer Ordering Access */}
      <form
        onSubmit={handleSaveBusinessAppLink}
        className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Link2 className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Business Application Link & Downloads
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Link {state.settings.storeName} directly as an installable web application for staff
                and customers
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Save App Link
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Business App Handle (Slug)
            </label>
            <input
              value={businessSlugInput}
              onChange={(e) => setBusinessSlugInput(e.target.value)}
              placeholder="innowear-fashion-collection"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Custom Domain / Shared App URL (Optional)
            </label>
            <input
              value={businessAppUrlInput}
              onChange={(e) => setBusinessAppUrlInput(e.target.value)}
              placeholder="Leave blank to use live hosted app URL"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2 text-xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)]">
            Live Business Application URL ({state.settings.storeName})
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={liveAppLinks.businessAppUrl}
              className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--accent)] font-mono-tabular text-[11px]"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(liveAppLinks.businessAppUrl);
                  setCopiedBizUrl(true);
                  notify('Business application link copied.');
                  setTimeout(() => setCopiedBizUrl(false), 2000);
                } catch {
                  notify('Could not copy link.');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 font-semibold rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] whitespace-nowrap shrink-0"
            >
              {copiedBizUrl ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
              )}
              {copiedBizUrl ? 'Copied Link' : 'Copy Business App Link'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton variant="card" label="Download / Install App" />
            <button
              type="button"
              onClick={() => {
                const file = downloadBusinessAppShortcut(state.settings, 'business');
                notify(`Downloaded ${file} launcher.`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5 text-[var(--accent)]" />
              Download App Shortcut
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={state.settings.customerOrderingEnabled}
                onChange={(e) =>
                  updateSettings({ customerOrderingEnabled: e.target.checked })
                }
                className="accent-[var(--accent)]"
              />
              <span>
                Customer Ordering {state.settings.customerOrderingEnabled ? 'Active' : 'Paused'}
              </span>
            </label>
            {onOpenCustomerAccess && (
              <button
                type="button"
                onClick={onOpenCustomerAccess}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] whitespace-nowrap"
              >
                Share Customer Order App
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Theme & Offline Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Brand Visual Identity
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Switch between InnoWear signature Black & Gold or Blue & Black workspace themes
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('black-gold')}
              className={`p-4 rounded-md border text-left transition-colors ${
                state.theme === 'black-gold'
                  ? 'border-[#d4af37] bg-[#1a1a20]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-4 rounded-sm bg-[#09090b] border border-[#383846]" />
                <span className="w-4 h-4 rounded-sm bg-[#d4af37]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Black & Gold</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Obsidian luxury boutique palette
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('blue-black')}
              className={`p-4 rounded-md border text-left transition-colors ${
                state.theme === 'blue-black'
                  ? 'border-[#3b82f6] bg-[#141f35]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-4 rounded-sm bg-[#060a12] border border-[#2d4269]" />
                <span className="w-4 h-4 rounded-sm bg-[#3b82f6]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Blue & Black</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Midnight slate & royal cobalt
              </p>
            </button>
          </div>
        </div>

        {/* Offline & Data Control */}
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Online + Offline Resilience
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                All POS sales, stock edits, and ledgers save locally immediately · Last saved{' '}
                {state.lastSyncedAt}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
              {isOffline ? (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Online Synced</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSimulatedOffline(!simulatedOffline)}
              className="px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              {simulatedOffline ? 'Resume Online Mode' : 'Test Offline Mode'}
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON Backup
            </button>
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-red-900/60 text-red-400 hover:bg-red-950/40 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* Store Settings & Notifications */}
      <form
        onSubmit={handleSaveSettings}
        className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Store Configuration & Notifications
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Tax rates, delivery fees, and operational alert preferences
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            Save Settings
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Business Name</label>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Sales Tax Rate (%)</label>
            <input
              type="number"
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Standard Courier Fee ({state.settings.currencySymbol})
            </label>
            <input
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Free Delivery Over ({state.settings.currencySymbol})
            </label>
            <input
              type="number"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
            />
          </div>
        </div>

        {/* Receipt & Tax Invoice Customization */}
        <div className="pt-4 border-t border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Advanced Receipt & Tax Invoice Branding
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[var(--text-secondary)] mb-1">
                Boutique Address (Printed on Receipts)
              </label>
              <input
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Store Phone</label>
              <input
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Tax ID / TPIN</label>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
            <div className="lg:col-span-3">
              <label className="block text-[var(--text-secondary)] mb-1">
                Receipt Footer & Return / Exchange Policy
              </label>
              <input
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Default Print Format
              </label>
              <select
                value={defaultReceiptFormat}
                onChange={(e) =>
                  setDefaultReceiptFormat(e.target.value as 'thermal' | 'invoice')
                }
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="thermal">80mm Thermal POS Slip</option>
                <option value="invoice">A4 Luxury Tax Invoice</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2 text-xs text-[var(--text-secondary)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.showReceiptQr}
              onChange={(e) => updateSettings({ showReceiptQr: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>Include QR verification code on printed receipts</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.lowStockAlerts}
              onChange={(e) => updateSettings({ lowStockAlerts: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>Low-stock alerts on Overview</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.orderNotifications}
              onChange={(e) => updateSettings({ orderNotifications: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>Instant online order notifications</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.offlineSyncEnabled}
              onChange={(e) => updateSettings({ offlineSyncEnabled: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>Automatic local browser storage sync</span>
          </label>
        </div>
      </form>

      {/* Users & Permissions Matrix */}
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Users & Role Permissions
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Invite User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Granted Permissions</th>
                <th className="py-3 px-4 font-medium text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {state.adminUsers.map((usr) => (
                <tr key={usr.id}>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex items-center gap-2.5">
                      {usr.role === 'Owner' && (
                        <OwnerAvatar
                          src={state.settings.ownerPhoto}
                          name={usr.name}
                          size="sm"
                        />
                      )}
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{usr.name}</div>
                        <div className="text-[var(--text-muted)]">
                          {usr.email} · {usr.lastActive}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-[var(--accent)]">
                    {usr.role}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                    {usr.permissions.join(' · ')}
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs">
                    {usr.role === 'Owner' ? (
                      <span className="text-[var(--text-muted)]">Owner (Locked)</span>
                    ) : (
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAdminUserActive(usr.id)}
                          className={`px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${
                            usr.active
                              ? 'border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/30'
                              : 'border-[var(--border-strong)] text-[var(--text-muted)]'
                          }`}
                        >
                          {usr.active ? 'Active' : 'Suspended'}
                        </button>
                        <DeleteButton
                          onConfirm={() => deleteAdminUser(usr.id)}
                          ariaLabel={`Delete admin user ${usr.name}`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Invite System User"
        subtitle="Assign role-based module access across InnoWear BMS"
      >
        <form onSubmit={handleAddUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Full Name</label>
            <input
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Work Email</label>
            <input
              required
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as AdminUser['role'])}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="Store Manager">Store Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Logistics Lead">Logistics Lead</option>
              <option value="Accountant">Accountant</option>
            </select>
          </div>
          <p className="text-[var(--text-muted)]">
            Permissions: {ROLE_PERMISSIONS[userRole].join(' · ')}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Grant Access
            </button>
          </div>
        </form>
      </Modal>
        </div>
      )}
    </div>
  );
};
