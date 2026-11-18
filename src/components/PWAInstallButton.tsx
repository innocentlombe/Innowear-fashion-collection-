import React, { useState } from 'react';
import { Download, Smartphone, Laptop, Copy, Check, Share, FileDown } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Modal } from './Modal';
import { useInnoWear } from '../store/useInnoWearStore';
import { buildBusinessAppLinks, downloadBusinessAppShortcut } from '../utils/appLinks';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'card';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  label = 'Download App',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { state, notify } = useInnoWear();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Suppress install controls when already running in standalone installed PWA mode
  if (isInstalled) {
    return null;
  }

  const { businessAppUrl } = buildBusinessAppLinks(state.settings);
  const appUrl = businessAppUrl;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        notify(`${state.settings.storeName} installed to your device.`);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      notify('App link copied — open in Chrome or Safari to install.');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      notify('Copy the URL directly from your browser address bar.');
    }
  };

  const triggerButton =
    variant === 'sidebar' ? (
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
          {label}
        </span>
        <span className="text-[11px] text-[var(--accent)]">PWA</span>
      </button>
    ) : variant === 'card' ? (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        {isInstallable ? 'Install App Now' : label}
      </button>
    ) : (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Install</span>
      </button>
    );

  return (
    <>
      {triggerButton}

      <Modal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={`Download ${state.settings.storeName} App`}
        subtitle="Install on Android, iPhone, iPad, or Desktop for instant offline-ready access"
      >
        <div className="space-y-4 text-xs">
          {isInstallable && (
            <div className="p-4 rounded-md bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  Ready for One-Click Installation
                </p>
                <p className="text-[var(--text-secondary)] mt-0.5">
                  Install directly to your home screen or desktop app launcher.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuide(false);
                }}
                className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
              >
                Install Now
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-md bg-[var(--bg-elevated)] border ${
                isIOS ? 'border-[var(--accent)]' : 'border-[var(--border-hairline)]'
              } space-y-2`}
            >
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Share className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>iPhone & iPad (Safari)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] leading-relaxed">
                <li>Open the app link in Safari.</li>
                <li>
                  Tap the <strong className="text-[var(--text-primary)]">Share</strong> icon at the
                  bottom toolbar.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
                </li>
              </ol>
            </div>

            <div
              className={`p-4 rounded-md bg-[var(--bg-elevated)] border ${
                !isIOS ? 'border-[var(--accent)]' : 'border-[var(--border-hairline)]'
              } space-y-2`}
            >
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Smartphone className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>Android (Chrome)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] leading-relaxed">
                <li>Open the app link in Google Chrome.</li>
                <li>
                  Tap the <strong className="text-[var(--text-primary)]">⋮ Menu</strong> in the top
                  right corner.
                </li>
                <li>
                  Tap <strong className="text-[var(--text-primary)]">Install App</strong> or{' '}
                  <strong className="text-[var(--text-primary)]">Add to Home screen</strong>.
                </li>
              </ol>
            </div>
          </div>

          <div className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <Laptop className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Windows & Mac Desktop (Chrome / Edge)</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Open the app directly in Chrome or Edge, then click the{' '}
              <strong className="text-[var(--text-primary)]">Install App</strong> icon on the right
              side of the browser address bar to create a standalone desktop application.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--text-muted)]">
                {state.settings.storeName} · Business Application Link
              </p>
              <button
                type="button"
                onClick={() => {
                  const file = downloadBusinessAppShortcut(state.settings, 'business');
                  notify(`Downloaded ${file} app launcher.`);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download App Shortcut
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-mono-tabular text-[11px]"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
