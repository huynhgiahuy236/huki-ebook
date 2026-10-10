"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi, CreateBusinessPayload } from '@/ui/api/businessApi';
import { taxRegistryService } from '@/ui/services/taxRegistryService';
import CustomLocationSelector, { LocationChangePayload } from '@/ui/components/common/CustomLocationSelector';

export function SellerRegisterView() {
  const router = useRouter();
  const { user, refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpTax, setIsLookingUpTax] = useState(false);
  const [isTaxVerified, setIsTaxVerified] = useState(false);
  const [, setTaxVerifiedSource] = useState('');

  // Check if business already exists
  React.useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await businessApi.getMyBusiness();
        if (res.success && res.data) {
          const b = (res.data as any)?.data || res.data;
          if (b.status === 'APPROVED') {
            router.replace('/seller/stores/setup');
          } else if (b.status === 'PENDING_APPROVAL') {
            router.replace('/seller/pending');
          }
        }
      } catch {
        // Not registered yet
      }
    };
    checkExisting();
  }, [router]);

  // Form State cho hồ sơ doanh nghiệp & đối tác
  const [formData, setFormData] = useState({
    // 1. Collection: businesses (Pháp lý doanh nghiệp & Cửa hàng)
    businessType: 'LLC' as 'CORPORATION' | 'LLC' | 'INDIVIDUAL' | 'PARTNERSHIP',
    company_name: '',
    store_name: '',
    international_name: '',
    short_name: '',
    tax_code: '',
    business_license_number: '',
    issue_date: '',
    issue_place: '',
    registered_street: '',
    registered_ward: '',
    registered_district: '',
    registered_province: '',
    license_document_url: '',
    ecommerce_industry_codes: '4791',
    website: '',
    description: '',

    // 2. Collection: business_representatives
    rep_full_name: '',
    rep_position: 'Người đại diện pháp luật',
    rep_id_card_number: '',
    rep_id_card_issue_date: '',
    rep_id_card_issue_place: '',
    rep_id_card_front_url: '',
    rep_id_card_back_url: '',
    operator_name: user?.fullName || '',
    operator_phone: user?.phone || '',
    operator_email: user?.email || '',
    authorization_letter_url: '',

    // 3. Collection: business_warehouses (Địa chỉ kho vật lý lấy hàng)
    warehouse_province: '',
    warehouse_province_code: '',
    warehouse_ward: '',
    warehouse_ward_code: '',
    warehouse_street: '',
    warehouse_contact_name: '',
    warehouse_contact_phone: '',

    // 4. Collection: business_compliance_docs
    compliance_doc_type: 'GIAY_PHEP_XUAT_BAN_SO',
    compliance_doc_number: '',
    compliance_issue_date: '',
    compliance_expiry_date: '',
    compliance_document_url: '',
    agreedDrmTerms: false,
    agreedTerms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const notify = (msg: string | { title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }, type?: 'success' | 'error' | 'info' | 'warning') => {
    if (typeof msg === 'string') {
      showToast?.(msg, type || 'info');
    } else {
      showToast?.(msg.message, msg.type || 'info');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'company_name' && typeof value === 'string') {
        if (!prev.store_name || prev.store_name === prev.company_name) {
          next.store_name = value;
        }
      }
      return next;
    });

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle warehouse location change from CustomLocationSelector
  const handleWarehouseLocationChange = (payload: LocationChangePayload) => {
    setFormData((prev) => ({
      ...prev,
      warehouse_province: payload.province,
      warehouse_province_code: payload.provinceCode || '',
      warehouse_ward: payload.ward,
      warehouse_ward_code: payload.wardCode || '',
    }));
    if (fieldErrors.warehouse_street) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.warehouse_street;
        return next;
      });
    }
  };

  // Tra cứu tự động từ CSDL Doanh nghiệp
  const handleLookupTaxCode = async (codeToLookup?: string) => {
    const targetCode = codeToLookup || formData.tax_code;
    if (!targetCode || targetCode.trim().length < 10) {
      setFieldErrors((prev) => ({
        ...prev,
        tax_code: 'Vui lòng nhập Mã số thuế hợp lệ (10 - 13 chữ số).',
      }));
      return;
    }

    setIsLookingUpTax(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.tax_code;
      return next;
    });

    const res = await taxRegistryService.lookupTaxCode(targetCode);
    setIsLookingUpTax(false);

    if (res.success && res.data) {
      const data = res.data;
      setFormData((prev) => ({
        ...prev,
        tax_code: data.tax_code,
        business_license_number: data.business_license_number,
        company_name: data.company_name,
        store_name: prev.store_name || data.short_name || data.company_name,
        international_name: data.international_name || prev.international_name,
        short_name: data.short_name || prev.short_name,
        businessType: (data.business_type as any) || prev.businessType,
        issue_date: data.issue_date || prev.issue_date,
        issue_place: data.issue_place || prev.issue_place,
        registered_street: data.registered_address?.street || prev.registered_street,
        registered_ward: data.registered_address?.ward || prev.registered_ward,
        registered_district: data.registered_address?.district || prev.registered_district,
        registered_province: data.registered_address?.province || prev.registered_province,
        rep_full_name: data.representative?.full_name || prev.rep_full_name,
        rep_position: data.representative?.position || prev.rep_position,
        ecommerce_industry_codes: (data.ecommerce_industry_codes || []).join(', ') || prev.ecommerce_industry_codes,
      }));

      setIsTaxVerified(true);
      setTaxVerifiedSource(
        data.verified_source === 'LOCAL_REGISTRY_DB'
          ? 'CSDL Doanh Nghiệp Quốc Gia (Cache Nội Bộ)'
          : 'Cổng Tra Cứu Thuế Trực Tuyến (Live API)'
      );

      notify({
        title: 'Tra cứu CSDL thành công',
        message: `Đã đối chiếu & tự động điền dữ liệu pháp nhân của "${data.company_name}". Vui lòng hoàn tất các thông tin người đại diện và kho hàng tiếp theo.`,
        type: 'success',
      });
    } else {
      setIsTaxVerified(false);
      notify({
        title: 'Chưa có trong CSDL tự động',
        message: res.error || 'Vui lòng kiểm tra lại MST hoặc nhập thông tin thủ công.',
        type: 'info',
      });
    }
  };

  const validateSingleField = (field: string, value: any) => {
    let error = '';
    const trimmed = typeof value === 'string' ? value.trim() : value;

    if (field === 'tax_code') {
      if (!trimmed) error = 'Vui lòng nhập Mã số thuế doanh nghiệp.';
      else if (!/^[0-9]{10}(-[0-9]{3})?$/.test(trimmed.replace(/\s+/g, ''))) {
        error = 'Mã số thuế phải gồm 10 hoặc 13 chữ số (VD: 0318926410 hoặc 0318926410-001).';
      }
    } else if (field === 'company_name') {
      if (!trimmed) error = 'Vui lòng nhập Tên chính thức của doanh nghiệp.';
      else if (trimmed.length < 5) error = 'Tên doanh nghiệp quá ngắn (tối thiểu 5 ký tự).';
    } else if (field === 'store_name') {
      if (!trimmed) error = 'Vui lòng nhập Tên Gian Hàng / Cửa Hàng hiển thị.';
      else if (trimmed.length < 3) error = 'Tên gian hàng quá ngắn (tối thiểu 3 ký tự).';
      else if (trimmed.length > 100) error = 'Tên gian hàng không được vượt quá 100 ký tự.';
    } else if (field === 'registered_street') {
      if (!trimmed) error = 'Vui lòng nhập địa chỉ trụ sở chính.';
    } else if (field === 'rep_full_name') {
      if (!trimmed) error = 'Vui lòng nhập Họ tên người đại diện pháp luật.';
    } else if (field === 'rep_id_card_number') {
      if (!trimmed) error = 'Vui lòng nhập Số CCCD/Hộ chiếu.';
      else if (!/^[0-9A-Za-z]{9,12}$/.test(trimmed)) {
        error = 'Số CCCD/CMND phải gồm 9 đến 12 chữ số hợp lệ.';
      }
    } else if (field === 'operator_phone') {
      if (!trimmed) error = 'Vui lòng nhập Số điện thoại người vận hành.';
      else if (!/^(0|\+84)[0-9]{9,10}$/.test(trimmed.replace(/\s+/g, ''))) {
        error = 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 0 hoặc +84).';
      }
    } else if (field === 'operator_email') {
      if (!trimmed) error = 'Vui lòng nhập Email người vận hành.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        error = 'Địa chỉ email không đúng định dạng (VD: contact@company.vn).';
      }
    } else if (field === 'warehouse_ward') {
      if (!trimmed) error = 'Vui lòng chọn Xã/Phường cho địa chỉ kho hàng.';
    } else if (field === 'warehouse_contact_phone') {
      if (!trimmed) error = 'Vui lòng nhập SĐT người liên hệ kho.';
      else if (!/^(0|\+84)[0-9]{9,10}$/.test(trimmed.replace(/\s+/g, ''))) {
        error = 'Số điện thoại kho không hợp lệ (gồm 10 số).';
      }
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });

    return !error;
  };

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.tax_code.trim()) errors.tax_code = 'Vui lòng nhập Mã số thuế doanh nghiệp.';
      else if (!/^[0-9]{10}(-[0-9]{3})?$/.test(formData.tax_code.trim().replace(/\s+/g, ''))) {
        errors.tax_code = 'Mã số thuế phải gồm 10 hoặc 13 chữ số (VD: 0318926410).';
      }
      if (!formData.company_name.trim()) errors.company_name = 'Vui lòng nhập Tên chính thức của doanh nghiệp.';
      if (!formData.store_name.trim()) errors.store_name = 'Vui lòng nhập Tên Gian Hàng / Cửa Hàng hiển thị.';
      else if (formData.store_name.trim().length < 3) errors.store_name = 'Tên gian hàng quá ngắn (tối thiểu 3 ký tự).';
      else if (formData.store_name.trim().length > 100) errors.store_name = 'Tên gian hàng không được vượt quá 100 ký tự.';
      if (!formData.businessType) errors.businessType = 'Vui lòng chọn loại hình doanh nghiệp.';
      if (!formData.registered_street.trim()) errors.registered_street = 'Vui lòng nhập địa chỉ trụ sở chính.';
    } else if (step === 2) {
      if (!formData.rep_full_name.trim()) errors.rep_full_name = 'Vui lòng nhập Họ tên người đại diện pháp luật.';
      if (!formData.rep_id_card_number.trim()) errors.rep_id_card_number = 'Vui lòng nhập Số CCCD/Hộ chiếu.';
      else if (!/^[0-9A-Za-z]{9,12}$/.test(formData.rep_id_card_number.trim())) {
        errors.rep_id_card_number = 'Số CCCD/CMND phải gồm 9 đến 12 chữ số hợp lệ.';
      }
      if (!formData.operator_phone.trim()) errors.operator_phone = 'Vui lòng nhập Số điện thoại người vận hành.';
      else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.operator_phone.trim().replace(/\s+/g, ''))) {
        errors.operator_phone = 'Số điện thoại người vận hành không hợp lệ.';
      }
      if (!formData.operator_email.trim()) errors.operator_email = 'Vui lòng nhập Email người vận hành.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.operator_email.trim())) {
        errors.operator_email = 'Email người vận hành không đúng định dạng.';
      }
    } else if (step === 3) {
      if (!formData.warehouse_province.trim()) errors.warehouse_province = 'Vui lòng chọn Tỉnh/Thành phố cho kho hàng.';
      if (!formData.warehouse_ward.trim()) errors.warehouse_ward = 'Vui lòng chọn Xã/Phường cho địa chỉ kho hàng.';
      if (!formData.warehouse_contact_phone.trim()) errors.warehouse_contact_phone = 'Vui lòng nhập SĐT thủ kho / người liên hệ.';
      else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.warehouse_contact_phone.trim().replace(/\s+/g, ''))) {
        errors.warehouse_contact_phone = 'Số điện thoại kho không hợp lệ.';
      }
    } else if (step === 4) {
      if (!formData.agreedDrmTerms) errors.agreedDrmTerms = 'Vui lòng đồng ý với cam kết bảo hộ bản quyền DRM HUKI.';
    } else if (step === 5) {
      if (!formData.agreedTerms) errors.agreedTerms = 'Vui lòng xác nhận tính trung thực và cam kết điều khoản sàn.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      notify({
        title: 'Thông tin chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại các trường báo đỏ trước khi tiếp tục.',
        type: 'error',
      });
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(5)) return;

    setIsSubmitting(true);

    const fullRegisteredAddress = [
      formData.registered_street,
      formData.registered_ward,
      formData.registered_district,
      formData.registered_province,
    ]
      .filter(Boolean)
      .join(', ');

    const payload: CreateBusinessPayload = {
      name: formData.company_name.trim(),
      store_name: formData.store_name.trim() || formData.company_name.trim(),
      taxCode: formData.tax_code.trim(),
      address: fullRegisteredAddress,
      email: formData.operator_email.trim(),
      phone: formData.operator_phone.trim(),
      businessType: formData.businessType,
    };

    // Xây dựng địa chỉ kho hoàn chỉnh
    const fullWarehouseAddress = [
      formData.warehouse_street,
      formData.warehouse_ward,
      formData.warehouse_province,
    ].filter(Boolean).join(', ');

    const fullProfile = {
      tax_code: formData.tax_code.trim(),
      company_name: formData.company_name.trim(),
      store_name: formData.store_name.trim() || formData.company_name.trim(),
      international_name: formData.international_name.trim(),
      short_name: formData.short_name.trim(),
      business_license_number: formData.business_license_number.trim() || formData.tax_code.trim(),
      issue_date: formData.issue_date || new Date().toISOString().slice(0, 10),
      issue_place: formData.issue_place || 'Sở Kế hoạch và Đầu tư',
      business_type: formData.businessType,
      registered_address: fullRegisteredAddress,
      email: formData.operator_email.trim(),
      phone: formData.operator_phone.trim(),
      website: formData.website.trim(),
      rep_full_name: formData.rep_full_name.trim(),
      rep_position: formData.rep_position.trim(),
      rep_id_card_number: formData.rep_id_card_number.trim(),
      rep_id_card_issue_date: formData.rep_id_card_issue_date || '2022-01-01',
      rep_id_card_issue_place: formData.rep_id_card_issue_place || 'Cục Cảnh sát QLHC về TTXH',
      rep_phone: formData.operator_phone.trim(),
      rep_email: formData.operator_email.trim(),
      rep_permanent_address: fullRegisteredAddress,
      // NOTE: bank details & PIN sẽ được thiết lập trong luồng Setup Store sau khi duyệt
      warehouse_address: fullWarehouseAddress || fullRegisteredAddress,
      warehouse_contact_name: formData.warehouse_contact_name.trim(),
      warehouse_contact_phone: formData.warehouse_contact_phone.trim(),
      partner_type: 'PUBLISHER',
      publishing_license_number: formData.compliance_doc_number || 'GP-XB/2024-HUKI',
      license_issue_date: formData.compliance_issue_date || '2024-01-01',
      estimated_book_count: 100,
      main_genres: ['Kinh Tế', 'Văn Học', 'Kỹ Năng Sống', 'Công Nghệ'],
      document_business_license: formData.license_document_url || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
      document_id_front: formData.rep_id_card_front_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
      document_id_back: formData.rep_id_card_back_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80',
      document_publishing_permit: formData.compliance_document_url || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
      terms_accepted: formData.agreedTerms,
      copyright_commitment: formData.agreedDrmTerms,
    };

    try {
      localStorage.setItem(`huki_enterprise_profile_${formData.tax_code.trim()}`, JSON.stringify(fullProfile));
    } catch {
      // ignore
    }

    try {
      const res = await businessApi.registerBusiness(payload);
      setIsSubmitting(false);

      if (res.success || res.data) {
        const savedBizId = res.data?.id;
        if (savedBizId) {
          try {
            localStorage.setItem(`huki_enterprise_profile_${savedBizId}`, JSON.stringify({ ...fullProfile, id: savedBizId }));
          } catch {
            // ignore
          }
        }

        notify({
          title: 'Gửi hồ sơ thành công',
          message: 'Hồ sơ đối tác đã được gửi đến Ban thẩm định HUKI và sẽ được phê duyệt trong 24h - 48h.',
          type: 'success',
        });
        if (refreshBusiness) {
          await refreshBusiness();
        }
        // Redirect về trang pending
        router.push('/seller/pending');
      } else {
        const errorMsg = res.error?.message || 'Có lỗi phát sinh khi gửi hồ sơ đối tác. Vui lòng kiểm tra lại thông tin.';
        notify({
          title: 'Chưa thể gửi hồ sơ',
          message: errorMsg,
          type: 'error',
        });
      }
    } catch {
      setIsSubmitting(false);
      notify({
        title: 'Gián đoạn kết nối',
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền internet.',
        type: 'error',
      });
    }
  };

  const stepTitles = [
    { num: 1, title: '1. Pháp Lý Doanh Nghiệp', desc: 'MST & Tra cứu CSDL' },
    { num: 2, title: '2. Người Đại Diện', desc: 'Đại diện & CCCD e-KYC' },
    { num: 3, title: '3. Kho Hàng Vận Hành', desc: 'Địa chỉ lấy hàng vật lý' },
    { num: 4, title: '4. Giấy Phép & DRM', desc: 'Xuất bản & Bản quyền số' },
    { num: 5, title: '5. Xem Lại & Gửi', desc: 'Thẩm định hồ sơ' },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAF8F5] text-slate-900 py-8 antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003B2B]/10 text-[#003B2B] text-xs font-semibold mb-2">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Quy trình thẩm định đối tác Nhà Bán Hàng &amp; NXB HUKI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
              Đăng Ký Hồ Sơ Doanh Nghiệp &amp; Nhà Bán Hàng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Hệ thống tự động đối chiếu thông tin pháp nhân từ CSDL Doanh nghiệp Quốc Gia nhằm rút ngắn thời gian phê duyệt.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs self-start md:self-auto shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-slate-600 font-medium">
              Tiến trình: <strong className="text-slate-900 font-bold">Bước {currentStep} / 5</strong>
            </span>
          </div>
        </div>

        {/* 5-Step Stepper Bar */}
        <section className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isCurrent
                      ? 'bg-white border-[#003B2B] ring-2 ring-[#003B2B]/15 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 cursor-pointer hover:bg-emerald-50'
                      : 'bg-white/60 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#003B2B] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : step.num}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase">Đã xong</span>
                    )}
                  </div>
                  <div className="font-semibold text-xs text-slate-900 truncate">{step.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{step.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* ========================================================================= */}
          {/* BƯỚC 1: COLLECTION businesses */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-editorial text-slate-900">
                  1. Hồ Sơ Pháp Lý Doanh Nghiệp &amp; Đối Chiếu CSDL
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập Mã số thuế để hệ thống tự động đối chiếu thông tin pháp nhân từ CSDL Quốc Gia
                </p>
              </div>

              {/* Tax Code Input & Auto Lookup Banner */}
              <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mã số thuế / Mã số doanh nghiệp (tax_code) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tax_code}
                      onChange={(e) => handleChange('tax_code', e.target.value)}
                      onBlur={(e) => validateSingleField('tax_code', e.target.value)}
                      placeholder="Nhập 10 hoặc 13 chữ số (VD: 0318926410)..."
                      className={`w-full h-12 bg-white border rounded-xl px-4 text-sm font-mono font-bold tracking-wider text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                        fieldErrors.tax_code
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15'
                      }`}
                    />
                    {fieldErrors.tax_code && (
                      <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.tax_code}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isLookingUpTax}
                    onClick={() => handleLookupTaxCode()}
                    className="h-12 px-5 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                  >
                    {isLookingUpTax ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang tra cứu...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">search_insights</span>
                        <span>Tra cứu CSDL</span>
                      </>
                    )}
                  </button>
                </div>

                {isTaxVerified && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                    <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                    <span>Đã đối chiếu thành công với CSDL Doanh nghiệp Quốc Gia</span>
                  </div>
                )}
              </div>

              {/* Thông tin chi tiết doanh nghiệp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên đầy đủ theo ĐKKD (company_name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    onBlur={(e) => validateSingleField('company_name', e.target.value)}
                    placeholder="CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH TP. HCM - FAHASA"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm font-semibold text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.company_name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.company_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên Gian Hàng / Thương Hiệu hiển thị (store_name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.store_name}
                    onChange={(e) => handleChange('store_name', e.target.value)}
                    onBlur={(e) => validateSingleField('store_name', e.target.value)}
                    placeholder="FAHASA Official Store"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm font-semibold text-emerald-800 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.store_name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.store_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Loại hình doanh nghiệp (business_type) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  >
                    <option value="LLC">Công ty TNHH (Trách nhiệm hữu hạn)</option>
                    <option value="CORPORATION">Công ty Cổ Phần (Joint Stock)</option>
                    <option value="INDIVIDUAL">Hộ Kinh Doanh Cá Thể / Cá Nhân</option>
                    <option value="PARTNERSHIP">Công ty Hợp Danh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã ngành TMĐT tuân thủ NĐ 52 &amp; 85 (ecommerce_industry_codes)
                  </label>
                  <input
                    type="text"
                    value={formData.ecommerce_industry_codes}
                    onChange={(e) => handleChange('ecommerce_industry_codes', e.target.value)}
                    placeholder="4791 (Bán lẻ qua TMĐT), 5811 (Xuất bản sách)..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày cấp Giấy phép ĐKKD (issue_date)
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => handleChange('issue_date', e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nơi cấp Giấy phép ĐKKD (issue_place)
                  </label>
                  <input
                    type="text"
                    value={formData.issue_place}
                    onChange={(e) => handleChange('issue_place', e.target.value)}
                    placeholder="Sở Kế hoạch và Đầu tư..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa chỉ trụ sở chính pháp lý (registered_address) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.registered_street}
                    onChange={(e) => handleChange('registered_street', e.target.value)}
                    onBlur={(e) => validateSingleField('registered_street', e.target.value)}
                    placeholder="Số nhà, tên đường, tầng tòa nhà, phường/xã, quận/huyện, tỉnh/thành phố..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.registered_street && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.registered_street}</p>
                  )}
                </div>

                {/* Upload Giấy phép ĐKKD */}
                <div className="md:col-span-2 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ảnh chụp / Bản scan Giấy chứng nhận ĐKKD (license_document_url) <span className="text-red-500">*</span>
                  </label>
                  <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <span className="material-symbols-outlined text-xl text-[#003B2B]">description</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {formData.license_document_url ? 'Giấy_Phep_DKKD_Xac_Thuc.pdf' : 'Tải lên bản scan hoặc ảnh màu Giấy phép ĐKKD'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Hỗ trợ định dạng PDF, JPG, PNG (tối đa 15MB)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        <span>Chọn tệp</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleChange('license_document_url', URL.createObjectURL(file));
                              notify({ title: 'Đã tải lên tệp', message: file.name, type: 'success' });
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          handleChange('license_document_url', 'https://cdn.hukiebook.vn/licenses/gpkd-sample-2026.pdf');
                          notify({ title: 'Đã chọn tệp mẫu', message: 'Giấy_Phep_DKKD_Sample_2026.pdf', type: 'info' });
                        }}
                        className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        File mẫu
                      </button>
                    </div>
                  </div>
                  {formData.license_document_url && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Đã đính kèm tệp minh chứng ĐKKD</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 2: COLLECTION business_representatives */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-editorial text-slate-900">
                  2. Người Đại Diện Pháp Luật &amp; Quản Lý Vận Hành
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vui lòng hoàn tất thông tin CCCD của người đại diện và người phụ trách vận hành
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ và tên người đại diện pháp luật (full_name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rep_full_name}
                    onChange={(e) => handleChange('rep_full_name', e.target.value)}
                    onBlur={(e) => validateSingleField('rep_full_name', e.target.value)}
                    placeholder="NGUYỄN VĂN HÙNG"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.rep_full_name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.rep_full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chức danh / Vị trí (position)
                  </label>
                  <input
                    type="text"
                    value={formData.rep_position}
                    onChange={(e) => handleChange('rep_position', e.target.value)}
                    placeholder="Giám đốc Điều hành / Tổng Giám đốc..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số CCCD / Hộ chiếu người đại diện (id_card_number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rep_id_card_number}
                    onChange={(e) => handleChange('rep_id_card_number', e.target.value)}
                    onBlur={(e) => validateSingleField('rep_id_card_number', e.target.value)}
                    placeholder="Nhập 12 chữ số CCCD (VD: 079094002381)..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm font-mono text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.rep_id_card_number && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.rep_id_card_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày cấp CCCD (id_card_issue_date)
                  </label>
                  <input
                    type="date"
                    value={formData.rep_id_card_issue_date}
                    onChange={(e) => handleChange('rep_id_card_issue_date', e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ tên người vận hành chính (operator_contact.name)
                  </label>
                  <input
                    type="text"
                    value={formData.operator_name}
                    onChange={(e) => handleChange('operator_name', e.target.value)}
                    placeholder="Họ tên người quản lý gian hàng..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    SĐT liên hệ vận hành (operator_contact.phone) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.operator_phone}
                    onChange={(e) => handleChange('operator_phone', e.target.value)}
                    onBlur={(e) => validateSingleField('operator_phone', e.target.value)}
                    placeholder="0908123456"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.operator_phone && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.operator_phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email nhận thông báo đơn hàng (operator_contact.email) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.operator_email}
                    onChange={(e) => handleChange('operator_email', e.target.value)}
                    onBlur={(e) => validateSingleField('operator_email', e.target.value)}
                    placeholder="publisher@company.vn"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.operator_email && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.operator_email}</p>
                  )}
                </div>

                {/* Upload CCCD */}
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-3">
                    Ảnh chụp giấy tờ tùy thân CCCD / Hộ chiếu người đại diện (e-KYC)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-colors">
                      <span className="material-symbols-outlined text-2xl text-slate-500">badge</span>
                      <div className="text-xs font-semibold text-slate-800">
                        {formData.rep_id_card_front_url ? 'CCCD_Mat_Truoc_Da_Chon.jpg' : 'Mặt trước CCCD / Hộ chiếu'}
                      </div>
                      <label className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
                        <span>Tải ảnh lên</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleChange('rep_id_card_front_url', URL.createObjectURL(file));
                              notify({ title: 'Đã tải lên ảnh', message: 'Mặt trước CCCD', type: 'success' });
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="p-3.5 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-colors">
                      <span className="material-symbols-outlined text-2xl text-slate-500">credit_card</span>
                      <div className="text-xs font-semibold text-slate-800">
                        {formData.rep_id_card_back_url ? 'CCCD_Mat_Sau_Da_Chon.jpg' : 'Mặt sau CCCD (Có mã vạch)'}
                      </div>
                      <label className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
                        <span>Tải ảnh lên</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleChange('rep_id_card_back_url', URL.createObjectURL(file));
                              notify({ title: 'Đã tải lên ảnh', message: 'Mặt sau CCCD', type: 'success' });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 3: COLLECTION business_warehouses */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-editorial text-slate-900">
                  3. Thông Tin Kho Xuất Hàng &amp; Vận Hành Lấy Hàng
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Địa chỉ thực tế để các đơn vị vận chuyển (GHN, Viettel Post, Shopee Xpress) đến lấy sách khi có đơn mới.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Địa chỉ kho - dùng CustomLocationSelector */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-3">
                    Địa chỉ kho hàng (Tỉnh/Thành + Xã/Phường) <span className="text-red-500">*</span>
                  </label>
                  <CustomLocationSelector
                    province={formData.warehouse_province}
                    provinceCode={formData.warehouse_province_code}
                    ward={formData.warehouse_ward}
                    wardCode={formData.warehouse_ward_code}
                    onChange={handleWarehouseLocationChange}
                    required={true}
                  />
                  {fieldErrors.warehouse_ward && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.warehouse_ward}</p>
                  )}
                </div>

                {/* Số nhà, tên đường */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số nhà, tên đường, tầng (tùy chọn, bổ sung địa chỉ chi tiết)
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse_street}
                    onChange={(e) => handleChange('warehouse_street', e.target.value)}
                    placeholder="VD: Số 123 Đường Nguyễn Trãi, Tầng 3, Tòa nhà ABC..."
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên thủ kho / Người phụ trách tại điểm kho (warehouse_contact_name)
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse_contact_name}
                    onChange={(e) => handleChange('warehouse_contact_name', e.target.value)}
                    placeholder="Trần Văn Kho"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số điện thoại liên hệ kho (warehouse_contact_phone) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse_contact_phone}
                    onChange={(e) => handleChange('warehouse_contact_phone', e.target.value)}
                    onBlur={(e) => validateSingleField('warehouse_contact_phone', e.target.value)}
                    placeholder="0918889999"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                  {fieldErrors.warehouse_contact_phone && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.warehouse_contact_phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 4: COLLECTION business_compliance_docs */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-editorial text-slate-900">
                  4. Giấy Phép Ngành Nghề Đặc Thù &amp; Bản Quyền DRM
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xác thực điều kiện phát hành sách, nội dung số có bản quyền và cam kết công nghệ DRM
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Loại giấy phép ngành nghề (doc_type)
                  </label>
                  <input
                    type="text"
                    value={formData.compliance_doc_type}
                    onChange={(e) => handleChange('compliance_doc_type', e.target.value)}
                    placeholder="GIAY_PHEP_XUAT_BAN_SO / BRAND_AUTHORIZATION"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số hiệu giấy phép / Quyết định (doc_number)
                  </label>
                  <input
                    type="text"
                    value={formData.compliance_doc_number}
                    onChange={(e) => handleChange('compliance_doc_number', e.target.value)}
                    placeholder="GP-XB-2026/88-HUKI"
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày cấp giấy phép (issue_date)
                  </label>
                  <input
                    type="date"
                    value={formData.compliance_issue_date}
                    onChange={(e) => handleChange('compliance_issue_date', e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày hết hạn hiệu lực (expiry_date)
                  </label>
                  <input
                    type="date"
                    value={formData.compliance_expiry_date}
                    onChange={(e) => handleChange('compliance_expiry_date', e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#003B2B] focus:ring-2 focus:ring-[#003B2B]/15 rounded-xl px-4 text-sm text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Upload Giấy phép */}
                <div className="md:col-span-2 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Bản scan Giấy phép xuất bản / Hợp đồng ủy quyền tác quyền (document_urls)
                  </label>
                  <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#003B2B] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <span className="material-symbols-outlined text-xl text-[#003B2B]">folder_special</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {formData.compliance_document_url ? 'Giay_Phep_Xuat_Ban_DRM.pdf' : 'Tải lên Giấy phép xuất bản hoặc Chứng nhận Mall'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Hỗ trợ định dạng PDF, JPG, PNG (tối đa 25MB)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        <span>Chọn tệp</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleChange('compliance_document_url', URL.createObjectURL(file));
                              notify({ title: 'Đã tải lên tệp', message: file.name, type: 'success' });
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          handleChange('compliance_document_url', 'https://cdn.hukiebook.vn/permits/xuatban-sample-2026.pdf');
                          notify({ title: 'Đã chọn tệp mẫu', message: 'Giay_Phep_Xuat_Ban_Sample_2026.pdf', type: 'info' });
                        }}
                        className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        File mẫu
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* DRM Terms Agreement */}
              <div className="p-4 bg-[#003B2B]/5 border border-[#003B2B]/20 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreedDrm"
                    checked={formData.agreedDrmTerms}
                    onChange={(e) => handleChange('agreedDrmTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#003B2B] focus:ring-[#003B2B] border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="agreedDrm" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                    <strong className="text-slate-900">Cam kết bản quyền &amp; Mã hóa DRM Tiêu chuẩn:</strong> Doanh nghiệp cam kết toàn bộ các ấn phẩm sách giấy, sách điện tử và sách nói đăng tải trên hệ sinh thái HUKI đều có đầy đủ hợp đồng chuyển nhượng tác quyền hợp pháp và đồng ý bảo vệ nội dung số thông qua chuẩn mã hóa bảo mật DRM của HUKI.
                  </label>
                </div>
                {fieldErrors.agreedDrmTerms && (
                  <p className="text-xs text-red-500 font-medium">{fieldErrors.agreedDrmTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BƯỚC 5: XEM LẠI TỔNG QUAN & GỬI THẨM ĐỊNH */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg sm:text-xl font-bold font-editorial text-slate-900">
                  5. Xem Lại Toàn Bộ Hồ Sơ &amp; Gửi Thẩm Định
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vui lòng rà soát lại thông tin đối chiếu trước khi gửi tới Ban thẩm định HUKI
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>1. Pháp Lý Doanh Nghiệp &amp; Gian Hàng</span>
                    <span className="text-emerald-700 font-semibold">{isTaxVerified ? '✓ Đã xác thực' : 'Khởi tạo'}</span>
                  </div>
                  <div><span className="text-slate-500">Tên DN:</span> <strong className="text-slate-900">{formData.company_name || 'Chưa nhập'}</strong></div>
                  <div><span className="text-slate-500">Gian hàng:</span> <strong className="text-emerald-800 font-semibold">{formData.store_name || formData.company_name || 'Chưa nhập'}</strong></div>
                  <div><span className="text-slate-500">MST:</span> <span className="font-mono font-bold text-slate-900">{formData.tax_code || 'Chưa nhập'}</span></div>
                  <div><span className="text-slate-500">Loại hình:</span> <span className="text-slate-900">{formData.businessType}</span></div>
                  <div><span className="text-slate-500">Trụ sở:</span> <span className="text-slate-900">{formData.registered_street || 'Chưa nhập'}</span></div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>2. Đại Diện &amp; Vận Hành</span>
                    <span className="text-emerald-700 font-semibold">✓ Hợp lệ</span>
                  </div>
                  <div><span className="text-slate-500">Đại diện:</span> <strong className="text-slate-900">{formData.rep_full_name || 'Chưa nhập'}</strong></div>
                  <div><span className="text-slate-500">Số CCCD:</span> <span className="font-mono text-slate-900">{formData.rep_id_card_number || 'Chưa nhập'}</span></div>
                  <div><span className="text-slate-500">Hotline:</span> <span className="text-slate-900">{formData.operator_phone || 'Chưa nhập'}</span></div>
                  <div><span className="text-slate-500">Email:</span> <span className="text-slate-900">{formData.operator_email || 'Chưa nhập'}</span></div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 md:col-span-2">
                  <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>3. Kho Xuất Hàng Vật Lý</span>
                    <span className="text-emerald-700 font-semibold">✓ Sẵn sàng</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Địa chỉ kho:</span>{' '}
                    <span className="text-slate-900 font-medium">
                      {[formData.warehouse_street, formData.warehouse_ward, formData.warehouse_province].filter(Boolean).join(', ') || 'Chưa chọn'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Liên hệ kho:</span>{' '}
                    <span className="text-slate-900">{formData.warehouse_contact_name || 'Thủ kho'} ({formData.warehouse_contact_phone || 'Chưa có SĐT'})</span>
                  </div>
                </div>
              </div>

              {/* Note about bank setup */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-700 shrink-0 text-xl">account_balance</span>
                <div className="text-xs text-emerald-900">
                  <strong className="block mb-0.5">Thiết lập tài khoản ngân hàng &amp; Mã PIN bảo mật</strong>
                  <p className="text-emerald-800 leading-relaxed">
                    Sau khi Ban quản trị sàn HUKI thẩm định và phê duyệt hồ sơ doanh nghiệp, bạn sẽ hoàn tất việc liên kết <strong>Tài khoản ngân hàng</strong> và thiết lập <strong>Mã PIN 6 số</strong> trong luồng Thiết Lập Gian Hàng.
                  </p>
                </div>
              </div>

              {/* Final Agreement */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreedFinal"
                    checked={formData.agreedTerms}
                    onChange={(e) => handleChange('agreedTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#003B2B] focus:ring-[#003B2B] border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="agreedFinal" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                    Tôi cam kết toàn bộ thông tin kê khai trên là hoàn toàn chính xác, đúng pháp luật và chịu trách nhiệm trước pháp luật về tính pháp lý của doanh nghiệp và quyền phát hành sách trên sàn HUKI.
                  </label>
                </div>
                {fieldErrors.agreedTerms && (
                  <p className="text-xs text-red-500 font-medium">{fieldErrors.agreedTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                ← Quay lại bước {currentStep - 1}
              </button>
            ) : (
              <Link
                href="/seller"
                className="h-12 px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center transition-colors"
              >
                Về Kênh Người Bán
              </Link>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Tiếp tục bước {currentStep + 1} →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang gửi hồ sơ thẩm định...</span>
                  </>
                ) : (
                  <span>Gửi hồ sơ đăng ký doanh nghiệp</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default SellerRegisterView;
