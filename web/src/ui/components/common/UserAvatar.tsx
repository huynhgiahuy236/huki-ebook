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
  size = 'w-8 h-8',
  className = '',
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const src = explicitSrc ?? user?.avatarUrl ?? user?.avatar ?? user?.profile?.avatar ?? null;
  const name = explicitName ?? user?.fullName ?? user?.name ?? user?.profile?.fullName ?? 'Người Dùng';

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (hasError || !src) {
    return (
      <div
        className={`${size} rounded-full bg-[#003b2b] text-[#94f5d6] font-bold text-xs flex items-center justify-center border border-[#94f5d6]/40 select-none ${className}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setHasError(true)}
      className={`${size} rounded-full object-cover border border-[#94f5d6]/40 ${className}`}
    />
  );
}
