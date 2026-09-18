"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { catalogApi, InventoryReason } from '@/ui/api/catalogApi';

export interface InventoryLogItem {
  id: string;
  change?: number;
  reason?: InventoryReason | string;
  createdAt?: string;
  note?: string;
  previousStock?: number;
  newStock?: number;
}

export interface InventoryBookItem {
  id: string;
  title: string;
  physicalDetails?: {
    stock?: number;
    reserved?: number;
  };
}

export interface InventoryLogsModalProps {
  book: InventoryBookItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryLogsModal({ book, isOpen, onClose }: InventoryLogsModalProps) {
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && book?.id) {
      fetchLogs(1);
    }
  }, [isOpen, book?.id]);

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen || !book || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-xl">history</span>
              Lịch Sử Biến Động Tồn Kho
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md">
              {book.title}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <span className="material-symbols-outlined text-3xl animate-spin text-emerald-600">progress_activity</span>
              <span className="text-xs">Đang tải nhật ký kiểm kho...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
              <span className="text-xs">Chưa có bản ghi biến động tồn kho nào</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log, idx) => {
                const isPositive = (log.change || 0) > 0;
                return (
                  <div 
                    key={log.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
                      }`}>
                        <span className="material-symbols-outlined text-lg font-bold">
                          {isPositive ? 'add' : 'remove'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{log.reason || 'Biến động tồn kho'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
                          {log.note && <span className="ml-1 text-slate-500">· {log.note}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-sm font-black font-mono ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isPositive ? `+${log.change}` : log.change}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {log.previousStock != null && log.newStock != null ? `${log.previousStock} → ${log.newStock}` : 'Đơn vị: cuốn'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Trang {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchLogs(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-[11px]"
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => fetchLogs(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-[11px]"
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
