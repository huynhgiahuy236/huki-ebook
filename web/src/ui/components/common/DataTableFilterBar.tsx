'use client';

import React, { useState, useEffect, useRef } from 'react';

export type DateFilterMode =
  | 'ALL_TIME'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'EXACT_DATE'
  | 'CUSTOM_RANGE'
  | 'SPECIFIC_MONTH';

export interface DateFilterValue {
  mode?: DateFilterMode;
  tier1?: string;
  preset?: string;
  value?: any;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  exactDate?: string; // YYYY-MM-DD
  month?: number;     // 1 - 12
  year?: number;      // e.g. 2026
}

export interface StatusTab<TStatus extends string = string> {
  key: TStatus;
  label: string;
  count?: number;
}

export interface BulkActionItem {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  confirmTitle?: string;
  isDanger?: boolean;
  confirmMessage?: string;
}

export interface BulkActionGroup {
  groupLabel?: string;
  label?: string;
  actions: BulkActionItem[];
}

export interface DataTableFilterBarProps<TStatus extends string = string> {
  tabs?: StatusTab<TStatus>[];
  filterTabs?: StatusTab<TStatus>[];
  activeTab?: TStatus;
  onTabChange?: (tab: TStatus) => void;
  statusFilter?: {
    current: TStatus;
    options: { value: TStatus; label: string; count?: number }[];
    onChange: (tab: TStatus) => void;
  };
  dateFilter?: DateFilterValue | {
    value: DateFilterValue;
    onChange: (val: DateFilterValue) => void;
  };
  onDateFilterChange?: (val: DateFilterValue) => void;
  enableDateFilter?: boolean;
  searchQuery?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
  leftCustomActions?: React.ReactNode;
  // Integrated Bulk Actions on Filter Bar
  bulkActionGroups?: BulkActionGroup[];
  selectedCount?: number;
  totalCount?: number;
  onExecuteBulkAction?: (actionValue: string) => Promise<void> | void;
  onBulkAction?: (actionValue: string) => Promise<void> | void;
  onClearSelection?: () => void;
  bulkLoading?: boolean;
  isBulkLoading?: boolean;
  itemName?: string;
  className?: string;
  bulkActions?: {
    selectedCount?: number;
    loading?: boolean;
    groups: BulkActionGroup[];
    onSelectAction: (actionValue: string) => Promise<void> | void;
    onClear?: () => void;
    totalCount?: number;
    itemName?: string;
  };
}

/**
 * Utility helper to test if an ISO date string matches the current DateFilterValue
 */
export function matchesDateFilter(dateInput: string | Date | number | undefined, filter?: DateFilterValue): boolean {
  if (!filter || filter.mode === 'ALL_TIME' || !dateInput) return true;

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return true;

  const now = new Date();

  // Helper to format YYYY-MM-DD
  const formatYMD = (target: Date) => {
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const itemYMD = formatYMD(d);
  const todayYMD = formatYMD(now);

  switch (filter.mode) {
    case 'TODAY':
      return itemYMD === todayYMD;

    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return itemYMD === formatYMD(yesterday);
    }

    case 'THIS_WEEK': {
      // Monday to Sunday
      const dayOfWeek = now.getDay() || 7; // 1 (Mon) - 7 (Sun)
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return d >= monday && d <= sunday;
    }

    case 'LAST_WEEK': {
      const dayOfWeek = now.getDay() || 7;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - dayOfWeek - 6);
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      return d >= lastMonday && d <= lastSunday;
    }

    case 'THIS_MONTH':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

    case 'LAST_MONTH': {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
    }

    case 'THIS_YEAR':
      return d.getFullYear() === now.getFullYear();

    case 'EXACT_DATE':
      return filter.exactDate ? itemYMD === filter.exactDate : true;

    case 'CUSTOM_RANGE': {
      if (filter.startDate && itemYMD < filter.startDate) return false;
      if (filter.endDate && itemYMD > filter.endDate) return false;
      return true;
    }

    case 'SPECIFIC_MONTH': {
      if (filter.year && d.getFullYear() !== filter.year) return false;
      if (filter.month && d.getMonth() + 1 !== filter.month) return false;
      return true;
    }

    default:
      return true;
  }
}

