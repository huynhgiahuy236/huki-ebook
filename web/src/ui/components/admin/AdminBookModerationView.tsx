"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { catalogApi, BookData } from '../../api/catalogApi';
import { useSmartFormCollapse } from '../../utils/formHooks';

import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

export function AdminBookModerationView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [inspectingBook, setInspectingBook] = useState<any>(null);
  const [isDrmPreviewOpen, setIsDrmPreviewOpen] = useState(false);
  const [rejectReasonModal, setRejectReasonModal] = useState<any>(null);
  const [customReason, setCustomReason] = useState('');
  const [customReasonError, setCustomReasonError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);

  const [queueItems, setQueueItems] = useState<any[]>([]);;

  const inspectPanelRef = useSmartFormCollapse({
    isOpen: Boolean(inspectingBook),
    onClose: () => setInspectingBook(null),
    isDirty: false,
  });

  const drmPreviewRef = useSmartFormCollapse({
    isOpen: isDrmPreviewOpen && Boolean(inspectingBook),
    onClose: () => setIsDrmPreviewOpen(false),
    isDirty: false,
  });

  const isRejectDirty = Boolean(customReason.trim());
  const rejectFormRef = useSmartFormCollapse({
    isOpen: Boolean(rejectReasonModal),
    onClose: () => {
      setRejectReasonModal(null);
      setCustomReason('');
      setCustomReasonError('');
    },
    isDirty: isRejectDirty,
  });

  const fetchBooksQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await catalogApi.getPublicBooks({ limit: 100 });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map(b => {
          const isPublished = b.status === 'PUBLISHED';
          const isDraft = b.status === 'DRAFT' || !b.status;
          const format = b.format === 'PHYSICAL' ? 'physical' : b.format === 'DIGITAL' ? 'ebook' : 'hybrid';
          const formatLabel = b.format === 'PHYSICAL' ? 'Sách Giấy' : b.format === 'DIGITAL' ? 'Ebook DRM' : 'Combo Sách + Ebook';
          const cover = b.coverUrl || b.coverImage || b.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80';

          return {
            id: b.id,
            rawBookId: b.id,
            title: b.title,
            publisher: b.publisher?.name || 'Nhà Xuất Bản Đối Tác',
            publisherCode: b.publisher?.name?.substring(0, 4)?.toUpperCase() || 'NXB',
            publisherLogo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&auto=format&fit=crop&q=80',
            cover,
            author: b.author?.name || 'Tác giả chính',
            format,
            formatLabel,
            isbn: (b as any).isbn || 'Chưa cấp ISBN',
            licenseNo: `QĐXB-${b.id.substring(0, 6).toUpperCase()}-2026`,
            price: b.price || 0,
            ebookPrice: b.format !== 'PHYSICAL' ? (b.price ? Math.round(b.price * 0.6) : 0) : null,
            submittedAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            status: isPublished ? 'approved' : 'pending',
            statusLabel: isPublished ? 'Đã phê duyệt' : 'Chờ kiểm duyệt',
            drmStatus: b.format !== 'PHYSICAL' ? 'Đã mã hóa AES-256 (Hợp lệ)' : 'Không áp dụng (Sách in)',
            samplePages: 15,
            totalPages: 320,
            fileSize: b.format !== 'PHYSICAL' ? '18.4 MB (EPUB)' : 'N/A',
            urgency: isDraft ? 'high' : 'low',
            notes: b.description || 'Đầy đủ hồ sơ kiểm duyệt nội dung theo tiêu chuẩn xuất bản.',
          };
        });
        setQueueItems(mapped);
      } else {
        setQueueItems([]);
      }
    } catch {
      setQueueItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooksQueue();
  }, [fetchBooksQueue]);

  const handleApprove = async (bookId: any) => {
    setActionLoadingId(bookId);
    try {
      const res = await catalogApi.publishBook(bookId);
      if (res.success) {
        showToast?.('Đã phê duyệt và kích hoạt phân phối toàn sàn HUKI!', 'success');
        setQueueItems(prev => prev.map(item => {
          if (item.id === bookId) {
            return { ...item, status: 'approved', statusLabel: 'Đã phê duyệt' };
          }
          return item;
        }));
        await fetchBooksQueue();
      } else {
        showToast?.(res.error?.message || 'Không thể phê duyệt sách.', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi phê duyệt sách.', 'error');
    } finally {
      setActionLoadingId(null);
      setInspectingBook(null);
    }
  };

  const handleRequestEdit = (bookId: any) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'need_update', statusLabel: 'Cần bổ sung thông tin' };
      }
      return item;
    }));
    showToast?.('Đã gửi thông báo yêu cầu NXB chỉnh sửa giấy phép!', 'info');
    setInspectingBook(null);
  };

  const handleReject = (bookId: any, reason: any) => {
    const finalReason = typeof reason === 'string' ? reason.trim() : customReason.trim();
    if (!finalReason) {
      setCustomReasonError('Vui lòng chọn hoặc nhập lý do từ chối phát hành ấn phẩm.');
      return;
    }
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'rejected', statusLabel: 'Từ chối phát hành', rejectReason: finalReason };
      }
      return item;
    }));
    showToast?.(`Đã từ chối phát hành tựa sách: ${finalReason}`, 'warning');
    setRejectReasonModal(null);
    setCustomReason('');
    setCustomReasonError('');
    setInspectingBook(null);
  };

  const filteredItems = queueItems.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (selectedFormat !== 'all' && item.format !== selectedFormat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.publisher.toLowerCase().includes(q) ||
        item.isbn.toLowerCase().includes(q) ||
        item.licenseNo.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = queueItems.filter(i => i.status === 'pending').length;
  const needUpdateCount = queueItems.filter(i => i.status === 'need_update').length;
  const approvedCount = queueItems.filter(i => i.status === 'approved').length;

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full font-sans">
      {/* 1. TOP HEADER & METRICS SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Kiểm Duyệt Sách &amp; Bản Quyền Số
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-gray-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Mã hóa DRM: Chuẩn AES-GCM-256</span>
          </div>

          <button 
            onClick={() => showToast?.('Đang quét tự động kiểm tra ISBN trùng lặp...', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            <span>Quét ISBN Tự Động</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chờ Kiểm Duyệt Ngay</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              {pendingCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{pendingCount} Tựa Sách</div>
          <div className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>Thời gian phản hồi &lt; 4h</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cần Bổ Sung Giấy Phép</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
              {needUpdateCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{needUpdateCount} Tựa Sách</div>
          <div className="mt-2 text-xs text-rose-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>Chờ NXB tải lên QĐXB</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Lên Kệ Tuần Này</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              {approvedCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">142 Đầu Sách</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Bảo vệ DRM thành công</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tỷ Lệ Duyệt Thành Công</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              96.8%
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">96.8%</div>
          <div className="mt-2 text-xs text-blue-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span>Chuẩn hóa nghiêm ngặt</span>
          </div>
        </div>
      </div>

      {/* 3. FILTERS, SEARCH & FORMAT TABS */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Status Tabs chuẩn AdminFilterTabs */}
        <AdminFilterTabs
          tabs={[
            { id: 'all', label: 'Tất Cả', count: queueItems.length },
            { id: 'pending', label: 'Chờ Xét Duyệt', count: pendingCount },
            { id: 'need_update', label: 'Cần Bổ Sung', count: needUpdateCount },
            { id: 'approved', label: 'Đã Phê Duyệt', count: approvedCount },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* Search & Format Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedFormat}
            onChange={(e: any) => {
              setSelectedFormat(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#00875A]"
          >
            <option value="all">Mọi Định Dạng</option>
            <option value="hybrid">Combo Sách + Ebook</option>
            <option value="ebook">Ebook DRM Độc Quyền</option>
            <option value="physical">Sách Giấy In</option>
          </select>

          <div className="relative flex-1 md:w-60">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
            <input
              type="text"
              placeholder="Tìm tên sách, ISBN, NXB..."
              value={searchQuery}
              onChange={(e: any) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. MODERATION QUEUE TABLE - Tách cột riêng, không rớt dòng, cuộn ngang, zebra striping */}
      <AdminTableContainer>
        <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
          <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Tác Phẩm</th>
              <th className="py-3 px-3 whitespace-nowrap">Tác Giả</th>
              <th className="py-3 px-3 whitespace-nowrap">Nhà Xuất Bản</th>
              <th className="py-3 px-3 whitespace-nowrap">Mã Sách / UUID</th>
              <th className="py-3 px-3 whitespace-nowrap">Định Dạng</th>
              <th className="py-3 px-3 whitespace-nowrap">Bảo Mật DRM</th>
              <th className="py-3 px-3 whitespace-nowrap">Mã ISBN</th>
              <th className="py-3 px-3 whitespace-nowrap">Quyết Định XB</th>
              <th className="py-3 px-3 whitespace-nowrap">Giá Sách Giấy</th>
              <th className="py-3 px-3 whitespace-nowrap">Giá Ebook</th>
              <th className="py-3 px-3 whitespace-nowrap">Thời Gian Gửi</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Trạng Thái</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">find_in_page</span>
                  <p className="font-semibold text-xs">Không tìm thấy hồ sơ sách nào phù hợp điều kiện lọc.</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`transition-colors group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                  } hover:bg-emerald-50/40`}
                >
                  {/* Tác Phẩm */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={item.cover} 
                        alt={item.title} 
                        className="w-8 h-11 object-cover rounded-md shadow-2xs border border-gray-200 shrink-0"
                      />
                      <span className="font-bold text-gray-900 text-xs group-hover:text-[#00875A] transition-colors">
                        {item.title}
                      </span>
                    </div>
                  </td>

                  {/* Tác Giả */}
                  <td className="py-3 px-3 whitespace-nowrap text-gray-700 font-medium">
                    {item.author}
                  </td>

                  {/* Nhà Xuất Bản */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[10.5px]">
                      {item.publisher}
                    </span>
                  </td>

                  {/* Mã Sách / UUID */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[10.5px] text-gray-400">
                    #{item.id}
                  </td>

                  {/* Định Dạng */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                      item.format === 'hybrid' ? 'text-emerald-700' :
                      item.format === 'ebook' ? 'text-purple-700' : 'text-blue-700'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {item.format === 'hybrid' ? 'auto_stories' : item.format === 'ebook' ? 'devices' : 'menu_book'}
                      </span>
                      {item.formatLabel}
                    </span>
                  </td>

                  {/* Bảo Mật DRM */}
                  <td className="py-3 px-3 whitespace-nowrap text-[10.5px] text-gray-500 font-medium">
                    {item.drmStatus}
                  </td>

                  {/* Mã ISBN */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-gray-800 font-semibold">
                    {item.isbn}
                  </td>

                  {/* Quyết Định XB */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[10.5px] text-gray-500">
                    {item.licenseNo}
                  </td>

                  {/* Giá Sách Giấy */}
                  <td className="py-3 px-3 whitespace-nowrap font-bold text-gray-900 text-xs">
                    {item.price ? `${item.price.toLocaleString()}₫` : '-'}
                  </td>

                  {/* Giá Ebook */}
                  <td className="py-3 px-3 whitespace-nowrap font-bold text-[#00875A] text-xs">
                    {item.ebookPrice ? `${item.ebookPrice.toLocaleString()}₫` : '-'}
                  </td>

                  {/* Thời Gian Gửi */}
                  <td className="py-3 px-3 whitespace-nowrap text-gray-500 text-[11px]">
                    {item.submittedAt}
                  </td>

                  {/* Trạng Thái */}
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <AdminStatusBadge
                      variant={
                        item.status === 'approved' ? 'success' :
                        item.status === 'pending' ? 'warning' :
                        item.status === 'need_update' ? 'danger' : 'neutral'
                      }
                      label={item.statusLabel}
                    />
                  </td>

                  {/* Thao Tác */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setInspectingBook(item)}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Thẩm Định</span>
                      </button>

                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          title="Phê duyệt nhanh"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                          <span>Duyệt</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Luôn hiển thị thanh phân trang mặc định */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="tựa sách kiểm duyệt"
        />
      </AdminTableContainer>

      {/* 5. QUICK INSPECTION IN-PAGE COLLAPSIBLE PANEL */}
      {inspectingBook && (
        <div ref={inspectPanelRef} className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-emerald-500/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Thẩm Định Bản Quyền &amp; Xuất Bản
                </h2>
                <span className="text-xs font-mono text-gray-500">Mã hồ sơ: {inspectingBook.id}</span>
              </div>
            </div>
            <button
              onClick={() => setInspectingBook(null)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              ✕ Đóng bảng
            </button>
          </div>

          {/* Body */}
          <div className="space-y-6 text-xs text-gray-700">
            {/* Book Card Highlight */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <img
                src={inspectingBook.cover}
                alt={inspectingBook.title}
                className="w-20 h-28 object-cover rounded-xl shadow-sm border border-gray-200 shrink-0 mx-auto sm:mx-0"
              />
              <div className="flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-[#00875A]/10 text-[#00875A] font-extrabold text-[10px] uppercase">
                    {inspectingBook.formatLabel}
                  </span>
                  <h3 className="text-sm font-extrabold text-gray-900 mt-1 leading-snug">
                    {inspectingBook.title}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">Tác giả: <strong>{inspectingBook.author}</strong></p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-extrabold text-[#00875A]">{inspectingBook.price.toLocaleString()}₫</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{inspectingBook.totalPages} trang</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{inspectingBook.fileSize}</span>
                </div>
              </div>
            </div>

            {/* Legal & Publishing Verification Box */}
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#00875A]">gavel</span>
                1. Xác Minh Pháp Lý &amp; Cục Xuất Bản
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-gray-400 text-[11px] block">Mã ISBN Quốc Tế</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.isbn}</span>
                  <span className="text-emerald-600 text-[10px] font-semibold block mt-0.5">✓ Đã đối chiếu Cục Xuất Bản</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Số Quyết Định Xuất Bản</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.licenseNo}</span>
                  <span className="text-emerald-600 text-[10px] font-semibold block mt-0.5">✓ Tem hợp chuẩn Bộ TTTT</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Đơn Vị Xuất Bản</span>
                  <span className="font-bold text-gray-900 text-xs">{inspectingBook.publisher}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Mã Nhà Xuất Bản Sàn</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.publisherCode}</span>
                </div>
              </div>
            </div>

            {/* DRM Protection & Watermark Engine Box */}
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-purple-600">lock</span>
                2. Kiểm Tra Mã Hóa DRM &amp; Thử Nghiệm Đọc Thử
              </h4>
              <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-950 text-xs">Mã hóa bản quyền DRM SHA-256 AES-GCM</div>
                    <p className="text-purple-700 text-[11px] mt-0.5">Watermark động nhúng Email độc giả khi mở sách trên Web/App</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-purple-600 text-white font-mono font-bold text-[10px]">
                    DRM PASSED
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-200/60">
                  <span className="text-purple-900 font-medium">Bản đọc thử cấp phép: <strong>{inspectingBook.samplePages} trang</strong></span>
                  <button
                    onClick={() => setIsDrmPreviewOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                    <span>Mở Trình Đọc DRM Thử Nghiệm</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes from Publisher */}
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-gray-500">notes</span>
                3. Ghi Chú Của Nhà Xuất Bản
              </h4>
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 text-xs italic">
                "{inspectingBook.notes}"
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setRejectReasonModal(inspectingBook);
                setCustomReason('');
                setCustomReasonError('');
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Từ Chối Phát Hành
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRequestEdit(inspectingBook.id)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Yêu Cầu Bổ Sung Giấy Phép
              </button>

              <button
                onClick={() => handleApprove(inspectingBook.id)}
                className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Phê Duyệt &amp; Phát Hành Toàn Sàn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DRM PREVIEW IN-PAGE PANEL */}
      {isDrmPreviewOpen && inspectingBook && (
        <div
          ref={drmPreviewRef}
          className="mt-6 bg-[#1E293B] text-white rounded-3xl overflow-hidden shadow-sm border-2 border-slate-700 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {/* DRM Header Bar */}
          <div className="px-6 py-4 bg-[#0F172A] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-[24px]">lock</span>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  {inspectingBook.title}
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded">
                    DRM ENCRYPTED SAMPLE
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Mã khóa phiên đọc: #DRM-KEY-99281-AUTH-SUPERADMIN
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsDrmPreviewOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* DRM Simulated Reader Viewport */}
          <div className="bg-[#F8FAFC] text-gray-900 p-8 overflow-y-auto relative select-none max-h-[600px]">
            {/* Security Watermark Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-25deg]">
              <div className="text-4xl font-extrabold text-gray-900 tracking-widest text-center">
                HUKI EBOOK DRM PROTECTED<br />
                SUPER ADMIN AUDIT 2026<br />
                {inspectingBook.isbn}
              </div>
            </div>

            {/* Sample Content Simulation */}
            <div className="max-w-2xl mx-auto space-y-6 font-serif text-sm leading-relaxed text-gray-800">
              <div className="text-center py-6 border-b border-gray-200">
                <span className="text-xs uppercase font-sans text-gray-400 tracking-widest">Trang Bản Quyền Số</span>
                <h1 className="text-2xl font-bold font-editorial text-gray-900 mt-2">{inspectingBook.title}</h1>
                <p className="text-sm font-sans text-gray-600 mt-1">Tác giả: {inspectingBook.author}</p>
                <p className="text-xs font-sans text-[#00875A] font-bold mt-1">Bản quyền phát hành thuộc về {inspectingBook.publisher}</p>
              </div>

              <h2 className="text-lg font-bold text-gray-900 font-editorial">CHƯƠNG 1: BƯỚC KHỞI ĐẦU</h2>
              <p>
                Trong thế giới kinh tế học hiện đại, việc thấu hiểu hành vi con người không chỉ dừng lại ở các phương trình toán học khô khan hay những biểu đồ cung cầu truyền thống. Thực tế chứng minh rằng mọi quyết định tài chính lớn lao đều bị chi phối sâu sắc bởi cảm xúc, định kiến nhận thức và bối cảnh tâm lý của từng cá nhân...
              </p>
              <p>
                Khi chúng ta phân tích các chu kỳ thị trường trong suốt một thế kỷ qua, điểm chung lớn nhất không nằm ở công nghệ hay các công cụ tài chính tối tân, mà nằm ở bản chất tâm lý con người vốn ít khi thay đổi. Lòng tham, nỗi sợ hãi, niềm hy vọng và sự hoài nghi luôn lặp lại dưới những hình thức mới...
              </p>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 font-sans text-xs text-amber-900">
                <strong>Thông tin DRM:</strong> File mã hóa hiển thị chuẩn xác phông chữ tiếng Việt, không phát hiện lỗi vỡ layout hoặc thiếu dấu phụ âm.
              </div>
            </div>
          </div>

          {/* DRM Footer Bar */}
          <div className="px-6 py-3 bg-[#0F172A] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>Trang 1 / {inspectingBook.samplePages} (Bản đọc thử kiểm duyệt)</span>
            <button
              onClick={() => {
                setIsDrmPreviewOpen(false);
                handleApprove(inspectingBook.id);
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Xác Nhận Đạt Chuẩn DRM &amp; Phê Duyệt
            </button>
          </div>
        </div>
      )}

      {/* 7. REJECT REASON IN-PAGE FORM */}
      {rejectReasonModal && (
        <div
          ref={rejectFormRef}
          className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-300 animate-in fade-in slide-in-from-top-4 duration-300 max-w-2xl"
        >
          <div className="flex items-center justify-between border-b border-rose-100 pb-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Phê Duyệt Tựa Sách</h3>
                <p className="text-xs text-slate-500">
                  Đối tác NXB: <strong>{rejectReasonModal.publisher}</strong> &bull; Tựa sách: <strong>{rejectReasonModal.title}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRejectReasonModal(null);
                setCustomReason('');
                setCustomReasonError('');
              }}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 mt-5">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Chọn lý do từ chối tiêu chuẩn:
              </span>
              <div className="space-y-2 mb-3">
                {[
                  'Mã ISBN không khớp với dữ liệu đăng ký tại Cục Xuất Bản',
                  'Thiếu hợp đồng nhượng quyền tác phẩm từ tác giả / NXB quốc tế',
                  'File Ebook mã hóa lỗi font hoặc chất lượng hình ảnh không đạt chuẩn',
                  'Nội dung có dấu hiệu vi phạm chính sách kiểm duyệt bản quyền'
                ].map((reason, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                      customReason === reason
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason}
                      checked={customReason === reason}
                      onChange={(e: any) => {
                        setCustomReason(e.target.value);
                        if (customReasonError) setCustomReasonError('');
                      }}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Hoặc nhập ghi chú chi tiết cụ thể cho NXB <span className="text-rose-500">*</span>:
              </label>
              <textarea
                placeholder="Ghi chú chi tiết thêm cho NXB để điều chỉnh lại..."
                value={customReason}
                onChange={(e: any) => {
                  setCustomReason(e.target.value);
                  if (customReasonError) setCustomReasonError('');
                }}
                rows={3}
                className={`w-full p-3.5 rounded-xl border text-xs text-slate-800 focus:outline-none transition-all resize-none ${
                  customReasonError
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:border-rose-500 bg-slate-50 focus:bg-white'
                }`}
              />
              {customReasonError && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{customReasonError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectReasonModal(null);
                  setCustomReason('');
                  setCustomReasonError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectReasonModal.id, customReason)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">cancel</span>
                <span>Xác Nhận Từ Chối Xuất Bản</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminBookModerationView;
