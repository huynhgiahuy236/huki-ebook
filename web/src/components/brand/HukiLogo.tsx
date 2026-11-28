import Image from 'next/image';

interface HukiLogoProps {
  /** 'mint' for dark forest-green backgrounds, 'dark' for white/light backgrounds */
  variant?: 'mint' | 'dark';
  /** Tailwind height utility, e.g. 'h-6', 'h-7', 'h-8' */
  className?: string;
  priority?: boolean;
}

/**
 * Official HUKI EBOOK brand wordmark rendered from the cropped transparent logo assets.
 */
export function HukiLogo({
  variant = 'mint',
  className = 'h-7 w-auto',
  priority = false,
}: HukiLogoProps) {
  const src =
    variant === 'dark' ? '/images/huki-logo-dark.png' : '/images/huki-logo-mint.png';

  return (
    <Image
      src={src}
      alt="HUKI EBOOK"
      width={1090}
      height={210}
      priority={priority}
      className={`select-none object-contain ${className}`}
    />
  );
}
