'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { generateWatermarkGrid, WatermarkPayload } from '@/utils/watermarkGenerator';
import { useMicroJitter } from '@/hooks/useMicroJitter';

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
  enableJitter = true,
  className = ''
}: WatermarkOverlayProps) {
  const { user } = useAuth();
  const jitter = useMicroJitter({ enabled: enableJitter, intervalMs: 100, maxOffset: 2 });

  const watermarkPayload = useMemo<WatermarkPayload>(() => {
    return {
      userId: user?.id,
      email: user?.email,
      phone: (user as any)?.phone,
      orderId,
      bookId,
      bookTitle,
      pageNum
    };
  }, [user?.id, user?.email, (user as any)?.phone, orderId, bookId, bookTitle, pageNum]);

  const gridItems = useMemo(() => {
    return generateWatermarkGrid(watermarkPayload, 4, 3);
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
          className="absolute whitespace-nowrap font-mono text-[10px] sm:text-[11px] font-bold tracking-widest opacity-[0.12] text-[#a82b18] transition-transform duration-75 ease-linear"
          style={{
            top: `${item.topPercent}%`,
            left: `${item.leftPercent}%`,
            transform: `translate3d(calc(-50% + ${jitter.x}px), calc(-50% + ${jitter.y}px), 0) rotate(${item.angle}deg)`,
            willChange: 'transform'
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
