import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Modal } from './Modal';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? 'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors'
            : 'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0'
        }
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
          Install App
        </span>
        {compact && <span className="text-[11px] text-[var(--accent)]">PWA</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors'
              : 'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0'
          }
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            Install on iOS
          </span>
        </button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install InnoWear BMS on iPhone / iPad"
          subtitle="Run offline as a full-screen boutique app"
        >
          <div className="space-y-4 text-xs text-[var(--text-secondary)]">
            <p>
              1. Tap the <strong className="text-[var(--text-primary)]">Share</strong> button in
              Safari&apos;s toolbar.
            </p>
            <p>
              2. Scroll down and select{' '}
              <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
            </p>
            <p>
              3. Tap <strong className="text-[var(--text-primary)]">Add</strong> to launch InnoWear
              BMS directly from your home screen.
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return null;
};
