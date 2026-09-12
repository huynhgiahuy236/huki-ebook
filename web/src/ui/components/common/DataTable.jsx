import React from 'react';

/**
 * Shared DataTable Component for HUKI EBOOK
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'Không có dữ liệu trong danh sách',
  onRowClick,
  className = ''
}) {
  return (
    <div className={`w-full overflow-hidden bg-theme-surface rounded-2xl border border-theme-border shadow-2xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-theme-text">
          <thead className="bg-theme-surface-subtle text-[11px] uppercase font-bold text-theme-text-muted border-b border-theme-border/70 tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3.5 px-4 font-bold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-theme-text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-theme-secondary border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-theme-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-theme-text-muted/60">inbox</span>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-theme-surface-subtle/80' : 'hover:bg-theme-surface-subtle/40'}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
