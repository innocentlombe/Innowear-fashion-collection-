import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  MessageCircle,
  ShoppingBag,
  Store,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OrderNotification } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import {
  BrowserNotificationPermission,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../utils/orderNotifications';

interface OrderNotificationBellProps {
  onSelectOrder?: (notification: OrderNotification) => void;
}

export const OrderNotificationBell: React.FC<OrderNotificationBellProps> = ({
  onSelectOrder,
}) => {
  const {
    state,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    updateSettings,
    notify,
  } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [open, setOpen] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleEnableBrowserAlerts = async () => {
    const result = await requestBrowserNotificationPermission();
    setBrowserPerm(result);
    if (result === 'granted') {
      updateSettings({ browserNotificationsEnabled: true, orderNotifications: true });
      notify('Device order notifications enabled.');
    } else if (result === 'denied') {
      notify('Browser notifications are blocked — enable them in browser site settings.');
    } else {
      notify('In-app order notifications remain active on this device.');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Order notifications (${unreadNotificationCount} unread)`}
        aria-expanded={open}
        className="relative p-2 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
      >
        {unreadNotificationCount > 0 ? (
          <BellRing className="w-4 h-4 text-[var(--accent)]" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] font-mono-tabular text-[10px] font-bold flex items-center justify-center shadow">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Order Notifications
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Live alerts for POS, Online &amp; WhatsApp orders
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    notificationSoundEnabled: !state.settings.notificationSoundEnabled,
                  })
                }
                title={
                  state.settings.notificationSoundEnabled
                    ? 'Mute order chime'
                    : 'Unmute order chime'
                }
                aria-label={
                  state.settings.notificationSoundEnabled
                    ? 'Mute order notification chime'
                    : 'Enable order notification chime'
                }
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)]"
              >
                {state.settings.notificationSoundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {state.notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  title="Clear notifications"
                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--status-danger)] hover:bg-[var(--bg-hover)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Browser Notification Permission Bar */}
          {browserPerm !== 'unsupported' && browserPerm !== 'granted' && (
            <div className="px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[var(--text-secondary)]">
                Get desktop &amp; mobile push alerts on new orders
              </span>
              <button
                type="button"
                onClick={handleEnableBrowserAlerts}
                className="px-2.5 py-1 font-semibold rounded bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
              >
                Enable Alerts
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-hairline)]">
            {state.notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[var(--text-muted)]">
                No order notifications yet. Alerts appear here automatically whenever a customer or
                cashier places an order.
              </div>
            ) : (
              state.notifications.map((ntf) => (
                <button
                  key={ntf.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(ntf.id);
                    onSelectOrder?.(ntf);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors flex items-start gap-3 ${
                    ntf.read ? 'opacity-75' : 'bg-[var(--accent-soft)]/35'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      ntf.channel === 'WhatsApp'
                        ? 'bg-[var(--status-positive-soft)] text-[var(--status-positive)] border border-[var(--status-positive-border)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--accent)] border border-[var(--border-hairline)]'
                    }`}
                  >
                    {ntf.channel === 'WhatsApp' ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : ntf.channel === 'Online' ? (
                      <Store className="w-4 h-4" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {ntf.orderNumber}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)] shrink-0">
                        {c}
                        {ntf.total.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {ntf.message}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {ntf.channel} · {ntf.itemCount} item(s) · {ntf.paymentMethod} ·{' '}
                      {ntf.timestamp}
                    </p>
                  </div>
                  {!ntf.read && (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
