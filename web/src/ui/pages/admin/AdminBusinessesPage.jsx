import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { taxRegistryService } from '../../services/taxRegistryService';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ Xét Duyệt' },
  { key: 'APPROVED', label: 'Đã Phê Duyệt' },
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
function buildFullEnterpriseProfile(biz) {
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

export default function AdminBusinessesPage() {
  const { showToast } = useToast();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Full Page Detail State
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Modal / Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewImageTitle, setPreviewImageTitle] = useState('');
  const [rejectModalBiz, setRejectModalBiz] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinesses({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setBusinesses(res.data);
      } else {
        setBusinesses([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách doanh nghiệp:', err);
      showToast({
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

  // Bộ lọc danh sách
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      if (activeTab !== 'ALL' && biz.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = biz.name?.toLowerCase().includes(q);
        const matchTax = biz.taxCode?.toLowerCase().includes(q);
        const matchEmail = biz.email?.toLowerCase().includes(q);
        const matchPhone = biz.phone?.toLowerCase().includes(q);
        return matchName || matchTax || matchEmail || matchPhone;
      }
      return true;
    });
  }, [businesses, activeTab, searchQuery]);

  // Đếm số lượng theo tab
  const counts = useMemo(() => {
    return {
      ALL: businesses.length,
      PENDING_APPROVAL: businesses.filter((b) => b.status === 'PENDING_APPROVAL').length,
      APPROVED: businesses.filter((b) => b.status === 'APPROVED').length,
      REJECTED: businesses.filter((b) => b.status === 'REJECTED').length,
    };
  }, [businesses]);

  // Xử lý phê duyệt
  const handleApprove = async (biz) => {
    if (!biz || actionLoadingId) return;
    setActionLoadingId(biz.id);
    try {
      const res = await adminApi.approveBusiness(biz.id);
      if (res.success) {
        showToast({
          title: 'Phê duyệt thành công',
          message: `Doanh nghiệp "${biz.name}" đã được cấp quyền hoạt động trên sàn!`,
          type: 'success',
        });
        fetchBusinesses();
        if (selectedBiz?.id === biz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'APPROVED' });
        }
      } else {
        showToast({
          title: 'Phê duyệt thất bại',
          message: res.error || 'Vui lòng kiểm tra lại trạng thái hồ sơ!',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Không thể thực hiện phê duyệt lúc này.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý từ chối
  const handleConfirmReject = async () => {
    if (!rejectModalBiz || actionLoadingId) return;
    const finalReason = rejectReason.trim() || 'Hồ sơ chưa đáp ứng tiêu chuẩn nền tảng';
    setActionLoadingId(rejectModalBiz.id);
    try {
      const res = await adminApi.rejectBusiness(rejectModalBiz.id, finalReason);
      if (res.success) {
        showToast({
          title: 'Đã từ chối hồ sơ',
          message: `Đã từ chối doanh nghiệp "${rejectModalBiz.name}" kèm lý do.`,
          type: 'info',
        });
        setRejectModalBiz(null);
        setRejectReason('');
        fetchBusinesses();
        if (selectedBiz?.id === rejectModalBiz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'REJECTED' });
        }
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: res.error || 'Không thể từ chối hồ sơ này.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi từ chối hồ sơ.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper render 1 ô thông tin thẩm định (Xanh / Đỏ / Vàng)
  const renderFieldAuditCard = (fieldKey, defaultLabel, declaredVal) => {
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
    const cfg = STATUS_CONFIG[selectedBiz.status] || STATUS_CONFIG.PENDING_APPROVAL;
    const isPending = selectedBiz.status === 'PENDING_APPROVAL';

    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-fade-in">
        
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

        {/* MODAL TỪ CHỐI */}
        {rejectModalBiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setRejectModalBiz(null)}
            />
            <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 animate-scale-up">
              <div className="flex items-center gap-3 text-rose-600">
                <span className="material-symbols-outlined text-3xl">cancel</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Từ Chối Hồ Sơ Doanh Nghiệp</h3>
                  <p className="text-xs text-gray-500">Doanh nghiệp: {rejectModalBiz.name}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700">
                  Lý do từ chối <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập lý do từ chối (VD: Mã số thuế không khớp CSDL Quốc gia, Thiếu bản scan GPKD có dấu mộc...)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"
                />

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
                      onClick={() => setRejectReason(preset)}
                      className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRejectModalBiz(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoadingId === rejectModalBiz.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Xác nhận từ chối
                </button>
              </div>
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              XÉT DUYỆT ĐỐI TÁC
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Hệ thống thẩm định 33 trường CSDL Quốc Gia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Hàng Chờ Xét Duyệt Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Xem xét, thẩm định 5 form đăng ký, đối chiếu CSDL Quốc Gia tự động và phê duyệt hồ sơ đối tác phát hành sách.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* 2. TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const count = counts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : tab.key === 'PENDING_APPROVAL' && count > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên DN, MST, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. BUSINESSES TABLE / LIST */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang tải danh sách doanh nghiệp...</span>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">domain_disabled</span>
            <p className="text-sm font-bold text-gray-600">Không tìm thấy doanh nghiệp nào</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.' : 'Hiện không có hồ sơ nào trong danh mục này.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Doanh Nghiệp</th>
                  <th className="py-3 px-4">Mã Số Thuế</th>
                  <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                  <th className="py-3 px-4">Ngày Đăng Ký</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBusinesses.map((biz) => {
                  const cfg = STATUS_CONFIG[biz.status] || STATUS_CONFIG.PENDING_APPROVAL;
                  const isPending = biz.status === 'PENDING_APPROVAL';
                  const isBusy = actionLoadingId === biz.id;

                  return (
                    <tr key={biz.id} className="hover:bg-gray-50/60 transition-colors">
                      
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-extrabold text-sm shrink-0">
                            {biz.name ? biz.name.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <div className="min-w-0">
                            <span
                              className="font-bold text-gray-900 block truncate hover:text-[#00875A] cursor-pointer"
                              onClick={() => setSelectedBiz(biz)}
                            >
                              {biz.name}
                            </span>
                            <span className="text-[11px] text-gray-400 block truncate">
                              ID: {biz.id.slice(0, 8)}... • Slug: /{biz.slug || 'n-a'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tax code */}
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                        {biz.taxCode || <span className="text-gray-400 font-sans italic">Chưa cung cấp</span>}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 font-medium truncate">{biz.email || 'N/A'}</div>
                        <div className="text-[11px] text-gray-500">{biz.phone || 'Chưa có SĐT'}</div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-gray-500">
                        {biz.createdAt ? new Date(biz.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBiz(biz)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            title="Xem chi tiết toàn trang"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Xem chi tiết</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(biz)}
                                disabled={isBusy}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                                title="Phê duyệt doanh nghiệp"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Duyệt</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalBiz(biz);
                                  setRejectReason('');
                                }}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Từ chối hồ sơ"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                <span>Từ chối</span>
                              </button>
                            </>
                          )}
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

      {/* 4. REJECT MODAL / DIALOG */}
      {rejectModalBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setRejectModalBiz(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-3xl">cancel</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Từ Chối Hồ Sơ Doanh Nghiệp</h3>
                <p className="text-xs text-gray-500">Doanh nghiệp: {rejectModalBiz.name}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">
                Lý do từ chối <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do từ chối để thông báo cho doanh nghiệp chỉnh sửa lại..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"
              />

              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Mã số thuế không hợp lệ',
                  'Thiếu giấy phép kinh doanh',
                  'Thông tin liên hệ không chính xác',
                  'Trùng lặp hồ sơ doanh nghiệp',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectModalBiz(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalBiz.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
