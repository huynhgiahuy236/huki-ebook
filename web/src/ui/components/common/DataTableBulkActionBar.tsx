'use client';

import React, { useState } from 'react';

export interface BulkActionItem {
  value: string;
  label: string;
  isDanger?: boolean;
  confirmMessage?: string;
}

export interface BulkActionGroup {
  groupLabel: string;
  actions: BulkActionItem[];
}

export interface DataTableBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actionGroups: BulkActionGroup[];
  onExecuteAction: (actionValue: string) => Promise<void> | void;
  onClearSelection: () => void;
  isLoading?: boolean;
  itemName?: string; // e.g. "đơn hàng", "sách", "mục"
  className?: string;
}

export default function DataTableBulkActionBar({
  selectedCount,
  totalCount,
  actionGroups,
  onExecuteAction,
  onClearSelection,
  isLoading = false,
  itemName = 'mục',
  className = '',
}: DataTableBulkActionBarProps) {
  const [showBulkMenu, setShowBulkMenu] = useState<boolean>(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<BulkActionItem | null>(null);

  if (selectedCount <= 0) return null;

  const handleSelectActionItem = (act: BulkActionItem) => {
    setShowBulkMenu(false);
    if (act.confirmMessage || act.isDanger) {
      setPendingConfirmAction(act);
    } else {
      void onExecuteAction(act.value);
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirmAction) return;
    const val = pendingConfirmAction.value;
    setPendingConfirmAction(null);
    await onExecuteAction(val);
  };

  return (
    <>
      {/* Inline Bulk Action Bar (Not floating at bottom) */}
      <div
        className={`inline-flex flex-wrap items-center justify-between gap-3 bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 rounded-xl shadow-xs border border-neutral-700/80 px-3.5 py-1.5 animate-in fade-in duration-150 ${className}`}
      >
        {/* Left: Selection Counter */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </span>
          <span>
            Đã chọn: <strong className="text-amber-400 font-bold">{selectedCount}</strong>
            {totalCount > 0 ? ` / ${totalCount}` : ''} {itemName}
          </span>
        </div>

        {/* Center: Custom Grouped Dropdown Menu */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              disabled={isLoading}
              className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Đang xử lý...' : 'Chọn việc cần làm'}</span>
              <span className={`text-[8px] text-neutral-400 transition-transform ${showBulkMenu ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Custom Popover with optgroup support */}
            {showBulkMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-neutral-800 dark:text-neutral-100">
                {actionGroups.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    /* optgroup key={gIdx} */
                    className={gIdx > 0 ? 'border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1' : ''}
                  >
                    <div className="px-3.5 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      {group.groupLabel}
                    </div>
                    <div className="space-y-0.5 px-1">
                      {group.actions.map((act) => (
                        <button
                          key={act.value}
                          type="button"
                          onClick={() => handleSelectActionItem(act)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                            act.isDanger
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                              : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <span>{act.label}</span>
                          {act.isDanger && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                              Nguy hiểm
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deselect / Clear Button */}
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Bỏ chọn tất cả"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Dangerous or Confirm-Guarded Actions */}
      {pendingConfirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPendingConfirmAction(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 max-w-md w-full shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Xác nhận thực hiện hàng loạt
              </h3>
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {pendingConfirmAction.confirmMessage ||
                `Bạn có chắc chắn muốn thực hiện "${pendingConfirmAction.label}" cho ${selectedCount} ${itemName} đã chọn?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="px-4 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                  pendingConfirmAction.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                Xác nhận thực hiện
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
