import React, { useEffect, useState } from 'react';
import {
  Download,
  RotateCcw,
  Plus,
  ShieldCheck,
  WifiOff,
  Wifi,
  Lock,
  Unlock,
  FileText,
  Trash2,
  Upload,
  Copy,
  User,
} from 'lucide-react';
import { AdminUser, BusinessDocument } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { PWAInstallButton } from '../components/PWAInstallButton';

const ROLE_PERMISSIONS: Record<AdminUser['role'], string[]> = {
  Owner: ['All Modules', 'Financial Ledger', 'User Roles', 'Price Overrides', 'Export Data'],
  'Store Manager': ['POS & Sales', 'Inventory', 'CRM', 'Orders', 'Staff Shifts'],
  Cashier: ['POS & Sales', 'Inventory View', 'Customer Lookup'],
  'Logistics Lead': ['Orders', 'Delivery Dispatch', 'Suppliers & POs'],
  Accountant: ['Accounting Ledger', 'Business Reports', 'Supplier Payables'],
};

function resizeAvatarToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image load error'));
      img.onload = () => {
        const size = 320;
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const AdminView: React.FC = () => {
  const {
    state,
    isOffline,
    isSyncing,
    pendingSync,
    serverRevision,
    simulatedOffline,
    setSimulatedOffline,
    adminUnlocked,
    hasAdminSession,
    verifyAdminPassword,
    changeAdminPassword,
    lockAdminPanel,
    updateAdminSecurity,
    setTheme,
    addAdminUser,
    toggleAdminUserActive,
    addDocument,
    deleteDocument,
    updateSettings,
    resetDemoData,
    notify,
  } = useInnoWear();

  // Admin panel unlock form
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Add user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<AdminUser['role']>('Store Manager');

  // Add document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<BusinessDocument['category']>('Business License');
  const [docRef, setDocRef] = useState('');
  const [docIssuer, setDocIssuer] = useState('');
  const [docIssueDate, setDocIssueDate] = useState('2026-01-01');
  const [docExpiryDate, setDocExpiryDate] = useState('2027-01-01');
  const [docNotes, setDocNotes] = useState('');

  // Settings form state synced with store updates
  const [storeName, setStoreName] = useState(state.settings.storeName);
  const [tagline, setTagline] = useState(state.settings.tagline);
  const [currencySymbol, setCurrencySymbol] = useState(state.settings.currencySymbol);
  const [taxRate, setTaxRate] = useState(String(state.settings.taxRate));
  const [taxId, setTaxId] = useState(state.settings.taxId);
  const [storeAddress, setStoreAddress] = useState(state.settings.storeAddress);
  const [storePhone, setStorePhone] = useState(state.settings.storePhone);
  const [deliveryFee, setDeliveryFee] = useState(String(state.settings.deliveryFeeStandard));
  const [freeThreshold, setFreeThreshold] = useState(
    String(state.settings.freeDeliveryThreshold)
  );
  const [receiptFooter, setReceiptFooter] = useState(state.settings.receiptFooter);
  const [defaultReceiptFormat, setDefaultReceiptFormat] = useState<'thermal' | 'invoice'>(
    state.settings.defaultReceiptFormat
  );
  const [showReceiptQr, setShowReceiptQr] = useState(state.settings.showReceiptQr);

  // Owner & customer storefront settings
  const [ownerName, setOwnerName] = useState(state.settings.ownerName);
  const [ownerTitle, setOwnerTitle] = useState(state.settings.ownerTitle);
  const [whatsappOrderPhone, setWhatsappOrderPhone] = useState(
    state.settings.whatsappOrderPhone
  );
  const [businessSlug, setBusinessSlug] = useState(state.settings.businessSlug);
  const [paymentChargeEnabled, setPaymentChargeEnabled] = useState(
    state.settings.paymentChargeEnabled
  );
  const [paymentChargeLabel, setPaymentChargeLabel] = useState(
    state.settings.paymentChargeLabel
  );
  const [paymentChargeType, setPaymentChargeType] = useState<'fixed' | 'percent'>(
    state.settings.paymentChargeType
  );
  const [paymentChargeValue, setPaymentChargeValue] = useState(
    String(state.settings.paymentChargeValue)
  );

  useEffect(() => {
    setStoreName(state.settings.storeName);
    setTagline(state.settings.tagline);
    setCurrencySymbol(state.settings.currencySymbol);
    setTaxRate(String(state.settings.taxRate));
    setTaxId(state.settings.taxId);
    setStoreAddress(state.settings.storeAddress);
    setStorePhone(state.settings.storePhone);
    setDeliveryFee(String(state.settings.deliveryFeeStandard));
    setFreeThreshold(String(state.settings.freeDeliveryThreshold));
    setReceiptFooter(state.settings.receiptFooter);
    setDefaultReceiptFormat(state.settings.defaultReceiptFormat);
    setShowReceiptQr(state.settings.showReceiptQr);
    setOwnerName(state.settings.ownerName);
    setOwnerTitle(state.settings.ownerTitle);
    setWhatsappOrderPhone(state.settings.whatsappOrderPhone);
    setBusinessSlug(state.settings.businessSlug);
    setPaymentChargeEnabled(state.settings.paymentChargeEnabled);
    setPaymentChargeLabel(state.settings.paymentChargeLabel);
    setPaymentChargeType(state.settings.paymentChargeType);
    setPaymentChargeValue(String(state.settings.paymentChargeValue));
  }, [state.settings]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockBusy(true);
    setUnlockError('');
    const result = await verifyAdminPassword(unlockPass);
    setUnlockBusy(false);
    if (!result.ok) {
      setUnlockError(result.error || 'Invalid administrator passcode.');
      return;
    }
    setUnlockPass('');
    notify('Admin control panel unlocked.');
  };

  if (!adminUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                Admin Control Locked
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Enter your administrator passcode to manage store settings and security
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 text-xs">
            <input
              type="password"
              required
              autoFocus
              value={unlockPass}
              onChange={(e) => setUnlockPass(e.target.value)}
              placeholder="Administrator passcode"
              className="w-full px-3 py-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            {unlockError && <p className="text-red-400">{unlockError}</p>}
            <button
              type="submit"
              disabled={unlockBusy}
              className="w-full py-2.5 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {unlockBusy ? 'Verifying...' : 'Unlock Admin Settings'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'InnoWear Fashion Collection',
      tagline: tagline.trim() || 'Your Business. Your Control. Your Growth.',
      currencySymbol: currencySymbol.trim() || 'K',
      taxRate: Math.max(0, parseFloat(taxRate) || 0),
      taxId: taxId.trim(),
      storeAddress: storeAddress.trim(),
      storePhone: storePhone.trim(),
      deliveryFeeStandard: Math.max(0, parseFloat(deliveryFee) || 0),
      freeDeliveryThreshold: Math.max(0, parseFloat(freeThreshold) || 0),
      receiptFooter: receiptFooter.trim(),
      defaultReceiptFormat,
      showReceiptQr,
      ownerName: ownerName.trim() || 'Innocent Lombe',
      ownerTitle: ownerTitle.trim() || 'Founder & Owner',
      whatsappOrderPhone: whatsappOrderPhone.trim(),
      businessSlug: businessSlug.trim() || 'innowear-fashion-collection',
      paymentChargeEnabled,
      paymentChargeLabel: paymentChargeLabel.trim() || 'Payment Charge',
      paymentChargeType,
      paymentChargeValue: Math.max(0, parseFloat(paymentChargeValue) || 0),
    });
  };

  const handleOwnerPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeAvatarToDataUrl(file);
      updateSettings({ ownerPhoto: dataUrl });
    } catch {
      notify('Could not process selected portrait image.');
    }
  };

  const handleBrowserNotificationsToggle = async (checked: boolean) => {
    if (checked && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore permission errors
        }
      }
    }
    updateSettings({ browserNotificationsEnabled: checked });
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

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docRef.trim()) return;
    addDocument({
      title: docTitle.trim(),
      category: docCategory,
      referenceNumber: docRef.trim(),
      issuer: docIssuer.trim() || 'Regulatory Authority',
      issueDate: docIssueDate,
      expiryDate: docExpiryDate,
      notes: docNotes.trim(),
      uploadedBy: state.settings.ownerName || 'Owner',
    });
    setDocTitle('');
    setDocRef('');
    setDocIssuer('');
    setDocNotes('');
    setShowDocModal(false);
  };

  const handleUpdatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    const result = await changeAdminPassword(currentPassword, newPassword);
    setPasswordSaving(false);
    if (!result.ok) {
      setPasswordError(result.error || 'Could not update passcode.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setShowPasswordModal(false);
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

  const customerStoreUrl =
    typeof window !== 'undefined'
      ? `${(state.settings.businessAppUrl.trim() || window.location.origin).replace(/\/$/, '')}/?mode=store`
      : '/?mode=store';

  const handleCopyStoreUrl = async () => {
    try {
      await navigator.clipboard.writeText(customerStoreUrl);
      notify('Customer storefront URL copied.');
    } catch {
      notify(customerStoreUrl);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Admin Control & System Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Owner control over brand theme, receipts, security lock, business documents, and
            server sync
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          {state.adminSecurity.protectAdminPanel && (
            <button
              type="button"
              onClick={lockAdminPanel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Admin
            </button>
          )}
        </div>
      </div>

      {/* Theme, Owner Profile & Offline Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Brand Visual Identity & Owner Profile
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Switch workspace theme and customize the founder identity
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

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-hairline)]">
            <div className="flex items-center gap-3 min-w-0">
              {state.settings.ownerPhoto ? (
                <img
                  src={state.settings.ownerPhoto}
                  alt={state.settings.ownerName}
                  className="w-12 h-12 rounded-full object-cover border border-[var(--accent)] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {state.settings.ownerName}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {state.settings.ownerTitle}
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer shrink-0">
              <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleOwnerPhotoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Offline & Data Control + Admin Security */}
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Server Sync & Offline Resilience
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Server Revision #{serverRevision} · Last saved {state.lastSyncedAt}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
              {isOffline ? (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Offline Mode</span>
                </>
              ) : isSyncing ? (
                <span className="text-[var(--accent)]">Syncing...</span>
              ) : pendingSync ? (
                <span className="text-amber-400">Queued for Sync</span>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Server Synced</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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

          {/* Admin Security Lock Controls */}
          <div className="pt-4 border-t border-[var(--border-hairline)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Admin Passcode Protection
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {state.adminSecurity.hasPassword ? 'Change Passcode' : 'Set Passcode'}
              </button>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-[var(--text-secondary)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.adminSecurity.protectAdminPanel}
                  onChange={(e) =>
                    updateAdminSecurity({ protectAdminPanel: e.target.checked })
                  }
                  className="accent-[var(--accent)]"
                />
                <span>Require passcode to open Admin Settings</span>
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
                <span>Require login on app startup</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Store Settings, Receipts, Charges & Customer Ordering */}
      <form
        onSubmit={handleSaveSettings}
        className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Store Configuration, Invoices & Storefront Ordering
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Business details, TPIN, tax rates, payment charges, receipt layout, and WhatsApp
              ordering
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
            <label className="block text-[var(--text-secondary)] mb-1">Brand Tagline</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Currency Symbol</label>
            <input
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
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
            <label className="block text-[var(--text-secondary)] mb-1">Store Address</label>
            <input
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Store Phone(s)</label>
            <input
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
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
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Default Receipt Format
            </label>
            <select
              value={defaultReceiptFormat}
              onChange={(e) =>
                setDefaultReceiptFormat(e.target.value as 'thermal' | 'invoice')
              }
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="invoice">Official Tax Invoice</option>
              <option value="thermal">80mm Thermal Receipt</option>
            </select>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              Standard Courier Fee ({currencySymbol})
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
              Free Delivery Over ({currencySymbol})
            </label>
            <input
              type="number"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Owner Name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Owner Title</label>
            <input
              value={ownerTitle}
              onChange={(e) => setOwnerTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Receipt Footer & QR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs pt-2 border-t border-[var(--border-hairline)]">
          <div className="lg:col-span-2">
            <label className="block text-[var(--text-secondary)] mb-1">Receipt Footer Message</label>
            <input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={showReceiptQr}
                onChange={(e) => setShowReceiptQr(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Show verification QR code on receipts</span>
            </label>
          </div>
        </div>

        {/* Payment Charge & WhatsApp Ordering */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3 border-t border-[var(--border-hairline)] text-xs">
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-semibold text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={paymentChargeEnabled}
                onChange={(e) => setPaymentChargeEnabled(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>Enable Electronic / Mobile Money Payment Charge</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={paymentChargeLabel}
                onChange={(e) => setPaymentChargeLabel(e.target.value)}
                placeholder="Label"
                className="px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
              <select
                value={paymentChargeType}
                onChange={(e) => setPaymentChargeType(e.target.value as 'fixed' | 'percent')}
                className="px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="fixed">Fixed ({currencySymbol})</option>
                <option value="percent">Percent (%)</option>
              </select>
              <input
                type="number"
                step="0.5"
                value={paymentChargeValue}
                onChange={(e) => setPaymentChargeValue(e.target.value)}
                className="px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                Customer Online Ordering & WhatsApp
              </span>
              <button
                type="button"
                onClick={handleCopyStoreUrl}
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
              >
                <Copy className="w-3 h-3" />
                Copy Storefront Link
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={businessSlug}
                onChange={(e) => setBusinessSlug(e.target.value)}
                placeholder="Store slug"
                className="px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
              <input
                value={whatsappOrderPhone}
                onChange={(e) => setWhatsappOrderPhone(e.target.value)}
                placeholder="WhatsApp number (+260...)"
                className="px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Operational & Notification Preferences */}
        <div className="flex flex-wrap gap-6 pt-3 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
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
            <span>Instant order notifications</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.notificationSoundEnabled}
              onChange={(e) => updateSettings({ notificationSoundEnabled: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>Order sound chime</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.browserNotificationsEnabled}
              onChange={(e) => void handleBrowserNotificationsToggle(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span>Browser desktop alerts</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.whatsappOrdersEnabled}
              onChange={(e) => updateSettings({ whatsappOrdersEnabled: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span>WhatsApp checkout button</span>
          </label>
        </div>
      </form>

      {/* Official Business Documents & Compliance Vault */}
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Business Documents & Compliance Vault
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowDocModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Document
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-4 font-medium">Document & Issuer</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Reference #</th>
                <th className="py-3 px-4 font-medium">Validity</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-xs">
              {state.documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[var(--text-primary)]">{doc.title}</div>
                    <div className="text-[var(--text-muted)] mt-0.5">{doc.issuer}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">{doc.category}</td>
                  <td className="py-3.5 px-4 font-mono-tabular text-[var(--accent)]">
                    {doc.referenceNumber}
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)]">
                    {doc.issueDate} → {doc.expiryDate}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => deleteDocument(doc.id)}
                      aria-label={`Delete ${doc.title}`}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                    <div className="font-medium text-[var(--text-primary)]">{usr.name}</div>
                    <div className="text-[var(--text-muted)]">
                      {usr.email} · {usr.lastActive}
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

      {/* Add Business Document Modal */}
      <Modal
        open={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Archive Official Business Document"
        subtitle="Store PACRA registration, ZRA TPIN certificates, leases, and supplier contracts"
      >
        <form onSubmit={handleAddDocument} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Document Title</label>
            <input
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Municipal Trading Permit 2026"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as BusinessDocument['category'])}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Business License">Business License</option>
                <option value="Tax & TPIN">Tax & TPIN</option>
                <option value="Lease & Property">Lease & Property</option>
                <option value="Supplier Contract">Supplier Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Reference Number</label>
              <input
                required
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                placeholder="PACRA-..."
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Issuing Authority</label>
            <input
              value={docIssuer}
              onChange={(e) => setDocIssuer(e.target.value)}
              placeholder="e.g. Zambia Revenue Authority"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Issue Date</label>
              <input
                type="date"
                value={docIssueDate}
                onChange={(e) => setDocIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Expiry Date</label>
              <input
                type="date"
                value={docExpiryDate}
                onChange={(e) => setDocExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Notes</label>
            <textarea
              rows={2}
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDocModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Save Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Admin Passcode Modal */}
      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={state.adminSecurity.hasPassword ? 'Update Admin Passcode' : 'Set Admin Passcode'}
        subtitle="Secured with server-side salted scrypt verification"
      >
        <form onSubmit={handleUpdatePasscode} className="space-y-4 text-xs">
          {state.adminSecurity.envOverrideActive && (
            <p className="p-2.5 rounded-md bg-amber-950/40 border border-amber-700/40 text-amber-300">
              Passcode is currently managed via the server ADMIN_PASSCODE environment setting.
            </p>
          )}
          {state.adminSecurity.hasPassword && !hasAdminSession && (
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Current Passcode
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          )}
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">
              New Passcode (minimum 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          {passwordError && <p className="text-red-400">{passwordError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] disabled:opacity-50"
            >
              {passwordSaving ? 'Saving...' : 'Save Passcode'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
