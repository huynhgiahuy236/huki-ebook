import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function UserAvatar({ src, name = 'Người Dùng', size = 'w-8 h-8', className = '' }) {
  const [hasError, setHasError] = useState(false);

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
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
