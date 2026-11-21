import React from 'react';
import { BellRing, MessageCircle, ShoppingBag, Store, X, ArrowRight } from 'lucide-react';
import { useInnoWear } from '../store/useInnoWearStore';

interface OrderNotificationBannerProps {
  onViewOrder?: () => void;
  actionLabel?: string;
}

export const OrderNotificationBanner: React.FC<OrderNotificationBannerProps> = ({
  onViewOrder,
  actionLabel = 'View Order',
}) => {
  const { state, activeOrderAlert, dismissOrderAlert, markNotificationRead } = useInnoWear();
  if (!activeOrderAlert) return null;

  const c = state.settings.currencySymbol;
  const isWhatsApp = activeOrderAlert.channel === 'WhatsApp';
  const headline =
    activeOrderAlert.channel === 'WhatsApp'
      ? 'New WhatsApp Order Received'
      : activeOrderAlert.channel === 'Online'
      ? 'New Online Order Received'
      : 'POS Order Completed';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-18 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-lg border shadow-2xl p-4 bg-[var(--bg-surface)] ${
        isWhatsApp ? 'border-[var(--status-positive)]' : 'border-[var(--accent)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            isWhatsApp
              ? 'bg-[var(--status-positive-soft)] text-[var(--status-positive)] border border-[var(--status-positive-border)]'
              : 'bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}
        >
          {isWhatsApp ? (
            <MessageCircle className="w-4 h-4" />
          ) : activeOrderAlert.channel === 'Online' ? (
            <Store className="w-4 h-4" />
          ) : activeOrderAlert.channel === 'POS' ? (
            <ShoppingBag className="w-4 h-4" />
          ) : (
            <BellRing className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs font-semibold ${
                isWhatsApp ? 'text-[var(--status-positive)]' : 'text-[var(--accent)]'
              }`}
            >
              {headline}
            </p>
            <button
              type="button"
              onClick={dismissOrderAlert}
              aria-label="Dismiss order notification"
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs font-medium text-[var(--text-primary)] mt-0.5 truncate">
            {activeOrderAlert.orderNumber} · {activeOrderAlert.customerName}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {activeOrderAlert.itemCount} item(s) · {activeOrderAlert.paymentMethod} ·{' '}
            <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
              {c}
              {activeOrderAlert.total.toFixed(2)}
            </span>
          </p>

          {onViewOrder && (
            <button
              type="button"
              onClick={() => {
                markNotificationRead(activeOrderAlert.id);
                dismissOrderAlert();
                onViewOrder();
              }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              {actionLabel}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
