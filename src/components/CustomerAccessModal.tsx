import React, { useMemo, useState } from 'react';
import { Copy, Check, ExternalLink, MessageCircle, Download, Store, ShieldCheck, Link2 } from 'lucide-react';
import { Modal } from './Modal';
import { useInnoWear } from '../store/useInnoWearStore';
import { buildBusinessAppLinks, downloadBusinessAppShortcut } from '../utils/appLinks';

interface CustomerAccessModalProps {
  open: boolean;
  onClose: () => void;
  onLaunchCustomerMode: () => void;
}

/** Deterministic visual QR-style matrix derived from the customer ordering URL */
const StoreQrBadgeSvg: React.FC<{ seed: string }> = ({ seed }) => {
  const cells = useMemo(() => {
    const size = 19;
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
          (x < 6 && y < 6) || (x >= size - 6 && y < 6) || (x < 6 && y >= size - 6);
        if (inFinder) continue;
        hash ^= (x * 37 + y * 19) & 0xff;
        hash = Math.imul(hash, 16777619);
        grid[y][x] = ((hash >>> 11) & 1) === 1;
      }
    }
    return grid;
  }, [seed]);

  return (
    <svg
      viewBox="0 0 19 19"
      className="w-28 h-28 rounded bg-white p-2 shrink-0"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Customer ordering portal code"
    >
      <rect width="19" height="19" fill="#ffffff" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#09090b" /> : null
        )
      )}
    </svg>
  );
};

export const CustomerAccessModal: React.FC<CustomerAccessModalProps> = ({
  open,
  onClose,
  onLaunchCustomerMode,
}) => {
  const { state, isAdminUnlocked, updateSettings, notify } = useInnoWear();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBizLink, setCopiedBizLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const { businessAppUrl, customerOrderAppUrl } = buildBusinessAppLinks(state.settings);
  const customerOrderUrl = customerOrderAppUrl;

  const handleCopyBizLink = async () => {
    try {
      await navigator.clipboard.writeText(businessAppUrl);
      setCopiedBizLink(true);
      notify(`${state.settings.storeName} business application link copied.`);
      setTimeout(() => setCopiedBizLink(false), 2000);
    } catch {
      notify('Could not access clipboard — copy the link from the box.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerOrderUrl);
      setCopiedLink(true);
      notify('Customer ordering app link copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      notify('Could not access clipboard — copy the link from the box.');
    }
  };

  const handleCopyWhatsAppInvite = async () => {
    const activePromo = state.campaigns.find((c) => c.status === 'Active');
    const msg = [
      `Shop *${state.settings.storeName}* online and place your order directly in Zambian Kwacha (ZMW):`,
      customerOrderUrl,
      activePromo ? `Use promo code *${activePromo.promoCode}* for ${activePromo.discountPercent}% off!` : '',
      `Tel: ${state.settings.storePhone} · ${state.settings.storeAddress}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(msg);
      setCopiedWhatsApp(true);
      notify('WhatsApp customer invite copied — paste in any chat or broadcast.');
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } catch {
      notify('Clipboard unavailable.');
    }
  };

  const handleDownloadPoster = () => {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${state.settings.storeName} — Customer Ordering Access</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;padding:40px;text-align:center;">
  <div style="max-width:480px;margin:0 auto;padding:36px;border:2px solid #d4af37;background:#141418;border-radius:12px;">
    <h1 style="margin:0;letter-spacing:4px;color:#d4af37;font-size:30px;">INNOWEAR</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;">${state.settings.storeName}</p>
    <p style="margin:24px 0 12px;font-size:18px;font-weight:600;">Order Online Anytime</p>
    <p style="margin:0 0 20px;font-size:13px;color:#d4d4d8;line-height:1.6;">
      Browse new arrivals, pick your size &amp; colour, pay in Kwacha (Card, Mobile Money, or Cash on Delivery), and track your delivery live.
    </p>
    <div style="padding:14px;background:#09090b;border:1px solid #383846;border-radius:8px;font-family:monospace;font-size:12px;word-break:break-all;color:#d4af37;">
      ${customerOrderUrl}
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">
      ${state.settings.storeAddress}<br/>
      Tel: ${state.settings.storePhone}
    </p>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'innowear-customer-ordering-card.html';
    link.click();
    URL.revokeObjectURL(url);
    notify('Downloaded printable customer ordering card.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Give Customer Access to Make Orders"
      subtitle="Share the dedicated Customer Ordering Portal — hides POS, Accounting, Inventory & Admin"
    >
      <div className="space-y-5 text-xs">
        {/* Enable/Pause Customer Access Toggle (Admin Only) */}
        {isAdminUnlocked && (
          <label className="flex items-center justify-between gap-4 p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] cursor-pointer">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                Customer Self-Service Ordering Portal
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {state.settings.customerOrderingEnabled
                  ? 'Customers can browse live stock, place Kwacha orders, get receipts, and track deliveries.'
                  : 'Ordering is currently paused for customers.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.customerOrderingEnabled}
              onChange={(e) => updateSettings({ customerOrderingEnabled: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)] shrink-0"
            />
          </label>
        )}

        {/* Shareable Links + QR Preview */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
          <StoreQrBadgeSvg seed={customerOrderUrl} />
          <div className="flex-1 min-w-0 w-full space-y-3">
            <div className="space-y-1.5">
              <p className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[var(--accent)]" />
                Customer Ordering App Link ({state.settings.storeName})
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={customerOrderUrl}
                  className="flex-1 min-w-0 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-mono-tabular text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {isAdminUnlocked && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-hairline)]">
                <p className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Full Business Application Link
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={businessAppUrl}
                    className="flex-1 min-w-0 px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-mono-tabular text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleCopyBizLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
                  >
                    {copiedBizLink ? (
                      <Check className="w-3.5 h-3.5 text-[var(--status-positive)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedBizLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Assurance Note */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[var(--text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            In <strong className="text-[var(--text-primary)]">Customer Mode</strong>, customers can
            only browse products, place orders, view receipts, and track their order status. All
            internal modules (POS, Inventory, Accounting, Reports, and Admin) stay hidden behind
            your Admin Password.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsAppInvite}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              {copiedWhatsApp ? (
                <Check className="w-3.5 h-3.5 text-[var(--status-positive)]" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
              )}
              {copiedWhatsApp ? 'Invite Copied' : 'Copy WhatsApp Invite'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPoster}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Counter Card
            </button>
            <button
              type="button"
              onClick={() => {
                const file = downloadBusinessAppShortcut(state.settings, 'customer');
                notify(`Downloaded ${file} customer app shortcut.`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              Shop App File
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLaunchCustomerMode();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5" />
            Open Customer Portal
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
