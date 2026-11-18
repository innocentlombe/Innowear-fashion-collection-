import React, { useEffect, useState } from 'react';
import { getInitials } from '../utils/imageUpload';

interface OwnerAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<OwnerAvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-base',
  xl: 'w-22 h-22 text-2xl',
};

export const OwnerAvatar: React.FC<OwnerAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass = SIZE_CLASSES[size];

  if (src && !failed) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 border border-[var(--accent)]/60 bg-[var(--bg-elevated)] ${sizeClass} ${className}`}
      >
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] font-semibold flex items-center justify-center select-none ${sizeClass} ${className}`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};
