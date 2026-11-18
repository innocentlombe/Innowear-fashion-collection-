import React, { useState } from 'react';
import {
  Search,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Truck,
  Clock,
} from 'lucide-react';
import { useInnoWear } from '../store/useInnoWearStore';
import { StorefrontView } from './StorefrontView';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Modal } from '../components/Modal';
import { OwnerAvatar } from '../components/OwnerAvatar';
import { DEFAULT_ADMIN_PASSWORD } from '../utils/auth';

interface CustomerPortalShellProps {
  onExitToStaff: () => void;
}

export const CustomerPortalShell: React.FC<CustomerPortalShellProps> = ({ onExitToStaff }) => {
  const { state, unlockWorkspace, isOffline, toast } = useInnoWear();
  const c = state.settings.currencySymbol;

  // Order tracking modal state
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');

  // Protected Staff/Owner return modal state
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [staffPwd, setStaffPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [staffError, setStaffError] = useState('');

  const matchingOrders = trackQuery.trim()
    ? state.orders.filter((o) => {
        const q = trackQuery.trim().toLowerCase();
        const del = state.deliveries.find((d) => d.orderNumber === o.orderNumber);
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (del && del.phone.toLowerCase().includes(q)) ||
          (del && del.trackingCode.toLowerCase().includes(q))
        );
      })
    : [];

  const handleStaffReturnClick = () => {
    if (!state.adminSecurity.protectAdminPanel && !state.adminSecurity.requireLoginOnStart) {
      onExitToStaff();
      return;
    }
    setStaffPwd('');
    setStaffError('');
    setStaffLoginOpen(true);
  };

  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    const ok = await unlockWorkspace(staffPwd);
    if (ok) {
      setStaffLoginOpen(false);
      setStaffPwd('');
      onExitToStaff();
    } else {
      setStaffError('Incorrect admin password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Customer-Facing Storefront Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface)]/95 backdrop-blur-xs border-b border-[var(--border-hairline)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-[var(--accent)] leading-none">
              INNOWEAR
            </span>
            <span className="hidden md:inline-block text-xs text-[var(--text-muted)] border-l border-[var(--border-hairline)] pl-3 truncate">
              {state.settings.storeName} · Customer Ordering Portal
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTrackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">Track Order</span>
              <span className="sm:hidden">Track</span>
            </button>

            <PWAInstallButton variant="header" label="Download App" />

            <button
              type="button"
              onClick={handleStaffReturnClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
              title="Staff & Owner Management Sign In"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Staff Login</span>
            </button>
          </div>
        </div>
      </header>

      {isOffline && (
        <div className="px-4 sm:px-8 py-2 bg-amber-950/50 border-b border-amber-700/40 text-center text-xs text-amber-300">
          Offline Mode — You can still browse items and submit orders locally.
        </div>
      )}

      {/* Main Customer Storefront Content */}
      <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {state.settings.customerOrderingEnabled ? (
          <StorefrontView customerMode />
        ) : (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-md w-full p-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-center space-y-4">
              <p className="font-display text-3xl font-bold tracking-wider text-[var(--accent)]">
                INNOWEAR
              </p>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                Online Ordering Currently Paused
              </h1>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Our boutique team is currently refreshing our seasonal collection. Please visit us
                in-store or contact us directly to place a private order.
              </p>
              <div className="pt-3 border-t border-[var(--border-hairline)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {state.settings.storePhone}
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {state.settings.storeAddress}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Boutique Customer Footer */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <span className="font-semibold text-[var(--text-primary)]">
              {state.settings.storeName}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
              {state.settings.storeAddress}
            </span>
            <span className="inline-flex items-center gap-1 font-mono-tabular">
              <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
              {state.settings.storePhone}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStaffReturnClick}
            className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
          >
            <Lock className="w-3 h-3" />
            Owner & Staff Management
          </button>
        </div>
      </footer>

      {/* Customer Order Tracking Modal */}
      <Modal
        open={trackOpen}
        onClose={() => setTrackOpen(false)}
        title="Track Your InnoWear Order"
        subtitle="Enter your Order Number (e.g. INW-2026-1048), name, or phone number"
      >
        <div className="space-y-4 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              placeholder="Order #, tracking code, or phone..."
              className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {!trackQuery.trim() ? (
            <p className="py-6 text-center text-[var(--text-muted)]">
              Enter your order number from your receipt to check live preparation and courier
              status.
            </p>
          ) : matchingOrders.length === 0 ? (
            <p className="py-6 text-center text-[var(--text-muted)]">
              No matching orders found for &ldquo;{trackQuery}&rdquo;. Double-check your order
              number or call {state.settings.storePhone}.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {matchingOrders.map((order) => {
                const delivery = state.deliveries.find((d) => d.orderNumber === order.orderNumber);
                const isDone =
                  order.fulfillmentStatus === 'Delivered' ||
                  order.fulfillmentStatus === 'Collected';
                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono-tabular font-semibold text-sm text-[var(--text-primary)]">
                          {order.orderNumber}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">{order.date}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isDone ? 'text-emerald-400' : 'text-[var(--accent)]'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : order.fulfillmentStatus === 'Dispatched' ? (
                          <Truck className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {order.fulfillmentStatus}
                      </span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-[var(--border-hairline)] text-[var(--text-secondary)]">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span className="truncate">
                            {item.qty}× {item.name} ({item.size}, {item.colour})
                          </span>
                          <span className="font-mono-tabular shrink-0">
                            {c}
                            {(item.unitPrice * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-hairline)]">
                      <span className="text-[var(--text-muted)] inline-flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[var(--accent)]" />
                        {delivery
                          ? `${delivery.trackingCode} · ${delivery.eta}`
                          : `${order.paymentMethod} (${order.paymentStatus})`}
                      </span>
                      <span className="font-mono-tabular font-semibold text-[var(--accent)]">
                        {c}
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Protected Return to Staff/Owner Workspace Modal */}
      <Modal
        open={staffLoginOpen}
        onClose={() => setStaffLoginOpen(false)}
        title="Staff & Owner Sign In"
        subtitle="Enter the admin password to return to the InnoWear Business Management System"
      >
        <form onSubmit={handleStaffLoginSubmit} className="space-y-4 text-xs">
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
              <p className="text-[11px] text-[var(--text-muted)]">{state.settings.ownerTitle}</p>
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Admin Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                autoFocus
                value={staffPwd}
                onChange={(e) => {
                  setStaffPwd(e.target.value);
                  if (staffError) setStaffError('');
                }}
                placeholder="Enter admin password"
                className="w-full pl-3 pr-10 py-2.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {staffError && <p className="text-red-400 mt-1.5">{staffError}</p>}
          </div>

          {state.adminSecurity.isDefaultPassword && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Default owner password:{' '}
              <span className="font-mono-tabular text-[var(--accent)]">
                {DEFAULT_ADMIN_PASSWORD}
              </span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStaffLoginOpen(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Stay in Storefront
            </button>
            <button
              type="submit"
              disabled={!staffPwd}
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
            >
              Sign In to BMS
            </button>
          </div>
        </form>
      </Modal>

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
