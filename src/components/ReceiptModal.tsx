import React, { useState } from 'react';
import { CheckCircle2, Printer, Receipt } from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { Modal } from './Modal';
import { VerificationMatrix } from '../utils/qr';

interface ReceiptModalProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  closeLabel?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  onClose,
  closeLabel = 'Close',
}) => {
  const [format, setFormat] = useState<'thermal' | 'invoice'>(
    settings.defaultReceiptFormat || 'invoice'
  );
  const c = settings.currencySymbol;

  if (!order) return null;

  const qrPayload = `${order.orderNumber}|${order.total.toFixed(2)}|${settings.taxId || 'INNOWEAR'}`;

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={format === 'invoice' ? 'Tax Invoice & Official Receipt' : 'Boutique Thermal Receipt'}
      subtitle={`${order.orderNumber} · ${order.date}`}
      maxWidth={format === 'invoice' ? 'max-w-xl' : 'max-w-md'}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {order.paymentStatus} via {order.paymentMethod}
            </span>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
            {(['invoice', 'thermal'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  format === fmt
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {fmt === 'invoice' ? 'Official Invoice' : '80mm Thermal'}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`p-5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-4 text-xs ${
            format === 'thermal' ? 'max-w-xs mx-auto font-mono-tabular' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]">
            <div>
              <span className="font-display text-lg font-semibold text-[var(--text-primary)] block leading-tight">
                {settings.storeName}
              </span>
              {settings.storeAddress && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{settings.storeAddress}</p>
              )}
              {settings.storePhone && (
                <p className="text-[11px] text-[var(--text-muted)]">{settings.storePhone}</p>
              )}
              {settings.taxId && (
                <p className="text-[11px] text-[var(--accent)] font-mono-tabular mt-0.5">
                  TPIN: {settings.taxId}
                </p>
              )}
            </div>
            <Receipt className="w-4 h-4 text-[var(--accent)] shrink-0 mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[var(--text-muted)]">
            <p>
              Customer: <span className="text-[var(--text-primary)]">{order.customerName}</span>
            </p>
            <p>
              Channel: <span className="text-[var(--text-primary)]">{order.channel}</span>
            </p>
            {order.staffName && (
              <p>
                Served by: <span className="text-[var(--text-primary)]">{order.staffName}</span>
              </p>
            )}
            {order.deliveryAddress && (
              <p>
                Delivery: <span className="text-[var(--text-primary)]">{order.deliveryAddress}</span>
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] font-medium">
                    {item.qty}x {item.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {item.sku} · Size {item.size} · {item.colour}
                  </p>
                </div>
                <span className="font-mono-tabular text-[var(--text-primary)] shrink-0">
                  {c}
                  {(item.unitPrice * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span className="font-mono-tabular">
                {c}
                {order.subtotal.toFixed(2)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                <span className="font-mono-tabular">
                  -{c}
                  {order.discount.toFixed(2)}
                </span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Delivery Fee</span>
                <span className="font-mono-tabular">
                  {c}
                  {order.deliveryFee.toFixed(2)}
                </span>
              </div>
            )}
            {(order.paymentCharge ?? 0) > 0 && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{order.paymentChargeLabel || settings.paymentChargeLabel || 'Payment Charge'}</span>
                <span className="font-mono-tabular">
                  {c}
                  {(order.paymentCharge || 0).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Tax ({settings.taxRate}%)</span>
              <span className="font-mono-tabular">
                {c}
                {order.tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-hairline)]">
              <span>Total</span>
              <span className="font-mono-tabular text-[var(--accent)]">
                {c}
                {order.total.toFixed(2)}
              </span>
            </div>
          </div>

          {(settings.showReceiptQr || settings.receiptFooter) && (
            <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-4">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {settings.receiptFooter || 'Thank you for shopping with InnoWear Fashion Collection.'}
              </p>
              {settings.showReceiptQr && <VerificationMatrix value={qrPayload} size={64} />}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
