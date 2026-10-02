"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { useDebounce } from '../../utils/useDebounce';
import {
  AdminStatusBadge,
  AdminFilterTabs,
  AdminActionButton,
} from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';

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

  // Bộ lọc danh sách (sử dụng debouncedSearch)
  const filteredStores = useMemo(() => {
    return stores.filter((st) => {
      if (activeTab !== 'ALL' && st.status !== activeTab) {
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
  }, [stores, activeTab, debouncedSearch]);

  // Tabs formatted for AdminFilterTabs
  const tabs = useMemo(() => {
    return STATUS_TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      count: tab.key === 'ALL' ? stores.length : stores.filter((s) => s.status === tab.key).length,
    }));
  }, [stores]);

  // Bulk Approve Stores
  const handleBulkApproveStores = async () => {
    if (selectedRowKeys.length === 0) return;
    const pendingStores = stores.filter((s) => selectedRowKeys.includes(s.id) && s.status === 'PENDING_APPROVAL');
    if (pendingStores.length === 0) {
      showToast?.({
        title: 'Không có gian hàng hợp lệ',
        message: 'Các gian hàng được chọn không ở trạng thái Chờ xét duyệt.',
        type: 'info',
      });
      return;
    }
    try {
      await Promise.all(pendingStores.map((s) => adminApi.approveStore(s.id)));
      showToast?.({
        title: 'Phê duyệt hàng loạt thành công',
        message: `Đã duyệt thành công ${pendingStores.length} gian hàng!`,
        type: 'success',
      });
      setSelectedRowKeys([]);
      fetchStores();
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi duyệt hàng loạt gian hàng.',
        type: 'error',
      });
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
        title: 'Cửa Hàng & Đường Dẫn (Slug)',
        sortable: true,
        render: (_val, st) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-800 font-extrabold text-xs shrink-0">
              {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words"
                onClick={() => setSelectedStore(st)}
                title={st.name}
              >
                {st.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10.5px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                  /{st.slug || 'chua-co-slug'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  ID: {st.id}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'business',
        title: 'Doanh Nghiệp Sở Hữu',
        render: (_val, st) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1 break-words">
              <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">apartment</span>
              <span>{st.business?.name || st.businessName || 'Doanh nghiệp liên kết'}</span>
            </span>
            <span className="font-mono text-[10.5px] text-gray-400">
              ID DN: {st.businessId || st.business?.id || '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'contact',
        title: 'Liên Hệ & Ngày Tạo',
        render: (_val, st) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-xs font-medium text-gray-800 break-words" title={st.email || ''}>
              {st.email || <span className="text-gray-400 italic">Chưa có email</span>}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
              <span className="font-mono flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px] text-gray-400">call</span>
                <span>{st.phone || 'Chưa có SĐT'}</span>
              </span>
              <span>•</span>
              <span className="font-mono text-[10.5px] text-gray-400">
                {st.createdAt ? new Date(st.createdAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        render: (_val, st) => <AdminStatusBadge status={st.status} />,
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        align: 'right',
        render: (_val, st) => {
          const isPending = st.status === 'PENDING_APPROVAL';
          const isBusy = actionLoadingId === st.id;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <AdminActionButton
                variant="view"
                icon="visibility"
                label="Hồ sơ"
                size="sm"
                onClick={() => setSelectedStore(st)}
                title="Xem chi tiết cửa hàng"
              />
              {isPending && (
                <>
                  <AdminActionButton
                    variant="success"
                    icon="check"
                    label="Duyệt"
                    size="sm"
                    onClick={() => handleApprove(st)}
                    disabled={isBusy}
                    title="Phê duyệt Store"
                  />
                  <AdminActionButton
                    variant="danger"
                    icon="close"
                    label="Từ Chối"
                    size="sm"
                    onClick={() => {
                      setRejectModalStore(st);
                      setRejectReason('');
                    }}
                    disabled={isBusy}
                    title="Từ chối Store"
                  />
                </>
              )}
            </div>
          );
        },
      },
    ],
    [actionLoadingId]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 font-sans">
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Lý &amp; Xét Duyệt Cửa Hàng
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Danh sách toàn bộ các gian hàng phân phối trực thuộc doanh nghiệp và NXB</p>
        </div>

        <button
          onClick={fetchStores}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* 2. CONTROLS TOOLBAR */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <AdminFilterTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => {
            setActiveTab(key);
          }}
        />

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên Store, slug, email, SĐT, DN..."
            value={searchQuery}
            onChange={(e: any) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
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
        bulkActionRender={(keys) => {
          const selectedItems = stores.filter((s) => keys.includes(s.id));
          const pendingCount = selectedItems.filter((s) => s.status === 'PENDING_APPROVAL').length;

          return (
            <div className="flex items-center gap-2 flex-wrap">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleBulkApproveStores}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Duyệt {pendingCount} Cửa Hàng</span>
                </button>
              )}
            </div>
          );
        }}
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
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalStore(st);
                        setRejectReason('');
                      }}
                      disabled={isBusy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                      <span>Từ Chối</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(st)}
                      disabled={isBusy}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      <span>Phê Duyệt Store</span>
                    </button>
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

      {/* 4. DETAIL IN-PAGE COLLAPSIBLE PANEL */}
      {selectedStore && (
        <div ref={storeDetailRef} className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-indigo-500/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Chi Tiết Cửa Hàng: {selectedStore.name}
                </h2>
                <p className="text-xs text-gray-500 font-mono">Mã cửa hàng: {selectedStore.id}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedStore(null)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              ✕ Đóng bảng
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 text-xs">
            {/* Card info */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">{selectedStore.name}</span>
                <AdminStatusBadge status={selectedStore.status} />
              </div>
              <p className="text-gray-600 leading-relaxed break-words">
                {selectedStore.description || 'Chưa có thông tin mô tả chi tiết cho cửa hàng này.'}
              </p>
            </div>

            {/* Grid info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐƯỜNG DẪN (SLUG)</span>
                <span className="font-mono font-bold text-gray-900 break-words">/{selectedStore.slug}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SỐ ĐIỆN THOẠI</span>
                <span className="font-semibold text-gray-900">{selectedStore.phone || 'N/A'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMAIL CỬA HÀNG</span>
                <span className="font-semibold text-gray-900 break-words">{selectedStore.email || 'N/A'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐỊA CHỈ KHO / CỬA HÀNG</span>
                <span className="text-gray-700 leading-relaxed break-words">{selectedStore.address || 'Chưa cập nhật địa chỉ kho.'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DOANH NGHIỆP CHỦ QUẢN</span>
                <span className="font-mono text-gray-700 break-words">{selectedStore.businessId || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              onClick={() => setSelectedStore(null)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              Đóng
            </button>

            {selectedStore.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={() => {
                    setRejectModalStore(selectedStore);
                    setRejectReason('');
                    setRejectReasonError('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                >
                  Từ chối
                </button>
                <button
                  onClick={() => handleApprove(selectedStore)}
                  disabled={actionLoadingId === selectedStore.id}
                  className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-all shadow-xs"
                >
                  Phê duyệt ngay
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
