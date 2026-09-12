import React from 'react';

/**
 * Shared Badge Component for HUKI EBOOK
 * Supports formats: ebook | physical | hybrid | discount
 * Supports statuses: success | pending | warning | danger | info | neutral
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
  ...props
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1',
    md: 'text-[11px] px-2.5 py-0.5 rounded-lg gap-1.5 font-semibold',
    lg: 'text-xs px-3 py-1 rounded-xl gap-1.5 font-bold'
  };

  const variantStyles = {
    // Book Formats
    ebook: 'bg-theme-primary text-white shadow-2xs',
    physical: 'bg-theme-secondary text-white shadow-2xs',
    hybrid: 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-2xs',
    discount: 'bg-theme-accent text-white font-bold shadow-2xs',
    
    // Status Badges
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800',
    warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800',
    neutral: 'bg-theme-surface-subtle text-theme-text-muted border border-theme-border/60',
    
    // Preview / Coming Soon
    preview: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-bold tracking-tight select-none ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}
      {children}
    </span>
  );
}
