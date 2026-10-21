'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi, type ProgramInfoResponse } from '@/lib/affiliate/affiliateApi';
import {
  affiliateStep1Schema,
  affiliateStep2Schema,
  affiliateStep3Schema,
  affiliateRegistrationSchema,
  type AffiliateRegistrationInput,
} from '@/lib/affiliate/schemas';

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [topErrorMessage, setTopErrorMessage] = useState<{ message: string; requestId?: string } | null>(null);
  const [validationSuccessNotice, setValidationSuccessNotice] = useState<string | null>(null);

  // Policy modal state
  const [activePolicyModal, setActivePolicyModal] = useState<'TERMS' | 'PRIVACY' | null>(null);
  const [programInfo, setProgramInfo] = useState<ProgramInfoResponse | null>(null);

  // Async code availability check state
  const [codeStatus, setCodeStatus] = useState<'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UNAVAILABLE' | 'INVALID'>('IDLE');
  const [codeMessage, setCodeMessage] = useState<string>('');

  // Profile check on mount & submission loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  type RegisterFormState = Omit<
    AffiliateRegistrationInput,
    'acceptedAffiliateTerms' | 'acceptedPrivacyNotice' | 'confirmedInformationAccuracy'
  > & {
    acceptedAffiliateTerms: boolean;
    acceptedPrivacyNotice: boolean;
    confirmedInformationAccuracy: boolean;
  };

  // Form State
  const [formData, setFormData] = useState<RegisterFormState>({
    displayName: user?.fullName || user?.name || '',
    affiliateCode: '',
    bio: '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || '',
    useAccountAvatar: true,
    avatarUrl: null,
    channels: [
      {
        type: 'FACEBOOK',
        url: '',
        handle: '',
        followersRange: 'FROM_1K_TO_5K',
        isPrimary: true,
      },
    ],
    contentCategories: ['Văn học', 'Kinh tế'],
    promotionMethods: ['REVIEW', 'SOCIAL_POST'],
    applicantType: 'INDIVIDUAL',
    promotionDescription: '',
    hasPaidTraffic: false,
    paidTrafficSources: [],
    taxId: '',
    payoutSetupLater: true,
    acceptedAffiliateTerms: false,
    acceptedPrivacyNotice: false,
    confirmedInformationAccuracy: false,
    marketingConsent: false,
  });

  // Handle Channel Changes
  const handleAddChannel = () => {
    if (formData.channels.length >= 10) {
      showToast('Tối đa 10 kênh quảng bá.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      channels: [
        ...prev.channels,
        {
          type: 'TIKTOK',
          url: '',
          handle: '',
          followersRange: 'FROM_1K_TO_5K',
          isPrimary: false,
        },
      ],
    }));
  };

  const handleRemoveChannel = (index: number) => {
    if (formData.channels.length <= 1) {
      showToast('Cần ít nhất 1 kênh quảng bá.', 'warning');
      return;
    }
    const wasPrimary = formData.channels[index].isPrimary;
    const newChannels = formData.channels.filter((_, i) => i !== index);
    if (wasPrimary && newChannels.length > 0) {
      newChannels[0].isPrimary = true;
    }
    setFormData((prev) => ({
      ...prev,
      channels: newChannels,
    }));
  };

  const handleSetPrimaryChannel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.map((ch, i) => ({
        ...ch,
        isPrimary: i === index,
      })),
    }));
  };

  const handleChannelChange = (index: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.channels];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, channels: updated };
    });
  };

  // Kiểm tra hồ sơ hiện tại & tải thông tin chương trình khi tải trang
  useEffect(() => {
    let isMounted = true;
    affiliateApi.getMyProfile().then((res) => {
      if (isMounted && res.success && res.data?.hasProfile && res.data.profile) {
        setExistingProfile(res.data.profile);
      }
    }).catch(() => {
      // ignore
    });

    affiliateApi.getProgramInfo().then((res) => {
      if (isMounted && res.success && res.data) {
        setProgramInfo(res.data);
      }
    }).catch(() => {
      // ignore
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Kiểm tra tính khả dụng của affiliateCode bất đồng bộ
  useEffect(() => {
    const code = formData.affiliateCode.trim();
    if (!code) {
      setCodeStatus('IDLE');
      setCodeMessage('');
      return;
    }
    if (!/^[A-Z0-9_]{4,24}$/.test(code)) {
      setCodeStatus('INVALID');
      setCodeMessage('Mã phải có từ 4 đến 24 ký tự chữ hoa, chữ số hoặc gạch dưới.');
      return;
    }

    setCodeStatus('CHECKING');
    const timer = setTimeout(async () => {
      try {
        const res = await affiliateApi.checkCodeAvailability(code);
        if (res.success && res.data?.available) {
          setCodeStatus('AVAILABLE');
          setCodeMessage('');
        } else {
          setCodeStatus('UNAVAILABLE');
          setCodeMessage(res.data?.reason || 'Mã đã được sử dụng hoặc thuộc danh sách bảo lưu.');
        }
      } catch {
        setCodeStatus('IDLE');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.affiliateCode]);

  // Step Nav & Local Validation
  const handleNextStep = () => {
    setFieldErrors({});
    setTopErrorMessage(null);
    setValidationSuccessNotice(null);

    let result;
    if (currentStep === 1) {
      result = affiliateStep1Schema.safeParse(formData);
    } else if (currentStep === 2) {
      result = affiliateStep2Schema.safeParse(formData);
    } else if (currentStep === 3) {
      result = affiliateStep3Schema.safeParse(formData);
    }

    if (result && !result.success) {
      const errors: Record<string, string[]> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
        if (issue.path.length > 0) {
          const rootField = String(issue.path[0]);
          if (!errors[rootField]) errors[rootField] = [];
          if (!errors[rootField].includes(issue.message)) {
            errors[rootField].push(issue.message);
          }
        }
      });
      setFieldErrors(errors);
      setTopErrorMessage({
        message: 'Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.',
      });
      return;
    }

    setFieldErrors({});
    setTopErrorMessage(null);

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
      setFieldErrors({});
      setTopErrorMessage(null);
      setValidationSuccessNotice(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Kiểm tra thông tin biểu mẫu
  const handleValidateAll = () => {
    const fullCheck = affiliateRegistrationSchema.safeParse(formData);
    if (!fullCheck.success) {
      const errors: Record<string, string[]> = {};
      fullCheck.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      setFieldErrors(errors);
      setValidationSuccessNotice(null);
      setTopErrorMessage({
        message: 'Thông tin chưa hợp lệ. Vui lòng rà soát lại các mục được đánh dấu đỏ.',
      });
      return;
    }

    setFieldErrors({});
    setTopErrorMessage(null);
    setValidationSuccessNotice(
      'Thông tin đã được điền đầy đủ và đúng định dạng. Bạn có thể nộp hồ sơ xét duyệt ngay.'
    );
  };

  // Nộp hồ sơ đăng ký chính thức
  const handleSubmitApplication = async () => {
    setFieldErrors({});
    setTopErrorMessage(null);
    setValidationSuccessNotice(null);

    const fullCheck = affiliateRegistrationSchema.safeParse(formData);
    if (!fullCheck.success) {
      const errors: Record<string, string[]> = {};
      fullCheck.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      setFieldErrors(errors);
      setTopErrorMessage({
        message: 'Thông tin chưa hợp lệ. Vui lòng rà soát lại các mục được đánh dấu đỏ.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await affiliateApi.submitApplication({
        ...fullCheck.data,
        termsVersion: programInfo?.termsVersion || '1.4.1',
        privacyVersion: programInfo?.privacyVersion || '1.4.1',
      });
      if (res.success) {
        showToast('Nộp hồ sơ đăng ký đối tác tiếp thị thành công!', 'success');
        router.push('/account/affiliate/application');
      } else {
        const msg = res.error?.message || 'Có lỗi xảy ra khi nộp hồ sơ';
        showToast(msg, 'error');
        setTopErrorMessage({
          message: msg,
          requestId: (res as any).requestId,
        });
        if ((res.error as any)?.details?.fieldErrors) {
          setFieldErrors((res.error as any).details.fieldErrors);
        }
      }
    } catch {
      showToast('Lỗi kết nối máy chủ. Vui lòng thử lại sau.', 'error');
      setTopErrorMessage({
        message: 'Không thể gửi hồ sơ do lỗi kết nối mạng.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccountLayout>
      <div className="w-full space-y-5 font-sans p-2 sm:p-4">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-[26px]">how_to_reg</span>
                <span>Đăng Ký Đối Tác Tiếp Thị (CTV)</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Đang nhận hồ sơ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Quy trình 4 bước hoàn thiện hồ sơ định danh và kênh phân phối.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Bước {currentStep} / 4
            </span>
          </div>
        </div>

        {/* Cooldown Alert if previous application was rejected */}
        {existingProfile?.isCoolingDown && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0 mt-0.5">timer</span>
            <div>
              <strong className="block text-rose-800">Tài khoản đang trong thời gian chờ (14 ngày):</strong>
              <p className="text-rose-700 mt-0.5 leading-relaxed">
                Hồ sơ trước đó chưa được duyệt. Bạn có thể nộp lại hồ sơ sau ngày{' '}
                <strong>
                  {existingProfile.cooldownUntil
                    ? new Date(existingProfile.cooldownUntil).toLocaleDateString('vi-VN')
                    : '14 ngày'}
                </strong>.
              </p>
            </div>
          </div>
        )}

        {/* Existing Profile Alert */}
        {existingProfile && !existingProfile.isCoolingDown && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-700 text-[20px]">info</span>
              <span>
                Bạn đã có hồ sơ CTV (Trạng thái: <strong>{existingProfile.status}</strong>).
              </span>
            </div>
            <Link
              href="/account/affiliate/application"
              className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800 transition-colors"
            >
              Xem tiến độ
            </Link>
          </div>
        )}

        {/* Live Guidance Banner */}
        {!existingProfile && (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-emerald-700 text-[20px] shrink-0 mt-0.5">verified_user</span>
            <div>
              <strong className="block text-emerald-800">Cổng Tiếp Nhận Hồ Sơ Đang Mở:</strong>
              <p className="text-gray-700 mt-0.5 leading-relaxed">
                Vui lòng hoàn thành 4 bước đăng ký để ban quản trị HuKi xét duyệt hồ sơ đối tác CTV của bạn (SLA phản hồi 24h - 48h).
              </p>
            </div>
          </div>
        )}

        {/* Top Error Message Alert */}
        {topErrorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0">error</span>
            <div className="flex-1">
              <p className="font-semibold">{topErrorMessage.message}</p>
            </div>
          </div>
        )}

        {/* Validation Success Notice */}
        {validationSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">check_circle</span>
            <div className="flex-1">
              <p className="font-semibold">{validationSuccessNotice}</p>
            </div>
          </div>
        )}

        {/* Multi-step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { step: 1, label: 'Định danh' },
            { step: 2, label: 'Kênh phân phối' },
            { step: 3, label: 'Khai báo traffic' },
            { step: 4, label: 'Điều khoản' },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                currentStep === item.step
                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-800 shadow-2xs'
                  : currentStep > item.step
                  ? 'bg-gray-50 border-gray-300 font-medium text-gray-700'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                {currentStep > item.step ? (
                  <span className="material-symbols-outlined text-emerald-600 text-[14px]">check</span>
                ) : (
                  <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                    {item.step}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Form Steps Body */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs space-y-6">
          {/* ================= STEP 1 ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2">
                Bước 1: Thông tin hồ sơ định danh
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Họ tên hiển thị đối tác <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nguyễn Văn Minh"
                  className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                {fieldErrors.displayName && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.displayName[0]}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Mã Đối tác Tiếp thị (Affiliate Code) <span className="text-red-500">*</span>:
                  </label>
                  {codeStatus === 'CHECKING' && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      Đang kiểm tra...
                    </span>
                  )}
                  {codeStatus === 'AVAILABLE' && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Mã hợp lệ &amp; khả dụng
                    </span>
                  )}
                  {codeStatus === 'UNAVAILABLE' && (
                    <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      {codeMessage || 'Mã đã được sử dụng'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.affiliateCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      affiliateCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                    })
                  }
                  placeholder="VD: MINH_HUKI"
                  maxLength={24}
                  className="w-full h-10 px-3 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 uppercase"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Quy cách: 4–24 ký tự (chữ hoa, chữ số, gạch dưới).
                </p>
                {fieldErrors.affiliateCode && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.affiliateCode[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Giới thiệu kinh nghiệm tiếp thị (30–500 ký tự) <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Kinh nghiệm sáng tạo nội dung, đối tượng khán giả của bạn..."
                  className="w-full p-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <div className="flex justify-between text-[10.5px] text-gray-400 mt-0.5">
                  <span>Tối thiểu 30 ký tự</span>
                  <span>{formData.bio.length}/500</span>
                </div>
                {fieldErrors.bio && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.bio[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email liên hệ tiếp thị <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="partner@example.com"
                    className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {fieldErrors.contactEmail && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.contactEmail[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="0912345678 hoặc +84912345678"
                    className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {fieldErrors.contactPhone && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.contactPhone[0]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2 ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Bước 2: Kênh phân phối &amp; Lưu lượng
                  </h2>
                  <p className="text-xs text-gray-500">
                    Khai báo ít nhất 1 kênh mạng xã hội hoặc website để ban quản trị đánh giá.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Thêm kênh</span>
                </button>
              </div>

              {fieldErrors['channels'] && (
                <p className="text-xs text-red-600 font-semibold">{fieldErrors['channels'][0]}</p>
              )}

              <div className="space-y-3">
                {formData.channels.map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">Kênh #{idx + 1}</span>
                        {ch.isPrimary ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            Kênh chính
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryChannel(idx)}
                            className="text-[11px] text-gray-500 hover:text-emerald-700 underline cursor-pointer"
                          >
                            Đặt làm kênh chính
                          </button>
                        )}
                      </div>
                      {formData.channels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChannel(idx)}
                          className="text-gray-400 hover:text-red-600 text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Nền tảng:
                        </label>
                        <select
                          value={ch.type}
                          onChange={(e) => handleChannelChange(idx, 'type', e.target.value)}
                          className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                          <option value="FACEBOOK">Facebook</option>
                          <option value="TIKTOK">TikTok</option>
                          <option value="YOUTUBE">YouTube</option>
                          <option value="INSTAGRAM">Instagram</option>
                          <option value="BLOG">Website / Blog</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          URL Kênh (Bắt buộc bắt đầu bằng https://):
                        </label>
                        <input
                          type="url"
                          value={ch.url}
                          onChange={(e) => handleChannelChange(idx, 'url', e.target.value)}
                          placeholder="https://facebook.com/trang-review-sach"
                          className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        {fieldErrors[`channels.${idx}.url`] && (
                          <p className="text-[10.5px] text-red-600 mt-0.5">
                            {fieldErrors[`channels.${idx}.url`][0]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Handle / Tên kênh (@username):
                        </label>
                        <input
                          type="text"
                          value={ch.handle}
                          onChange={(e) => handleChannelChange(idx, 'handle', e.target.value)}
                          placeholder="@trangreviewsach"
                          className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Quy mô người theo dõi:
                        </label>
                        <select
                          value={ch.followersRange}
                          onChange={(e) => handleChannelChange(idx, 'followersRange', e.target.value)}
                          className="w-full h-9 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                          <option value="UNDER_1K">Dưới 1.000 followers</option>
                          <option value="FROM_1K_TO_5K">1.000 – 5.000 followers</option>
                          <option value="FROM_5K_TO_10K">5.000 – 10.000 followers</option>
                          <option value="FROM_10K_TO_50K">10.000 – 50.000 followers</option>
                          <option value="FROM_50K_TO_100K">50.000 – 100.000 followers</option>
                          <option value="ABOVE_100K">Trên 100.000 followers</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phương thức quảng bá dự kiến (Chọn ít nhất 1):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'REVIEW', label: 'Review / Đánh giá' },
                    { id: 'SOCIAL_POST', label: 'Bài đăng MXH' },
                    { id: 'SHORT_VIDEO', label: 'Video ngắn (Reels/TikTok)' },
                    { id: 'BLOG', label: 'Blog / Bài viết web' },
                  ].map((m) => {
                    const checked = formData.promotionMethods.includes(m.id as any);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const updated = checked
                            ? formData.promotionMethods.filter((x) => x !== m.id)
                            : [...formData.promotionMethods, m.id as any];
                          setFormData({ ...formData, promotionMethods: updated });
                        }}
                        className={`p-2 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3 ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2">
                Bước 3: Khai báo lưu lượng &amp; Tư cách đối tác
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tư cách pháp lý tham gia:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="applicantType"
                      checked={formData.applicantType === 'INDIVIDUAL'}
                      onChange={() => setFormData({ ...formData, applicantType: 'INDIVIDUAL' })}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Cá nhân</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="applicantType"
                      checked={formData.applicantType === 'BUSINESS'}
                      onChange={() => setFormData({ ...formData, applicantType: 'BUSINESS' })}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Doanh nghiệp / Hộ kinh doanh</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kế hoạch triển khai &amp; nhóm độc giả mục tiêu (50–1000 ký tự) <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={formData.promotionDescription}
                  onChange={(e) => setFormData({ ...formData, promotionDescription: e.target.value })}
                  placeholder="Mô tả cụ thể cách bạn sẽ giới thiệu sách tới cộng đồng đọc giả của mình..."
                  className="w-full p-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <div className="flex justify-between text-[10.5px] text-gray-400 mt-0.5">
                  <span>Tối thiểu 50 ký tự</span>
                  <span>{formData.promotionDescription.length}/1000</span>
                </div>
                {fieldErrors.promotionDescription && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.promotionDescription[0]}</p>
                )}
              </div>

              {/* Paid Traffic Toggle */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">
                      Có sử dụng quảng cáo trả phí (Paid Traffic / Paid Ads)?
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Facebook Ads, Google Ads, TikTok Ads hoặc kênh trả phí khác.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.hasPaidTraffic}
                    onChange={(e) => setFormData({ ...formData, hasPaidTraffic: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600 cursor-pointer"
                  />
                </div>

                {formData.hasPaidTraffic && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Nguồn quảng cáo trả phí (Chọn ít nhất 1): <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'META_ADS', label: 'Meta / Facebook Ads' },
                        { id: 'TIKTOK_ADS', label: 'TikTok Ads' },
                        { id: 'GOOGLE_SEARCH', label: 'Google Search Ads' },
                        { id: 'OTHER_PAID', label: 'Kênh trả phí khác' },
                      ].map((src) => {
                        const checked = formData.paidTrafficSources.includes(src.id as any);
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => {
                              const updated = checked
                                ? formData.paidTrafficSources.filter((x) => x !== src.id)
                                : [...formData.paidTrafficSources, src.id as any];
                              setFormData({ ...formData, paidTrafficSources: updated });
                            }}
                            className={`p-2 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                              checked
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {src.label}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.paidTrafficSources && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.paidTrafficSources[0]}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã số thuế (Tùy chọn ở bước đăng ký):
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value.trim() })}
                  placeholder="10 chữ số hoặc 10 chữ số-xxx"
                  className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <p className="text-[10.5px] text-gray-500 mt-1">
                  MST sẽ được hoàn thiện trước khi thực hiện lệnh rút hoa hồng đầu tiên.
                </p>
                {fieldErrors.taxId && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.taxId[0]}</p>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4 ================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h2 className="text-base font-bold text-gray-900 border-b pb-2">
                Bước 4: Điều khoản chương trình &amp; Xác nhận
              </h2>

              {/* Review Summary */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                <span className="font-bold text-gray-800 block">Tóm tắt hồ sơ đăng ký:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                  <div>Họ tên: <strong className="text-gray-900">{formData.displayName}</strong></div>
                  <div>Mã CTV: <strong className="text-emerald-700 font-mono">{formData.affiliateCode}</strong></div>
                  <div>Email: <strong className="text-gray-900">{formData.contactEmail}</strong></div>
                  <div>Số điện thoại: <strong className="text-gray-900">{formData.contactPhone}</strong></div>
                  <div>Số kênh quảng bá: <strong className="text-gray-900">{formData.channels.length}</strong></div>
                  <div>Tư cách: <strong className="text-gray-900">{formData.applicantType === 'INDIVIDUAL' ? 'Cá nhân' : 'Doanh nghiệp'}</strong></div>
                </div>
              </div>

              {/* Terms Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptedAffiliateTerms}
                    onChange={(e) => setFormData({ ...formData, acceptedAffiliateTerms: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600 mt-0.5"
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePolicyModal('TERMS');
                      }}
                      className="text-emerald-800 underline font-bold hover:text-emerald-950 inline cursor-pointer text-left"
                    >
                      Điều khoản Đối tác Tiếp thị HuKi
                    </button>{' '}
                    bao gồm chính sách ghi nhận lượt giới thiệu, thời gian tạm giữ và chống tự mua qua link. <span className="text-red-500">*</span>
                  </span>
                </label>
                {fieldErrors.acceptedAffiliateTerms && (
                  <p className="text-[11px] text-red-600 pl-6">{fieldErrors.acceptedAffiliateTerms[0]}</p>
                )}

                <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptedPrivacyNotice}
                    onChange={(e) => setFormData({ ...formData, acceptedPrivacyNotice: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600 mt-0.5"
                  />
                  <span>
                    Tôi đã đọc và đồng thuận với{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePolicyModal('PRIVACY');
                      }}
                      className="text-emerald-800 underline font-bold hover:text-emerald-950 inline cursor-pointer text-left"
                    >
                      Chính sách Quyền riêng tư &amp; Dữ liệu
                    </button>{' '}
                    của HuKi. <span className="text-red-500">*</span>
                  </span>
                </label>
                {fieldErrors.acceptedPrivacyNotice && (
                  <p className="text-[11px] text-red-600 pl-6">{fieldErrors.acceptedPrivacyNotice[0]}</p>
                )}

                <label className="flex items-start gap-2.5 text-xs text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.confirmedInformationAccuracy}
                    onChange={(e) => setFormData({ ...formData, confirmedInformationAccuracy: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600 mt-0.5"
                  />
                  <span>
                    Tôi cam kết toàn bộ thông tin định danh và kênh phân phối khai báo là trung thực và thuộc quyền quản lý của tôi. <span className="text-red-500">*</span>
                  </span>
                </label>
                {fieldErrors.confirmedInformationAccuracy && (
                  <p className="text-[11px] text-red-600 pl-6">{fieldErrors.confirmedInformationAccuracy[0]}</p>
                )}

                <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600 mt-0.5"
                  />
                  <span>
                    (Tùy chọn) Nhận bản tin cập nhật các đầu sách mới có mức hoa hồng ưu đãi từ các Nhà xuất bản.
                  </span>
                </label>
              </div>

              {/* Notice */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1.5 mt-4">
                <div className="flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified_user</span>
                  <span>Sẵn Sàng Gửi Hồ Sơ Xét Duyệt</span>
                </div>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Hồ sơ của bạn sẽ được chuyển đến Ban Quản Trị HuKi để thẩm định kênh và thông tin trong vòng 24h - 48h làm việc. Bạn có thể theo dõi tiến độ phê duyệt tại trang Trạng thái hồ sơ.
                </p>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-gray-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Quay lại</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={handleValidateAll}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Kiểm tra thông tin</span>
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Tiếp tục</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || (existingProfile && existingProfile.isCoolingDown)}
                  onClick={handleSubmitApplication}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Đang nộp hồ sơ...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Nộp Hồ Sơ Đăng Ký</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Policy & Terms Modal */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">
                  {activePolicyModal === 'TERMS' ? 'gavel' : 'shield'}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {activePolicyModal === 'TERMS'
                      ? 'Điều Khoản & Quy Chế Tiếp Thị Liên Kết'
                      : 'Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu'}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Phiên bản {programInfo?.termsVersion || '1.4.1'} • Hiệu lực từ 2026
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-700 leading-relaxed">
              {activePolicyModal === 'TERMS' ? (
                <>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">1. Cơ chế ghi nhận hoa hồng (Attribution)</h4>
                    <p>
                      Hoa hồng được ghi nhận theo cơ chế <strong>Last-Click</strong> trong thời hạn hiệu lực của Cookie là{' '}
                      <strong>{programInfo?.cookieDurationDays || 30} ngày</strong>. Nếu người dùng nhấp vào link tiếp thị của đối tác khác trước khi hoàn tất đặt hàng, đơn hàng sẽ được ghi nhận cho đối tác cuối cùng.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2. Biểu phí hoa hồng đối tác</h4>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>Sách in giấy vật lý: <strong>{programInfo?.rates?.physical || 5}%</strong> trên giá trị ròng sản phẩm.</li>
                      <li>Sách điện tử (Ebook): <strong>{programInfo?.rates?.ebook || 10}%</strong> trên giá trị giao dịch.</li>
                      <li>Sách nói (Audiobook): <strong>{programInfo?.rates?.audio || 10}%</strong> trên giá trị giao dịch.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">3. Thời gian đối soát &amp; Tạm giữ hoa hồng</h4>
                    <p>
                      - Đơn hàng sách in: Tạm giữ <strong>{programInfo?.holdingDays?.physical || 7} ngày</strong> kể từ khi đơn hàng giao thành công (chờ kết thúc hạn hoàn trả hợp lệ).
                      <br />
                      - Đơn hàng Ebook / Audiobook: Tạm giữ <strong>{programInfo?.holdingDays?.digitalHours || 24} giờ</strong> kể từ thời điểm thanh toán trực tuyến.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">4. Quy định chống gian lận &amp; Vi phạm</h4>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>Nghiêm cấm hành vi tự mua hàng qua liên kết tiếp thị của chính mình (Self-referral fraud).</li>
                      <li>Nghiêm cấm đấu thầu từ khóa chứa nhãn hiệu &quot;HuKi&quot;, &quot;Nhà sách HuKi&quot; trên các công cụ quảng cáo tìm kiếm (Brand bidding).</li>
                      <li>Nghiêm cấm phát tán thư rác (spam), chèn cookie trái phép (cookie stuffing) hoặc tạo lưu lượng ảo.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">5. Thanh toán &amp; Nghĩa vụ Thuế</h4>
                    <p>
                      Hạn mức rút tiền tối thiểu là <strong>{(programInfo?.minPayoutAmount || 100000).toLocaleString('vi-VN')} đ</strong>.
                      HuKi thực hiện khấu trừ và kê khai Thuế Thu nhập Cá nhân (TNCN) theo quy định của pháp luật Việt Nam trước khi giải ngân.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">1. Thu thập dữ liệu cá nhân</h4>
                    <p>
                      HuKi thu thập các thông tin: Họ tên, Số điện thoại, Email, Kênh truyền thông, Mã số thuế và Thông tin tài khoản ngân hàng nhằm mục đích thiết lập định danh đối tác, thanh toán hoa hồng và thực hiện nghĩa vụ thuế với cơ quan nhà nước.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2. Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP</h4>
                    <p>
                      Toàn bộ dữ liệu của đối tác được lưu trữ trên hạ tầng máy chủ bảo mật, mã hóa đường truyền SSL/TLS và chỉ được xử lý bởi nhân sự có thẩm quyền phê duyệt đối tác của HuKi.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">3. Quyền của chủ thể dữ liệu</h4>
                    <p>
                      Đối tác có quyền tra cứu, cập nhật thông tin hồ sơ, yêu cầu ngừng nhận bản tin tiếp thị hoặc yêu cầu đóng tài khoản tiếp thị bất kỳ lúc nào qua trang Cài đặt tài khoản hoặc liên hệ ban hỗ trợ HuKi.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (activePolicyModal === 'TERMS') {
                    setFormData((prev) => ({ ...prev, acceptedAffiliateTerms: true }));
                  } else if (activePolicyModal === 'PRIVACY') {
                    setFormData((prev) => ({ ...prev, acceptedPrivacyNotice: true }));
                  }
                  setActivePolicyModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tôi đã hiểu &amp; Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
