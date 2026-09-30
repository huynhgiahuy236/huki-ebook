"use client";

import React, { useState, useEffect } from 'react';
import { catalogApi, InventoryReason } from '@/ui/api/catalogApi';

export interface InventoryLogItem {
  id: string;
  change?: number;
  reason?: InventoryReason | string;
  createdAt?: string;
  note?: string;
  previousStock?: number;
  newStock?: number;
  actor?: string;
  operation?: string;
}

export interface InventoryBookItem {
  id: string;
  title: string;
  isbn?: string;
  physicalDetails?: {
    stock?: number;
    reserved?: number;
  };
}

export interface InventoryLogsDrawerProps {
  book: InventoryBookItem | null;
  isOpen?: boolean;
  onClose: () => void;
  className?: string;
}

export function InventoryLogsDrawer({ book, isOpen = true, onClose, className = '' }: InventoryLogsDrawerProps) {
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen && book?.id) {
      fetchLogs(1);
    }
  }, [isOpen, book?.id]);

  const fetchLogs = async (pageNum = 1) => {
    if (!book?.id) return;
    try {
      setLoading(true);
      const res = await catalogApi.getInventoryLogs(book.id, { page: pageNum, limit: 10 });
      if (res) {
        const payload = (res.data as any)?.data || (res.data as any)?.items || res.data || [];
        const logList = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        const meta = (res.data as any)?.meta || (res as any).meta || {};
        setLogs(Array.isArray(logList) ? logList : []);
        setPage(meta.page || pageNum);
        setTotalPages(meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load inventory logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !book) return null;

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <span className="material-symbols-outlined text-lg text-emerald-600">history</span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Lịch Sử Biến Động Tồn Kho</span>
              <span className="font-normal text-xs text-slate-400">·</span>
              <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">{book.title}</span>
            </h3>
            {book.isbn && (
              <p className="text-[11px] text-slate-400 font-mono">ISBN: {book.isbn}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <span className="material-symbols-outlined text-2xl animate-spin text-emerald-600">progress_activity</span>
          <span className="text-xs">Đang tải nhật ký kiểm kho...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="material-symbols-outlined text-2xl">inventory_2</span>
          <span className="text-xs">Chưa có bản ghi biến động tồn kho nào cho đầu sách này</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] border-b border-slate-100 dark:border-slate-800">
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Lý Do / Nghiệp Vụ</th>
                <th className="py-2.5 px-3 text-center">Biến Động</th>
                <th className="py-2.5 px-3 text-center">Tồn Trước</th>
                <th className="py-2.5 px-3 text-center">Tồn Sau</th>
                <th className="py-2.5 px-3">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log, idx) => {
                const changeNum = Number(log.change || 0);
                const isPositive = changeNum > 0;
                return (
                  <tr key={log.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                      {log.reason || 'Điều chỉnh'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono">
                      <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : changeNum < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'}>
                        {isPositive ? `+${changeNum}` : changeNum}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {log.previousStock ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {log.newStock ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                      {log.note || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 text-[11px]">
                Trang {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => fetchLogs(page - 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => fetchLogs(page + 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export alias for backward compatibility
export const InventoryLogsModal = InventoryLogsDrawer;
export default InventoryLogsDrawer;
