import React, { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T = any> {
  key: string;
  title: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: string | number;
  headerClassName?: string;
  className?: string;
  sticky?: 'left' | 'right';
  sortable?: boolean;
  sortKey?: string;
  sorter?: (a: T, b: T) => number;
  render?: (value: any, row: T, index: number, isChild?: boolean, level?: number) => React.ReactNode;
}

export interface PaginationConfig {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export interface GroupedDataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyField?: string | ((row: T) => string | number);
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: string;
  onRowClick?: (row: T, event: React.MouseEvent) => void;
  rowClassName?: string | ((row: T, index: number, isChild?: boolean) => string);
  className?: string;
  containerClassName?: string;
  tableClassName?: string;

  // Expandable Row
  expandable?: boolean;
  expandedRowRender?: (row: T, index: number) => React.ReactNode;
  expandedRowKeys?: (string | number)[];
  onExpandedRowsChange?: (keys: (string | number)[]) => void;
  defaultExpandedRowKeys?: (string | number)[];

  // Grouped / Nested Children
  childrenField?: keyof T;
  indentSize?: number;

  // Selection & Bulk Actions
  selectable?: boolean;
  selectedRowKeys?: (string | number)[];
  onSelectionChange?: (keys: (string | number)[], selectedRows: T[]) => void;
  getCheckboxProps?: (row: T) => { disabled?: boolean };
  bulkActionRender?: (selectedKeys: (string | number)[], selectedRows: T[], clearSelection: () => void) => React.ReactNode;

  // Pagination (Standard: 10 items/page, locked)
  pagination?: boolean | PaginationConfig;

  // Sorting
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (sortKey: string, direction: SortDirection) => void;
}

/**
 * Standard Locked Pagination Bar (Always 10 items/page default)
 */
export function StandardPaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'mục',
  className = '',
}: PaginationConfig & { className?: string }) {
  const calculatedTotalPages = Math.max(1, totalPages !== undefined ? totalPages : Math.ceil(totalItems / pageSize) || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), calculatedTotalPages);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (calculatedTotalPages <= 7) {
      for (let i = 1; i <= calculatedTotalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', calculatedTotalPages);
      } else if (safeCurrentPage >= calculatedTotalPages - 3) {
        pages.push(1, '...', calculatedTotalPages - 4, calculatedTotalPages - 3, calculatedTotalPages - 2, calculatedTotalPages - 1, calculatedTotalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', calculatedTotalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startIdx = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIdx = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className={`p-3 sm:px-4 sm:py-3 bg-theme-surface border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-theme-text-muted font-sans select-none ${className}`}>
      {/* Items count summary */}
      <div className="text-[11.5px] font-medium text-theme-text-muted whitespace-nowrap">
        Hiển thị <strong className="text-theme-text font-bold">{totalItems === 0 ? 0 : `${startIdx} - ${endIdx}`}</strong> / <strong className="text-theme-text font-bold">{totalItems}</strong> {itemLabel}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
            safeCurrentPage <= 1
              ? 'opacity-40 border-theme-border text-theme-text-muted cursor-not-allowed bg-theme-surface-subtle/50'
              : 'border-theme-border text-theme-text hover:bg-theme-surface-subtle cursor-pointer bg-theme-surface shadow-2xs'
          }`}
          aria-label="Trang trước"
        >
          <span className="material-symbols-outlined text-[15px]">chevron_left</span>
          <span>Trang trước</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-theme-text-muted/60 font-bold text-xs">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isCurrent = pageNum === safeCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-theme-secondary text-white shadow-2xs'
                    : 'text-theme-text hover:bg-theme-surface-subtle border border-theme-border/70 bg-theme-surface'
                }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={safeCurrentPage >= calculatedTotalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
            safeCurrentPage >= calculatedTotalPages
              ? 'opacity-40 border-theme-border text-theme-text-muted cursor-not-allowed bg-theme-surface-subtle/50'
              : 'border-theme-border text-theme-text hover:bg-theme-surface-subtle cursor-pointer bg-theme-surface shadow-2xs'
          }`}
          aria-label="Trang sau"
        >
          <span>Trang sau</span>
          <span className="material-symbols-outlined text-[15px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Shared GroupedDataTable Component for HUKI EBOOK
 * Supports:
 * - Horizontal scrolling with non-wrapping columns
 * - Expandable Row (inline detail without popups)
 * - Parent -> Child grouped rows
 * - Checkbox selection with Bulk Action bar
 * - Locked 10 items/page pagination (always renders Page 1)
 * - Column sorting with asc/desc/none states
 * - Comprehensive Loading / Empty / Error & Retry states
 */
export default function GroupedDataTable<T extends Record<string, any> = any>({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'Không có dữ liệu trong danh sách',
  emptyTitle = 'Không tìm thấy dữ liệu',
  emptyIcon = 'inbox',
  onRowClick,
  rowClassName = '',
  className = '',
  containerClassName = '',
  tableClassName = '',

  // Expandable Row
  expandable = false,
  expandedRowRender,
  expandedRowKeys: controlledExpandedKeys,
  onExpandedRowsChange,
  defaultExpandedRowKeys = [],

  // Grouping
  childrenField = 'children' as keyof T,
  indentSize = 24,

  // Selection
  selectable = false,
  selectedRowKeys: controlledSelectedKeys,
  onSelectionChange,
  getCheckboxProps,
  bulkActionRender,

  // Pagination
  pagination = true,

  // Sorting
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSortChange,
}: GroupedDataTableProps<T>) {
  // Key resolver helper
  const getRowKey = useCallback(
    (row: T, defaultIdx: number): string | number => {
      if (typeof keyField === 'function') {
        return keyField(row);
      }
      return row[keyField] !== undefined ? row[keyField] : defaultIdx;
    },
    [keyField]
  );

  // Internal Expand State
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<(string | number)[]>(defaultExpandedRowKeys);
  const isControlledExpand = controlledExpandedKeys !== undefined;
  const currentExpandedKeys = isControlledExpand ? controlledExpandedKeys : internalExpandedKeys;

  const toggleExpand = useCallback(
    (key: string | number) => {
      const nextKeys = currentExpandedKeys.includes(key)
        ? currentExpandedKeys.filter((k) => k !== key)
        : [...currentExpandedKeys, key];
      if (!isControlledExpand) {
        setInternalExpandedKeys(nextKeys);
      }
      onExpandedRowsChange?.(nextKeys);
    },
    [currentExpandedKeys, isControlledExpand, onExpandedRowsChange]
  );

  // Internal Selection State
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<(string | number)[]>([]);
  const isControlledSelection = controlledSelectedKeys !== undefined;
  const currentSelectedKeys = isControlledSelection ? controlledSelectedKeys : internalSelectedKeys;

  // Internal Sorting State
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null);
  const activeSortColumn = controlledSortColumn !== undefined ? controlledSortColumn : internalSortColumn;
  const activeSortDirection = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;

  const handleSortClick = useCallback(
    (col: Column<T>) => {
      if (!col.sortable) return;
      const key = col.sortKey || col.key;
      let nextDir: SortDirection = 'asc';
      if (activeSortColumn === key) {
        if (activeSortDirection === 'asc') nextDir = 'desc';
        else if (activeSortDirection === 'desc') nextDir = null;
        else nextDir = 'asc';
      }

      if (controlledSortColumn === undefined) {
        setInternalSortColumn(nextDir ? key : null);
        setInternalSortDirection(nextDir);
      }
      onSortChange?.(key, nextDir);
    },
    [activeSortColumn, activeSortDirection, controlledSortColumn, onSortChange]
  );

  // Client-side sorting when not controlled by onSortChange
  const sortedData = useMemo(() => {
    if (onSortChange || !activeSortColumn || !activeSortDirection) {
      return data;
    }
    const col = columns.find((c) => (c.sortKey || c.key) === activeSortColumn);
    if (!col) return data;

    return [...data].sort((a, b) => {
      if (col.sorter) {
        const res = col.sorter(a, b);
        return activeSortDirection === 'asc' ? res : -res;
      }
      const valA = a[activeSortColumn];
      const valB = b[activeSortColumn];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return activeSortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA);
      const strB = String(valB);
      const res = strA.localeCompare(strB, 'vi', { numeric: true });
      return activeSortDirection === 'asc' ? res : -res;
    });
  }, [data, columns, activeSortColumn, activeSortDirection, onSortChange]);

  // Client-side Pagination State (if pagination === true)
  const [clientPage, setClientPage] = useState<number>(1);
  const isServerPagination = typeof pagination === 'object' && pagination !== null;
  const isPaginationEnabled = pagination !== false;

  const displayData = useMemo(() => {
    if (!isPaginationEnabled || isServerPagination) {
      return sortedData;
    }
    // Client-side pagination locked to 10 items/page
    const pageSize = 10;
    const startIndex = (clientPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, isPaginationEnabled, isServerPagination, clientPage]);

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      let nextKeys: (string | number)[] = [];
      let selectedRows: T[] = [];
      if (checked) {
        const selectableRows = displayData.filter((row, idx) => {
          const props = getCheckboxProps?.(row);
          return !props?.disabled;
        });
        nextKeys = selectableRows.map((row, idx) => getRowKey(row, idx));
        selectedRows = selectableRows;
      }
      if (!isControlledSelection) {
        setInternalSelectedKeys(nextKeys);
      }
      onSelectionChange?.(nextKeys, selectedRows);
    },
    [displayData, getCheckboxProps, getRowKey, isControlledSelection, onSelectionChange]
  );

  const handleSelectRow = useCallback(
    (key: string | number, row: T, checked: boolean) => {
      let nextKeys: (string | number)[];
      if (checked) {
        nextKeys = [...currentSelectedKeys, key];
      } else {
        nextKeys = currentSelectedKeys.filter((k) => k !== key);
      }
      if (!isControlledSelection) {
        setInternalSelectedKeys(nextKeys);
      }
      const selectedRows = data.filter((r, idx) => nextKeys.includes(getRowKey(r, idx)));
      onSelectionChange?.(nextKeys, selectedRows);
    },
    [currentSelectedKeys, data, getRowKey, isControlledSelection, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    if (!isControlledSelection) {
      setInternalSelectedKeys([]);
    }
    onSelectionChange?.([], []);
  }, [isControlledSelection, onSelectionChange]);

  // Check if all display rows are selected
  const allSelectableRows = useMemo(() => {
    return displayData.filter((row) => !getCheckboxProps?.(row)?.disabled);
  }, [displayData, getCheckboxProps]);

  const isAllSelected = useMemo(() => {
    if (allSelectableRows.length === 0) return false;
    return allSelectableRows.every((row, idx) => currentSelectedKeys.includes(getRowKey(row, idx)));
  }, [allSelectableRows, currentSelectedKeys, getRowKey]);

  const isIndeterminate = useMemo(() => {
    if (allSelectableRows.length === 0) return false;
    const selectedCount = allSelectableRows.filter((row, idx) =>
      currentSelectedKeys.includes(getRowKey(row, idx))
    ).length;
    return selectedCount > 0 && selectedCount < allSelectableRows.length;
  }, [allSelectableRows, currentSelectedKeys, getRowKey]);

  // Selected Row Objects
  const selectedRowsList = useMemo(() => {
    return data.filter((row, idx) => currentSelectedKeys.includes(getRowKey(row, idx)));
  }, [data, currentSelectedKeys, getRowKey]);

  // Total columns count (including expander and checkbox)
  const totalColSpan = columns.length + (expandable ? 1 : 0) + (selectable ? 1 : 0);

  // Render single row and potential children
  const renderRow = (row: T, rowIdx: number, level: number = 0, parentKeyPrefix: string = ''): React.ReactNode => {
    const key = getRowKey(row, rowIdx);
    const uniqueKey = `${parentKeyPrefix}${key}`;
    const isExpanded = currentExpandedKeys.includes(key);
    const isSelected = currentSelectedKeys.includes(key);
    const checkboxProps = getCheckboxProps?.(row);
    const isChild = level > 0;
    const children = row[childrenField] as T[] | undefined;
    const hasChildren = Array.isArray(children) && children.length > 0;
    const hasDetail = expandable && expandedRowRender !== undefined;

    const rowCustomClass =
      typeof rowClassName === 'function' ? rowClassName(row, rowIdx, isChild) : rowClassName;

    return (
      <React.Fragment key={uniqueKey}>
        <tr
          onClick={(e) => onRowClick && onRowClick(row, e)}
          className={`transition-colors ${
            isSelected
              ? 'bg-theme-secondary-subtle/40 hover:bg-theme-secondary-subtle/60'
              : isChild
              ? 'bg-theme-surface-subtle/30 hover:bg-theme-surface-subtle/70'
              : 'hover:bg-theme-surface-subtle/50'
          } ${onRowClick ? 'cursor-pointer' : ''} ${rowCustomClass}`}
        >
          {/* Checkbox Column */}
          {selectable && (
            <td className="w-10 px-3 py-2.5 text-center align-middle whitespace-nowrap">
              <input
                type="checkbox"
                checked={isSelected}
                disabled={checkboxProps?.disabled}
                onChange={(e) => handleSelectRow(key, row, e.target.checked)}
                className="w-4 h-4 rounded border-theme-border text-theme-secondary focus:ring-theme-secondary cursor-pointer disabled:cursor-not-allowed"
                aria-label={`Chọn hàng ${key}`}
              />
            </td>
          )}

          {/* Expander Column */}
          {(expandable || hasChildren) && (
            <td className="w-8 px-2 py-2.5 text-center align-middle whitespace-nowrap">
              {hasDetail || hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(key);
                  }}
                  className="w-6 h-6 rounded-md hover:bg-theme-surface-subtle text-theme-text-muted hover:text-theme-text flex items-center justify-center transition-transform cursor-pointer"
                  aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] transition-transform duration-150 ${
                      isExpanded ? 'rotate-90 text-theme-secondary font-bold' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                </button>
              ) : (
                <span className="inline-block w-6" />
              )}
            </td>
          )}

          {/* Data Columns */}
          {columns.map((col, colIdx) => {
            const cellValue = row[col.key];
            const isFirstDataCol = colIdx === 0;

            return (
              <td
                key={col.key || colIdx}
                className={`py-2.5 px-3 text-xs text-theme-text ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.className || ''}`}
                style={{
                  paddingLeft: isFirstDataCol && level > 0 ? `${level * indentSize + 12}px` : undefined,
                  width: col.width,
                  minWidth: col.minWidth,
                }}
              >
                <div className="flex items-center gap-1.5">
                  {isFirstDataCol && level > 0 && (
                    <span className="text-theme-text-muted/60 font-mono select-none text-[11px]">
                      └──
                    </span>
                  )}
                  <div className="w-full">
                    {col.render ? col.render(cellValue, row, rowIdx, isChild, level) : (cellValue ?? '-')}
                  </div>
                </div>
              </td>
            );
          })}
        </tr>

        {/* Expandable Detail Section */}
        {hasDetail && isExpanded && (
          <tr className="bg-theme-surface-subtle/40 border-b border-theme-border/60">
            <td colSpan={totalColSpan} className="p-4 sm:p-5">
              <div className="rounded-xl border border-theme-border bg-theme-surface p-4 shadow-2xs">
                {expandedRowRender(row, rowIdx)}
              </div>
            </td>
          </tr>
        )}

        {/* Grouped Children Rows */}
        {hasChildren && isExpanded && (
          children.map((child, childIdx) =>
            renderRow(child, childIdx, level + 1, `${uniqueKey}-child-`)
          )
        )}
      </React.Fragment>
    );
  };

  return (
    <div className={`w-full flex flex-col rounded-xl border border-theme-border bg-theme-surface shadow-2xs ${containerClassName}`}>
      {/* Bulk Action Bar if selection > 0 */}
      {selectable && currentSelectedKeys.length > 0 && bulkActionRender && (
        <div className="p-2.5 sm:px-4 bg-theme-secondary-subtle/80 border-b border-theme-border flex flex-wrap items-center justify-between gap-3 text-xs text-theme-secondary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>
              Đã chọn <strong className="font-bold text-theme-text">{currentSelectedKeys.length}</strong> mục
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-theme-text-muted hover:text-theme-text underline cursor-pointer ml-1"
            >
              Bỏ chọn
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActionRender(currentSelectedKeys, selectedRowsList, clearSelection)}
          </div>
        </div>
      )}

      {/* Main Table Container with Horizontal Scroll */}
      <div className={`w-full overflow-x-auto ${className}`}>
        <table className={`w-full text-left text-xs text-theme-text divide-y divide-theme-border/60 ${tableClassName}`}>
          <thead className="bg-theme-surface-subtle text-[10.5px] uppercase font-bold text-theme-text-muted tracking-wider select-none">
            <tr>
              {/* Select All Checkbox Header */}
              {selectable && (
                <th className="w-10 px-3 py-3 text-center align-middle whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-theme-border text-theme-secondary focus:ring-theme-secondary cursor-pointer"
                    aria-label="Chọn tất cả"
                  />
                </th>
              )}

              {/* Expander Column Header */}
              {expandable && (
                <th className="w-8 px-2 py-3 text-center align-middle whitespace-nowrap">
                  <span className="sr-only">Mở rộng chi tiết</span>
                </th>
              )}

              {/* Data Column Headers */}
              {columns.map((col, idx) => {
                const sortKey = col.sortKey || col.key;
                const isCurrentSort = activeSortColumn === sortKey;

                return (
                  <th
                    key={col.key || idx}
                    onClick={() => handleSortClick(col)}
                    className={`py-3 px-3 font-bold whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.sortable ? 'cursor-pointer hover:bg-theme-surface-subtle/80 hover:text-theme-text transition-colors' : ''} ${
                      col.headerClassName || ''
                    }`}
                    style={{ width: col.width, minWidth: col.minWidth }}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end w-full' : col.align === 'center' ? 'justify-center w-full' : ''
                      }`}
                    >
                      <span>{col.title}</span>
                      {col.sortable && (
                        <span className="inline-flex items-center">
                          {isCurrentSort && activeSortDirection === 'asc' && (
                            <span className="material-symbols-outlined text-[14px] text-theme-secondary font-bold">
                              arrow_upward
                            </span>
                          )}
                          {isCurrentSort && activeSortDirection === 'desc' && (
                            <span className="material-symbols-outlined text-[14px] text-theme-secondary font-bold">
                              arrow_downward
                            </span>
                          )}
                          {(!isCurrentSort || activeSortDirection === null) && (
                            <span className="material-symbols-outlined text-[14px] text-theme-text-muted/50">
                              unfold_more
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-theme-border/40 bg-theme-surface">
            {/* 1. Loading State */}
            {loading ? (
              <tr>
                <td colSpan={totalColSpan} className="py-12 text-center text-theme-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-theme-secondary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              /* 2. Error State with Retry Button */
              <tr>
                <td colSpan={totalColSpan} className="py-10 px-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">error</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-theme-text">Không thể tải dữ liệu</p>
                      <p className="text-[11px] text-theme-text-muted leading-relaxed">
                        {error}
                      </p>
                    </div>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-theme-surface border border-theme-border hover:bg-theme-surface-subtle text-theme-text flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">refresh</span>
                        <span>Thử lại</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              /* 3. Empty State */
              <tr>
                <td colSpan={totalColSpan} className="py-10 px-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-xl bg-theme-surface-subtle text-theme-text-muted flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">{emptyIcon}</span>
                    </div>
                    <p className="text-xs font-bold text-theme-text">{emptyTitle}</p>
                    <p className="text-[11px] text-theme-text-muted">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              /* 4. Normal Rows */
              displayData.map((row, rowIdx) => renderRow(row, rowIdx))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination Bar (Always visible according to standard) */}
      {isPaginationEnabled && (
        isServerPagination ? (
          <StandardPaginationBar {...pagination} />
        ) : (
          <StandardPaginationBar
            currentPage={clientPage}
            totalItems={sortedData.length}
            pageSize={10}
            onPageChange={(p) => setClientPage(p)}
          />
        )
      )}
    </div>
  );
}
