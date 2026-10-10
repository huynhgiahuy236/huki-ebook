'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { generateWatermarkGrid, WatermarkPayload } from '@/utils/watermarkGenerator';

export interface WatermarkOverlayProps {
  pageNum: number;
  bookId?: string;
  bookTitle?: string;
  orderId?: string;
  enableJitter?: boolean;
  className?: string;
}

export default function WatermarkOverlay({
  pageNum,
  bookId,
  bookTitle,
  orderId,
  enableJitter = false,
  className = ''
}: WatermarkOverlayProps) {
  const { user } = useAuth();

  const watermarkPayload = useMemo<WatermarkPayload>(() => {
    return {
      userId: user?.id,
      fullName: user?.fullName || (user as any)?.name,
      email: user?.email,
      phone: (user as any)?.phone,
      orderId,
      bookId,
      bookTitle,
      pageNum
    };
  }, [user?.id, user?.fullName, (user as any)?.name, user?.email, (user as any)?.phone, orderId, bookId, bookTitle, pageNum]);

  // Generate 3 clearly visible, non-intrusive watermark lines distributed across the page
  const gridItems = useMemo(() => {
    return generateWatermarkGrid(watermarkPayload, 3, 1);
  }, [watermarkPayload]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-30 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {gridItems.map((item) => (
        <div
          key={item.id}
          className="absolute whitespace-nowrap font-sans text-xs sm:text-[13px] font-semibold tracking-wider text-slate-800 dark:text-slate-200 select-none pointer-events-none transition-none"
          style={{
            top: `${item.topPercent}%`,
            left: `${item.leftPercent}%`,
            transform: `translate(-50%, -50%) rotate(${item.angle}deg)`,
            opacity: 0.22,
            willChange: 'auto',
            textShadow: '0 0 1px rgba(255, 255, 255, 0.4)'
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
