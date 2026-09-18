import React from 'react';
import Link from 'next/link';
import Button from './Button';

export interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
  actionIcon?: string;
  className?: string;
}

/**
 * Shared EmptyState Component for HUKI EBOOK
 */
export default function EmptyState({
  icon = 'search_off',
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có thông tin nào để hiển thị.',
  actionText,
  actionLink,
  onAction,
  actionIcon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`rounded-2xl border border-dashed border-theme-border bg-theme-surface p-8 sm:p-12 text-center my-4 flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-theme-secondary-subtle text-theme-secondary flex items-center justify-center mb-4 shadow-2xs">
        <span className="material-symbols-outlined text-3xl sm:text-4xl">{icon}</span>
      </div>
      
      <h3 className="font-editorial text-lg sm:text-xl font-bold text-theme-text mb-1.5">
        {title}
      </h3>
      
      <p className="text-xs sm:text-sm text-theme-text-muted mb-6 max-w-md leading-relaxed">
        {description}
      </p>

      {actionText && (
        actionLink ? (
          <Link href={actionLink}>
            <Button variant="primary" size="md" icon={actionIcon}>
              {actionText}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={onAction} icon={actionIcon}>
            {actionText}
          </Button>
        )
      )}
    </div>
  );
}
