import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';

export default function SellerRegisterPage() {
  const navigate = useNavigate();
  const { user, refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State cho cả 6 bước
  const [formData, setFormData] = useState({
    // Bước 1: Loại Đơn Vị
    businessType: 'CORPORATION', // 'CORPORATION' | 'LLC' | 'INDIVIDUAL' | 'PARTNERSHIP'

    // Bước 2: Thông Tin Doanh Nghiệp
    name: 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    taxCode: '0318926410',
    foundedDate: '2021-04-15',
    primaryField: 'Kinh doanh sách, xuất bản phẩm & nội dung số',
    website: 'https://trituevietbooks.vn',
    description: 'Chuyên phân phối các dòng sách kinh tế, tư duy, tâm lý ứng dụng và phát triển bản thân có bản quyền quốc tế và dịch thuật tiếng Việt, kết hợp cả sách giấy cao cấp và ebook có DRM.',

    // Bước 3: Người Đại Diện
    repName: user?.fullName || 'Nguyễn Văn Hùng',
    repIdNumber: '079094002381',
    repPosition: 'Giám đốc Điều hành',
    repPhone: '0908123456',

    // Bước 4: Liên Hệ & Vận Hành
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    address: 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn',
    warehouseAddress: 'Kho HUKI Vận Hành, 120 Song Hành, TP. Thủ Đức, TP.HCM',
    email: user?.email || 'publisher@trituevietbooks.vn',
    phone: '19008866',

    // Bước 5: Hồ Sơ Pháp Lý
    licenseDocUrl: 'https://cdn.hukiebook.vn/licenses/gpkd-sample-2026.pdf',
    publishingPermitUrl: 'https://cdn.hukiebook.vn/permits/xuatban-sample-2026.pdf',
    agreedDrmTerms: true,

    // Bước 6: Cam Kết
    agreedTerms: true,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.businessType) {
        showToast('Vui lòng chọn loại hình đơn vị đăng ký!', 'error');
        return false;
      }
    } else if (step === 2) {
      if (!formData.name.trim()) {
        showToast('Vui lòng nhập Tên doanh nghiệp/NXB!', 'error');
        return false;
      }
      if (!formData.taxCode.trim()) {
        showToast('Vui lòng nhập Mã số thuế!', 'error');
        return false;
      }
    } else if (step === 3) {
      if (!formData.repName.trim()) {
        showToast('Vui lòng nhập Họ tên người đại diện!', 'error');
        return false;
      }
      if (!formData.repIdNumber.trim()) {
        showToast('Vui lòng nhập Số CCCD/Hộ chiếu!', 'error');
        return false;
      }
    } else if (step === 4) {
      if (!formData.address.trim()) {
        showToast('Vui lòng nhập Địa chỉ trụ sở chính!', 'error');
        return false;
      }
      if (!formData.email.trim()) {
        showToast('Vui lòng nhập Email liên hệ doanh nghiệp!', 'error');
        return false;
      }
      if (!formData.phone.trim()) {
        showToast('Vui lòng nhập Hotline liên hệ!', 'error');
        return false;
      }
    } else if (step === 5) {
      if (!formData.agreedDrmTerms) {
        showToast('Vui lòng đồng ý với cam kết bảo hộ bản quyền DRM!', 'error');
        return false;
      }
    } else if (step === 6) {
      if (!formData.agreedTerms) {
        showToast('Vui lòng đồng ý với cam kết tính chính xác của hồ sơ!', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep(6)) return;

    setIsSubmitting(true);

    const fullAddress = [
      formData.address,
      formData.ward,
      formData.district,
      formData.province
    ].filter(Boolean).join(', ');

    const payload = {
      name: formData.name.trim(),
      taxCode: formData.taxCode.trim(),
      address: fullAddress,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      businessType: formData.businessType,
    };

    try {
      const res = await businessApi.registerBusiness(payload);
      setIsSubmitting(false);

      if (res.success || res.data) {
        showToast(
          {
            title: 'Gửi hồ sơ thành công',
            message: 'Hồ sơ đối tác đã được gửi thành công và đang được chuyển tới Ban thẩm định HUKI (xử lý trong 24h - 48h).',
          },
          'success'
        );
        if (refreshBusiness) {
          await refreshBusiness();
        }
        navigate('/account-status');
      } else {
        const errorMsg = res.error?.message || 'Có lỗi phát sinh khi gửi hồ sơ đối tác. Vui lòng kiểm tra lại thông tin.';
        showToast(
          {
            title: 'Chưa thể gửi hồ sơ',
            message: errorMsg,
          },
          'error'
        );
        if (res.error?.code === 'BUSINESS_ALREADY_EXISTS') {
          setTimeout(() => {
            navigate('/account-status');
          }, 2000);
        }
      }
    } catch (err) {
      setIsSubmitting(false);
      showToast(
        {
          title: 'Gián đoạn kết nối',
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền internet.',
        },
        'error'
      );
    }
  };

  const stepTitles = [
    { num: 1, title: 'Loại Đơn Vị', desc: 'Chọn hình thức pháp nhân' },
    { num: 2, title: 'Thông Tin Doanh Nghiệp', desc: 'Tên pháp lý & MST' },
    { num: 3, title: 'Người Đại Diện', desc: 'Đại diện pháp luật & CCCD' },
    { num: 4, title: 'Liên Hệ & Vận Hành', desc: 'Trụ sở, kho bãi & hotline' },
    { num: 5, title: 'Hồ Sơ Xác Minh', desc: 'Bản scan GPKD & Bản quyền DRM' },
    { num: 6, title: 'Xem Lại & Gửi', desc: 'Thẩm định hồ sơ' },
  ];

  const progressPercentage = Math.round((currentStep / 6) * 100);

  return (
    <div className="w-full bg-[#fbf9f5] text-on-surface font-body-md antialiased min-h-screen py-6">
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 lg:px-12 max-w-[1680px] mx-auto w-full">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#e8e5df] gap-4">
          <div>
            <div className="flex items-center gap-2 text-tertiary font-label-md uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-[18px]">business_center</span>
              <span>Quy trình gia nhập hệ sinh thái xuất bản số HUKI</span>
            </div>
            <h1 className="font-display-lg text-[32px] lg:text-[40px] leading-[40px] lg:leading-[48px] font-bold text-on-surface tracking-tight">
              Đăng Ký Đối Tác &amp; Hồ Sơ Doanh Nghiệp
            </h1>
            <p className="font-body-lg text-sm sm:text-base text-[#59413c] mt-2 max-w-3xl">
              Hoàn tất thông tin pháp nhân để HUKI thẩm định và cấp chứng nhận quyền tạo gian hàng chính thức trên cổng phân phối sách giấy và sách điện tử bản quyền.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#ffffff] border border-[#e8e5df] px-3.5 py-2 rounded-xl shadow-xs self-start md:self-auto shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-body-sm text-xs text-on-surface-variant font-medium">
              Hồ sơ: <strong className="font-title-md text-on-surface">Bước {currentStep} / 6</strong>
            </span>
          </div>
        </div>

        {/* 6-Step Stepper Bar */}
        <section className="py-8 my-2">
          <div className="relative">
            <div className="w-full h-1 bg-[#e8e5df] absolute top-4 left-0 -z-0"></div>
            <div
              className="h-1 bg-[#006953] absolute top-4 left-0 -z-0 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
            ></div>

            <div className="relative z-10 grid grid-cols-3 md:grid-cols-6 gap-2">
              {stepTitles.map((step) => {
                const isCompleted = step.num < currentStep;
                const isCurrent = step.num === currentStep;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => {
                      if (step.num < currentStep) setCurrentStep(step.num);
                    }}
                    className={`flex flex-col items-center text-center transition-all ${step.num <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ring-4 ring-[#fbf9f5] transition-all ${isCompleted
                          ? 'bg-[#006953] text-white'
                          : isCurrent
                            ? 'bg-[#006953] text-white ring-[#94f5d6] ring-offset-2 ring-offset-[#fbf9f5]'
                            : 'bg-white text-gray-500 border border-[#e8e5df]'
                        }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      ) : (
                        step.num
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-bold ${isCurrent ? 'text-[#006953]' : 'text-gray-700'}`}>
                      Bước {step.num}
                    </span>
                    <span className="text-[11px] font-medium text-gray-600 hidden md:inline truncate max-w-[120px]">
                      {step.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 font-bold ${isCompleted
                          ? 'text-emerald-700 bg-emerald-50'
                          : isCurrent
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-gray-400 bg-gray-100'
                        }`}
                    >
                      {isCompleted ? 'Đã xong' : isCurrent ? 'Đang điền' : 'Chưa đến'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Form Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">

          {/* Left: Dynamic Step Form Container */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e8e5df] p-6 sm:p-8 lg:p-10 shadow-sm">

            {/* Current Step Breadcrumb Banner */}
            <div className="bg-[#f2fbf9] border border-[#d2dcda] rounded-xl p-4 flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#006953] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">
                    {currentStep === 1 && 'domain'}
                    {currentStep === 2 && 'business'}
                    {currentStep === 3 && 'badge'}
                    {currentStep === 4 && 'location_on'}
                    {currentStep === 5 && 'verified_user'}
                    {currentStep === 6 && 'fact_check'}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] text-[#006953] uppercase tracking-wider font-bold">
                    Bước {currentStep} / 6: {stepTitles[currentStep - 1].title}
                  </div>
                  <div className="text-sm text-gray-900 font-bold mt-0.5">
                    {stepTitles[currentStep - 1].desc}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={currentStep === 6 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">

              {/* ======================================================== */}
              {/* BƯỚC 1: CHỌN LOẠI HÌNH ĐƠN VỊ */}
              {/* ======================================================== */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 mb-1">1. Lựa Chọn Loại Hình Tổ Chức / Pháp Nhân</h2>
                    <p className="text-xs text-gray-500">
                      Chọn mô hình hoạt động phù hợp với pháp nhân của bạn để HUKI áp dụng quy chế và mức phí chiết khấu 85/15 tương ứng.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        type: 'CORPORATION',
                        title: 'Doanh Nghiệp / Công Ty Cổ Phần - TNHH',
                        desc: 'Dành cho các công ty phát hành sách, công ty truyền thông và NXB có tư cách pháp nhân đầy đủ.',
                        icon: 'apartment',
                        badge: 'Phổ biến nhất'
                      },
                      {
                        type: 'LLC',
                        title: 'Hộ Kinh Doanh Cá Thể',
                        desc: 'Dành cho các nhà sách tư nhân, hiệu sách truyền thống có đăng ký hộ kinh doanh cá thể.',
                        icon: 'storefront',
                        badge: 'Nhanh chóng'
                      },
                      {
                        type: 'PARTNERSHIP',
                        title: 'Tổ Hợp Xuất Bản & Dịch Thuật',
                        desc: 'Dành cho các đơn vị liên kết xuất bản, nhóm dịch giả và tổ hợp sáng tác có ủy quyền.',
                        icon: 'groups',
                        badge: 'Độc quyền'
                      },
                      {
                        type: 'INDIVIDUAL',
                        title: 'Tác Giả & Nhà Sáng Tác Tự Do',
                        desc: 'Dành cho tác giả tự do có tác phẩm bản quyền muốn tự phát hành Ebook DRM trên nền tảng.',
                        icon: 'person_edit',
                        badge: 'Tác giả'
                      },
                    ].map((item) => {
                      const isSelected = formData.businessType === item.type;
                      return (
                        <div
                          key={item.type}
                          onClick={() => handleChange('businessType', item.type)}
                          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                              ? 'border-[#006953] bg-[#f2fbf9] shadow-xs ring-2 ring-[#006953]/20'
                              : 'border-[#e8e5df] bg-white hover:border-[#006953]/40 hover:bg-gray-50/50'
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#006953] text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#006953] text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {item.badge}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-gray-900 mb-1">{item.title}</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                          </div>
                          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#006953]">
                            <span className="material-symbols-outlined text-base">
                              {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <span>{isSelected ? 'Đang chọn mô hình này' : 'Chọn mô hình này'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* BƯỚC 2: THÔNG TIN PHÁP LÝ DOANH NGHIỆP */}
              {/* ======================================================== */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="border-b border-[#e8e5df] pb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-1">2. Thông Tin Pháp Lý Doanh Nghiệp</h2>
                    <p className="text-xs text-gray-500">
                      Cung cấp thông tin đăng ký doanh nghiệp chính xác để xác thực quyền kinh doanh xuất bản phẩm theo quy định.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Tên doanh nghiệp / NXB chính thức <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="VD: CÔNG TY TNHH PHÁT HÀNH SÁCH ALPHA..."
                      className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none transition-all"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Ghi chính xác theo Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD).</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Mã số thuế (MST) / Mã số doanh nghiệp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.taxCode}
                        onChange={(e) => handleChange('taxCode', e.target.value)}
                        placeholder="VD: 0318926410"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 font-mono focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Ngày cấp / Ngày thành lập
                      </label>
                      <input
                        type="date"
                        value={formData.foundedDate}
                        onChange={(e) => handleChange('foundedDate', e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Lĩnh vực hoạt động chính
                      </label>
                      <select
                        value={formData.primaryField}
                        onChange={(e) => handleChange('primaryField', e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      >
                        <option>Kinh doanh sách, xuất bản phẩm &amp; nội dung số</option>
                        <option>Nhà xuất bản sách giáo dục &amp; đại học</option>
                        <option>Đại lý phát hành &amp; phân phối sách nhập khẩu</option>
                        <option>Tổ hợp dịch thuật và sáng tác độc lập</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Website chính thức (Tùy chọn)
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://yourwebsite.vn"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Mô tả tóm tắt định hướng xuất bản &amp; phân phối
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Mô tả các dòng sách chủ lực, thể loại trọng tâm..."
                      className="w-full p-3 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* BƯỚC 3: NGƯỜI ĐẠI DIỆN PHÁP LUẬT */}
              {/* ======================================================== */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="border-b border-[#e8e5df] pb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-1">3. Thông Tin Người Đại Diện Pháp Luật</h2>
                    <p className="text-xs text-gray-500">
                      Thông tin cá nhân người đại diện ký kết thỏa thuận hợp tác và chịu trách nhiệm pháp lý cho các xuất bản phẩm.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Họ và tên người đại diện <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.repName}
                        onChange={(e) => handleChange('repName', e.target.value)}
                        placeholder="VD: NGUYỄN VĂN HÙNG"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Chức vụ trong đơn vị <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.repPosition}
                        onChange={(e) => handleChange('repPosition', e.target.value)}
                        placeholder="VD: Giám đốc / Tổng Biên Tập"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Số CCCD / Hộ chiếu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.repIdNumber}
                        onChange={(e) => handleChange('repIdNumber', e.target.value)}
                        placeholder="VD: 079094002381"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 font-mono focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Số điện thoại cá nhân người đại diện
                      </label>
                      <input
                        type="tel"
                        value={formData.repPhone}
                        onChange={(e) => handleChange('repPhone', e.target.value)}
                        placeholder="VD: 0908123456"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] focus:ring-2 focus:ring-[#006953]/15 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#f8f6f1] rounded-xl border border-[#e8e5df] text-xs text-gray-600 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-base text-[#006953] mt-0.5">verified_user</span>
                    <span>
                      HUKI cam kết bảo mật 100% dữ liệu định danh cá nhân theo tiêu chuẩn an toàn thông tin ISO 27001 và chỉ sử dụng cho mục đích đối soát pháp lý.
                    </span>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* BƯỚC 4: LIÊN HỆ & VẬN HÀNH TRỤ SỞ */}
              {/* ======================================================== */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="border-b border-[#e8e5df] pb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-1">4. Địa Chỉ Trụ Sở &amp; Liên Hệ Vận Hành</h2>
                    <p className="text-xs text-gray-500">
                      Địa chỉ dùng để ký kết hợp đồng điện tử, xuất hóa đơn VAT và điều phối lấy hàng sách in tận nơi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Tỉnh / Thành phố <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.province}
                        onChange={(e) => handleChange('province', e.target.value)}
                        placeholder="TP. Hồ Chí Minh"
                        className="w-full h-11 px-3 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Quận / Huyện <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => handleChange('district', e.target.value)}
                        placeholder="Quận 1"
                        className="w-full h-11 px-3 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">Phường / Xã <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.ward}
                        onChange={(e) => handleChange('ward', e.target.value)}
                        placeholder="Phường Bến Nghé"
                        className="w-full h-11 px-3 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Địa chỉ chi tiết trụ sở chính <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="VD: Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn"
                      className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      Địa chỉ kho hàng lấy sách in (cho đơn vị vận chuyển GHN/GHTK)
                    </label>
                    <input
                      type="text"
                      value={formData.warehouseAddress}
                      onChange={(e) => handleChange('warehouseAddress', e.target.value)}
                      placeholder="VD: Kho HUKI Vận Hành, 120 Song Hành, TP. Thủ Đức"
                      className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Email tiếp nhận đơn hàng &amp; đối soát <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="publisher@yourdomain.vn"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Hotline liên hệ vận hành <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="1900 8866"
                        className="w-full h-11 px-4 rounded-xl border border-[#e8e5df] bg-white text-sm text-gray-900 focus:border-[#006953] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* BƯỚC 5: HỒ SƠ PHÁP LÝ & BẢO HỘ DRM */}
              {/* ======================================================== */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <div className="border-b border-[#e8e5df] pb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-1">5. Hồ Sơ Xác Minh Pháp Lý &amp; Cam Kết DRM</h2>
                    <p className="text-xs text-gray-500">
                      Đính kèm tài liệu chứng minh quyền kinh doanh và xác nhận quy chế bảo mật bản quyền số HUKI DRM.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border-2 border-dashed border-[#d2dcda] bg-[#fbf9f5] text-center flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#006953] mb-1">upload_file</span>
                      <h4 className="text-xs font-bold text-gray-900">Bản scan Giấy phép ĐKKD (PDF / JPG)</h4>
                      <p className="text-[11px] text-gray-500 mt-1 mb-3">Tối đa 10MB, rõ dấu mộc đỏ cơ quan cấp phép</p>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span> Đã đính kèm gpkd-sample.pdf
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl border-2 border-dashed border-[#d2dcda] bg-[#fbf9f5] text-center flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#ac2c19] mb-1">description</span>
                      <h4 className="text-xs font-bold text-gray-900">Giấy ủy quyền xuất bản / Hợp đồng bản quyền</h4>
                      <p className="text-[11px] text-gray-500 mt-1 mb-3">Tài liệu ủy quyền phân phối sách giấy / Ebook</p>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span> Đã đính kèm banquyen-sample.pdf
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#f2fbf9] rounded-2xl border border-[#94f5d6]/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#006953]">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>Chính Sách Bảo Hộ Bản Quyền Số HUKI DRM</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Mọi ấn phẩm điện tử (Ebook/Audiobook) phát hành trên sàn HUKI đều được mã hóa bằng thuật toán khóa riêng biệt của tác giả, chống sao chép và chỉ đọc được qua ứng dụng HUKI được cấp phép.
                    </p>
                    <label className="flex items-center gap-2 pt-2 cursor-pointer select-none text-xs font-bold text-[#006953]">
                      <input
                        type="checkbox"
                        checked={formData.agreedDrmTerms}
                        onChange={(e) => handleChange('agreedDrmTerms', e.target.checked)}
                        className="w-4 h-4 rounded text-[#006953] focus:ring-[#006953]"
                      />
                      <span>Tôi đồng ý và cam kết tuân thủ quy chuẩn bản quyền DRM của HUKI</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* BƯỚC 6: XEM LẠI & GỬI HỒ SƠ */}
              {/* ======================================================== */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="border-b border-[#e8e5df] pb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-1">6. Xem Lại Tổng Thể &amp; Xác Nhận Gửi Hồ Sơ</h2>
                    <p className="text-xs text-gray-500">
                      Vui lòng kiểm tra lại toàn bộ thông tin đã khai báo trước khi nộp hồ sơ lên Ban Thẩm Định HUKI.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-[#f8f6f1] rounded-2xl border border-[#e8e5df] p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-[#e8e5df] pb-3">
                      <div>
                        <span className="text-gray-500">Loại hình pháp nhân:</span>
                        <p className="font-bold text-sm text-gray-900 mt-0.5">{formData.businessType}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-bold text-[#006953] hover:underline cursor-pointer"
                      >
                        Sửa
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#e8e5df] pb-3">
                      <div>
                        <span className="text-gray-500">Tên doanh nghiệp / NXB:</span>
                        <p className="font-bold text-sm text-gray-900 mt-0.5">{formData.name}</p>
                        <p className="text-gray-600 mt-0.5 font-mono">MST: {formData.taxCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-xs font-bold text-[#006953] hover:underline cursor-pointer"
                      >
                        Sửa
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#e8e5df] pb-3">
                      <div>
                        <span className="text-gray-500">Người đại diện pháp luật:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{formData.repName} ({formData.repPosition})</p>
                        <p className="text-gray-600 mt-0.5">CCCD: {formData.repIdNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-bold text-[#006953] hover:underline cursor-pointer"
                      >
                        Sửa
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#e8e5df] pb-3">
                      <div>
                        <span className="text-gray-500">Trụ sở &amp; Liên hệ:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{formData.address}, {formData.ward}, {formData.district}, {formData.province}</p>
                        <p className="text-gray-600 mt-0.5">Email: {formData.email} • Hotline: {formData.phone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-xs font-bold text-[#006953] hover:underline cursor-pointer"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 cursor-pointer select-none text-xs text-gray-800">
                    <input
                      type="checkbox"
                      checked={formData.agreedTerms}
                      onChange={(e) => handleChange('agreedTerms', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#006953] focus:ring-[#006953]"
                    />
                    <span>
                      Tôi cam kết toàn bộ thông tin đăng ký doanh nghiệp trên là trung thực, chính xác và chịu mọi trách nhiệm pháp lý trước pháp luật Việt Nam.
                    </span>
                  </label>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="pt-6 border-t border-[#e8e5df] flex flex-col sm:flex-row items-center justify-between gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#e8e5df] bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Quay Lại (Bước {currentStep - 1})</span>
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#e8e5df] bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Về Sàn HUKI</span>
                  </Link>
                )}

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <span>Tiếp Tục: {stepTitles[currentStep].title}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#ac2c19] hover:bg-[#8e1404] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>Đang gửi hồ sơ lên Ban Thẩm Định...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">verified</span>
                          <span>Xác Nhận &amp; Gửi Hồ Sơ Thẩm Định</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Progress & B2B Partner Info */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">

            {/* Progress Card */}
            <div className="bg-white border border-[#e8e5df] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-gray-900">Tiến Độ Hoàn Thành</div>
                <span className="text-xs font-bold text-[#006953]">{progressPercentage}%</span>
              </div>

              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-[#006953] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 font-medium mb-4">
                Bước {currentStep} trên 6: {stepTitles[currentStep - 1].title}
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#e8e5df] text-xs">
                {stepTitles.map((st) => {
                  const isDone = st.num < currentStep;
                  const isCurrent = st.num === currentStep;
                  return (
                    <div
                      key={st.num}
                      className={`flex items-center gap-2 p-1.5 rounded-lg ${isCurrent ? 'bg-[#f2fbf9] font-bold text-gray-900' : 'text-gray-500'
                        }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isDone ? 'text-[#006953]' : isCurrent ? 'text-[#006953]' : 'text-gray-300'
                        }`}>
                        {isDone ? 'check_circle' : isCurrent ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      <span className={isDone ? 'line-through opacity-70' : ''}>{st.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support B2B Info Box */}
            <div className="bg-[#f2fbf9] border border-[#d2dcda] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006953] text-[18px]">contact_phone</span>
                <span>Ban Hỗ Trợ Đối Tác B2B</span>
              </h3>
              <div className="space-y-2.5 text-xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Hotline thẩm định:</span>
                  <span className="font-bold text-[#006953]">1900 8866 (Nhánh 2)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Email tiếp nhận:</span>
                  <span className="font-mono text-gray-900 font-bold">publisher@hukiebook.vn</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Thời gian xử lý:</span>
                  <span className="font-bold text-gray-900">Từ 24h – 48h làm việc</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
