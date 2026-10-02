"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { taxRegistryService } from '../../services/taxRegistryService';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer, AdminActionButton } from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import AuditHistoryTimeline, { AuditLogItem } from '../common/AuditHistoryTimeline';
import { useDebounce } from '../../utils/useDebounce';
import { featureFlagsService, SellerFeature } from '../../services/featureFlagsService';
import CustomModal from '../common/CustomModal';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ Xét Duyệt' },
  { key: 'APPROVED', label: 'Đã Phê Duyệt' },
  { key: 'SUSPENDED', label: 'Tạm Ngưng / Khóa' },
  { key: 'REJECTED', label: 'Đã Từ Chối' },
];

const STATUS_CONFIG = {
  PENDING_APPROVAL: {
    label: 'Chờ xét duyệt',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'hourglass_top',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'check_circle',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: 'cancel',
  },
  SUSPENDED: {
    label: 'Tạm ngưng',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'block',
  },
};

/**
 * Tạo profile 33 trường đầy đủ từ thông tin doanh nghiệp cơ bản (hoặc lấy từ Local Storage nếu đã lưu)
 */
function buildFullEnterpriseProfile(biz: any) {
  if (!biz) return null;

  // Kiểm tra nếu có dữ liệu lưu trữ chi tiết lúc đăng ký
  const storageKey = `huki_enterprise_profile_${biz.taxCode || biz.id}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }

  // Profile mẫu chuẩn tương ứng theo MST hoặc tên
  const tax = biz.taxCode || '0318926410';
  const name = biz.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT';

  // Fallback demo docs
  const sampleDocGPKD = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80';
  const sampleDocCCCDFront = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80';
  const sampleDocCCCDBack = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80';
  const sampleDocPublishing = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80';

  return {
    id: biz.id,
    status: biz.status,
    createdAt: biz.createdAt,

    // FORM 1: DOANH NGHIỆP & PHÁP LÝ (12 trường)
    tax_code: tax,
    company_name: name,
    international_name: biz.internationalName || (name.includes('KIM ĐỒNG') ? 'KIM DONG PUBLISHING HOUSE' : 'VIET INTELLECT DIGITAL CONTENT AND BOOK PUBLISHING CO., LTD'),
    short_name: biz.shortName || (name.includes('KIM ĐỒNG') ? 'NXB KIM ĐỒNG' : name.includes('NHÃ NAM') ? 'NHÃ NAM BOOKS' : 'TRÍ TUỆ VIỆT BOOKS'),
    business_license_number: tax,
    issue_date: '2021-04-15',
    issue_place: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
    business_type: name.includes('CỔ PHẦN') ? 'CORPORATION' : 'LLC',
    registered_address: biz.address || 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    email: biz.email || 'contact@trituevietbooks.vn',
    phone: biz.phone || '0908123456',
    website: 'https://trituevietbooks.vn',

    // FORM 2: NGƯỜI ĐẠI DIỆN PHÁP LUẬT (8 trường)
    rep_full_name: name.includes('KIM ĐỒNG') ? 'Bùi Tuấn Nghĩa' : 'Huỳnh Gia Huy',
    rep_position: 'Giám đốc Điều hành',
    rep_id_card_number: '079098012345',
    rep_id_card_issue_date: '2022-08-10',
    rep_id_card_issue_place: 'Cục Cảnh sát QLHC về TTXH',
    rep_phone: '0908123456',
    rep_email: 'rep.huy@trituevietbooks.vn',
    rep_permanent_address: 'Số 123 Đường Sách, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',

    // FORM 3: TÀI KHOẢN NGÂN HÀNG (4 trường)
    bank_name: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
    bank_branch: 'Chi nhánh Sài Gòn - PGD Bến Nghé',
    bank_account_number: '0071001234567',
    bank_account_holder_name: name.toUpperCase(),

    // FORM 4: HỒ SƠ NĂNG LỰC & XUẤT BẢN (5 trường)
    partner_type: name.includes('KIM ĐỒNG') ? 'PUBLISHER' : 'DISTRIBUTOR',
    publishing_license_number: 'GP-XB/2021-8899/CXB',
    license_issue_date: '2021-05-20',
    estimated_book_count: 250,
    main_genres: ['Kinh Tế - Khởi Nghiệp', 'Văn Học - Tiểu Thuyết', 'Công Nghệ Thông Tin', 'Kỹ Năng Sống'],

    // FORM 5: TÀI LIỆU MINH CHỨNG & CAM KẾT (4 tài liệu)
    document_business_license: sampleDocGPKD,
    document_id_front: sampleDocCCCDFront,
    document_id_back: sampleDocCCCDBack,
    document_publishing_permit: sampleDocPublishing,
    terms_accepted: true,
    copyright_commitment: true,
  };
}

export function AdminBusinessesView() {
  const { showToast } = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);

  // Selection & Bulk Actions State
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [allFeatures, setAllFeatures] = useState<SellerFeature[]>([]);

  // Feature Flag Modal for single business
  const [featureModalBiz, setFeatureModalBiz] = useState<any>(null);

  // Bulk Feature Flag Modal
  const [bulkFeatureModalOpen, setBulkFeatureModalOpen] = useState(false);
  const [bulkFeatureIds, setBulkFeatureIds] = useState<string[]>([]);
  const [bulkFeatureAction, setBulkFeatureAction] = useState<'BLOCK' | 'UNBLOCK'>('BLOCK');

  // Suspend Modal
  const [suspendModalBiz, setSuspendModalBiz] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Full Page Detail State
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'stores' | 'governance_audit'>('profile');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [bizAuditLogs, setBizAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Modal / Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState<any>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState('');
  const [rejectModalBiz, setRejectModalBiz] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  useEffect(() => {
    if (selectedBiz?.id && detailTab === 'governance_audit') {
      setLoadingAudit(true);
      adminApi.getBusinessAuditLogs(selectedBiz.id)
        .then((res) => {
          if (res.success && res.data?.items) {
            setBizAuditLogs(res.data.items);
          } else {
            setBizAuditLogs([]);
          }
        })
        .catch(() => setBizAuditLogs([]))
        .finally(() => setLoadingAudit(false));
    }
  }, [selectedBiz?.id, detailTab]);

  const isRejectDirty = Boolean(rejectReason.trim());
  const rejectFormRef = useSmartFormCollapse({
    isOpen: Boolean(rejectModalBiz),
    onClose: () => {
      setRejectModalBiz(null);
      setRejectReason('');
      setRejectReasonError('');
    },
    isDirty: isRejectDirty,
  });

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinesses({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setBusinesses(res.data);
      } else {
        setBusinesses([]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách doanh nghiệp:', err);
      showToast?.({
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể kết nối đến máy chủ quản trị. Vui lòng thử lại!',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Khi chọn xem chi tiết một doanh nghiệp, tự động chạy bộ máy đối chiếu CSDL 33 trường
  useEffect(() => {
    if (!selectedBiz) {
      setAuditResult(null);
      return;
    }

    const runAudit = async () => {
      setIsAuditing(true);
      const fullProfile = buildFullEnterpriseProfile(selectedBiz);
      const res = await taxRegistryService.evaluateEnterpriseProfile(fullProfile);
      setAuditResult(res);
      setIsAuditing(false);
    };

    runAudit();
  }, [selectedBiz]);

  // Bộ lọc danh sách (sử dụng debouncedSearch)
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz: any) => {
      if (activeTab !== 'ALL' && biz.status !== activeTab) {
        return false;
      }
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matchName = biz.name?.toLowerCase().includes(q);
        const matchTax = biz.taxCode?.toLowerCase().includes(q);
        const matchEmail = biz.email?.toLowerCase().includes(q);
        const matchPhone = biz.phone?.toLowerCase().includes(q);
        return matchName || matchTax || matchEmail || matchPhone;
      }
      return true;
    });
  }, [businesses, activeTab, debouncedSearch]);

  // Load features list
  useEffect(() => {
    setAllFeatures(featureFlagsService.getAllFeatures());
    const handleFeaturesUpdate = () => {
      setAllFeatures(featureFlagsService.getAllFeatures());
    };
    window.addEventListener('huki_feature_flags_updated', handleFeaturesUpdate);
    return () => window.removeEventListener('huki_feature_flags_updated', handleFeaturesUpdate);
  }, []);

  // Đếm số lượng theo tab
  const counts = useMemo(() => {
    return {
      ALL: businesses.length,
      PENDING_APPROVAL: businesses.filter((b) => b.status === 'PENDING_APPROVAL').length,
      APPROVED: businesses.filter((b) => b.status === 'APPROVED').length,
      SUSPENDED: businesses.filter((b) => b.status === 'SUSPENDED').length,
      REJECTED: businesses.filter((b) => b.status === 'REJECTED').length,
    };
  }, [businesses]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredBusinesses.length / pageSize) || 1;
  const paginatedBusinesses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBusinesses.slice(start, start + pageSize);
  }, [filteredBusinesses, currentPage]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  const businessColumns: Column<any>[] = useMemo(
    () => [
      {
        key: 'stt',
        title: 'STT',
        width: 50,
        align: 'center',
        render: (_val, _row, idx) => (
          <span className="font-mono text-theme-text-muted text-[11px] font-semibold">
            {(currentPage - 1) * pageSize + idx + 1}
          </span>
        ),
      },
      {
        key: 'name',
        title: 'Doanh Nghiệp & Pháp Lý',
        sortable: true,
        render: (_val, biz) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-bold text-xs shrink-0">
              {biz.name ? biz.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="font-bold text-gray-900 block hover:text-[#00875A] cursor-pointer text-xs break-words"
                onClick={() => {
                  setSelectedBiz(biz);
                  setDetailTab('profile');
                }}
                title={biz.name}
              >
                {biz.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10.5px] font-mono font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                  MST: {biz.taxCode || 'Chưa cấp'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  ID: {biz.id}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        title: 'Đại Diện & Liên Hệ',
        render: (_val, biz) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-xs font-medium text-gray-800 break-words" title={biz.email || ''}>
              {biz.email || <span className="text-gray-400 italic">Chưa có email</span>}
            </span>
            <span className="font-mono text-[11px] text-gray-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-gray-400">call</span>
              <span>{biz.phone || 'Chưa cập nhật SĐT'}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'partnerType',
        title: 'Loại Hình & Ngày Nộp',
        render: (_val, biz) => {
          const isPublisher = biz.name?.toUpperCase().includes('NXB') || biz.name?.toUpperCase().includes('XUẤT BẢN');
          return (
            <div className="flex flex-col gap-1 py-1">
              <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border w-fit ${
                isPublisher ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isPublisher ? '🏛️ Nhà Xuất Bản' : '🏢 Nhà Phát Hành / DN'}
              </span>
              <span className="text-gray-400 font-mono text-[10.5px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                <span>{biz.createdAt ? new Date(biz.createdAt).toLocaleDateString('vi-VN') : '14/09/2026'}</span>
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 140,
        align: 'center',
        render: (val) => {
          let statusVariant: any = 'neutral';
          let statusLabel = 'Không xác định';
          if (val === 'APPROVED') {
            statusVariant = 'success';
            statusLabel = 'Đã phê duyệt';
          } else if (val === 'PENDING_APPROVAL') {
            statusVariant = 'warning';
            statusLabel = 'Chờ xét duyệt';
          } else if (val === 'REJECTED') {
            statusVariant = 'danger';
            statusLabel = 'Đã từ chối';
          } else if (val === 'SUSPENDED') {
            statusVariant = 'neutral';
            statusLabel = 'Tạm ngưng';
          }
          return <AdminStatusBadge variant={statusVariant} label={statusLabel} />;
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 260,
        align: 'right',
        render: (_val, biz) => {
          const isPending = biz.status === 'PENDING_APPROVAL';
          const isSuspended = biz.status === 'SUSPENDED';
          const isApproved = biz.status === 'APPROVED';
          const isBusy = actionLoadingId === biz.id;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <AdminActionButton
                variant="view"
                icon="visibility"
                label="Hồ sơ"
                size="sm"
                onClick={() => {
                  setSelectedBiz(biz);
                  setDetailTab('profile');
                }}
                title="Xem chi tiết toàn trang"
              />

              {/* Quản lý tính năng Seller */}
              <button
                type="button"
                onClick={() => setFeatureModalBiz(biz)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Quản lý tính năng Seller của DN này"
              >
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>Tính Năng</span>
              </button>

              {isPending && (
                <>
                  <AdminActionButton
                    variant="success"
                    icon="check"
                    label="Duyệt"
                    size="sm"
                    onClick={() => handleApprove(biz)}
                    disabled={isBusy}
                    title="Phê duyệt doanh nghiệp"
                  />
                  <AdminActionButton
                    variant="danger"
                    icon="close"
                    label="Từ Chối"
                    size="sm"
                    onClick={() => {
                      setRejectModalBiz(biz);
                      setRejectReason('');
                    }}
                    disabled={isBusy}
                    title="Từ chối hồ sơ"
                  />
                </>
              )}

              {isApproved && (
                <button
                  type="button"
                  onClick={() => {
                    setSuspendModalBiz(biz);
                    setSuspendReason('');
                  }}
                  disabled={isBusy}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Khóa / Tạm ngưng hoạt động doanh nghiệp"
                >
                  <span className="material-symbols-outlined text-[14px]">block</span>
                  <span>Khóa</span>
                </button>
              )}

              {isSuspended && (
                <button
                  type="button"
                  onClick={() => handleReactivate(biz)}
                  disabled={isBusy}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Kích hoạt mở lại hoạt động doanh nghiệp"
                >
                  <span className="material-symbols-outlined text-[14px]">lock_open</span>
                  <span>Mở Khóa</span>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [currentPage, pageSize, actionLoadingId]
  );

  // Xử lý phê duyệt
  const handleApprove = async (biz: any) => {
    if (!biz || actionLoadingId) return;
    setActionLoadingId(biz.id);
    try {
      const res = await adminApi.approveBusiness(biz.id);
      if (res.success) {
        showToast?.({
          title: 'Phê duyệt thành công',
          message: `Doanh nghiệp "${biz.name}" đã được cấp quyền hoạt động trên sàn!`,
          type: 'success',
        });
        fetchBusinesses();
        if (selectedBiz?.id === biz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'APPROVED' });
        }
      } else {
        showToast?.({
          title: 'Phê duyệt thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Vui lòng kiểm tra lại trạng thái hồ sơ!',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: (err as any)?.message || 'Không thể thực hiện phê duyệt lúc này.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý từ chối
  const handleConfirmReject = async () => {
    if (!rejectModalBiz || actionLoadingId) return;
    if (!rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập lý do từ chối hồ sơ doanh nghiệp.');
      return;
    }
    const finalReason = rejectReason.trim();
    setActionLoadingId(rejectModalBiz.id);
    try {
      const res = await adminApi.rejectBusiness(rejectModalBiz.id, finalReason);
      if (res.success) {
        showToast?.({
          title: 'Đã từ chối hồ sơ',
          message: `Đã từ chối doanh nghiệp "${rejectModalBiz.name}" kèm lý do.`,
          type: 'info',
        });
        setRejectModalBiz(null);
        setRejectReason('');
        setRejectReasonError('');
        fetchBusinesses();
        if (selectedBiz?.id === rejectModalBiz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'REJECTED' });
        }
      } else {
        showToast?.({
          title: 'Thao tác thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Không thể từ chối hồ sơ này.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: (err as any)?.message || 'Có lỗi xảy ra khi từ chối hồ sơ.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý tạm ngưng / khóa doanh nghiệp
  const handleConfirmSuspend = async () => {
    if (!suspendModalBiz || actionLoadingId) return;
    setActionLoadingId(suspendModalBiz.id);
    try {
      const res = await adminApi.suspendBusiness(suspendModalBiz.id, suspendReason.trim() || undefined);
      if (res.success) {
        showToast?.({
          title: 'Đã tạm ngưng doanh nghiệp',
          message: `Doanh nghiệp "${suspendModalBiz.name}" đã được chuyển sang trạng thái Tạm ngưng.`,
          type: 'warning',
        });
        setSuspendModalBiz(null);
        setSuspendReason('');
        fetchBusinesses();
      } else {
        showToast?.({
          title: 'Khóa thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Không thể tạm ngưng doanh nghiệp lúc này.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi tạm ngưng doanh nghiệp.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý mở khóa / kích hoạt lại doanh nghiệp
  const handleReactivate = async (biz: any) => {
    if (!biz || actionLoadingId) return;
    setActionLoadingId(biz.id);
    try {
      const res = await adminApi.reactivateBusiness(biz.id);
      if (res.success) {
        showToast?.({
          title: 'Mở khóa thành công',
          message: `Doanh nghiệp "${biz.name}" đã hoạt động trở lại bình thường!`,
          type: 'success',
        });
        fetchBusinesses();
      } else {
        showToast?.({
          title: 'Mở khóa thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Không thể kích hoạt lại.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi kích hoạt lại doanh nghiệp.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selectedRowKeys.length === 0) return;
    const pendingToApprove = businesses.filter((b) => selectedRowKeys.includes(b.id) && b.status === 'PENDING_APPROVAL');
    if (pendingToApprove.length === 0) {
      showToast?.({
        title: 'Không có mục hợp lệ',
        message: 'Các doanh nghiệp đã chọn không ở trạng thái Chờ xét duyệt.',
        type: 'info',
      });
      return;
    }

    try {
      await Promise.all(pendingToApprove.map((b) => adminApi.approveBusiness(b.id)));
      showToast?.({
        title: 'Phê duyệt hàng loạt thành công',
        message: `Đã duyệt thành công ${pendingToApprove.length} doanh nghiệp!`,
        type: 'success',
      });
      setSelectedRowKeys([]);
      fetchBusinesses();
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi duyệt hàng loạt',
        message: err?.message || 'Một số doanh nghiệp không thể phê duyệt.',
        type: 'error',
      });
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedRowKeys.length === 0) return;
    const activeToSuspend = businesses.filter((b) => selectedRowKeys.includes(b.id) && b.status === 'APPROVED');
    if (activeToSuspend.length === 0) {
      showToast?.({
        title: 'Không có mục hợp lệ',
        message: 'Chỉ có thể tạm ngưng các doanh nghiệp đang hoạt động (Đã phê duyệt).',
        type: 'info',
      });
      return;
    }

    try {
      await Promise.all(activeToSuspend.map((b) => adminApi.suspendBusiness(b.id, 'Tạm ngưng đồng loạt bởi Quản trị viên')));
      showToast?.({
        title: 'Tạm ngưng hàng loạt thành công',
        message: `Đã tạm ngưng ${activeToSuspend.length} doanh nghiệp!`,
        type: 'warning',
      });
      setSelectedRowKeys([]);
      fetchBusinesses();
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi khóa hàng loạt',
        message: err?.message || 'Có lỗi xảy ra khi khóa doanh nghiệp.',
        type: 'error',
      });
    }
  };

  const handleApplyBulkFeatures = () => {
    if (selectedRowKeys.length === 0 || bulkFeatureIds.length === 0) return;
    featureFlagsService.bulkToggleBusinessFeatures(
      selectedRowKeys,
      bulkFeatureIds,
      bulkFeatureAction === 'BLOCK'
    );
    showToast?.({
      title: 'Cập nhật tính năng thành công',
      message: `Đã ${bulkFeatureAction === 'BLOCK' ? 'chặn' : 'mở'} ${bulkFeatureIds.length} tính năng cho ${selectedRowKeys.length} doanh nghiệp!`,
      type: 'success',
    });
    setBulkFeatureModalOpen(false);
    setBulkFeatureIds([]);
    setAllFeatures(featureFlagsService.getAllFeatures());
  };

  // Helper render 1 ô thông tin thẩm định (Xanh / Đỏ / Vàng)
  const renderFieldAuditCard = (fieldKey: any, defaultLabel: any, declaredVal: any) => {
    const audit = auditResult?.fields?.[fieldKey];
    const isPendingAudit = isAuditing || !audit;

    const status = audit?.status || 'VALID';
    const badge = audit?.badge || 'Đang kiểm tra...';
    const message = audit?.message || '';

    // Style theo status
    let cardBorder = 'border-gray-200 bg-white';
    let badgeStyle = 'bg-gray-100 text-gray-700 border-gray-200';
    let textColor = 'text-gray-900';
    let icon = 'info';

    if (status === 'VALID') {
      cardBorder = 'border-emerald-200 bg-emerald-50/30';
      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      textColor = 'text-emerald-950';
      icon = 'check_circle';
    } else if (status === 'INVALID') {
      cardBorder = 'border-rose-300 bg-rose-50/50 ring-1 ring-rose-200';
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      textColor = 'text-rose-950';
      icon = 'cancel';
    } else if (status === 'WARNING') {
      cardBorder = 'border-amber-200 bg-amber-50/40';
      badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
      textColor = 'text-amber-950';
      icon = 'warning';
    }

    return (
      <div className={`p-3.5 rounded-xl border ${cardBorder} flex flex-col justify-between gap-2 transition-all`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {audit?.fieldLabel || defaultLabel}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeStyle}`}>
            <span className="material-symbols-outlined text-[13px]">{icon}</span>
            <span>{isPendingAudit ? 'Đang so khớp...' : badge}</span>
          </span>
        </div>

        <div className={`text-xs font-semibold ${textColor} break-words leading-snug`}>
          {String(declaredVal || audit?.declaredValue || '—')}
        </div>

        {message && status !== 'NEUTRAL' && (
          <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex items-start gap-1">
            <span className="text-gray-400">•</span>
            <span className={status === 'INVALID' ? 'text-rose-700 font-medium' : 'text-gray-600'}>
              {message}
            </span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // VIEW 1: CHẾ ĐỘ XEM TOÀN TRANG (FULL PAGE INSPECTION VIEW) - KHÔNG DÙNG POPUP
  // =========================================================================
  if (selectedBiz) {
    const fullProfile = buildFullEnterpriseProfile(selectedBiz);
    const cfg = (STATUS_CONFIG as any)[selectedBiz.status] || STATUS_CONFIG.PENDING_APPROVAL;
    const isPending = selectedBiz.status === 'PENDING_APPROVAL';

    return (
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
        
        {/* 1. TOP NAVIGATION & ACTION HEADER */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBiz(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Quay lại danh sách</span>
            </button>

            <div className="h-6 w-px bg-gray-200" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-900 truncate max-w-md">
                  {fullProfile.company_name}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
                  <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Mã hồ sơ: <span className="font-mono font-medium">{fullProfile.id}</span> • Ngày nộp: {fullProfile.createdAt ? new Date(fullProfile.createdAt).toLocaleDateString('vi-VN') : '14/09/2026'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {isPending && (
              <>
                <button
                  onClick={() => {
                    setRejectModalBiz(selectedBiz);
                    setRejectReason('');
                  }}
                  disabled={actionLoadingId === selectedBiz.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Từ chối hồ sơ</span>
                </button>

                <button
                  onClick={() => handleApprove(selectedBiz)}
                  disabled={actionLoadingId === selectedBiz.id}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Phê duyệt ngay</span>
                </button>
              </>
            )}

            {!isPending && (
              <span className="text-xs text-gray-500 font-medium italic">
                Hồ sơ này đã ở trạng thái {cfg.label.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
          <button
            type="button"
            onClick={() => setDetailTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              detailTab === 'profile'
                ? 'bg-emerald-50 text-[#00875A] border border-emerald-200 shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Hồ Sơ Doanh Nghiệp</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('stores')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              detailTab === 'stores'
                ? 'bg-emerald-50 text-[#00875A] border border-emerald-200 shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>Gian Hàng Liên Kết</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {selectedBiz.stores?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('governance_audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              detailTab === 'governance_audit'
                ? 'bg-emerald-50 text-[#00875A] border border-emerald-200 shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history_edu</span>
            <span>Lịch Sử Quản Trị</span>
          </button>
        </div>

        {/* TAB 1: HỒ SƠ DOANH NGHIỆP */}
        {detailTab === 'profile' && (
          <>
        {/* 2. AUDIT SUMMARY BANNER (TỔNG KẾT THẨM ĐỊNH TỰ ĐỘNG) */}
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-emerald-400">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">
                  KẾT QUẢ ĐỐI CHIẾU CSDL TỰ ĐỘNG
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-300">Bộ máy thẩm định 33 trường</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {auditResult?.overallStatus === 'PASS'
                  ? 'Hồ sơ đạt tiêu chuẩn pháp lý cao - Khớp dữ liệu Tổng cục Thuế'
                  : auditResult?.overallStatus === 'FLAGGED'
                  ? 'Hồ sơ có một số cảnh báo cần Admin lưu ý'
                  : 'Phát hiện sai lệch thông tin so với CSDL Quốc Gia'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Nguồn đối chiếu: <span className="text-emerald-300 font-medium">{auditResult?.registrySource === 'LOCAL_REGISTRY_DB' ? 'CSDL Doanh Nghiệp Quốc Gia (Cache Nội Bộ)' : auditResult?.registrySource === 'NATIONAL_TAX_API' ? 'Cổng Tra Cứu Thuế Trực Tuyến (Live API)' : 'Chưa tìm thấy trong CSDL'}</span>
              </p>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-center">
              <div className="text-xl font-extrabold text-emerald-400">
                {auditResult?.validCount ?? '—'} / 33
              </div>
              <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">HỢP LỆ (XANH)</div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-rose-900/40 border border-rose-500/30 text-center">
              <div className="text-xl font-extrabold text-rose-400">
                {auditResult?.invalidCount ?? 0}
              </div>
              <div className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">SAI LỆCH (ĐỎ)</div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-amber-900/40 border border-amber-500/30 text-center">
              <div className="text-xl font-extrabold text-amber-400">4</div>
              <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">CHỨNG TỪ SOI MẮT</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. KHỐI 1: THÔNG TIN DOANH NGHIỆP & PHÁP LÝ (12 TRƯỜNG) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Form 1: Thông Tin Doanh Nghiệp &amp; Pháp Lý
                </h3>
                <p className="text-[11px] text-gray-500">Đối chiếu 12 trường thông tin với CSDL Tổng cục Thuế &amp; Cổng ĐKKD Quốc Gia</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              12 Trường Dữ Liệu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {renderFieldAuditCard('tax_code', 'Mã số thuế', fullProfile.tax_code)}
            {renderFieldAuditCard('company_name', 'Tên doanh nghiệp', fullProfile.company_name)}
            {renderFieldAuditCard('international_name', 'Tên quốc tế', fullProfile.international_name)}
            {renderFieldAuditCard('short_name', 'Tên viết tắt / Thương hiệu', fullProfile.short_name)}
            {renderFieldAuditCard('business_license_number', 'Số Giấy phép ĐKKD', fullProfile.business_license_number)}
            {renderFieldAuditCard('issue_date', 'Ngày cấp GPKD', fullProfile.issue_date)}
            {renderFieldAuditCard('issue_place', 'Nơi cấp GPKD', fullProfile.issue_place)}
            {renderFieldAuditCard('business_type', 'Loại hình doanh nghiệp', fullProfile.business_type)}
            {renderFieldAuditCard('email', 'Email doanh nghiệp', fullProfile.email)}
            {renderFieldAuditCard('phone', 'Hotline liên hệ', fullProfile.phone)}
            {renderFieldAuditCard('website', 'Website công ty', fullProfile.website)}
            <div className="md:col-span-2 lg:col-span-3">
              {renderFieldAuditCard('registered_address', 'Địa chỉ trụ sở chính', fullProfile.registered_address)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. KHỐI 2: NGƯỜI ĐẠI DIỆN PHÁP LUẬT (8 TRƯỜNG) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Form 2: Người Đại Diện Pháp Luật
                </h3>
                <p className="text-[11px] text-gray-500">Đối chiếu 8 trường nhân thân, số CCCD 12 số và quyền đại diện pháp nhân</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              8 Trường Dữ Liệu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {renderFieldAuditCard('rep_full_name', 'Họ tên người đại diện', fullProfile.rep_full_name)}
            {renderFieldAuditCard('rep_position', 'Chức vụ đại diện', fullProfile.rep_position)}
            {renderFieldAuditCard('rep_id_card_number', 'Số CCCD (12 số)', fullProfile.rep_id_card_number)}
            {renderFieldAuditCard('rep_id_card_issue_date', 'Ngày cấp CCCD', fullProfile.rep_id_card_issue_date)}
            {renderFieldAuditCard('rep_id_card_issue_place', 'Nơi cấp CCCD', fullProfile.rep_id_card_issue_place)}
            {renderFieldAuditCard('rep_phone', 'SĐT người đại diện', fullProfile.rep_phone)}
            {renderFieldAuditCard('rep_email', 'Email người đại diện', fullProfile.rep_email)}
            {renderFieldAuditCard('rep_permanent_address', 'Địa chỉ thường trú', fullProfile.rep_permanent_address)}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. KHỐI 3: TÀI KHOẢN NGÂN HÀNG & THANH TOÁN (4 TRƯỜNG) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold text-xs">
                3
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Form 3: Thông Tin Tài Khoản Ngân Hàng &amp; Đối Soát Doanh Thu
                </h3>
                <p className="text-[11px] text-gray-500">Kiểm tra mạng lưới NAPAS và kiểm tra luật Chống Rửa Tiền (AML Check)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              4 Trường Dữ Liệu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {renderFieldAuditCard('bank_name', 'Ngân hàng thụ hưởng', fullProfile.bank_name)}
            {renderFieldAuditCard('bank_branch', 'Chi nhánh ngân hàng', fullProfile.bank_branch)}
            {renderFieldAuditCard('bank_account_number', 'Số tài khoản', fullProfile.bank_account_number)}
            {renderFieldAuditCard('bank_account_holder_name', 'Tên chủ tài khoản (AML)', fullProfile.bank_account_holder_name)}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. KHỐI 4: HỒ SƠ NĂNG LỰC & XUẤT BẢN (5 TRƯỜNG) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold text-xs">
                4
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Form 4: Hồ Sơ Năng Lực &amp; Ngành Nghề Xuất Bản
                </h3>
                <p className="text-[11px] text-gray-500">Giấy phép phát hành xuất bản phẩm điện tử theo Luật Xuất Bản Việt Nam</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              5 Trường Dữ Liệu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {renderFieldAuditCard('partner_type', 'Phân loại đối tác', fullProfile.partner_type)}
            {renderFieldAuditCard('publishing_license_number', 'Số GP Xuất bản / ĐKKD', fullProfile.publishing_license_number)}
            {renderFieldAuditCard('license_issue_date', 'Ngày cấp GP Xuất bản', fullProfile.license_issue_date)}
            {renderFieldAuditCard('estimated_book_count', 'Số lượng đầu sách', fullProfile.estimated_book_count)}
            <div className="md:col-span-2">
              {renderFieldAuditCard('main_genres', 'Thể loại sách chính', fullProfile.main_genres)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. KHỐI 5: TÀI LIỆU MINH CHỨNG & SCAN (ADMIN TỰ MẮT THẨM ĐỊNH) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                5
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Form 5: Tài Liệu Minh Chứng (Admin Tự Mắt Thẩm Định)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Bấm vào từng ảnh để phóng to toàn màn hình và đối chiếu con dấu đỏ, chữ ký, chân dung người đại diện
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              4 Tài Liệu Scan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Doc 1: GPKD */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-2.5 group hover:border-[#00875A] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Scan GPKD (Dấu Đỏ)</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Đã tải lên</span>
              </div>
              <div
                onClick={() => {
                  setPreviewImageUrl(fullProfile.document_business_license);
                  setPreviewImageTitle('Bản Scan Giấy Phép Đăng Ký Kinh Doanh (GPKD)');
                }}
                className="relative h-44 rounded-xl overflow-hidden bg-gray-200 cursor-pointer border border-gray-300 group-hover:shadow-md transition-all flex items-center justify-center"
              >
                <img
                  src={fullProfile.document_business_license}
                  alt="Scan GPKD"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                  <span>Phóng to soi dấu</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Admin soi con dấu đỏ của Sở Kế hoạch &amp; Đầu tư và số MST trên giấy.
              </p>
            </div>

            {/* Doc 2: CCCD Mặt Trước */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-2.5 group hover:border-[#00875A] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">CCCD Mặt Trước</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Đã tải lên</span>
              </div>
              <div
                onClick={() => {
                  setPreviewImageUrl(fullProfile.document_id_front);
                  setPreviewImageTitle('Ảnh Căn Cước Công Dân (Mặt Trước)');
                }}
                className="relative h-44 rounded-xl overflow-hidden bg-gray-200 cursor-pointer border border-gray-300 group-hover:shadow-md transition-all flex items-center justify-center"
              >
                <img
                  src={fullProfile.document_id_front}
                  alt="CCCD Mặt Trước"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                  <span>Phóng to xem ảnh</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Admin đối chiếu ảnh chân dung, họ tên và số CCCD 12 chữ số.
              </p>
            </div>

            {/* Doc 3: CCCD Mặt Sau */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-2.5 group hover:border-[#00875A] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">CCCD Mặt Sau</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Đã tải lên</span>
              </div>
              <div
                onClick={() => {
                  setPreviewImageUrl(fullProfile.document_id_back);
                  setPreviewImageTitle('Ảnh Căn Cước Công Dân (Mặt Sau)');
                }}
                className="relative h-44 rounded-xl overflow-hidden bg-gray-200 cursor-pointer border border-gray-300 group-hover:shadow-md transition-all flex items-center justify-center"
              >
                <img
                  src={fullProfile.document_id_back}
                  alt="CCCD Mặt Sau"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                  <span>Phóng to xem ảnh</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Admin kiểm tra đặc điểm nhận dạng, vân tay và ngày cấp của Cục CSQLHC.
              </p>
            </div>

            {/* Doc 4: Giấy phép xuất bản */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col gap-2.5 group hover:border-[#00875A] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Giấy Phép Xuất Bản</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Đã tải lên</span>
              </div>
              <div
                onClick={() => {
                  setPreviewImageUrl(fullProfile.document_publishing_permit);
                  setPreviewImageTitle('Giấy Phép Hoạt Động Xuất Bản / Hợp Đồng Ủy Quyền');
                }}
                className="relative h-44 rounded-xl overflow-hidden bg-gray-200 cursor-pointer border border-gray-300 group-hover:shadow-md transition-all flex items-center justify-center"
              >
                <img
                  src={fullProfile.document_publishing_permit}
                  alt="Giấy Phép Xuất Bản"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs">
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                  <span>Phóng to xem giấy phép</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Admin đối chiếu giấy phép của Cục Xuất Bản hoặc Giấy ủy quyền phân phối.
              </p>
            </div>

          </div>
        </div>

        {/* 8. BOTTOM FIXED ACTION BAR */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-4 z-20">
          <div>
            <div className="text-xs font-bold text-gray-900">Quyết Định Thẩm Định Hồ Sơ Đối Tác</div>
            <p className="text-[11px] text-gray-500">
              Kiểm tra kỹ các trường báo đỏ và các bản scan tài liệu trước khi phê duyệt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedBiz(null)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng xem chi tiết
            </button>

            {isPending && (
              <>
                <button
                  onClick={() => {
                    setRejectModalBiz(selectedBiz);
                    setRejectReason('');
                  }}
                  disabled={actionLoadingId === selectedBiz.id}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Từ chối hồ sơ
                </button>

                <button
                  onClick={() => handleApprove(selectedBiz)}
                  disabled={actionLoadingId === selectedBiz.id}
                  className="px-6 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Phê duyệt hồ sơ này
                </button>
              </>
            )}
          </div>
        </div>
        </>
        )}

        {/* TAB 2: GIAN HÀNG LIÊN KẾT */}
        {detailTab === 'stores' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">storefront</span>
                <h3 className="font-extrabold text-gray-900 text-sm">Danh Sách Gian Hàng Trực Thuộc</h3>
              </div>
              <span className="text-xs font-bold text-gray-500">
                Tổng cộng: {selectedBiz.stores?.length || 0} gian hàng
              </span>
            </div>

            {(!selectedBiz.stores || selectedBiz.stores.length === 0) ? (
              <div className="py-12 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">store</span>
                <p className="text-xs font-bold text-gray-600">Chưa có gian hàng nào liên kết</p>
                <p className="text-[11px] text-gray-400">Doanh nghiệp này chưa tạo hoặc chưa được duyệt gian hàng nào.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-3">Tên Gian Hàng</th>
                      <th className="py-2.5 px-3">Mã Slug</th>
                      <th className="py-2.5 px-3">Mô Tả</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBiz.stores.map((st: any) => (
                      <tr key={st.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{st.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">/{st.slug}</td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{st.description || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <AdminStatusBadge variant={st.status === 'APPROVED' ? 'success' : 'warning'} label={st.status || 'Hoạt động'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LỊCH SỬ QUẢN TRỊ (AUDIT HISTORY TIMELINE) */}
        {detailTab === 'governance_audit' && (
          <AuditHistoryTimeline
            title="Lịch Sử Quản Trị & Phê Duyệt Doanh Nghiệp"
            description="Theo dõi toàn bộ nhật ký phê duyệt, từ chối, tạm ngưng hoặc mở khóa tài khoản doanh nghiệp từ Platform Admin."
            items={bizAuditLogs}
            loading={loadingAudit}
            emptyTitle="Chưa có nhật ký thay đổi quản trị"
            emptyMessage="Hồ sơ doanh nghiệp này chưa có thao tác thay đổi trạng thái nào được ghi nhận từ Platform Admin."
          />
        )}

        {/* MODAL PHÓNG TO ẢNH TÀI LIỆU MINH CHỨNG */}
        {previewImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">verified</span>
                  <span className="font-bold text-sm">{previewImageTitle}</span>
                </div>
                <button
                  onClick={() => setPreviewImageUrl(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
                <img
                  src={previewImageUrl}
                  alt={previewImageTitle}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-gray-300"
                />
              </div>
              <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>Chế độ soi chứng từ chất lượng cao</span>
                <button
                  onClick={() => setPreviewImageUrl(null)}
                  className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORM TỪ CHỐI IN-PAGE COLLAPSIBLE */}
        {rejectModalBiz && (
          <div
            ref={rejectFormRef}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-300 animate-in fade-in slide-in-from-top-4 duration-300 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-rose-100 pb-4">
              <div className="flex items-center gap-3 text-rose-600">
                <span className="material-symbols-outlined text-3xl">cancel</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Từ Chối Hồ Sơ Doanh Nghiệp</h3>
                  <p className="text-xs text-gray-500">Doanh nghiệp: {rejectModalBiz.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectModalBiz(null);
                  setRejectReason('');
                  setRejectReasonError('');
                }}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">
                Lý do từ chối <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do từ chối (VD: Mã số thuế không khớp CSDL Quốc gia, Thiếu bản scan GPKD có dấu mộc...)"
                value={rejectReason}
                onChange={(e: any) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError('');
                }}
                className={`w-full p-3 rounded-xl bg-gray-50 border text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none ${
                  rejectReasonError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200'
                }`}
              />
              {rejectReasonError && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{rejectReasonError}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Mã số thuế không tồn tại trong CSDL',
                  'Tên doanh nghiệp không khớp CSDL Thuế',
                  'Thiếu bản scan GPKD dấu đỏ',
                  'Tên chủ tài khoản không khớp tên DN',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setRejectReason(preset);
                      if (rejectReasonError) setRejectReasonError('');
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-700 font-medium transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setRejectModalBiz(null);
                  setRejectReason('');
                  setRejectReasonError('');
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalBiz.id}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: BẢNG DANH SÁCH DOANH NGHIỆP TRUYỀN THỐNG
  // =========================================================================
  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Lý &amp; Xét Duyệt Doanh Nghiệp
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/admin/business-update-requests"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white border border-theme-primary/30 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Yêu Cầu Chỉnh Sửa</span>
          </Link>

          <button
            onClick={fetchBusinesses}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
              refresh
            </span>
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* 2. TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Status Tabs */}
        <AdminFilterTabs
          tabs={STATUS_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          counts={counts}
        />

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên DN, MST, email, SĐT..."
            value={searchQuery}
            onChange={(e: any) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. BUSINESSES TABLE / LIST */}
      <GroupedDataTable
        columns={businessColumns}
        data={filteredBusinesses}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={(keys) => setSelectedRowKeys(keys as string[])}
        bulkActionRender={(keys) => {
          const selectedItems = businesses.filter((b) => keys.includes(b.id));
          const pendingCount = selectedItems.filter((b) => b.status === 'PENDING_APPROVAL').length;
          const activeCount = selectedItems.filter((b) => b.status === 'APPROVED').length;

          return (
            <div className="flex items-center gap-2 flex-wrap">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Duyệt {pendingCount} DN</span>
                </button>
              )}

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={handleBulkSuspend}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">block</span>
                  <span>Khóa {activeCount} DN</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setBulkFeatureIds([]);
                  setBulkFeatureAction('BLOCK');
                  setBulkFeatureModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00281D] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">toggle_on</span>
                <span>Khóa/Mở Tính Năng ({keys.length})</span>
              </button>
            </div>
          );
        }}
        expandable={true}
        expandedRowRender={(biz: any) => {
          const full = buildFullEnterpriseProfile(biz);
          const isPending = biz.status === 'PENDING_APPROVAL';
          const isBusy = actionLoadingId === biz.id;

          return (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Card 1: Pháp Lý & Mã Số Thuế */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#00875A]">apartment</span>
                    <span>Hồ Sơ Pháp Lý &amp; CSDL Thuế</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Tên Quốc Tế:</span>
                      <span className="font-medium text-gray-800 text-right break-words">{full?.international_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Tên Viết Tắt:</span>
                      <span className="font-semibold text-gray-900 text-right break-words">{full?.short_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Mã Số Thuế:</span>
                      <span className="font-mono font-bold text-emerald-800">{full?.tax_code || 'Chưa cung cấp'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Loại Hình DN:</span>
                      <span className="font-medium text-gray-700 text-right">{full?.business_type === 'CORPORATION' ? 'Công ty Cổ Phần' : 'Công ty TNHH'}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-100 flex flex-col">
                      <span className="text-gray-500 text-[10.5px]">Địa chỉ trụ sở chính:</span>
                      <span className="font-medium text-gray-800 text-[11px] leading-snug mt-0.5 break-words">{full?.registered_address || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Người Đại Diện Pháp Luật */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-blue-600">badge</span>
                    <span>Người Đại Diện Pháp Luật</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Họ &amp; Tên:</span>
                      <span className="font-bold text-gray-900 text-right break-words">{full?.rep_full_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Chức Vụ:</span>
                      <span className="font-medium text-gray-700 text-right">{full?.rep_position || 'Người đại diện'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Số CCCD / CMND:</span>
                      <span className="font-mono font-medium text-gray-800">{full?.rep_id_card_number || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">SĐT Liên Hệ:</span>
                      <span className="font-mono text-gray-700">{full?.rep_phone || full?.phone || '—'}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-100 flex flex-col">
                      <span className="text-gray-500 text-[10.5px]">Email Đại Diện:</span>
                      <span className="font-medium text-gray-800 text-[11px] break-words">{full?.rep_email || full?.email || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Ngân Hàng & Năng Lực Phát Hành */}
                <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                    <span className="material-symbols-outlined text-[15px] text-purple-600">account_balance</span>
                    <span>Tài Khoản &amp; Năng Lực Sách</span>
                  </div>
                  <div className="space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Số TK Ngân Hàng:</span>
                      <span className="font-mono font-bold text-gray-900">{full?.bank_account_number || '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[10.5px]">Ngân hàng:</span>
                      <span className="font-medium text-gray-800 text-[11px] break-words">{full?.bank_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Số GP Xuất Bản:</span>
                      <span className="font-mono text-indigo-700 font-semibold">{full?.publishing_license_number || 'Chưa cấp'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 shrink-0">Quy Mô Đầu Sách:</span>
                      <span className="font-bold text-[#00875A]">{full?.estimated_book_count || 0} tựa sách</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200/60 bg-gray-50/50 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBiz(biz);
                      setDetailTab('profile');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#00875A] border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    <span>Mở hồ sơ thẩm định 33 trường toàn trang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBiz(biz);
                      setDetailTab('stores');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">storefront</span>
                    <span>Xem gian hàng ({biz.stores?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeatureModalBiz(biz)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">tune</span>
                    <span>Quản lý tính năng Seller</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalBiz(biz);
                          setRejectReason('');
                        }}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                        <span>Từ chối</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(biz)}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>Phê duyệt ngay</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }}
        emptyTitle="Không tìm thấy doanh nghiệp nào"
        emptyMessage={searchQuery ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.' : 'Hiện không có hồ sơ nào trong danh mục này.'}
        emptyIcon="domain_disabled"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredBusinesses.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'doanh nghiệp',
        }}
      />

      {/* 4. MODAL: QUẢN LÝ TÍNH NĂNG SELLER CHO 1 DOANH NGHIỆP */}
      {featureModalBiz && (
        <CustomModal
          isOpen={true}
          onClose={() => setFeatureModalBiz(null)}
          title={`Tính Năng Seller: ${featureModalBiz.name}`}
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3.5 max-h-[75vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-800">Doanh nghiệp: {featureModalBiz.name}</span>
                <div className="text-slate-500 mt-0.5">MST: {featureModalBiz.taxCode || 'N/A'} • Email: {featureModalBiz.email}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                featureModalBiz.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {featureModalBiz.status}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Bật hoặc chặn các tính năng hoạt động của Seller dành riêng cho doanh nghiệp này. Nếu tính năng đang bảo trì toàn sàn (Global OFF), seller vẫn sẽ bị khóa.
            </p>

            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {allFeatures.map((feat) => {
                const isBlockedForThisBiz = (feat.disabledBusinesses || []).includes(featureModalBiz.id);
                const isGlobalDisabled = !feat.isEnabledGlobally;

                return (
                  <div key={feat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{feat.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                          {feat.id}
                        </span>
                        {isGlobalDisabled && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded">
                            Bảo trì toàn sàn
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{feat.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        featureFlagsService.toggleBusinessForFeature(feat.id, featureModalBiz.id, !isBlockedForThisBiz);
                        setAllFeatures(featureFlagsService.getAllFeatures());
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                        isBlockedForThisBiz
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {isBlockedForThisBiz ? 'Đang Chặn (Bấm Mở)' : 'Được Phép (Bấm Chặn)'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFeatureModalBiz(null)}
                className="px-4 py-1.5 text-xs font-bold bg-[#003B2B] text-white rounded-xl hover:bg-[#00281D]"
              >
                Đóng
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 5. MODAL: KHÓA / MỞ TÍNH NĂNG HÀNG LOẠT CHO CÁC DOANH NGHIỆP ĐƯỢC CHỌN */}
      {bulkFeatureModalOpen && (
        <CustomModal
          isOpen={true}
          onClose={() => setBulkFeatureModalOpen(false)}
          title={`Quản Lý Tính Năng Cho ${selectedRowKeys.length} Doanh Nghiệp Đã Chọn`}
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3.5 max-h-[75vh] overflow-hidden">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Hành động:</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkFeatureAction('BLOCK')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    bulkFeatureAction === 'BLOCK' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Chặn / Khóa tính năng
                </button>
                <button
                  type="button"
                  onClick={() => setBulkFeatureAction('UNBLOCK')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    bulkFeatureAction === 'UNBLOCK' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Mở khóa / Cấp quyền
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Chọn các tính năng muốn áp dụng:</span>
              <button
                type="button"
                onClick={() => {
                  if (bulkFeatureIds.length === allFeatures.length) {
                    setBulkFeatureIds([]);
                  } else {
                    setBulkFeatureIds(allFeatures.map((f) => f.id));
                  }
                }}
                className="text-[#003B2B] hover:underline cursor-pointer"
              >
                {bulkFeatureIds.length === allFeatures.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {allFeatures.map((feat) => {
                const checked = bulkFeatureIds.includes(feat.id);
                return (
                  <label key={feat.id} className="p-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkFeatureIds([...bulkFeatureIds, feat.id]);
                        } else {
                          setBulkFeatureIds(bulkFeatureIds.filter((id) => id !== feat.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#003B2B] focus:ring-[#003B2B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{feat.name}</div>
                      <div className="text-[10px] text-slate-500">{feat.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkFeatureModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyBulkFeatures}
                disabled={bulkFeatureIds.length === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#003B2B] hover:bg-[#00281D] disabled:opacity-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Áp Dụng Cho {selectedRowKeys.length} Doanh Nghiệp
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 6. MODAL: TẠM NGƯNG / KHÓA DOANH NGHIỆP */}
      {suspendModalBiz && (
        <CustomModal
          isOpen={true}
          onClose={() => setSuspendModalBiz(null)}
          title={`Tạm Ngưng Doanh Nghiệp: ${suspendModalBiz.name}`}
          size="md"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
              <div>
                <p className="font-bold">Cảnh báo tạm ngưng hoạt động:</p>
                <p className="mt-0.5">
                  Tất cả gian hàng và sản phẩm sách thuộc doanh nghiệp <strong>{suspendModalBiz.name}</strong> sẽ tạm thời bị ẩn khỏi sàn thương mại và người bán sẽ bị khóa quyền truy cập Seller Hub.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do tạm ngưng / Khóa tài khoản:
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Nhập lý do khóa (VD: Vi phạm chính sách bản quyền, chưa hoàn thành đối soát tài chính...)"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSuspendModalBiz(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Xác Nhận Khóa Doanh Nghiệp
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 7. REJECT IN-PAGE FORM */}
      {rejectModalBiz && (
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
                <h3 className="text-base font-bold text-slate-900">Từ Chối Hồ Sơ Doanh Nghiệp</h3>
                <p className="text-xs text-slate-500">Doanh nghiệp: <strong>{rejectModalBiz.name}</strong> (MST: {rejectModalBiz.taxCode || rejectModalBiz.id})</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRejectModalBiz(null);
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
                Lý do từ chối hồ sơ <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập chi tiết lý do từ chối để thông báo cho đối tác bổ sung/chỉnh sửa lại..."
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
                  'Mã số thuế không hợp lệ hoặc chưa kích hoạt trên Cổng Thuế Quốc Gia',
                  'Thiếu giấy chứng nhận đăng ký kinh doanh (GPKD) hợp lệ',
                  'Thông tin người đại diện pháp luật không khớp với CCCD',
                  'Trùng lặp hồ sơ doanh nghiệp đã đăng ký trên hệ thống',
                  'Chưa cung cấp giấy phép hoạt động xuất bản/phát hành hợp chuẩn',
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
                  setRejectModalBiz(null);
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
                disabled={actionLoadingId === rejectModalBiz.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">cancel</span>
                <span>{actionLoadingId === rejectModalBiz.id ? 'Đang xử lý...' : 'Xác Nhận Từ Chối Hồ Sơ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBusinessesView;

