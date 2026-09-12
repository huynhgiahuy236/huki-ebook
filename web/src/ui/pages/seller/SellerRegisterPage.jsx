import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function SellerRegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, refreshBusiness } = useAuth();

  const [formData, setFormData] = useState({
    name: 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    taxCode: '0318926410',
    address: 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    email: 'contact@trituevietbooks.vn',
    phone: '0918 882 991',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [business, setBusiness] = useState(user?.business || null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    businessApi.getMyBusiness().then((res) => {
      if (active && res.success) setBusiness(res.data);
      if (active) setIsChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên doanh nghiệp!', 'error');
      return;
    }

    setIsLoading(true);
    const res = await businessApi.registerBusiness({
      name: formData.name.trim(),
      taxCode: formData.taxCode.trim(),
      address: formData.address.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      businessType: 'CORPORATION',
    });
    setIsLoading(false);

    if (res.success) {
      showToast('Nộp hồ sơ doanh nghiệp thành công! Đang chờ Admin HUKI phê duyệt.', 'success');
      setBusiness(res.data);
      await refreshBusiness();
      navigate('/seller/business/status', { replace: true });
    } else {
      showToast(res.error?.message || 'Đăng ký doanh nghiệp thất bại. Vui lòng kiểm tra lại.', 'error');
    }
  };

  if (isChecking) {
    return <BusinessState title="Đang kiểm tra hồ sơ doanh nghiệp…" icon="progress_activity" spinning />;
  }

  if (business) {
    const statusContent = {
      PENDING_APPROVAL: {
        title: 'Hồ sơ đang chờ phê duyệt',
        description: 'Admin HUKI đang thẩm định hồ sơ. Bạn có thể tạo cửa hàng sau khi doanh nghiệp được duyệt.',
        icon: 'hourglass_top',
        tone: 'amber',
      },
      APPROVED: {
        title: 'Doanh nghiệp đã được phê duyệt',
        description: 'Hồ sơ hợp lệ. Bạn có thể tiếp tục tạo và quản lý cửa hàng.',
        icon: 'verified',
        tone: 'emerald',
      },
      REJECTED: {
        title: 'Hồ sơ chưa được chấp thuận',
        description: 'Vui lòng liên hệ bộ phận hỗ trợ đối tác để được hướng dẫn cập nhật hồ sơ.',
        icon: 'cancel',
        tone: 'red',
      },
      SUSPENDED: {
        title: 'Doanh nghiệp đang bị tạm ngưng',
        description: 'Các quyền bán hàng tạm thời bị khóa. Vui lòng liên hệ Admin HUKI.',
        icon: 'pause_circle',
        tone: 'red',
      },
    }[business.status];

    return (
      <BusinessState
        {...statusContent}
        business={business}
        action={business.status === 'APPROVED' ? () => navigate('/seller/stores') : undefined}
        actionLabel="Quản lý cửa hàng"
      />
    );
  }

  return (
    <div className="w-full bg-[#fbf9f5] text-on-surface font-body-md antialiased min-h-screen py-6">
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 lg:px-12 max-w-[1680px] mx-auto w-full">

<div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#e8e5df] gap-4">
<div>
<div className="flex items-center gap-2 text-tertiary font-label-md uppercase tracking-wider mb-2">
<span className="material-symbols-outlined text-[18px]">business_center</span>
<span>Quy trình gia nhập hệ sinh thái xuất bản số HUKI</span>
</div>
<h1 className="font-display-lg text-[36px] lg:text-[42px] leading-[46px] lg:leading-[50px] font-medium text-on-surface tracking-tight">
              Đăng Ký Đối Tác &amp; Hồ Sơ Doanh Nghiệp
            </h1>
<p className="font-body-lg text-body-md text-[#59413c] mt-2 max-w-3xl">
              Hoàn tất thông tin pháp nhân để HUKI thẩm định và cấp chứng nhận quyền tạo gian hàng chính thức trên cổng phân phối sách giấy và sách điện tử bản quyền.
            </p>
</div>
<div className="flex items-center gap-2 bg-[#ffffff] border border-[#e8e5df] px-3.5 py-2 rounded-xl shadow-sm self-start md:self-auto shrink-0">
<span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
<span className="font-body-sm text-xs text-on-surface-variant font-medium">Hồ sơ: <strong className="font-title-md text-on-surface">Bản nháp #HK-REG-2026-8802</strong></span>
</div>
</div>

<section className="py-8 my-2">
<div className="relative">

<div className="stepper-line bg-[#e8e5df] w-full"></div>

<div className="stepper-line bg-tertiary" style={{ width: '20%' }}></div>

<div className="relative z-10 grid grid-cols-6 gap-2">

<div className="flex flex-col items-center text-center cursor-pointer group">
<div className="w-9 h-9 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-title-md text-xs shadow-sm ring-4 ring-[#fbf9f5]">
<span className="material-symbols-outlined text-[20px]">check</span>
</div>
<span className="font-title-md text-xs text-tertiary mt-2">Bước 1</span>
<span className="font-body-sm text-xs font-medium text-on-surface">Loại Đơn Vị</span>
<span className="font-label-sm text-[11px] text-tertiary font-medium">Đã xác nhận</span>
</div>

<div className="flex flex-col items-center text-center">
<div className="w-9 h-9 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-title-md text-sm shadow-md ring-4 ring-[#94f5d6]/40 ring-offset-2 ring-offset-[#fbf9f5]">
                  2
                </div>
<span className="font-title-md text-xs text-tertiary mt-2">Bước 2</span>
<span className="font-title-md text-xs text-on-surface">Thông Tin Doanh Nghiệp</span>
<span className="font-label-sm text-[11px] text-[#b02e1b] bg-[#ffdad4]/60 px-2 py-0.5 rounded-full mt-0.5">Đang thực hiện</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  3
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 3</span>
<span className="font-body-sm text-xs text-[#59413c]">Người Đại Diện</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  4
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 4</span>
<span className="font-body-sm text-xs text-[#59413c]">Liên Hệ &amp; Vận Hành</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  5
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 5</span>
<span className="font-body-sm text-xs text-[#59413c]">Hồ Sơ Xác Minh</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Chưa bắt đầu</span>
</div>

<div className="flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
<div className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant border border-[#e8e5df] flex items-center justify-center font-title-md text-xs ring-4 ring-[#fbf9f5]">
                  6
                </div>
<span className="font-body-sm text-xs text-on-surface-variant mt-2">Bước 6</span>
<span className="font-body-sm text-xs text-[#59413c]">Xem Lại &amp; Gửi</span>
<span className="font-label-sm text-[11px] text-[#8d706b]">Duyệt hồ sơ</span>
</div>
</div>
</div>
</section>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">

<div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-[#e8e5df] p-8 lg:p-10 shadow-[0_4px_20px_-2px_rgba(23,32,31,0.04)]">

<div className="bg-surface-container-low border border-[#d2dcda] rounded-xl p-4 flex items-center justify-between mb-8">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[22px]">corporate_fare</span>
</div>
<div>
<div className="font-label-sm text-[11px] text-[#59413c] uppercase tracking-wider">Đơn vị đăng ký đã chọn</div>
<div className="font-title-md text-sm text-on-surface font-semibold mt-0.5">
                    DOANH NGHIỆP KINH DOANH SÁCH &amp; PHÁT HÀNH
                  </div>
</div>
</div>
<Link className="font-body-sm text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-4" to="/">
<span>Thay đổi loại đơn vị</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</Link>
</div>
<form className="space-y-8" onSubmit={handleSubmit}>

<div className="border-b border-[#e8e5df] pb-8">
<div className="flex items-center gap-2 mb-1">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">1. Thông Tin Pháp Lý Doanh Nghiệp</h2>
</div>
<p className="font-body-sm text-xs text-[#6b7280] mb-6 pl-4">
                  Cung cấp thông tin đăng ký doanh nghiệp chính xác để xác thực quyền kinh doanh xuất bản phẩm theo quy định Bộ TT&amp;TT.
                </p>
<div className="space-y-5">

<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Tên doanh nghiệp / Tên pháp lý chính thức <span className="text-error">*</span>
</label>
<div className="relative">
<input
  className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all"
  type="text"
  required
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
/>
<span className="absolute right-3.5 top-3 text-tertiary material-symbols-outlined text-[20px]">check_circle</span>
</div>
<p className="font-body-sm text-[12px] text-[#6b7280] mt-1.5 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">info</span>
                      Nhập chính xác từng ký tự theo Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD).
                    </p>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                        Mã số thuế (MST) <span className="text-error">*</span>
</label>
<input
  className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary"
  type="text"
  value={formData.taxCode}
  onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
/>
</div>
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                        Số điện thoại liên hệ <span className="text-error">*</span>
</label>
<input
  className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary"
  type="tel"
  value={formData.phone}
  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
/>
</div>
</div>

<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Email doanh nghiệp <span className="text-error">*</span>
</label>
<input
  className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary"
  type="email"
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
/>
</div>
</div>
</div>

<div className="border-b border-[#e8e5df] pb-8">
<div className="flex items-center gap-2 mb-1">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
<h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">2. Địa Chỉ Đăng Ký Kinh Doanh (Trụ sở chính)</h2>
</div>
<div className="space-y-5">
<div>
<label className="block font-title-md text-xs text-on-surface mb-2">
                      Địa chỉ chi tiết <span className="text-error">*</span>
</label>
<input
  className="w-full h-12 px-4 rounded-xl border border-[#e8e5df] bg-[#ffffff] font-body-md text-sm text-on-surface focus:border-tertiary focus:ring-1 focus:ring-tertiary"
  type="text"
  value={formData.address}
  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
/>
</div>
</div>
</div>

<div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
<button className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#e8e5df] bg-surface-container-lowest hover:bg-[#fbf9f5] text-on-surface font-title-md text-xs flex items-center justify-center gap-2 transition-all shadow-sm" type="button" onClick={() => navigate('/seller')}>
<span className="material-symbols-outlined text-[18px]">arrow_back</span>
<span>Hủy &amp; Quay Lại</span>
</button>
<div className="flex items-center gap-3 w-full sm:w-auto">
<button
  type="submit"
  disabled={isLoading}
  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-tertiary hover:bg-[#004D38] text-on-tertiary font-title-md text-xs flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,105,83,0.3)] hover:shadow-lg transition-all cursor-pointer disabled:opacity-70"
>
  {isLoading ? (
    <span>Đang gửi hồ sơ...</span>
  ) : (
    <>
      <span className="material-symbols-outlined text-[18px]">send</span>
      <span>Nộp Hồ Sơ Đăng Ký Doanh Nghiệp</span>
    </>
  )}
</button>
</div>
</div>
</form>
</div>

<div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">

<div className="bg-surface-container-lowest border border-[#e8e5df] rounded-2xl p-6 shadow-sm">
<div className="flex items-center justify-between mb-3">
<div className="font-headline-sm text-sm font-semibold text-on-surface">Tiến Độ Hoàn Thành</div>
<span className="font-title-md text-xs text-tertiary font-bold">33%</span>
</div>

<div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-4">
<div className="h-full bg-tertiary rounded-full transition-all duration-500" style={{ width: '33%' }}></div>
</div>
<div className="text-xs text-[#6b7280] font-body-sm mb-4">
                Bước 2 trên 6: Nhập thông tin pháp nhân thương mại
              </div>

<div className="space-y-3 pt-3 border-t border-[#e8e5df] text-xs">
<div className="flex items-center gap-2 text-tertiary">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span className="font-medium line-through opacity-80">Đã chọn loại hình doanh nghiệp</span>
</div>
<div className="flex items-center gap-2 text-on-surface font-semibold bg-surface-container-low p-2 rounded-lg">
<span className="material-symbols-outlined text-[18px] text-tertiary">radio_button_checked</span>
<span>Đang nhập thông tin pháp lý &amp; trụ sở</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Người đại diện pháp luật &amp; CCCD</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Địa chỉ lấy hàng &amp; liên hệ vận hành</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Bản scan Giấy ĐKKD (PDF/JPG)</span>
</div>
<div className="flex items-center gap-2 text-[#8d706b]">
<span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
<span>Giấy ủy quyền / Bản quyền phát hành</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-[#e8e5df] rounded-2xl p-6 shadow-sm relative overflow-hidden">
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-lg bg-surface-container-low text-tertiary flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[20px]">policy</span>
</div>
<div>
<h3 className="font-headline-sm text-sm font-semibold text-on-surface">Tại Sao HUKI Cần Thông Tin Này?</h3>
<p className="font-body-sm text-xs text-[#59413c] mt-2 leading-relaxed">
                    HUKI là sàn thương mại điện tử sách có <strong>bảo hộ bản quyền DRM quốc gia</strong>. Thông tin pháp nhân và mã số thuế giúp hệ thống xác thực người bán chính thống, bảo vệ quyền tác giả và xuất hóa đơn điện tử hợp pháp cho độc giả theo chuẩn quy định.
                  </p>
</div>
</div>
</div>

<div className="bg-[#ffffff] border border-[#e8e5df] rounded-2xl p-6 shadow-sm">
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-lg bg-[#ffdad4]/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
<span className="material-symbols-outlined text-[20px]">encrypted</span>
</div>
<div>
<h3 className="font-headline-sm text-sm font-semibold text-on-surface">Cam Kết Bảo Mật 100%</h3>
<p className="font-body-sm text-xs text-[#59413c] mt-2 leading-relaxed">
                    Hồ sơ đăng ký doanh nghiệp của bạn được mã hóa an toàn 256-bit và chỉ phục vụ duy nhất cho mục đích thẩm định gian hàng, tuyệt đối không chia sẻ hay công khai trên sàn giao dịch.
                  </p>
</div>
</div>
</div>

<div className="bg-surface-container-low/70 border border-[#d2dcda] rounded-2xl p-6 shadow-sm">
<h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-tertiary text-[18px]">contact_phone</span>
<span>Ban Hỗ Trợ Đối Tác B2B</span>
</h3>
<div className="space-y-2.5 text-xs font-body-sm text-on-surface">
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Hotline thẩm định:</span>
<span className="font-title-md text-tertiary font-bold">1900 8866 (Nhánh 2)</span>
</div>
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Email tiếp nhận:</span>
<span className="font-title-md text-on-surface select-all">publisher@hukiebook.vn</span>
</div>
<div className="flex items-center justify-between">
<span className="text-[#6b7280]">Thời gian xử lý:</span>
<span className="font-medium text-on-surface">Từ 24h – 48h làm việc</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-[#d2dcda]">
<Link className="flex items-center gap-1.5 text-tertiary hover:underline text-xs font-title-md" to="/seller/register">
<span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
<span>Tải Sổ tay hướng dẫn đăng ký đối tác (PDF)</span>
</Link>
</div>
</div>
</div>
</div>
      </main>
    </div>
  );
}

function BusinessState({ title, description, icon, tone = 'emerald', spinning = false, business, action, actionLabel }) {
  const toneClass = tone === 'red'
    ? 'bg-red-50 border-red-200 text-red-900'
    : tone === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-emerald-50 border-emerald-200 text-emerald-900';

  return (
    <main className="min-h-[70vh] bg-[#fbf9f5] px-4 py-16 flex items-center justify-center">
      <section className={`w-full max-w-xl rounded-3xl border p-8 text-center shadow-sm ${toneClass}`} aria-live="polite">
        <span className={`material-symbols-outlined text-5xl ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
        <h1 className="mt-4 font-editorial text-3xl font-bold">{title}</h1>
        {description && <p className="mt-3 text-sm leading-6 opacity-80">{description}</p>}
        {business && (
          <dl className="mt-6 rounded-2xl bg-white/80 p-4 text-left text-sm">
            <div className="flex justify-between gap-4"><dt>Doanh nghiệp</dt><dd className="font-bold text-right">{business.name}</dd></div>
            <div className="mt-2 flex justify-between gap-4"><dt>Mã số thuế</dt><dd className="font-semibold">{business.taxCode || 'Chưa cung cấp'}</dd></div>
            <div className="mt-2 flex justify-between gap-4"><dt>Trạng thái</dt><dd className="font-bold">{business.status}</dd></div>
          </dl>
        )}
        {action && (
          <button type="button" onClick={action} className="mt-6 min-h-11 rounded-xl bg-[#004d3b] px-6 py-3 text-sm font-bold text-white hover:bg-[#006650]">
            {actionLabel}
          </button>
        )}
      </section>
    </main>
  );
}
