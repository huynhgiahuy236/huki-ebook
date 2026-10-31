"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CustomModal from '../common/CustomModal';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { useDebounce } from '../../utils/useDebounce';
import {
  AdminStatusBadge,
  AdminActionButton,
} from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import DataTableFilterBar, { DateFilterValue, matchesDateFilter, BulkActionGroup } from '../common/DataTableFilterBar';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ Xét Duyệt' },
  { key: 'APPROVED', label: 'Đang Hoạt Động' },
  { key: 'REJECTED', label: 'Đã Từ Chối' },
];

export function AdminStoresView() {
  const { showToast } = useToast();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);
  const [expandedStoreIds, setExpandedStoreIds] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    tier1: 'ALL',
    preset: 'ALL',
  });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Drawer / In-Page Form State
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [rejectModalStore, setRejectModalStore] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  const storeDetailRef = useSmartFormCollapse({
    isOpen: Boolean(selectedStore),
    onClose: () => setSelectedStore(null),
    isDirty: false,
  });

  const isRejectDirty = Boolean(rejectReason.trim());
  const rejectFormRef = useSmartFormCollapse({
    isOpen: Boolean(rejectModalStore),
    onClose: () => {
      setRejectModalStore(null);
      setRejectReason('');
      setRejectReasonError('');
    },
    isDirty: isRejectDirty,
  });

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStores({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setStores(res.data);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách cửa hàng:', err);
      showToast?.({
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể tải danh sách cửa hàng từ Gateway.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Bộ lọc danh sách (sử dụng debouncedSearch & dateFilter)
  const filteredStores = useMemo(() => {
    return stores.filter((st) => {
      if (activeTab !== 'ALL' && st.status !== activeTab) {
        return false;
      }
      if (!matchesDateFilter(st.createdAt, dateFilter)) {
        return false;
      }
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matchName = st.name?.toLowerCase().includes(q);
        const matchSlug = st.slug?.toLowerCase().includes(q);
        const matchEmail = st.email?.toLowerCase().includes(q);
        const matchPhone = st.phone?.toLowerCase().includes(q);
        const matchBiz = st.business?.name?.toLowerCase().includes(q) || st.businessId?.toLowerCase().includes(q);
        return matchName || matchSlug || matchEmail || matchPhone || matchBiz;
      }
      return true;
    });
  }, [stores, activeTab, debouncedSearch, dateFilter]);

  // Tabs formatted for AdminFilterTabs
  const tabs = useMemo(() => {
    return STATUS_TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      count: tab.key === 'ALL' ? stores.length : stores.filter((s) => s.status === tab.key).length,
    }));
  }, [stores]);

  const storeBulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        label: 'Phê Duyệt & Vận Hành',
        actions: [
          {
            value: 'APPROVE_STORES',
            label: 'Duyệt cửa hàng',
            icon: 'check_circle',
            color: 'success',
            confirmTitle: 'Phê duyệt các cửa hàng đã chọn?',
            confirmMessage: `Bạn có chắc muốn duyệt ${selectedRowKeys.length} cửa hàng đã chọn để mở bán trên sàn?`,
          },
          {
            value: 'SUSPEND_STORES',
            label: 'Tạm ngưng hoạt động',
            icon: 'pause_circle',
            color: 'warning',
            confirmTitle: 'Tạm ngưng các cửa hàng?',
            confirmMessage: `Bạn có chắc muốn tạm ngưng ${selectedRowKeys.length} cửa hàng đã chọn?`,
          },
          {
            value: 'REJECT_STORES',
            label: 'Từ chối đăng ký',
            icon: 'cancel',
            color: 'danger',
            confirmTitle: 'Từ chối đăng ký gian hàng?',
            confirmMessage: `Bạn có chắc muốn từ chối ${selectedRowKeys.length} yêu cầu đăng ký cửa hàng đã chọn?`,
          },
        ],
      },
    ],
    [selectedRowKeys.length]
  );

  const handleExecuteBulkAction = async (action: string) => {
    if (selectedRowKeys.length === 0) return;
    setBulkLoading(true);
    try {
      if (action === 'APPROVE_STORES') {
        let count = 0;
        for (const id of selectedRowKeys) {
          try {
            await adminApi.approveStore(id);
            count++;
          } catch {}
        }
        showToast?.({
          title: 'Phê duyệt hàng loạt thành công',
          message: `Đã duyệt thành công ${count}/${selectedRowKeys.length} gian hàng!`,
          type: 'success',
        });
        setSelectedRowKeys([]);
        fetchStores();
      } else if (action === 'REJECT_STORES') {
        let count = 0;
        for (const id of selectedRowKeys) {
          try {
            await adminApi.rejectStore(id, 'Từ chối hàng loạt bởi quản trị viên');
            count++;
          } catch {}
        }
        showToast?.({
          title: 'Đã từ chối hàng loạt',
          message: `Đã từ chối ${count}/${selectedRowKeys.length} gian hàng!`,
          type: 'info',
        });
        setSelectedRowKeys([]);
        fetchStores();
      } else {
        showToast?.({
          title: 'Thao tác hoàn tất',
          message: `Đã xử lý tác vụ cho ${selectedRowKeys.length} gian hàng đã chọn.`,
          type: 'info',
        });
        setSelectedRowKeys([]);
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi thực hiện tác vụ hàng loạt.',
        type: 'error',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Xử lý phê duyệt Store
  const handleApprove = async (store: any) => {
    if (!store || actionLoadingId) return;
    setActionLoadingId(store.id);
    try {
      const res = await adminApi.approveStore(store.id);
      if (res.success) {
        showToast?.({
          title: 'Phê duyệt Store thành công',
          message: `Cửa hàng "${store.name}" đã được mở bán trên sàn!`,
          type: 'success',
        });
        fetchStores();
        if (selectedStore?.id === store.id) {
          setSelectedStore({ ...selectedStore, status: 'APPROVED' });
        }
      } else {
        showToast?.({
          title: 'Phê duyệt thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Vui lòng thử lại sau!',
          type: 'error',
        });
      }
    } catch (err) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: (err as any)?.message || 'Có lỗi khi phê duyệt cửa hàng.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý từ chối Store
  const handleConfirmReject = async () => {
    if (!rejectModalStore || actionLoadingId) return;
    if (!rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập lý do từ chối phê duyệt cửa hàng.');
      return;
    }
    const finalReason = rejectReason.trim();
    setActionLoadingId(rejectModalStore.id);
    try {
      const res = await adminApi.rejectStore(rejectModalStore.id, finalReason);
      if (res.success) {
        showToast?.({
          title: 'Đã từ chối Store',
          message: `Đã từ chối cửa hàng "${rejectModalStore.name}".`,
          type: 'info',
        });
        setRejectModalStore(null);
        setRejectReason('');
        setRejectReasonError('');
        fetchStores();
        if (selectedStore?.id === rejectModalStore.id) {
          setSelectedStore({ ...selectedStore, status: 'REJECTED' });
        }
      } else {
        showToast?.({
          title: 'Từ chối thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Không thể từ chối cửa hàng lúc này.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: (err as any)?.message || 'Có lỗi xảy ra khi từ chối cửa hàng.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Định nghĩa 5 cột chuẩn GroupedDataTable
  const storeColumns: Column<any>[] = useMemo(
    () => [
      {
        key: 'storeName',
        title: 'Cửa hàng & Slug',
        sortable: true,
        render: (_val, st) => (
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[11px] shrink-0 select-none">
              {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-bold text-gray-900 hover:text-[#00875A] cursor-pointer text-xs truncate max-w-[220px] leading-tight"
                  onClick={() => setSelectedStore(st)}
                  title={st.name}
                >
                  {st.name}
                </span>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60 shrink-0">
                  /{st.slug || 'chua-co-slug'}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'business',
        title: 'Doanh nghiệp chủ quản',
        render: (_val, st) => (
          <div className="flex items-center gap-1.5 py-0.5 text-xs">
            <span className="material-symbols-outlined text-[13px] text-emerald-600 shrink-0">apartment</span>
            <span className="font-semibold text-emerald-950 truncate max-w-[190px]" title={st.business?.name || st.businessName || 'Doanh nghiệp liên kết'}>
              {st.business?.name || st.businessName || 'Doanh nghiệp liên kết'}
            </span>
            {st.business?.taxCode && (
              <span className="text-[9.5px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 shrink-0">
                MST: {st.business.taxCode}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'contact',
        title: 'Liên hệ',
        render: (_val, st) => (
          <div className="flex items-center gap-2 py-0.5 text-xs">
            <span className="font-medium text-gray-800 truncate max-w-[140px]" title={st.email || ''}>
              {st.email || <span className="text-gray-400 italic">Chưa có email</span>}
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-mono text-[10.5px] text-gray-500 shrink-0">
              {st.phone || 'Chưa có SĐT'}
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-mono text-[10.5px] text-gray-400 shrink-0">
              {st.createdAt ? new Date(st.createdAt).toLocaleDateString('vi-VN') : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái',
        align: 'center',
        width: 150,
        render: (_val, st) => {
          if (st.status === 'PENDING_APPROVAL') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_top</span>
                <span>Chờ duyệt pháp lý</span>
              </span>
            );
          }
          return <AdminStatusBadge status={st.status} />;
        },
      },
      {
        key: 'actions',
        title: 'Thao tác',
        width: 170,
        align: 'right',
        render: (_val, st) => {
          const isPending = st.status === 'PENDING_APPROVAL';
          return (
            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStore(st)}
                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Xem chi tiết cửa hàng"
              >
                <span className="material-symbols-outlined text-[13px]">visibility</span>
                <span>Hồ sơ</span>
              </button>
              {isPending && (
                <Link
                  href="/admin/businesses"
                  className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 transition-colors"
                  title="Doanh nghiệp chủ quản chưa được duyệt pháp lý. Bấm để sang thẩm định."
                >
                  <span className="material-symbols-outlined text-[13px] text-amber-700">verified</span>
                  <span>Duyệt Pháp Lý ↗</span>
                </Link>
              )}
            </div>
          );
        },
      },
    ],
    [actionLoadingId]
  );

  return (
    <div className="flex flex-col gap-3.5 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 font-sans">
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Danh Sách Gian Hàng Đang Bán
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Theo dõi tình trạng hoạt động, số đầu sách, link shop và quản lý mở/đóng bán gian hàng mặt tiền</p>
        </div>

        <button
          onClick={fetchStores}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* 2. CONTROLS TOOLBAR WITH 2-TIER DATE FILTER & INLINE BULK ACTIONS */}
      <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
        <DataTableFilterBar
          searchPlaceholder="Tìm theo tên Store, slug, email, SĐT, DN..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filterTabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          enableDateFilter={true}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          selectedCount={selectedRowKeys.length}
          bulkActionGroups={storeBulkActionGroups}
          onBulkAction={handleExecuteBulkAction}
          isBulkLoading={bulkLoading}
        />
      </div>

      {/* 3. GROUPED DATA TABLE WITH 3-CARD MASTER-DETAIL */}
      <GroupedDataTable
        columns={storeColumns}
        data={filteredStores}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={(keys) => setSelectedRowKeys(keys as string[])}
        expandable={true}
        expandedRowKeys={expandedStoreIds}
        onExpandedRowsChange={(keys) => setExpandedStoreIds(keys as string[])}
        onRowClick={(st) => {
          setExpandedStoreIds((prev) =>
            prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id]
          );
        }}
        expandedRowRender={(st: any) => {
          const isPending = st.status === 'PENDING_APPROVAL';
          const isBusy = actionLoadingId === st.id;

          return (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Card 1: Thông Tin Cửa Hàng & Định Danh */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#00875A]">storefront</span>
                    <span>Thông Tin Cửa Hàng &amp; Định Danh</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Tên Cửa Hàng:</span>
                      <span className="font-bold text-gray-900 text-right break-words">{st.name}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Đường Dẫn (Slug):</span>
                      <span className="font-mono font-bold text-indigo-700 text-right break-words">/{st.slug || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Mã Cửa Hàng (ID):</span>
                      <span className="font-mono text-gray-700 break-words">{st.id}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Ngày Đăng Ký:</span>
                      <span className="font-mono text-gray-700">{st.createdAt ? new Date(st.createdAt).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Doanh Nghiệp Chủ Quản & Pháp Lý */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-blue-600">apartment</span>
                    <span>Doanh Nghiệp Chủ Quản</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Tên Doanh Nghiệp:</span>
                      <span className="font-bold text-gray-900 text-right break-words">{st.business?.name || st.businessName || 'Doanh nghiệp liên kết'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Mã Doanh Nghiệp (ID):</span>
                      <span className="font-mono text-gray-700 break-words">{st.businessId || st.business?.id || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Mã Số Thuế DN:</span>
                      <span className="font-mono font-bold text-emerald-800">{st.business?.taxCode || 'Chưa cung cấp'}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-100 flex flex-col">
                      <span className="text-gray-500 text-[10.5px]">Mô tả gian hàng:</span>
                      <span className="text-gray-700 text-[11px] leading-snug mt-0.5 break-words">{st.description || 'Chưa có thông tin mô tả chi tiết cho cửa hàng này.'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Liên Hệ & Thao Tác Nhanh */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-purple-600">contacts</span>
                    <span>Liên Hệ &amp; Vận Hành</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Email Cửa Hàng:</span>
                      <span className="font-medium text-gray-900 text-right break-words">{st.email || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Số Điện Thoại:</span>
                      <span className="font-mono font-semibold text-gray-800">{st.phone || '—'}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-100 flex flex-col">
                      <span className="text-gray-500 text-[10.5px]">Địa chỉ kho / xuất hàng:</span>
                      <span className="font-medium text-gray-800 text-[11px] break-words leading-snug mt-0.5">{st.address || 'Chưa cập nhật địa chỉ kho.'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200/60 bg-gray-50/50 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStore(st)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                    <span>Xem Hồ Sơ Chi Tiết</span>
                  </button>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-700 italic">
                      Doanh nghiệp chủ quản chưa hoàn tất thẩm định pháp lý (MST, GPKD).
                    </span>
                    <Link
                      href="/admin/businesses"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">gavel</span>
                      <span>Sang Thẩm Định Doanh Nghiệp ↗</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        }}
        emptyTitle="Không tìm thấy cửa hàng nào"
        emptyMessage={
          searchQuery
            ? `Không có kết quả khớp với từ khóa "${searchQuery}"`
            : activeTab !== 'ALL'
            ? 'Không có cửa hàng nào trong trạng thái đã chọn.'
            : 'Hiện chưa có cửa hàng nào được đăng ký trên hệ thống.'
        }
        emptyIcon="store_mall_directory"
        pagination={true}
        className="w-full"
      />

      {/* 4. DETAIL MODAL (CLEAN & CONNECTED TO BUSINESS) */}
      <CustomModal
        isOpen={Boolean(selectedStore)}
        onClose={() => setSelectedStore(null)}
        size="lg"
        title={
          selectedStore && (
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[18px]">storefront</span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">Hồ Sơ Cửa Hàng: {selectedStore.name}</span>
                  <AdminStatusBadge status={selectedStore.status} />
                </div>
                <p className="text-[11px] text-gray-400 font-mono font-normal">Mã Store: {selectedStore.id}</p>
              </div>
            </div>
          )
        }
      >
        {selectedStore && (
          <div className="space-y-4 p-5 text-xs">
            {/* Card info */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900">{selectedStore.name}</span>
                <span className="text-[11px] font-mono text-gray-500">
                  Tạo ngày: {selectedStore.createdAt ? new Date(selectedStore.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed break-words text-[11.5px]">
                {selectedStore.description || 'Gian hàng chính hãng phân phối sách trên nền tảng HuKi.'}
              </p>
            </div>

            {/* Doanh nghiệp chủ quản (KYB connection) */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">apartment</span>
                  <span>DOANH NGHIỆP CHỦ QUẢN (PHÁP NHÂN)</span>
                </div>
                {selectedStore.business?.taxCode && (
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    MST: {selectedStore.business.taxCode}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                <div>
                  <p className="font-bold text-emerald-900 text-xs">
                    {selectedStore.business?.name || selectedStore.businessName || 'Doanh Nghiệp Đối Tác Liên Kết'}
                  </p>
                  <p className="text-[10.5px] font-mono text-emerald-700 mt-0.5">
                    Mã DN: {selectedStore.businessId || 'N/A'}
                  </p>
                </div>
                <Link
                  href="/admin/businesses"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-[#003B2B] border border-emerald-300 font-bold text-xs transition-colors shadow-2xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px] text-emerald-700">verified</span>
                  <span>Xem Hồ Sơ Pháp Lý &amp; MST DN ↗</span>
                </Link>
              </div>
            </div>

            {/* Grid info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ĐƯỜNG DẪN (SLUG)</span>
                  <span className="font-mono font-bold text-indigo-700 break-words text-xs">/{selectedStore.slug}</span>
                </div>
                {selectedStore.slug && (
                  <a
                    href={`/stores/${selectedStore.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    <span>Xem Shop</span>
                  </a>
                )}
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SỐ ĐIỆN THOẠI</span>
                <span className="font-mono font-semibold text-gray-900">{selectedStore.phone || 'Chưa cung cấp'}</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-0.5 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMAIL CỬA HÀNG</span>
                <span className="font-medium text-gray-900 break-words">{selectedStore.email || 'Chưa cung cấp'}</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-0.5 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐỊA CHỈ KHO / CỬA HÀNG</span>
                <span className="text-gray-700 leading-relaxed break-words">{selectedStore.address || 'Chưa cập nhật địa chỉ kho.'}</span>
              </div>
            </div>

            {/* Footer inside modal */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {selectedStore.status === 'PENDING_APPROVAL' && (
                <Link
                  href="/admin/businesses"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  <span>Sang Thẩm Định Doanh Nghiệp ↗</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </CustomModal>

      {/* 5. REJECT STORE IN-PAGE FORM */}
      {rejectModalStore && (
        <div
          ref={rejectFormRef}
          className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-300 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-rose-100 pb-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Phê Duyệt Cửa Hàng</h3>
                <p className="text-xs text-slate-500">Cửa hàng: <strong>{rejectModalStore.name}</strong> (Slug: {rejectModalStore.slug || rejectModalStore.id})</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRejectModalStore(null);
                setRejectReason('');
                setRejectReasonError('');
              }}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do từ chối phê duyệt <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do từ chối để thông báo cho đối tác bổ sung/chỉnh sửa lại..."
                value={rejectReason}
                onChange={(e: any) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError('');
                }}
                className={`w-full p-3.5 rounded-xl bg-slate-50 border text-sm text-slate-800 focus:outline-none transition-all resize-none ${
                  rejectReasonError
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                }`}
              />
              {rejectReasonError && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{rejectReasonError}</span>
                </p>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium mb-1.5 block">Chọn mẫu lý do nhanh:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Tên cửa hàng vi phạm nhãn hiệu hoặc bản quyền đã được bảo hộ',
                  'Thông tin địa chỉ kho xuất hàng không hợp lệ hoặc thiếu chi tiết',
                  'Trùng lặp đường dẫn định danh cửa hàng (slug) đã tồn tại',
                  'Hồ sơ doanh nghiệp chủ quản chưa hoàn tất xác thực pháp lý',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRejectReason(preset);
                      if (rejectReasonError) setRejectReasonError('');
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent text-slate-700 font-medium transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalStore(null);
                  setRejectReason('');
                  setRejectReasonError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalStore.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">cancel</span>
                <span>{actionLoadingId === rejectModalStore.id ? 'Đang xử lý...' : 'Xác Nhận Từ Chối Cửa Hàng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStoresView;
