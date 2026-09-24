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
    <div className="w-full flex flex-col gap-1 text-left">
      {label && (
        <label htmlFor={inputId} className="text-[11.5px] font-semibold text-theme-text flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted text-[16px] pointer-events-none">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          className={`
            w-full bg-theme-surface text-theme-text text-xs rounded-lg border border-theme-border
            py-1.5 h-8.5 transition-all duration-200 placeholder:text-theme-text-muted/60
            focus:outline-none focus:border-theme-secondary focus:ring-1 focus:ring-theme-secondary
            disabled:bg-theme-surface-subtle disabled:opacity-60 disabled:cursor-not-allowed
            ${icon && iconPosition === 'left' ? 'pl-8 pr-2.5' : icon && iconPosition === 'right' ? 'pl-2.5 pr-8' : 'px-2.5'}
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            ${className}
          `}
          {...props}
        />

        {icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted text-[16px] pointer-events-none">
            {icon}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-[10.5px] font-medium text-rose-500 flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-[13px]">error</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[10.5px] text-theme-text-muted mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
