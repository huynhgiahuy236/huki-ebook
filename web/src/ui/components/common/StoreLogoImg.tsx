'use client';

import React, { useState, useEffect } from 'react';
import { sanitizeImageUrl } from '@/ui/utils/imageUtils';

interface StoreLogoImgProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackSrc?: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Renders a store logo/avatar/banner image safely:
 * - Filters out dead `blob:` URLs via `sanitizeImageUrl`
 * - Attaches `referrerPolicy="no-referrer"` for CDN/hotlink compatibility
 * - Cascades primary -> fallbackSrc -> initial letter badge on load error (zero broken-image icon)
 */
export function StoreLogoImg({
  src,
  alt,
  fallbackText,
  fallbackSrc,
  className = 'w-full h-full object-cover',
  fallbackClassName = 'w-full h-full flex items-center justify-center bg-[#003b2b] text-white font-bold',
}: StoreLogoImgProps) {
  const cleanPrimary = sanitizeImageUrl(src);
  const cleanFallback = sanitizeImageUrl(fallbackSrc);
  const initialStage: 'primary' | 'fallback' | 'initial' = cleanPrimary
    ? 'primary'
    : cleanFallback
    ? 'fallback'
    : 'initial';

  const [stage, setStage] = useState<'primary' | 'fallback' | 'initial'>(initialStage);

  useEffect(() => {
    setStage(cleanPrimary ? 'primary' : cleanFallback ? 'fallback' : 'initial');
  }, [cleanPrimary, cleanFallback]);

  if (stage === 'primary' && cleanPrimary) {
    return (
      <img
        src={cleanPrimary}
        alt={alt}
        referrerPolicy="no-referrer"
        className={className}
        onError={() => setStage(cleanFallback ? 'fallback' : 'initial')}
      />
    );
  }

  if (stage === 'fallback' && cleanFallback) {
    return (
      <img
        src={cleanFallback}
        alt={alt}
        referrerPolicy="no-referrer"
        className={className}
        onError={() => setStage('initial')}
      />
    );
  }

  const label = (fallbackText || alt || 'H').trim().slice(0, 2).toUpperCase();
  return <span className={fallbackClassName}>{label}</span>;
}
