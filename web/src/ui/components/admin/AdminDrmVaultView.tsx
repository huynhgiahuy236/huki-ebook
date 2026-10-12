"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import {
  AdminStatusBadge,
  AdminFilterTabs,
  AdminPagination,
  AdminTableContainer,
} from './AdminUI';
import {
  adminDrmApi,
  type DrmOverviewData,
  type DrmLicenseItem,
} from '@/ui/api/adminDrmApi';

export function AdminDrmVaultView() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'secure' | 'upgrade_needed' | 'revoked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [overview, setOverview] = useState<DrmOverviewData | null>(null);
  const [licenses, setLicenses] = useState<DrmLicenseItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotatingId, setIsRotatingId] = useState<string | null>(null);
  const [isRevokingId, setIsRevokingId] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedDrmIds, setExpandedDrmIds] = useState<Set<string>>(new Set());
  const [hasActiveReadersPulse, setHasActiveReadersPulse] = useState(false);
  const previousActiveReadersRef = useRef<number | null>(null);

  // Debounce tìm kiếm 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load số liệu overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await adminDrmApi.getOverview();
      if (res.data) {
        setOverview(res.data);
        if (
          previousActiveReadersRef.current !== null &&
          previousActiveReadersRef.current !== res.data.activeReadersCount
        ) {
          setHasActiveReadersPulse(true);
          setTimeout(() => setHasActiveReadersPulse(false), 2000);
        }
        previousActiveReadersRef.current = res.data.activeReadersCount;
      }
    } catch (err) {
      console.error('Lỗi khi tải DRM overview:', err);
    }
  }, []);

  // Load danh sách giấy phép
  const fetchLicenses = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await adminDrmApi.getLicenses({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        status: activeTab,
      });

      if (res.data) {
        let items: DrmLicenseItem[] = [];
        let total = 0;
        let pages = 1;

        if (Array.isArray(res.data)) {
          items = res.data;
          total = items.length;
        } else if (typeof res.data === 'object') {
          const raw = res.data as any;
          if (Array.isArray(raw.items)) {
            items = raw.items;
          } else if (Array.isArray(raw.data)) {
            items = raw.data;
          }
          total = Number(raw.total) || items.length;
          pages = Number(raw.totalPages) || Math.ceil(total / pageSize) || 1;
        }

        setLicenses(items);
        setTotalItems(total || items.length);
        setTotalPages(pages);
      }
    } catch (err) {
      if (!isSilent) {
        console.error('Lỗi khi tải danh sách DRM licenses:', err);
        showToast?.('Không thể tải danh sách giấy phép DRM từ máy chủ', 'error');
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, activeTab, showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  // Silent Background Auto-Polling (3.5s - Cơ chế Shopee Realtime) & Lắng nghe RealtimeSyncBus
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchOverview();
      fetchLicenses(true);
    }, 3500);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'DRM_READER_JOINED' ||
        msg.type === 'DRM_READER_LEFT' ||
        msg.type === 'DRM_ACTIVE_READERS_CHANGED' ||
        msg.type === 'DRM_LICENSE_REVOKED' ||
        msg.type === 'DRM_LICENSE_RESTORED'
      ) {
        fetchOverview();
        fetchLicenses(true);
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [fetchOverview, fetchLicenses]);

  // Xử lý luân chuyển khóa (Rotate Key)
  const handleRotateKey = async (licId: string) => {
    if (isRotatingId) return;
    setIsRotatingId(licId);
    try {
      const res = await adminDrmApi.rotateKey(licId);
      if (res.success || res.data) {
        showToast?.(`Đã luân chuyển (Rotate) khóa bảo mật cho ${licId} thành công!`, 'success');
        await Promise.all([fetchLicenses(true), fetchOverview()]);
      } else {
        showToast?.(res.error?.message || 'Không thể luân chuyển khóa', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi rotate key:', err);
      showToast?.(err?.message || 'Lỗi khi luân chuyển khóa DRM', 'error');
    } finally {
      setIsRotatingId(null);
    }
  };

  // Xử lý thu hồi giấy phép DRM tức thì (Instant Kill-Switch chống đọc lậu)
  const handleRevokeLicense = async (item: DrmLicenseItem) => {
    if (isRevokingId) return;
    const confirmed = window.confirm(
      `Xác nhận THU HỒI giấy phép DRM của tác phẩm "${item.bookTitle}" (${item.id})?\n\nMọi thiết bị đọc lậu đang mở tác phẩm này sẽ bị ngắt kết nối và khóa nội dung tức thì (POL-04)!`
    );
    if (!confirmed) return;

    setIsRevokingId(item.id);
    try {
      const res = await adminDrmApi.revokeLicense(
        item.id,
        `Ban Quản Trị đã thu hồi giấy phép bản quyền của tác phẩm "${item.bookTitle}" do phát hiện vi phạm chính sách bản quyền POL-04.`
      );
      if (res.success || res.data) {
        showToast?.(`Đã thu hồi giấy phép DRM của tác phẩm "${item.bookTitle}"! Phiên đọc đã bị khóa từ xa.`, 'success');
        realtimeSyncBus.publish('DRM_LICENSE_REVOKED', {
          licenseId: item.id,
          bookId: item.bookId,
          reason: 'Giấy phép đọc tác phẩm đã bị thu hồi tức thì bởi Ban Quản Trị (POL-04).',
        });
        await Promise.all([fetchLicenses(true), fetchOverview()]);
      } else {
        showToast?.(res.error?.message || 'Không thể thu hồi giấy phép', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi thu hồi DRM:', err);
      showToast?.(err?.message || 'Lỗi khi thu hồi giấy phép DRM', 'error');
    } finally {
      setIsRevokingId(null);
    }
  };

  // Xử lý khôi phục giấy phép DRM hợp lệ
  const handleRestoreLicense = async (item: DrmLicenseItem) => {
    if (isRestoringId) return;
    setIsRestoringId(item.id);
    try {
      const res = await adminDrmApi.restoreLicense(item.id);
      if (res.success || res.data) {
        showToast?.(`Đã khôi phục giấy phép DRM hợp lệ cho "${item.bookTitle}" thành công!`, 'success');
        realtimeSyncBus.publish('DRM_LICENSE_RESTORED', {
          licenseId: item.id,
          bookId: item.bookId,
        });
        await Promise.all([fetchLicenses(true), fetchOverview()]);
      } else {
        showToast?.(res.error?.message || 'Không thể khôi phục giấy phép', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi khôi phục DRM:', err);
      showToast?.(err?.message || 'Lỗi khi khôi phục giấy phép DRM', 'error');
    } finally {
      setIsRestoringId(null);
    }
  };

  // Xử lý quét toàn vẹn bản quyền (Integrity Scan)
  const handleScanIntegrity = async () => {
    if (isScanning) return;
    setIsScanning(true);
    showToast?.('Bắt đầu quét toàn vẹn bản quyền DRM trên cụm đám mây...', 'info');

    try {
      const res = await adminDrmApi.scanIntegrity();
      if (res.data) {
        const { scannedCount, kmsLatencyMs, scanDurationMs, compromisedCount } = res.data;
        if (scannedCount === 0) {
          showToast?.('Kho bản quyền hiện chưa có chứng chỉ DRM nào để quét đối chiếu.', 'info');
        } else {
          showToast?.(
            `Quét hoàn tất ${scannedCount} giấy phép DRM (${scanDurationMs}ms, KMS: ${kmsLatencyMs}ms). ${compromisedCount} tệp rò rỉ!`,
            'success'
          );
        }
      } else {
        showToast?.('Kho bản quyền chưa có chứng chỉ nào.', 'info');
      }
      await fetchOverview();
    } catch (err: any) {
      console.error('Lỗi quét toàn vẹn DRM:', err);
      showToast?.(err?.message || 'Lỗi trong quá trình quét toàn vẹn DRM', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleExpandDrm = (id: string) => {
    setExpandedDrmIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { key: 'all', label: 'Tất Cả Khóa', count: overview ? overview.totalEncryptedBooks : totalItems },
    { key: 'secure', label: 'An Toàn Tuyệt Đối', count: overview ? overview.totalEncryptedBooks : totalItems },
    { key: 'upgrade_needed', label: 'Cần Nâng Cấp Khóa', count: 0 },
    { key: 'revoked', label: 'Bị Thu Hồi (Đọc Lậu)', count: overview ? overview.revokedDevicesCount : 0 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Trị Khóa Bản Quyền DRM Vault
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Giám sát mã hóa AES-GCM-256, cụm KMS và chứng chỉ bản quyền tác phẩm số
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleScanIntegrity}
            disabled={isScanning}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isScanning ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-800'
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${isScanning ? 'animate-spin' : ''}`}>
              {isScanning ? 'sync' : 'verified_user'}
            </span>
            <span>{isScanning ? 'Đang Quét Toàn Vẹn...' : 'Quét Toàn Vẹn Bản Quyền (Integrity Scan)'}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng khóa */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Tổng Khóa Mã Hóa</div>
            <div className="text-2xl font-extrabold text-gray-900 font-editorial mt-1">
              {overview ? overview.totalEncryptedBooks.toLocaleString('vi-VN') : '0'}
            </div>
            <div className={`text-[11px] font-medium mt-0.5 ${overview && overview.totalEncryptedBooks > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
              {overview && overview.totalEncryptedBooks > 0 ? 'Đã kích hoạt bảo vệ AES-GCM-256' : 'Chưa có sách cấp chứng chỉ'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">key</span>
          </div>
        </div>

        {/* Card 2: Độc giả */}
        <div className={`p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between transition-all duration-300 ${
          hasActiveReadersPulse ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''
        }`}>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Độc Giả Đang Đọc</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-editorial mt-1 flex items-center gap-2">
              <span>{overview ? overview.activeReadersCount.toLocaleString('vi-VN') : '0'}</span>
              {overview && overview.activeReadersCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" title="Realtime Active"></span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              {overview && overview.activeReadersCount > 0 ? 'Gắn Dynamic Canvas Watermark' : 'Chưa có phiên đọc trực tuyến'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">devices</span>
          </div>
        </div>

        {/* Card 3: Thiết bị thu hồi */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Thiết Bị Bị Thu Hồi</div>
            <div className="text-2xl font-extrabold text-rose-600 font-editorial mt-1">
              {overview ? overview.revokedDevicesCount.toLocaleString('vi-VN') : '0'}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              {overview && overview.revokedDevicesCount > 0 ? 'Vượt ngưỡng 3 thiết bị / POL-04' : 'Không có thiết bị vi phạm'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">block</span>
          </div>
        </div>

        {/* Card 4: KMS Cluster */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">KMS Hardware Cluster</div>
            <div className="text-2xl font-extrabold text-purple-700 font-editorial mt-1">
              {overview ? overview.kmsHardwareClusters : 'Chưa cấu hình'}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              {overview && overview.kmsLatencyMs > 0 ? `Hardware Latency ${overview.kmsLatencyMs}ms` : 'Hạ tầng KMS ở chế độ chờ'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">dns</span>
          </div>
        </div>
      </div>

      {/* 3. LICENSES LIST TABLE */}
      <AdminTableContainer>
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <AdminFilterTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setCurrentPage(1);
            }}
          />

          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo ID giấy phép, tên sách, NXB..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-2 w-10 text-center">STT</th>
                <th className="py-3 px-3.5">Tác Phẩm &amp; Mã Giấy Phép</th>
                <th className="py-3 px-3.5">Thuật Toán &amp; Cụm KMS</th>
                <th className="py-3 px-3.5">Độc Giả (Đang Đọc / Tổng Cấp)</th>
                <th className="py-3 px-4 text-right">Trạng Thái &amp; Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl text-purple-400 animate-spin block mb-2">
                      progress_activity
                    </span>
                    Đang nạp dữ liệu chứng chỉ DRM từ máy chủ...
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                      enhanced_encryption
                    </span>
                    <div className="text-sm font-semibold text-gray-700">Chưa Có Giấy Phép DRM Nào Được Phát Hành</div>
                    <div className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      Hệ thống hiện tại chưa có ấn bản sách số nào được đóng gói hoặc cấp phát chứng chỉ DRM. Khi có tác phẩm số kích hoạt bản quyền, thông tin mã hóa sẽ hiển thị tại đây.
                    </div>
                  </td>
                </tr>
              ) : (
                licenses.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isExpanded = expandedDrmIds.has(item.id);
                  const isRotating = isRotatingId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`transition-colors group ${
                          isExpanded ? 'bg-purple-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                        } hover:bg-purple-50/40`}
                      >
                        {/* Chevron toggle */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandDrm(item.id)}
                            className="w-6 h-6 rounded-md hover:bg-purple-100 text-gray-500 hover:text-purple-800 flex items-center justify-center transition-all cursor-pointer"
                            title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                          >
                            <span
                              className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-purple-700' : ''
                              }`}
                            >
                              chevron_right
                            </span>
                          </button>
                        </td>

                        {/* STT */}
                        <td className="py-3 px-2 text-center text-[11px] font-mono text-gray-400">
                          {itemIndex}
                        </td>

                        {/* Tác Phẩm & Mã Giấy Phép */}
                        <td className="py-3 px-3.5">
                          <div
                            onClick={() => toggleExpandDrm(item.id)}
                            className="font-bold text-gray-900 text-xs hover:text-purple-800 transition-colors cursor-pointer truncate max-w-[280px]"
                          >
                            {item.bookTitle}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10.5px] font-bold text-purple-900">{item.id}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10.5px] text-gray-500 truncate max-w-[160px]">
                              {item.publisher}
                            </span>
                          </div>
                        </td>

                        {/* Thuật Toán & Cụm KMS */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-gray-800 text-xs">
                            {item.algorithm}
                          </div>
                          <div className="text-[10.5px] text-gray-500 mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] text-purple-600">cloud</span>
                            <span>{item.encryptionCluster}</span>
                          </div>
                        </td>

                        {/* Độc Giả */}
                        <td className="py-3 px-3.5">
                          <div className="text-xs font-bold text-gray-900">
                            {item.activeReaders.toLocaleString('vi-VN')}{' '}
                            <span className="font-normal text-[11px] text-gray-500">đang đọc</span>
                          </div>
                          <div className="text-[10.5px] text-gray-500 mt-0.5">
                            Tổng cấp: {item.issuedLicenses.toLocaleString('vi-VN')}
                          </div>
                        </td>

                        {/* Trạng Thái & Thao Tác */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <AdminStatusBadge
                              status={
                                item.securityStatus === 'secure'
                                  ? 'ACTIVE'
                                  : item.securityStatus === 'revoked'
                                  ? 'ERROR'
                                  : 'WARNING'
                              }
                              label={item.statusLabel}
                            />

                            {item.securityStatus === 'revoked' ? (
                              <button
                                onClick={() => handleRestoreLicense(item)}
                                disabled={isRestoringId === item.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                  isRestoringId === item.id
                                    ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                                }`}
                                title="Khôi phục giấy phép DRM"
                              >
                                {isRestoringId === item.id ? (
                                  <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                ) : (
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                )}
                                <span>{isRestoringId === item.id ? 'Đang mở...' : 'Khôi Phục'}</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRotateKey(item.id)}
                                  disabled={isRotating}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                    isRotating
                                      ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
                                  }`}
                                  title="Luân chuyển khóa mã hóa"
                                >
                                  {isRotating && (
                                    <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                  )}
                                  <span>{isRotating ? 'Đang đổi...' : 'Đổi Khóa'}</span>
                                </button>

                                <button
                                  onClick={() => handleRevokeLicense(item)}
                                  disabled={isRevokingId === item.id}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                    isRevokingId === item.id
                                      ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title="Thu hồi giấy phép / Khóa đọc lậu tức thì"
                                >
                                  {isRevokingId === item.id ? (
                                    <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[12px]">block</span>
                                  )}
                                  <span>{isRevokingId === item.id ? 'Đang khóa...' : 'Thu Hồi'}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Master-Detail Expandable Subcard */}
                      {isExpanded && (
                        <tr className="bg-purple-50/20 border-b border-purple-100">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-purple-200/70 shadow-xs">
                              {/* Cột 1: Cấu hình khóa */}
                              <div className="space-y-2 text-xs border-r border-gray-100 pr-3">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">key</span>
                                  <span>Cấu Hình Khóa &amp; Fingerprint</span>
                                </div>
                                <div className="space-y-1.5 pt-1 text-[11px]">
                                  <div>
                                    <span className="text-gray-400">Mã ISBN: </span>
                                    <span className="font-mono font-semibold">{item.isbn}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Vân tay SHA-256: </span>
                                    <span className="font-mono text-[10px] text-gray-700 block break-all bg-gray-50 p-1.5 rounded border border-gray-100 mt-0.5">
                                      {item.keyFingerprint}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Cụm KMS: </span>
                                    <span className="font-semibold">{item.encryptionCluster}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Cột 2: Watermark & Thu hồi */}
                              <div className="space-y-2 text-xs border-r border-gray-100 pr-3">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">water_drop</span>
                                  <span>Chống Sao Chép &amp; Watermark</span>
                                </div>
                                <div className="space-y-1.5 pt-1 text-[11px]">
                                  <div>
                                    <span className="text-gray-400">Watermark Engine: </span>
                                    <span className="font-semibold text-emerald-800">{item.watermarkEngine}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Thiết bị thu hồi: </span>
                                    <span className="font-semibold text-rose-700">{item.revokedDevices} thiết bị</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Trạng thái an ninh: </span>
                                    <span className="font-semibold">{item.statusLabel}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Cột 3: Hành động quản trị */}
                              <div className="space-y-2 text-xs flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">build</span>
                                    <span>Thao Tác Bảo Mật DRM &amp; Kill-Switch</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-1">
                                    {item.securityStatus === 'revoked'
                                      ? 'Giấy phép tác phẩm hiện đang bị đình chỉ do vi phạm bản quyền hoặc phát hiện đọc lậu (POL-04).'
                                      : 'Luân chuyển khóa AES-GCM-256 mới hoặc thu hồi giấy phép từ xa để ngắt kết nối thiết bị đọc lậu.'}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {item.securityStatus === 'revoked' ? (
                                    <button
                                      onClick={() => handleRestoreLicense(item)}
                                      disabled={isRestoringId === item.id}
                                      className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                                        isRestoringId === item.id
                                          ? 'bg-emerald-400 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-700'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                      <span>{isRestoringId === item.id ? 'Đang Khôi Phục...' : 'Khôi Phục Bản Quyền Tác Phẩm'}</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleRotateKey(item.id)}
                                        disabled={isRotating}
                                        className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                                          isRotating
                                            ? 'bg-purple-400 cursor-not-allowed'
                                            : 'bg-purple-700 hover:bg-purple-800'
                                        }`}
                                      >
                                        <span
                                          className={`material-symbols-outlined text-[14px] ${
                                            isRotating ? 'animate-spin' : ''
                                          }`}
                                        >
                                          sync
                                        </span>
                                        <span>{isRotating ? 'Đang Luân Chuyển Khóa...' : 'Luân Chuyển Khóa (Rotate)'}</span>
                                      </button>

                                      <button
                                        onClick={() => handleRevokeLicense(item)}
                                        disabled={isRevokingId === item.id}
                                        className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                                          isRevokingId === item.id
                                            ? 'bg-rose-400 cursor-not-allowed'
                                            : 'bg-rose-600 hover:bg-rose-700'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">devices_off</span>
                                        <span>{isRevokingId === item.id ? 'Đang Thu Hồi Khóa...' : 'Thu Hồi Bản Quyền (Kill-Switch Đọc Lậu)'}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="giấy phép DRM"
        />
      </AdminTableContainer>
    </div>
  );
}

export default AdminDrmVaultView;
