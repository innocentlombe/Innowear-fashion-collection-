import React, { useEffect, useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';

interface AppLoadingScreenProps {
  storeName: string;
  workspaceLabel: string;
  onComplete: () => void;
}

const LOADING_STEPS = [
  'Initializing InnoWear workspace...',
  'Syncing catalog, inventory & orders...',
  'Preparing your dashboard...',
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  storeName,
  workspaceLabel,
  onComplete,
}) => {
  const [progress, setProgress] = useState(12);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const t1 = window.setTimeout(() => {
      if (cancelled) return;
      setProgress(48);
      setStepIndex(1);
    }, 360);

    const t2 = window.setTimeout(() => {
      if (cancelled) return;
      setProgress(82);
      setStepIndex(2);
    }, 840);

    const finishTimer = window.setTimeout(async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => window.setTimeout(resolve, 350)),
          ]);
        }
      } catch {
        // Ignore font readiness issues
      }
      if (cancelled) return;
      setProgress(100);
      window.setTimeout(() => {
        if (cancelled) return;
        setFadingOut(true);
        window.setTimeout(() => {
          if (!cancelled) onComplete();
        }, 260);
      }, 220);
    }, 1220);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas)] text-[var(--text-primary)]"
    >
      <div
        className={`w-full max-w-sm rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-8 shadow-sm text-center space-y-6 transition-all duration-300 ${
          fadingOut ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Brand Mark */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-none">
              InnoWear
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">{storeName}</p>
          </div>
        </div>

        {/* Workspace Tag */}
        <div className="py-1.5 px-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
          <span>{workspaceLabel}</span>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-2">
          <div
            className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="truncate">{LOADING_STEPS[stepIndex]}</span>
            <span className="font-mono-tabular font-medium text-[var(--text-secondary)] ml-2 shrink-0">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
