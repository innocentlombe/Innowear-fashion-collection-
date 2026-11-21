import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteButtonProps {
  onConfirm: () => void;
  ariaLabel: string;
  label?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onConfirm,
  ariaLabel,
  label,
}) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (armed) {
    return (
      <span
        className="inline-flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setArmed(false);
            onConfirm();
          }}
          className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setArmed(false);
          }}
          aria-label="Cancel delete"
          className="p-1 rounded-md border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setArmed(true);
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--status-danger)] hover:border-[var(--status-danger-border)] hover:bg-[var(--status-danger-soft)] transition-colors whitespace-nowrap shrink-0"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
};
