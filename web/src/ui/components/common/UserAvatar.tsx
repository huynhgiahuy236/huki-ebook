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

  const sizeClassMap: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7.5 h-7.5 text-[11px]',
    md: 'w-8.5 h-8.5 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const sizeClasses = sizeClassMap[size] || size || 'w-8.5 h-8.5 text-xs';

  const getInitials = (n: string) => {
    if (!n) return 'HU';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (hasError || !src) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#e2e8f0] text-[#64748b] font-bold flex items-center justify-center border border-[#cbd5e1] shadow-xs shrink-0 select-none overflow-hidden ${className}`}
      >
        <span className="material-symbols-outlined text-[17px] text-[#94a3b8]">person</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setHasError(true)}
      className={`${sizeClasses} rounded-full object-cover border-2 border-[var(--theme-border,#e8e5df)] shadow-xs shrink-0 ${className}`}
    />
  );
}
