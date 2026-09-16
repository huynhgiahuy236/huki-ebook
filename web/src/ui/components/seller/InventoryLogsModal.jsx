import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { catalogApi } from '../../api/catalogApi';

export function InventoryLogsModal({ book, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isOpen && book?.id) {
      fetchLogs(1);
    }
  }, [isOpen, book?.id]);

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchLogs = async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await catalogApi.getInventoryLogs(book.id, { page: pageNum, limit: 10 });
      if (res) {
        const payload = res.data?.data || res.data?.items || res.data || [];
        const logList = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        const meta = res.data?.meta || res.meta || {};
        setLogs(Array.isArray(logList) ? logList : []);
        setPage(meta.page || pageNum);
        setTotalPages(meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load inventory logs', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !book) return null;

  const getActionBadge = (reason, change) => {
    switch (reason) {
      case 'RESTOCK':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">Nhập kho (+{change})</span>;
      case 'RESERVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Khóa tạm giữ ({change})</span>;
      case 'RELEASE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">Giải phóng (+{change})</span>;
      case 'SALE_DEDUCT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">Bán thành công ({change})</span>;
      case 'DAMAGED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">Hàng hỏng ({change})</span>;
      default:
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {change >= 0 ? `+${change}` : change} ({reason || 'Điều chỉnh'})
          </span>
        );
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col border border-gray-100 overflow-hidden animate-scaleIn"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">history</span>
              Lịch sử biến động tồn kho
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
              Sách: <strong className="text-gray-800">{book.title}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Đang tải lịch sử tồn kho...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">inventory_2</span>
              <p className="text-sm">Chưa có lịch sử biến động kho cho cuốn sách này.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 pl-5 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-primary group-hover:scale-125 transition-transform"></div>
                  
                  <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.reason, log.change)}
                        <span className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        Tồn sau đổi: <span className="text-primary">{log.balance}</span>
                      </span>
                    </div>

                    {log.note && (
                      <p className="text-xs text-gray-600 mt-1">
                        Ghi chú: {log.note}
                      </p>
                    )}

                    {log.orderId && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Mã đơn liên quan: <span className="font-mono">{log.orderId}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination & Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/70 text-xs">
          <span className="text-gray-500">
            Trang {page} / {totalPages || 1}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default InventoryLogsModal;


