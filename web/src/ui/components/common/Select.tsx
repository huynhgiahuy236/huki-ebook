import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  className?: string;
  id?: string;
  required?: boolean;
}

/**
 * Shared Select Dropdown Component for HUKI EBOOK
 */
export default function Select({
  label,
  error,
  helperText,
  options = [],
  children,
  className = '',
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold text-theme-text flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          className={`
            w-full appearance-none bg-theme-surface text-theme-text text-xs sm:text-sm rounded-xl border border-theme-border
            pl-3 pr-9 py-2 h-10 transition-all duration-200 cursor-pointer
            focus:outline-none focus:border-theme-secondary focus:ring-1 focus:ring-theme-secondary
            disabled:bg-theme-surface-subtle disabled:opacity-60 disabled:cursor-not-allowed
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            ${className}
          `}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted text-[18px] pointer-events-none">
          expand_more
        </span>
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