export function DataTableFilterBar<TStatus extends string = string>(props: DataTableFilterBarProps<TStatus>) {
  const tabs: StatusTab<TStatus>[] | undefined =
    props.tabs ||
    props.filterTabs ||
    (props.statusFilter
      ? props.statusFilter.options.map((opt) => ({ key: opt.value, label: opt.label, count: opt.count }))
      : undefined);
  const activeTab = props.activeTab ?? props.statusFilter?.current;
  const onTabChange = props.onTabChange || props.statusFilter?.onChange;

  const isDateFilterObj =
    props.dateFilter && typeof props.dateFilter === 'object' && 'value' in props.dateFilter;
  const rawDateFilter = isDateFilterObj
    ? (props.dateFilter as any).value
    : (props.dateFilter as DateFilterValue) || { mode: 'ALL_TIME' };
  const dateFilter: DateFilterValue = {
    ...rawDateFilter,
    mode: rawDateFilter?.mode || 'ALL_TIME',
  };
  const onDateFilterChange =
    props.onDateFilterChange || (isDateFilterObj ? (props.dateFilter as any).onChange : undefined);

  const enableDateFilter = props.enableDateFilter ?? true;
  const searchQuery = props.searchQuery ?? props.searchValue ?? '';
  const onSearchChange = props.onSearchChange;
  const searchPlaceholder = props.searchPlaceholder ?? 'Tìm kiếm...';
  const extraFilters = props.extraFilters;
  const leftCustomActions = props.leftCustomActions;

  const bulkActionGroups = props.bulkActionGroups || props.bulkActions?.groups;
  const selectedCount = props.selectedCount ?? props.bulkActions?.selectedCount ?? 0;
  const totalCount = props.totalCount ?? props.bulkActions?.totalCount;
  const onExecuteBulkAction = props.onExecuteBulkAction || props.onBulkAction || props.bulkActions?.onSelectAction;
  const onClearSelection = props.onClearSelection || props.bulkActions?.onClear;
  const bulkLoading = props.bulkLoading ?? props.isBulkLoading ?? props.bulkActions?.loading ?? false;
  const itemName = props.itemName ?? props.bulkActions?.itemName ?? 'mục';
  const className =
    props.className ??
    'bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs';

  // Local state for search debounce
  const [internalSearch, setInternalSearch] = useState(searchQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInternalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = (val: string) => {
    setInternalSearch(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange?.(val);
    }, 300);
  };

  const handleClearSearch = () => {
    setInternalSearch('');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onSearchChange?.('');
  };

  // Date selection state: Split into 2 selects
  const isQuickMode = [
    'ALL_TIME',
    'TODAY',
    'YESTERDAY',
    'THIS_WEEK',
    'LAST_WEEK',
    'THIS_MONTH',
    'LAST_MONTH',
    'THIS_YEAR',
  ].includes((dateFilter.mode || 'ALL_TIME') as string);
  const quickModeValue = isQuickMode ? dateFilter.mode : '';

  const isSpecificMode = ['EXACT_DATE', 'CUSTOM_RANGE', 'SPECIFIC_MONTH'].includes(
    (dateFilter.mode || '') as string
  );
  const specificModeValue = isSpecificMode ? dateFilter.mode : '';

  const [showDatePickerPopover, setShowDatePickerPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Bulk action state
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [pendingConfirmAction, setPendingConfirmAction] = useState<BulkActionItem | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDatePickerPopover(false);
      }
    };
    if (showDatePickerPopover) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showDatePickerPopover]);

  // Handle Select 1: Mốc thời gian nhanh
  const handleQuickPresetChange = (preset: DateFilterMode) => {
    setShowDatePickerPopover(false);
    onDateFilterChange?.({ mode: preset });
  };

  // Handle Select 2: Thời gian cụ thể
  const handleSpecificModeChange = (modeVal: string) => {
    if (!modeVal) {
      setShowDatePickerPopover(false);
      onDateFilterChange?.({ mode: 'ALL_TIME' });
      return;
    }
    const newMode = modeVal as DateFilterMode;
    const today = new Date().toISOString().slice(0, 10);
    const updated: DateFilterValue = {
      ...dateFilter,
      mode: newMode,
      exactDate: dateFilter.exactDate || today,
      startDate: dateFilter.startDate || today,
      endDate: dateFilter.endDate || today,
      month: dateFilter.month || new Date().getMonth() + 1,
      year: dateFilter.year || new Date().getFullYear(),
    };
    onDateFilterChange?.(updated);
    setShowDatePickerPopover(true);
  };

  const getDateLabel = () => {
    const mode = dateFilter.mode;
    switch (mode) {
      case 'TODAY':
        return 'Hôm nay';
      case 'YESTERDAY':
        return 'Hôm qua';
      case 'THIS_WEEK':
        return 'Tuần này';
      case 'LAST_WEEK':
        return 'Tuần trước';
      case 'THIS_MONTH':
        return 'Tháng này';
      case 'LAST_MONTH':
        return 'Tháng trước';
      case 'THIS_YEAR':
        return 'Năm nay';
      case 'EXACT_DATE':
        return dateFilter.exactDate ? `Ngày: ${dateFilter.exactDate}` : 'Ngày cố định';
      case 'CUSTOM_RANGE':
        return dateFilter.startDate && dateFilter.endDate
          ? `${dateFilter.startDate} → ${dateFilter.endDate}`
          : 'Khoảng ngày';
      case 'SPECIFIC_MONTH':
        return `T${dateFilter.month || 1}/${dateFilter.year || 2026}`;
      default:
        return 'Toàn bộ thời gian';
    }
  };

  // Helper to locate bulk action configuration
  const findBulkAction = (val: string): BulkActionItem | undefined => {
    if (!bulkActionGroups) return undefined;
    for (const g of bulkActionGroups) {
      const found = g.actions.find((a) => a.value === val);
      if (found) return found;
    }
    return undefined;
  };

  const handleApplyBulkAction = () => {
    if (!selectedBulkAction || !onExecuteBulkAction) return;
    const act = findBulkAction(selectedBulkAction);
    if (!act) return;

    if (act.confirmMessage || act.isDanger) {
      setPendingConfirmAction(act);
    } else {
      void onExecuteBulkAction(selectedBulkAction);
    }
  };

  const handleConfirmBulkAction = async () => {
    if (!pendingConfirmAction || !onExecuteBulkAction) return;
    const val = pendingConfirmAction.value;
    setPendingConfirmAction(null);
    await onExecuteBulkAction(val);
  };

  // Custom Dropdown Open States
  const [showQuickDateDropdown, setShowQuickDateDropdown] = useState(false);
  const [showSpecificDateDropdown, setShowSpecificDateDropdown] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const quickDateRef = useRef<HTMLDivElement>(null);
  const specificDateRef = useRef<HTMLDivElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Close all popovers on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickDateRef.current && !quickDateRef.current.contains(target)) {
        setShowQuickDateDropdown(false);
      }
      if (specificDateRef.current && !specificDateRef.current.contains(target)) {
        setShowSpecificDateDropdown(false);
        if (popoverRef.current && !popoverRef.current.contains(target)) {
          setShowDatePickerPopover(false);
        }
      }
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(target)) {
        setShowBulkMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const quickPresets: { mode: DateFilterMode; label: string }[] = [
    { mode: 'ALL_TIME', label: 'Toàn bộ thời gian' },
    { mode: 'TODAY', label: 'Hôm nay' },
    { mode: 'YESTERDAY', label: 'Hôm qua' },
    { mode: 'THIS_WEEK', label: 'Tuần này' },
    { mode: 'LAST_WEEK', label: 'Tuần trước' },
    { mode: 'THIS_MONTH', label: 'Tháng này' },
    { mode: 'LAST_MONTH', label: 'Tháng trước' },
    { mode: 'THIS_YEAR', label: 'Năm nay' },
  ];

  const getQuickDateLabel = () => {
    switch (dateFilter.mode) {
      case 'TODAY':
        return 'Hôm nay';
      case 'YESTERDAY':
        return 'Hôm qua';
      case 'THIS_WEEK':
        return 'Tuần này';
      case 'LAST_WEEK':
        return 'Tuần trước';
      case 'THIS_MONTH':
        return 'Tháng này';
      case 'LAST_MONTH':
        return 'Tháng trước';
      case 'THIS_YEAR':
        return 'Năm nay';
      case 'ALL_TIME':
        return 'Toàn bộ thời gian';
      default:
        return 'Mốc thời gian';
    }
  };

  const handleSelectBulkActionItem = (act: BulkActionItem) => {
    setShowBulkMenu(false);
    if (act.confirmMessage || act.isDanger) {
      setPendingConfirmAction(act);
    } else {
      void onExecuteBulkAction?.(act.value);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Status Filter Tabs (if provided) */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700/80'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-neutral-200/90 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Secondary Bar: Extra Filters + Split Date Selects + Search Input + Bulk Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom actions slot or extra filters */}
          {leftCustomActions}
          {extraFilters}

          {enableDateFilter && (
            <>
              {/* Select 1: Mốc thời gian nhanh (Custom High-End Dropdown) */}
              <div className="relative" ref={quickDateRef}>
            <button
              type="button"
              onClick={() => {
                setShowQuickDateDropdown(!showQuickDateDropdown);
                setShowSpecificDateDropdown(false);
                setShowDatePickerPopover(false);
                setShowBulkMenu(false);
              }}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                isQuickMode && dateFilter.mode !== 'ALL_TIME'
                  ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10 shadow-2xs'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
              title="Mốc thời gian nhanh"
            >
              <span>{getQuickDateLabel()}</span>
              <span className={`text-[8px] text-neutral-400 transition-transform ${showQuickDateDropdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showQuickDateDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-40 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Mốc thời gian nhanh
                </div>
                <div className="space-y-0.5 px-1">
                  {quickPresets.map((preset) => {
                    const isSelected = dateFilter.mode === preset.mode;
                    return (
                      <button
                        key={preset.mode}
                        type="button"
                        onClick={() => {
                          handleQuickPresetChange(preset.mode);
                          setShowQuickDateDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {isSelected && <span className="text-primary text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Select 2: Thời gian cụ thể (Custom High-End Dropdown + Popover) */}
          <div className="relative" ref={specificDateRef}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowSpecificDateDropdown(!showSpecificDateDropdown);
                  setShowQuickDateDropdown(false);
                  setShowBulkMenu(false);
                }}
                className={`h-9 px-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                  isSpecificMode
                    ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10 shadow-2xs font-bold'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300'
                }`}
                title="Tùy chọn thời gian cụ thể"
              >
                <span>{isSpecificMode ? getDateLabel() : '-- Thời gian cụ thể --'}</span>
                <span className={`text-[8px] text-neutral-400 transition-transform ${showSpecificDateDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Reset clear button if specific mode active */}
              {isSpecificMode && (
                <button
                  type="button"
                  onClick={() => {
                    onDateFilterChange?.({ mode: 'ALL_TIME' });
                    setShowDatePickerPopover(false);
                  }}
                  className="h-9 px-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  title="Xóa lọc cụ thể"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Menu for Specific Modes */}
            {showSpecificDateDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-40 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Tùy chọn cụ thể
                </div>
                <div className="space-y-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSpecificModeChange('EXACT_DATE');
                      setShowSpecificDateDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      dateFilter.mode === 'EXACT_DATE'
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>Chọn đúng 1 ngày cố định...</span>
                    {dateFilter.mode === 'EXACT_DATE' && <span className="text-primary text-xs font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSpecificModeChange('CUSTOM_RANGE');
                      setShowSpecificDateDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      dateFilter.mode === 'CUSTOM_RANGE'
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>Chọn khoảng ngày (Từ - Đến)...</span>
                    {dateFilter.mode === 'CUSTOM_RANGE' && <span className="text-primary text-xs font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSpecificModeChange('SPECIFIC_MONTH');
                      setShowSpecificDateDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      dateFilter.mode === 'SPECIFIC_MONTH'
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>Chọn theo Tháng / Năm...</span>
                    {dateFilter.mode === 'SPECIFIC_MONTH' && <span className="text-primary text-xs font-bold">✓</span>}
                  </button>
                </div>
              </div>
            )}

            {/* Popover for Date Inputs */}
            {showDatePickerPopover && (
              <div
                ref={popoverRef}
                className="absolute left-0 top-full mt-1.5 z-40 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-72 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
              >
                {dateFilter.mode === 'EXACT_DATE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                      Chọn ngày cố định:
                    </label>
                    <input
                      type="date"
                      value={dateFilter.exactDate || ''}
                      onChange={(e) =>
                        onDateFilterChange?.({
                          ...dateFilter,
                          exactDate: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 font-medium"
                    />
                  </div>
                )}

                {dateFilter.mode === 'CUSTOM_RANGE' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-0.5">
                        Từ ngày:
                      </label>
                      <input
                        type="date"
                        value={dateFilter.startDate || ''}
                        onChange={(e) =>
                          onDateFilterChange?.({
                            ...dateFilter,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-0.5">
                        Đến ngày:
                      </label>
                      <input
                        type="date"
                        value={dateFilter.endDate || ''}
                        onChange={(e) =>
                          onDateFilterChange?.({
                            ...dateFilter,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 font-medium"
                      />
                    </div>
                  </div>
                )}

                {dateFilter.mode === 'SPECIFIC_MONTH' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-0.5">
                        Tháng:
                      </label>
                      <select
                        value={dateFilter.month || new Date().getMonth() + 1}
                        onChange={(e) =>
                          onDateFilterChange?.({
                            ...dateFilter,
                            month: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-medium cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            Tháng {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-0.5">
                        Năm:
                      </label>
                      <select
                        value={dateFilter.year || new Date().getFullYear()}
                        onChange={(e) =>
                          onDateFilterChange?.({
                            ...dateFilter,
                            year: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-medium cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {getDateLabel()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDatePickerPopover(false)}
                    className="px-3.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    Áp dụng & Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {/* Clean Search Input */}
          {onSearchChange && (
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                value={internalSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-3 pr-7 rounded-xl text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-medium"
              />
              {internalSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs font-bold p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Bulk Action Menu directly on Filter Bar (Custom Popover with clean optgroup categorization) */}
        {bulkActionGroups && bulkActionGroups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {selectedCount > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-700/80 rounded-xl text-xs font-semibold shadow-xs animate-in fade-in duration-150">
                {/* Selection Counter */}
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center font-bold text-[11px]">
                    ✓
                  </span>
                  <span>
                    Đã chọn: <strong className="text-amber-400 font-bold">{selectedCount}</strong>
                    {totalCount !== undefined ? `/${totalCount}` : ''} {itemName}
                  </span>
                </div>

                {/* Custom Grouped Action Dropdown Menu */}
                <div className="relative" ref={bulkMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkMenu(!showBulkMenu);
                      setShowQuickDateDropdown(false);
                      setShowSpecificDateDropdown(false);
                    }}
                    disabled={bulkLoading}
                    className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>{bulkLoading ? 'Đang xử lý...' : 'Chọn việc cần làm'}</span>
                    <span className={`text-[8px] text-neutral-400 transition-transform ${showBulkMenu ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Popover Menu with Clear Optgroups, Distinct Styling, and Direct 1-Click Execution */}
                  {showBulkMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {bulkActionGroups.map((group, gIdx) => (
                        <div
                          key={gIdx}
                          /* optgroup */
                          className={gIdx > 0 ? 'border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1' : ''}
                        >
                          <div className="px-3.5 py-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                            {group.groupLabel || group.label}
                          </div>
                          <div className="space-y-0.5 px-1">
                            {group.actions.map((act) => (
                              <button
                                key={act.value}
                                type="button"
                                onClick={() => handleSelectBulkActionItem(act)}
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

                {/* Clear Selection Button */}
                {onClearSelection && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    disabled={bulkLoading}
                    className="h-8 px-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Bỏ chọn tất cả"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 opacity-50">
                <button
                  type="button"
                  disabled
                  className="h-9 px-3 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-neutral-400 cursor-not-allowed flex items-center gap-2"
                  title="Chọn ít nhất 1 dòng trong bảng để thực hiện thao tác"
                >
                  <span>-- Chọn việc cần làm (chọn ở bảng) --</span>
                  <span className="text-[8px] text-neutral-400">▼</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Dangerous Actions */}
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
                Xác nhận thao tác hàng loạt
              </h3>
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {pendingConfirmAction.confirmMessage ||
                `Bạn có chắc chắn muốn thực hiện "${pendingConfirmAction.label}" cho ${selectedCount} mục đã chọn? Thao tác này không thể hoàn tác.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                disabled={bulkLoading}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkAction}
                disabled={bulkLoading}
                className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  pendingConfirmAction.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {bulkLoading ? 'Đang thực hiện...' : 'Xác nhận thực hiện'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTableFilterBar;
