'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  affiliateStep1Schema,
  affiliateStep2Schema,
  affiliateStep3Schema,
  affiliateStep4Schema,
  affiliateRegistrationSchema,
  type AffiliateRegistrationInput,
} from '@/lib/affiliate/schemas';

export default function AffiliateRegisterPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [topErrorMessage, setTopErrorMessage] = useState<{ message: string; requestId?: string } | null>(null);
  const [validationSuccessNotice, setValidationSuccessNotice] = useState<string | null>(null);

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
        followersRange: 'UNDER_5K',
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
          followersRange: 'UNDER_5K',
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
      });
      setFieldErrors(errors);
      setTopErrorMessage({
        message: 'Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.',
      });
      return;
    }

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

  // Test full form validation using Zod contract (no fake submission)
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
        message: 'Biểu mẫu còn một số trường chưa hợp lệ theo Zod Contract. Vui lòng rà soát lại.',
      });
      return;
    }

    setFieldErrors({});
    setTopErrorMessage(null);
    setValidationSuccessNotice(
      'Biểu mẫu hợp lệ 100% theo Zod Contract v1.4.1 (Không phát hiện lỗi dữ liệu). Cổng tiếp nhận hồ sơ chính thức sẽ mở tại Giai đoạn 3.'
    );
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
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Chưa mở tiếp nhận
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Biểu mẫu 4 bước định danh và kênh phân phối được chuẩn hóa theo Zod Contract v1.4.1.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Bước {currentStep} / 4
            </span>
          </div>
        </div>

        {/* Honest Status Notice Banner */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">info</span>
          <div>
            <strong className="block text-amber-800">Cổng Tiếp Nhận Hồ Sơ Đang Trong Giai Đoạn Chuẩn Bị:</strong>
            <p className="text-gray-700 mt-0.5 leading-relaxed">
              Tính năng đăng ký đối tác tiếp thị HuKi đang trong giai đoạn hoàn thiện giao diện và ràng buộc kiểm thực.
              Cổng tiếp nhận hồ sơ chính thức sẽ mở sau khi hoàn tất hạ tầng backend ở Giai đoạn 3.
              Bạn có thể trải nghiệm đầy đủ các bước và kiểm tra tính hợp lệ của biểu mẫu bên dưới.
            </p>
          </div>
        </div>

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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã Đối tác Tiếp thị (Affiliate Code) <span className="text-red-500">*</span>:
                </label>
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
                  Quy cách: 4–24 ký tự (chữ hoa, chữ số, gạch dưới). Tính duy nhất sẽ được kiểm tra và cấp phát khi hệ thống mở tiếp nhận.
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
                          <option value="WEBSITE">Website / Blog</option>
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
                          <option value="UNDER_5K">Dưới 5.000 followers</option>
                          <option value="FROM_5K_TO_20K">5.000 – 20.000</option>
                          <option value="FROM_20K_TO_100K">20.000 – 100.000</option>
                          <option value="OVER_100K">Trên 100.000 followers</option>
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
                    Tôi đồng ý với <strong className="text-emerald-800">Điều khoản Đối tác Tiếp thị HuKi (v1.4.1)</strong> bao gồm chính sách last-click, thời gian holding và chống tự mua qua link. <span className="text-red-500">*</span>
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
                    Tôi đã đọc và đồng thuận với <strong className="text-emerald-800">Chính sách Quyền riêng tư &amp; Dữ liệu</strong> của HuKi. <span className="text-red-500">*</span>
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

              {/* Unactivated State Submission Notice */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-1.5 mt-4">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">lock</span>
                  <span>Cổng Tiếp Nhận Hồ Sơ Chưa Mở Chính Thức</span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Để bảo vệ tính toàn vẹn của dữ liệu và hệ sinh thái tài chính, nút nộp hồ sơ được tạm khóa
                  cho đến khi dịch vụ tiếp nhận và quy trình phê duyệt của ban quản trị được kích hoạt ở Giai đoạn 3.
                  Bạn có thể nhấn nút bên dưới để kiểm tra tính hợp lệ toàn diện của dữ liệu theo Zod Contract.
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
                  <span>Kiểm Tra Tính Hợp Lệ (Zod Contract)</span>
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
                  disabled
                  title="Cổng đăng ký chưa mở (Chờ Backend Giai đoạn 3)"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-300 text-gray-500 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5 shadow-none"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Nộp Hồ Sơ (Chưa Kích Hoạt)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
