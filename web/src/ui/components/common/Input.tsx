import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  className?: string;
  id?: string;
  required?: boolean;
}

/**
 * Shared Input Component for HUKI EBOOK
 */
export default function Input({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  className = '',
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-theme-text flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted text-[18px] pointer-events-none">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          className={`
            w-full bg-theme-surface text-theme-text text-xs sm:text-sm rounded-xl border border-theme-border
            py-2 h-10 transition-all duration-200 placeholder:text-theme-text-muted/60
            focus:outline-none focus:border-theme-secondary focus:ring-1 focus:ring-theme-secondary
            disabled:bg-theme-surface-subtle disabled:opacity-60 disabled:cursor-not-allowed
            ${icon && iconPosition === 'left' ? 'pl-9 pr-3' : icon && iconPosition === 'right' ? 'pl-3 pr-9' : 'px-3'}
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            ${className}
          `}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted text-[18px] pointer-events-none">
            {icon}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-theme-text-muted mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
