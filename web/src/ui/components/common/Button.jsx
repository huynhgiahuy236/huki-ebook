import React from 'react';

/**
 * Shared Button Component for HUKI EBOOK
 * Supports variants: primary | secondary | outline | ghost | danger
 * Supports sizes: sm (36px) | md (40px) | lg (48px)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-9 gap-1.5 shadow-2xs',
    md: 'text-xs sm:text-sm px-4 py-2 h-10 gap-2 shadow-xs',
    lg: 'text-sm sm:text-base px-6 py-2.5 h-12 gap-2.5 shadow-sm'
  };

  const variantStyles = {
    primary: 'bg-theme-primary text-white hover:bg-theme-primary-hover active:scale-[0.99] focus-visible:ring-theme-primary',
    secondary: 'bg-theme-secondary text-white hover:opacity-90 active:scale-[0.99] focus-visible:ring-theme-secondary',
    accent: 'bg-theme-accent text-white hover:bg-theme-accent-hover active:scale-[0.99] focus-visible:ring-theme-accent',
    outline: 'border border-theme-border bg-theme-surface text-theme-text hover:bg-theme-surface-subtle active:bg-theme-border/40 focus-visible:ring-theme-secondary',
    ghost: 'text-theme-text hover:bg-theme-surface-subtle active:bg-theme-border/30 focus-visible:ring-theme-secondary',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99] focus-visible:ring-rose-500'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
      )}
    </button>
  );
}
