import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { catalogApi } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { InventoryLogsModal } from '../../components/seller/InventoryLogsModal';

export default function SellerInventoryPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  const [selectedBookForLogs, setSelectedBookForLogs] = useState(null);

  // Modal State for Restock / Adjust
  const [adjustModal, setAdjustModal] = useState({
    isOpen: false,
    book: null,
    operation: 'ADD', // ADD (Nhập kho), SUBTRACT (Xuất kho/Hỏng), SET (Kiểm kê)
    quantity: 10,
    reason: 'RESTOCK',
    note: '',
    submitting: false,
  });

  // ESC key listener to close adjust modal
  useEffect(() => {
    if (!adjustModal.isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAdjustModal((p) => ({ ...p, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustModal.isOpen]);

  const [toast, setToast] = useState(null);


  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            bizId = myBiz.data.id;
            setActiveBusinessId(bizId);
          }
        } catch { /* ignore */ }
      }

      let bookList = [];
      try {
        const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
        if (res.data) {
          bookList = Array.isArray(res.data) ? res.data : res.data.data || [];
        }
      } catch {
        // Fallback to public books if seller endpoint not accessible
        const pubRes = await catalogApi.getPublicBooks({ limit: 100 });
        if (pubRes.data) {
          bookList = Array.isArray(pubRes.data) ? pubRes.data : pubRes.data.data || [];
        }
      }

      const physicalBooks = bookList.filter(
        (b) => b.format === 'PHYSICAL' || b.format === 'BOTH'
      );
      setBooks(physicalBooks);
    } catch (err) {
      console.error('Failed to fetch books for inventory', err);
      showToast('Không thể tải danh sách tồn kho', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);


  // Compute Metrics
  const metrics = useMemo(() => {
    let totalTitles = books.length;
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    books.forEach((b) => {
      const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
      const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
      const available = Math.max(0, stock - reserved);

      totalOnHand += stock;
      totalReserved += reserved;
      totalAvailable += available;

      if (available === 0) outOfStockCount++;
      else if (available <= 5) lowStockCount++;
    });

    return {
      totalTitles,
      totalOnHand,
      totalReserved,
      totalAvailable,
      outOfStockCount,
      lowStockCount,
    };
  }, [books]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const titleMatch = (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.isbn || '').toLowerCase().includes(search.toLowerCase());
      if (!titleMatch) return false;

      const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
      const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
      const available = Math.max(0, stock - reserved);

      if (filterStatus === 'OUT_OF_STOCK') return available === 0;
      if (filterStatus === 'LOW_STOCK') return available > 0 && available <= 5;
      if (filterStatus === 'IN_STOCK') return available > 5;
      return true;
    });
  }, [books, search, filterStatus]);

  const handleOpenAdjust = (book, operation = 'ADD') => {
    setAdjustModal({
      isOpen: true,
      book,
      operation,
      quantity: operation === 'ADD' ? 10 : 1,
      reason: operation === 'ADD' ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
      note: '',
      submitting: false,
    });
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!adjustModal.book) return;

    try {
      setAdjustModal((prev) => ({ ...prev, submitting: true }));
      await catalogApi.updateInventory(adjustModal.book.id, {
        operation: adjustModal.operation,
        quantity: Number(adjustModal.quantity),
        reason: adjustModal.reason,
        note: adjustModal.note,
      });

      showToast(
        `Đã cập nhật tồn kho cho "${adjustModal.book.title}" thành công!`,
        'success'
      );
      setAdjustModal((prev) => ({ ...prev, isOpen: false }));
      await fetchInventory();
    } catch (err) {
      console.error('Failed to update inventory', err);
      showToast(err?.message || 'Cập nhật tồn kho thất bại', 'error');
      setAdjustModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm font-medium animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">inventory</span>
            Quản Lý Tồn Kho 3 Tầng (3-Tier Inventory)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kiểm soát chính xác Tồn thực tế (On-Hand), Tạm giữ (Reserved), và Khả dụng (Available) với cơ chế khóa nguyên tử chống Race Condition.
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Làm mới
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Đầu Sách Vật Lý</span>
            <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-1.5 rounded-lg text-lg">
              menu_book
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalTitles}</div>
          <span className="text-[11px] text-gray-400">Ấn bản sách giấy</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Tổng Tồn Thực (On-Hand)</span>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg text-lg">
              warehouse
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalOnHand}</div>
          <span className="text-[11px] text-gray-400">Hiện có trong kho</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Đang Tạm Giữ (Reserved)</span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-1.5 rounded-lg text-lg">
              lock_clock
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{metrics.totalReserved}</div>
          <span className="text-[11px] text-gray-400">Đơn chờ thanh toán</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Sẵn Sàng Bán (Available)</span>
            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-1.5 rounded-lg text-lg">
              check_circle
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{metrics.totalAvailable}</div>
          <span className="text-[11px] text-gray-400">Người mua có thể đặt</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sách hoặc ISBN..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'IN_STOCK', label: 'Còn hàng' },
            { id: 'LOW_STOCK', label: 'Sắp hết (≤ 5)' },
            { id: 'OUT_OF_STOCK', label: 'Hết hàng (0)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === tab.id
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Đang tải bảng tồn kho...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">search_off</span>
            <p className="text-sm">Không tìm thấy sách nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Sách & Thông Tin</th>
                  <th className="py-3.5 px-3 text-center">Tồn Thực (On-Hand)</th>
                  <th className="py-3.5 px-3 text-center">Tạm Giữ (Reserved)</th>
                  <th className="py-3.5 px-3 text-center">Khả Dụng (Available)</th>
                  <th className="py-3.5 px-3 text-center">Trạng Thái Kho</th>
                  <th className="py-3.5 px-4 text-right min-w-[240px] whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredBooks.map((book) => {
                  const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
                  const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
                  const available = Math.max(0, stock - reserved);

                  return (
                    <tr key={book.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Book info */}
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="w-10 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                          <img
                            src={book.coverUrl || book.coverImage || book.cover || '/banners/hero-library.jpg'}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <span className="font-bold text-gray-900 block truncate">{book.title}</span>
                          <span className="text-[11px] text-gray-400 block truncate">
                            ISBN: {book.isbn || 'Chưa cập nhật'} • Tác giả: {book.author?.name || book.author || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* On-hand */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-gray-800 text-sm">{stock}</span>
                      </td>

                      {/* Reserved */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`font-bold text-sm ${reserved > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {reserved}
                        </span>
                      </td>

                      {/* Available */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-bold text-sm ${
                            available === 0
                              ? 'text-red-600'
                              : available <= 5
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {available}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {available === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            Hết hàng
                          </span>
                        ) : available <= 5 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Sắp hết ({available})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Còn hàng
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right min-w-[240px] whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <button
                            onClick={() => handleOpenAdjust(book, 'ADD')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                            title="Nhập thêm hàng vào kho"
                          >
                            <span className="material-symbols-outlined text-sm">add_box</span>
                            Nhập kho
                          </button>

                          <button
                            onClick={() => handleOpenAdjust(book, 'SET')}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                            title="Điều chỉnh hoặc kiểm kê tồn kho"
                          >
                            <span className="material-symbols-outlined text-sm">tune</span>
                            Điều chỉnh
                          </button>

                          <button
                            onClick={() => setSelectedBookForLogs(book)}
                            className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
                            title="Xem lịch sử biến động kho"
                          >
                            <span className="material-symbols-outlined text-base">history</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust / Restock Modal via Portal */}
      {adjustModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setAdjustModal((p) => ({ ...p, isOpen: false }))}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-100 animate-scaleIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {adjustModal.operation === 'ADD' ? 'add_box' : 'tune'}
                </span>
                {adjustModal.operation === 'ADD' ? 'Nhập Thêm Tồn Kho' : 'Điều Chỉnh Tồn Kho'}
              </h3>
              <button
                onClick={() => setAdjustModal((p) => ({ ...p, isOpen: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Sách: <strong className="text-gray-900">{adjustModal.book?.title}</strong>
            </p>

            <form onSubmit={handleSaveAdjust} className="space-y-4">
              {/* Operation type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phương thức:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ADD', label: 'Cộng thêm (+)' },
                    { id: 'SUBTRACT', label: 'Trừ bớt (-)' },
                    { id: 'SET', label: 'Đặt lại (=)' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() =>
                        setAdjustModal((p) => ({
                          ...p,
                          operation: op.id,
                          reason: op.id === 'ADD' ? 'RESTOCK' : op.id === 'SUBTRACT' ? 'DAMAGED' : 'MANUAL_ADJUSTMENT',
                        }))
                      }
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                        adjustModal.operation === op.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {adjustModal.operation === 'SET' ? 'Số lượng tồn mới sau kiểm kê:' : 'Số lượng thay đổi:'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustModal.quantity}
                  onChange={(e) => setAdjustModal((p) => ({ ...p, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-primary font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lý do:</label>
                <select
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="RESTOCK">Nhập thêm hàng từ NXB (RESTOCK)</option>
                  <option value="MANUAL_ADJUSTMENT">Kiểm kê định kỳ (MANUAL_ADJUSTMENT)</option>
                  <option value="DAMAGED">Hàng lỗi / rách hỏng (DAMAGED)</option>
                  <option value="RETURNED">Khách trả hàng (RETURNED)</option>
                  <option value="CORRECTION">Sửa sai lệch số liệu (CORRECTION)</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhập 50 cuốn từ đợt in mới..."
                  value={adjustModal.note}
                  onChange={(e) => setAdjustModal((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal((p) => ({ ...p, isOpen: false }))}
                  className="w-1/2 py-2 rounded-xl border border-gray-200 font-semibold text-xs text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adjustModal.submitting}
                  className="w-1/2 py-2 rounded-xl bg-primary hover:bg-primary-hover font-semibold text-xs text-white shadow-2xs disabled:opacity-50"
                >
                  {adjustModal.submitting ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* History Log Modal */}
      <InventoryLogsModal
        book={selectedBookForLogs}
        isOpen={Boolean(selectedBookForLogs)}
        onClose={() => setSelectedBookForLogs(null)}
      />
    </div>
  );
}

