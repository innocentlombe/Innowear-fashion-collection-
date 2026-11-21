import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  Copy,
  Download,
  Gift,
  FileText,
  Receipt as ReceiptIcon,
  Check,
  X,
} from 'lucide-react';
import { Order } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { buildBusinessAppLinks } from '../utils/appLinks';

interface AdvancedReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  primaryActionLabel?: string;
}

/** Deterministic Code-128 style visual barcode SVG generated from the order number */
const OrderBarcodeSvg: React.FC<{ value: string }> = ({ value }) => {
  const bars = useMemo(() => {
    const out: Array<{ x: number; w: number }> = [];
    let cursor = 4;
    const chars = `*${value}*`;
    for (let i = 0; i < chars.length; i++) {
      const code = chars.charCodeAt(i);
      const pattern = [
        ((code >> 0) & 1) + 1,
        ((code >> 1) & 1) + 1,
        ((code >> 2) & 1) + 1,
        ((code >> 3) & 1) + 1,
        ((code >> 4) & 1) + 1,
        ((code >> 5) & 1) + 1,
      ];
      for (let j = 0; j < pattern.length; j++) {
        const w = pattern[j] * 1.4;
        if (j % 2 === 0) {
          out.push({ x: cursor, w });
        }
        cursor += w;
      }
      cursor += 1.6;
    }
    return { items: out, width: Math.max(180, Math.ceil(cursor + 4)) };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${bars.width} 42`}
      className="h-10 w-full max-w-[240px] mx-auto"
      role="img"
      aria-label={`Barcode for ${value}`}
    >
      {bars.items.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={0} width={bar.w} height={36} fill="#111113" />
      ))}
    </svg>
  );
};

/** Deterministic verification QR matrix SVG derived from receipt metadata */
const VerificationQrSvg: React.FC<{ seed: string }> = ({ seed }) => {
  const cells = useMemo(() => {
    const size = 15;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (ox: number, oy: number) => {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const border = x === 0 || y === 0 || x === 4 || y === 4;
          const center = x === 2 && y === 2;
          grid[oy + y][ox + x] = border || center;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(size - 5, 0);
    drawFinder(0, size - 5);

    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inFinder =
          (x < 6 && y < 6) ||
          (x >= size - 6 && y < 6) ||
          (x < 6 && y >= size - 6);
        if (inFinder) continue;
        hash ^= (x * 31 + y * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        grid[y][x] = ((hash >>> 12) & 1) === 1;
      }
    }
    return grid;
  }, [seed]);

  return (
    <svg
      viewBox="0 0 15 15"
      className="w-16 h-16 shrink-0"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Receipt verification QR code"
    >
      <rect width="15" height="15" fill="#ffffff" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111113" /> : null
        )
      )}
    </svg>
  );
};

export const AdvancedReceiptModal: React.FC<AdvancedReceiptModalProps> = ({
  order,
  onClose,
  primaryActionLabel = 'Done',
}) => {
  const { state, notify } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [format, setFormat] = useState<'thermal' | 'invoice'>(
    state.settings.defaultReceiptFormat || 'thermal'
  );
  const [giftMode, setGiftMode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order) {
      setFormat(state.settings.defaultReceiptFormat || 'thermal');
      setGiftMode(false);
      setCopied(false);
    }
  }, [order?.id, state.settings.defaultReceiptFormat]);

  if (!order) return null;

  const totalQty = order.items.reduce((sum, i) => sum + i.qty, 0);
  const { customerOrderAppUrl } = buildBusinessAppLinks(state.settings);
  const qrPayload = `${order.orderNumber}|${order.date}|${order.total.toFixed(2)}`;

  const buildPlainTextReceipt = (): string => {
    const lines: string[] = [
      state.settings.storeName.toUpperCase(),
      state.settings.storeAddress,
      `Tel: ${state.settings.storePhone}`,
      '----------------------------------------',
      `${giftMode ? 'GIFT RECEIPT' : 'OFFICIAL RECEIPT'}: ${order.orderNumber}`,
      `Date: ${order.date}`,
      `Channel: ${order.channel}${order.staffName ? ` | Associate: ${order.staffName}` : ''}`,
      '----------------------------------------',
      ...order.items.map((item) =>
        giftMode
          ? `${item.qty}x ${item.name} (${item.size}, ${item.colour}) [${item.sku}]`
          : `${item.qty}x ${item.name} (${item.size}, ${item.colour}) - ${c}${(
              item.unitPrice * item.qty
            ).toFixed(2)}`
      ),
      '----------------------------------------',
    ];

    if (!giftMode) {
      if (order.discount > 0) {
        lines.push(
          `Discount${order.promoCode ? ` (${order.promoCode})` : ''}: -${c}${order.discount.toFixed(
            2
          )}`
        );
      }
      if (order.deliveryFee > 0) {
        lines.push(`Delivery: ${c}${order.deliveryFee.toFixed(2)}`);
      }
      if (order.paymentCharge && order.paymentCharge > 0) {
        lines.push(
          `${order.paymentChargeLabel || 'Payment Charge'}: ${c}${order.paymentCharge.toFixed(2)}`
        );
      }
      lines.push(`TOTAL (ZMW): ${c}${order.total.toFixed(2)}`);
      lines.push(`Payment: ${order.paymentMethod} (${order.paymentStatus}) · Currency: Zambian Kwacha (ZMW)`);
      if (order.cashTendered && order.cashTendered > 0) {
        lines.push(
          `Cash Tendered: ${c}${order.cashTendered.toFixed(2)} | Change: ${c}${(
            order.changeDue || 0
          ).toFixed(2)}`
        );
      }
    }

    if (order.receiptNotes) {
      lines.push(`Note: ${order.receiptNotes}`);
    }
    lines.push('----------------------------------------');
    if (state.settings.customerOrderingEnabled) {
      lines.push(`Order Online via ${state.settings.storeName} App:`);
      lines.push(customerOrderAppUrl);
    }
    lines.push(state.settings.receiptFooter);
    return lines.join('\n');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainTextReceipt());
      setCopied(true);
      notify('Formatted receipt copied — ready to paste in WhatsApp or SMS.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Clipboard unavailable — use Download Receipt instead.');
    }
  };

  const handleDownloadHtml = () => {
    const safeTitle = `${order.orderNumber}-${giftMode ? 'gift' : format}`;
    const itemRows = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;">
            <strong>${item.name}</strong><br/>
            <span style="color:#666;font-size:12px;">${item.sku} · Size ${item.size} · ${item.colour}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;text-align:center;">${item.qty}</td>
          ${
            giftMode
              ? ''
              : `<td style="padding:8px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;">${c}${(
                  item.unitPrice * item.qty
                ).toFixed(2)}</td>`
          }
        </tr>`
      )
      .join('');

    const totalsHtml = giftMode
      ? `<p style="margin-top:16px;font-size:12px;color:#555;">Gift Receipt — prices omitted for gifting. Present barcode for 14-day size or style exchange.</p>`
      : `
        <div style="margin-top:16px;font-size:13px;line-height:1.7;">
          ${
            order.discount > 0
              ? `<div style="display:flex;justify-content:space-between;color:#15803d;"><span>Discount ${
                  order.promoCode ? `(${order.promoCode})` : ''
                }</span><span style="font-family:monospace;">-${c}${order.discount.toFixed(2)}</span></div>`
              : ''
          }
          ${
            order.deliveryFee > 0
              ? `<div style="display:flex;justify-content:space-between;"><span>Delivery</span><span style="font-family:monospace;">${c}${order.deliveryFee.toFixed(2)}</span></div>`
              : ''
          }
          ${
            order.paymentCharge && order.paymentCharge > 0
              ? `<div style="display:flex;justify-content:space-between;"><span>${
                  order.paymentChargeLabel || 'Payment Charge'
                }</span><span style="font-family:monospace;">${c}${order.paymentCharge.toFixed(
                  2
                )}</span></div>`
              : ''
          }
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;border-top:2px solid #111;margin-top:8px;padding-top:8px;">
            <span>Total (ZMW)</span><span style="font-family:monospace;">${c}${order.total.toFixed(2)}</span>
          </div>
          <p style="margin-top:10px;font-size:12px;color:#444;">Payment: ${order.paymentMethod} (${order.paymentStatus}) · Currency: Zambian Kwacha (ZMW)</p>
        </div>`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${state.settings.storeName} — ${order.orderNumber}</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f5f5f4;padding:24px;color:#111;">
  <div style="max-width:${format === 'thermal' ? '360px' : '680px'};margin:0 auto;background:#fff;padding:28px;border:1px solid #d4d4d8;">
    <h1 style="margin:0;letter-spacing:2px;font-size:22px;">INNOWEAR</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">${state.settings.storeName} · ${state.settings.storeAddress}</p>
    <p style="margin:2px 0 16px;font-size:12px;color:#555;">Tel: ${state.settings.storePhone}</p>
    <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:10px 0;font-size:12px;line-height:1.6;">
      <div><strong>${giftMode ? 'Gift Receipt' : format === 'invoice' ? 'Sales Invoice' : 'Sales Receipt'}:</strong> ${order.orderNumber}</div>
      <div><strong>Date:</strong> ${order.date} · <strong>Channel:</strong> ${order.channel}</div>
      ${order.staffName ? `<div><strong>Sales Associate:</strong> ${order.staffName}</div>` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px;">
      <thead>
        <tr style="border-bottom:1px solid #111;text-align:left;font-size:11px;color:#666;">
          <th style="padding-bottom:6px;">Item</th>
          <th style="padding-bottom:6px;text-align:center;">Qty</th>
          ${giftMode ? '' : '<th style="padding-bottom:6px;text-align:right;">Amount</th>'}
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    ${totalsHtml}
    <p style="margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;font-size:11px;color:#666;line-height:1.5;">
      ${state.settings.receiptFooter}
    </p>
    ${
      state.settings.customerOrderingEnabled
        ? `<p style="margin-top:8px;font-size:11px;color:#333;"><strong>Order Online App:</strong> <a href="${customerOrderAppUrl}" style="color:#111;">${customerOrderAppUrl}</a></p>`
        : ''
    }
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}.html`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Downloaded ${safeTitle}.html`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt ${order.orderNumber}`}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Format Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border-hairline)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Advanced Receipt Studio · {order.orderNumber}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {order.channel} · {order.paymentMethod} ({order.paymentStatus}) · {totalQty} item(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setFormat('thermal')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  format === 'thermal'
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setFormat('invoice')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  format === 'invoice'
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                A4 Invoice
              </button>
            </div>

            {/* Gift Mode Toggle */}
            <button
              type="button"
              onClick={() => setGiftMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                giftMode
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Gift Receipt
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt modal"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Paper Preview Canvas */}
        <div className="p-6 bg-[var(--bg-canvas)]/70 flex justify-center">
          {format === 'thermal' ? (
            /* 80mm Thermal Slip */
            <div className="receipt-print-sheet w-full max-w-[360px] bg-[#fcfbf8] text-[#111113] p-6 rounded-sm shadow-xl border border-neutral-300 space-y-4">
              <div className="text-center space-y-1">
                <p className="font-display text-2xl font-bold tracking-[0.2em] text-black">
                  INNOWEAR
                </p>
                <p className="text-[11px] font-medium text-neutral-700">
                  {state.settings.storeName}
                </p>
                <p className="text-[10px] text-neutral-600">{state.settings.storeAddress}</p>
                <p className="text-[10px] text-neutral-600 font-mono-tabular">
                  {state.settings.storePhone}
                </p>
              </div>

              <div className="border-t border-b border-dashed border-neutral-400 py-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-600">
                    {giftMode ? 'Gift Slip #' : 'Receipt #'}
                  </span>
                  <span className="font-mono-tabular font-semibold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Date & Time</span>
                  <span className="font-mono-tabular">{order.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">
                    {order.channel === 'POS' ? 'Associate' : 'Channel'}
                  </span>
                  <span>
                    {order.staffName ||
                      (order.channel === 'WhatsApp' ? 'WhatsApp Order' : 'Online Storefront')}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2.5 text-[11px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between gap-2 font-semibold">
                      <span>
                        {item.qty}× {item.name}
                      </span>
                      {!giftMode && (
                        <span className="font-mono-tabular shrink-0">
                          {c}
                          {(item.unitPrice * item.qty).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-600 font-mono-tabular">
                      <span>
                        {item.sku} · {item.size} · {item.colour}
                      </span>
                      {!giftMode && item.qty > 1 && (
                        <span>
                          @{c}
                          {item.unitPrice.toFixed(2)} ea
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals or Gift Notice */}
              {giftMode ? (
                <div className="border-t border-dashed border-neutral-400 pt-3 text-center text-[11px] text-neutral-700">
                  <p className="font-semibold text-black">GIFT RECEIPT · PRICES HIDDEN</p>
                  <p className="mt-1">
                    Eligible for complimentary size or style exchange within 14 days.
                  </p>
                </div>
              ) : (
                <div className="border-t border-dashed border-neutral-400 pt-3 space-y-1 text-[11px]">
                  {order.discount > 0 && (
                    <div className="flex justify-between font-medium text-emerald-800">
                      <span>
                        Savings {order.promoCode ? `(${order.promoCode})` : '(Loyalty/Promo)'}
                      </span>
                      <span className="font-mono-tabular">
                        -{c}
                        {order.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Courier Delivery</span>
                      <span className="font-mono-tabular">
                        {c}
                        {order.deliveryFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.paymentCharge && order.paymentCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        {order.paymentChargeLabel || 'Payment Charge'}
                      </span>
                      <span className="font-mono-tabular">
                        {c}
                        {order.paymentCharge.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-black pt-2 mt-1 border-t border-neutral-900">
                    <span>TOTAL DUE (ZMW)</span>
                    <span className="font-mono-tabular">
                      {c}
                      {order.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 space-y-0.5 text-[10px] text-neutral-700">
                    <div className="flex justify-between">
                      <span>Payment Tender</span>
                      <span className="font-semibold">
                        {order.paymentMethod} · {order.paymentStatus}
                      </span>
                    </div>
                    {order.cashTendered && order.cashTendered > 0 && (
                      <>
                        <div className="flex justify-between font-mono-tabular">
                          <span>Cash Tendered</span>
                          <span>
                            {c}
                            {order.cashTendered.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-mono-tabular font-semibold text-black">
                          <span>Change Returned</span>
                          <span>
                            {c}
                            {(order.changeDue || 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {order.receiptNotes && (
                <div className="border-t border-dashed border-neutral-400 pt-2 text-[10px] text-neutral-700">
                  <span className="font-semibold text-black">Note:</span> {order.receiptNotes}
                </div>
              )}

              {/* Barcode & QR Verification */}
              <div className="border-t border-dashed border-neutral-400 pt-3 space-y-3 text-center">
                <OrderBarcodeSvg value={order.orderNumber} />
                <p className="font-mono-tabular text-[10px] tracking-widest text-neutral-700 -mt-2">
                  {order.orderNumber}
                </p>

                {state.settings.showReceiptQr && (
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <VerificationQrSvg seed={qrPayload} />
                    <div className="text-left text-[9px] text-neutral-600 max-w-[170px] leading-snug">
                      <p className="font-semibold text-black">Verified Digital Receipt</p>
                      <p>Scan at InnoWear boutique desk for instant order & exchange lookup.</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-neutral-600 leading-relaxed pt-1">
                  {state.settings.receiptFooter}
                </p>
                {state.settings.customerOrderingEnabled && (
                  <p className="text-[9px] font-mono-tabular text-neutral-700 break-all pt-1">
                    Shop App: {customerOrderAppUrl}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* A4 Sales Invoice Layout */
            <div className="receipt-print-sheet w-full bg-[#ffffff] text-[#111113] p-8 rounded-sm shadow-xl border border-neutral-300 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-neutral-900">
                <div>
                  <p className="font-display text-3xl font-bold tracking-[0.18em] text-black leading-none">
                    INNOWEAR
                  </p>
                  <p className="text-xs font-medium text-neutral-700 mt-1">
                    {state.settings.storeName}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">{state.settings.storeAddress}</p>
                  <p className="text-xs text-neutral-600 font-mono-tabular">
                    {state.settings.storePhone}
                  </p>
                </div>

                <div className="sm:text-right space-y-1">
                  <p className="text-sm font-bold tracking-wider text-black">
                    {giftMode ? 'GIFT EXCHANGE SLIP' : 'SALES INVOICE'}
                  </p>
                  <p className="font-mono-tabular text-sm font-semibold text-neutral-900">
                    {order.orderNumber}
                  </p>
                  <p className="font-mono-tabular text-xs text-neutral-600">Issued {order.date}</p>
                  <p className="text-xs font-semibold text-emerald-800">
                    {order.paymentStatus} · {order.fulfillmentStatus}
                  </p>
                </div>
              </div>

              {/* Order Metadata */}
              <div className="flex flex-wrap items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-500">Transaction Details</p>
                  <p className="text-neutral-800">Channel: {order.channel}</p>
                  <p className="text-neutral-800">Payment Method: {order.paymentMethod}</p>
                </div>

                <div className="sm:text-right space-y-1">
                  {order.staffName && (
                    <p className="text-neutral-800">Sales Associate: {order.staffName}</p>
                  )}
                  {order.deliveryAddress && (
                    <p className="text-neutral-600">Delivery: {order.deliveryAddress}</p>
                  )}
                </div>
              </div>

              {/* Invoice Line Items Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-neutral-300 text-neutral-600">
                    <th className="py-2.5 font-semibold">Item Description & SKU</th>
                    <th className="py-2.5 font-semibold">Variant</th>
                    <th className="py-2.5 font-semibold text-center">Qty</th>
                    {!giftMode && (
                      <>
                        <th className="py-2.5 font-semibold text-right">Unit Price</th>
                        <th className="py-2.5 font-semibold text-right">Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3">
                        <p className="font-semibold text-black">{item.name}</p>
                        <p className="font-mono-tabular text-[11px] text-neutral-500">{item.sku}</p>
                      </td>
                      <td className="py-3 text-neutral-700">
                        Size {item.size} · {item.colour}
                      </td>
                      <td className="py-3 text-center font-mono-tabular">{item.qty}</td>
                      {!giftMode && (
                        <>
                          <td className="py-3 text-right font-mono-tabular">
                            {c}
                            {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3 text-right font-mono-tabular font-semibold">
                            {c}
                            {(item.unitPrice * item.qty).toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals + Verification QR Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="flex items-center gap-4">
                  {state.settings.showReceiptQr && <VerificationQrSvg seed={qrPayload} />}
                  <div className="space-y-1 text-[11px] text-neutral-600 max-w-xs">
                    {order.receiptNotes && (
                      <p className="text-black">
                        <strong>Order Note:</strong> {order.receiptNotes}
                      </p>
                    )}
                    <p>{state.settings.receiptFooter}</p>
                    {state.settings.customerOrderingEnabled && (
                      <p className="font-mono-tabular text-[10px] text-neutral-800 break-all">
                        Order Online App: {customerOrderAppUrl}
                      </p>
                    )}
                  </div>
                </div>

                {!giftMode && (
                  <div className="w-full sm:w-64 space-y-1.5 text-xs">
                    {order.discount > 0 && (
                      <div className="flex justify-between text-emerald-800 font-medium">
                        <span>Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
                        <span className="font-mono-tabular">
                          -{c}
                          {order.discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>Delivery Fee</span>
                        <span className="font-mono-tabular">
                          {c}
                          {order.deliveryFee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {order.paymentCharge && order.paymentCharge > 0 && (
                      <div className="flex justify-between text-neutral-600">
                        <span>{order.paymentChargeLabel || 'Payment Charge'}</span>
                        <span className="font-mono-tabular">
                          {c}
                          {order.paymentCharge.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-black pt-2 border-t-2 border-neutral-900">
                      <span>Total (ZMW)</span>
                      <span className="font-mono-tabular">
                        {c}
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                    {order.cashTendered && order.cashTendered > 0 && (
                      <div className="pt-1 text-[11px] text-neutral-600 flex justify-between font-mono-tabular">
                        <span>Tendered {c}{order.cashTendered.toFixed(2)}</span>
                        <span>Change {c}{(order.changeDue || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Print {format === 'thermal' ? 'Receipt' : 'Invoice'}
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-positive)]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Text' : 'Copy for WhatsApp / SMS'}
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
