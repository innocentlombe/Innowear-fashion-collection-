import React, { useState } from 'react';
import { Download, RotateCcw, Plus, ShieldCheck, WifiOff, Wifi } from 'lucide-react';
import { AdminUser } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';

const ROLE_PERMISSIONS: Record<AdminUser['role'], string[]> = {
  Owner: ['All Modules', 'Financial Ledger', 'User Roles', 'Price Overrides', 'Export Data'],
  'Store Manager': ['POS & Sales', 'Inventory', 'CRM', 'Orders', 'Staff Shifts'],
  Cashier: ['POS & Sales', 'Inventory View', 'Customer Lookup'],
  'Logistics Lead': ['Orders', 'Delivery Dispatch', 'Suppliers & POs'],
  Accountant: ['Accounting Ledger', 'Business Reports', 'Supplier Payables'],
};

export const AdminView: React.FC = () => {
  const {
    state,
    isOffline,
    simulatedOffline,
    setSimulatedOffline,
    setTheme,
    addAdminUser,
    toggleAdminUserActive,
    updateSettings,
    resetDemoData,
    notify,
  } = useInnoWear();

  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<AdminUser['role']>('Store Manager');

  const [storeName, setStoreName] = useState(state.settings.storeName);
  const [taxRate, setTaxRate] = useState(String(state.settings.taxRate));
  const [deliveryFee, setDeliveryFee] = useState(String(state.settings.deliveryFeeStandard));
  const [freeThreshold, setFreeThreshold] = useState(String(state.settings.freeDeliveryThreshold));

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'InnoWear Fashion Collection',
      taxRate: Math.max(0, parseFloat(taxRate) || 0),
      deliveryFeeStandard: Math.max(0, parseFloat(deliveryFee) || 0),
      freeDeliveryThreshold: Math.max(0, parseFloat(freeThreshold) || 0),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Admin Control & System Settings
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Owner control over brand theme, users, permissions, store configuration, notifications,
          and offline backup
        </p>
      </div>

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

        <div className="flex flex-wrap gap-6 pt-2 text-xs text-[var(--text-secondary)]">
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
    </div>
  );
};
