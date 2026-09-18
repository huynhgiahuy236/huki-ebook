'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseMicroJitterOptions {
  enabled?: boolean;
  intervalMs?: number;
  maxOffset?: number;
}

export function useMicroJitter({
  enabled = true,
  intervalMs = 100,
  maxOffset = 2
}: UseMicroJitterOptions = {}) {
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastUpdateRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setOffset({ x: 0, y: 0 });
      return;
    }

    // Respect reduced motion accessibility preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const loop = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= intervalMs) {
        lastUpdateRef.current = timestamp;

        // Generate subtle random offset between -maxOffset and +maxOffset (±2px)
        const jitterX = Math.round((Math.random() * (maxOffset * 2) - maxOffset) * 10) / 10;
        const jitterY = Math.round((Math.random() * (maxOffset * 2) - maxOffset) * 10) / 10;

        setOffset({ x: jitterX, y: jitterY });
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [enabled, intervalMs, maxOffset]);

  return offset;
}
