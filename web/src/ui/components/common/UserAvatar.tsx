import React, { useState } from 'react';
import type { UserSession } from '../../api/types';

export interface UserAvatarProps {
  user?: UserSession | null;
  src?: string | null;
  name?: string;
  size?: string;
  className?: string;
}

export default function UserAvatar({
  user,
  src: explicitSrc,
  name: explicitName,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const src = explicitSrc ?? user?.avatarUrl ?? user?.avatar ?? user?.profile?.avatar ?? null;
  const name = explicitName ?? user?.fullName ?? user?.name ?? user?.profile?.fullName ?? 'HuKi User';

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClassMap: Record<string, { cls: string; px: number }> = {
    xs: { cls: 'w-6 h-6 text-[10px]', px: 24 },
    sm: { cls: 'w-7 h-7 text-[11px]', px: 28 },
    md: { cls: 'w-8 h-8 text-xs', px: 32 },
    lg: { cls: 'w-10 h-10 text-sm', px: 40 },
    xl: { cls: 'w-12 h-12 text-base', px: 48 },
    '2xl': { cls: 'w-24 h-24 text-2xl', px: 96 },
  };

  const currentSize = sizeClassMap[size] || { cls: 'w-8 h-8 text-xs', px: 32 };
  const hasCustomSize = className.includes('w-');
  const sizeClasses = hasCustomSize
    ? ''
    : `${currentSize.cls} min-w-[${currentSize.px}px] min-h-[${currentSize.px}px] max-w-[${currentSize.px}px] max-h-[${currentSize.px}px]`;
  const inlineStyle = hasCustomSize ? undefined : { width: `${currentSize.px}px`, height: `${currentSize.px}px` };

  const getInitials = (n: string) => {
    if (!n) return 'H';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return parts[parts.length - 1].slice(0, 1).toUpperCase();
  };

  if (hasError || !src) {
    return (
      <div
        style={inlineStyle}
        className={`${sizeClasses} rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center border border-emerald-800 shadow-xs shrink-0 select-none overflow-hidden aspect-square ${className}`}
      >
        <span className="font-extrabold uppercase select-none">{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      style={inlineStyle}
      className={`${sizeClasses} rounded-full object-cover border border-[var(--theme-border,#e8e5df)] shadow-xs shrink-0 aspect-square overflow-hidden ${className}`}
    />
  );
}
