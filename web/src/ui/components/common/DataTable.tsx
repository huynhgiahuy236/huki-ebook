import React from 'react';
import GroupedDataTable, {
  Column as BaseColumn,
  GroupedDataTableProps,
  SortDirection,
  PaginationConfig,
} from './GroupedDataTable';

export type Column<T = any> = BaseColumn<T>;
export type { SortDirection, PaginationConfig };

export interface DataTableProps<T = any> extends Omit<GroupedDataTableProps<T>, 'columns' | 'data'> {
  columns: Column<T>[];
  data: T[];
}

/**
 * Shared DataTable Component for HUKI EBOOK
 * Fully backward compatible wrapper powered by GroupedDataTable foundation.
 */
export default function DataTable<T extends Record<string, any> = any>(props: DataTableProps<T>) {
  return <GroupedDataTable<T> {...props} />;
}
