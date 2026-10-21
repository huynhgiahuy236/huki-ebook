"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  OnboardingSidebar,
  Step1Goals,
  Step2Genres,
  Step3Formats,
  Step4Habits,
  Step5WelcomeGift,
} from '@/ui/components/onboarding';
import { voucherApi } from '@/ui/api/voucherApi';
import { ONBOARDING_GENRES } from '@/ui/components/onboarding/onboardingData';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, completeOnboarding } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Chặn và redirect người chưa đăng nhập hoặc đã hoàn tất onboarding
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dọn dẹp cache cũ
    localStorage.removeItem('huki_onboarding_completed');

    if (!isLoading && !user) {
      router.replace('/auth/login?redirect=/onboarding');
      return;
    }

    if (user?.hasCompletedOnboarding) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Step 1: Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['read_digital']);

  // Step 2: Genres (default 3 popular categories)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([
    'self_help',
    'biz_finance',
    'tech_ai',
  ]);

  // Step 3: Formats & Theme
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['epub']);
  const [selectedTheme, setSelectedTheme] = useState<'LIGHT' | 'DARK' | 'SEPIA'>('LIGHT');

  // Step 4: Habits
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [yearlyBooksTarget, setYearlyBooksTarget] = useState<number>(12);
  const [preferredTime, setPreferredTime] = useState<'MORNING' | 'NOON' | 'NIGHT' | 'FLEXIBLE'>('NIGHT');

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId) ? prev.filter((id) => id !== formatId) : [...prev, formatId]
    );
  };

  const handleNext = () => {
    setSubmitError(null);
    if (currentStep === 1 && selectedGoals.length === 0) {
      showToast({
        title: 'Chưa chọn mục tiêu',
        message: 'Vui lòng chọn ít nhất 1 mục tiêu trải nghiệm!',
        type: 'warning',
      });
      return;
    }

    if (currentStep === 2 && selectedGenres.length < 3) {
      showToast({
        title: 'Chọn thêm thể loại',
        message: 'Vui lòng chọn ít nhất 3 thể loại sách yêu thích!',
        type: 'warning',
      });
      return;
    }

    if (currentStep === 3 && selectedFormats.length === 0) {
      showToast({
        title: 'Chưa chọn định dạng',
        message: 'Vui lòng chọn ít nhất 1 định dạng đọc sách!',
        type: 'warning',
      });
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await completeOnboarding({});
      if (!res.success) {
        setIsSubmitting(false);
        const errMsg = res.error?.message || 'Không thể lưu trạng thái bỏ qua. Vui lòng bấm Thử lại!';
        setSubmitError(errMsg);
        showToast({
          title: 'Chưa thể lưu cấu hình',
          message: errMsg,
          type: 'error',
        });
        return;
      }

      showToast({
        title: 'Đã lưu cấu hình cơ bản',
        message: 'Bạn có thể thay đổi lại sở thích trong Cài đặt tài khoản!',
        type: 'info',
      });
      router.push('/');
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi yêu cầu.';
      setSubmitError(errMsg);
      showToast({
        title: 'Lỗi kết nối',
        message: errMsg,
        type: 'error',
      });
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Lấy category IDs từ selected genres
      const selectedGenreItems = ONBOARDING_GENRES.filter((g) => selectedGenres.includes(g.id));
      const categoryNames = [...new Set(selectedGenreItems.map((g) => g.category))];

      // Gửi toàn bộ preferences lên backend và cập nhật hasCompletedOnboarding
      const res = await completeOnboarding({
        primaryGoals: selectedGoals,
        favoriteGenres: selectedGenres,
        preferredCategories: categoryNames,
        preferredFormats: selectedFormats,
        preferredTheme: selectedTheme,
        dailyMinutesGoal: dailyMinutes,
        yearlyBooksTarget: yearlyBooksTarget,
        preferredReadingTime: preferredTime,
        readingHabits: {
          dailyMinutes,
          yearlyBooksTarget,
          preferredTime,
        },
      });

      if (!res.success) {
        setIsSubmitting(false);
        const errMsg = res.error?.message || 'Lưu sở thích không thành công. Vui lòng bấm Thử lại!';
        setSubmitError(errMsg);
        showToast({
          title: 'Lưu sở thích thất bại',
          message: errMsg,
          type: 'error',
        });
        return;
      }

      // Kiểm tra cấp voucher thực tế từ backend promotion service
      let welcomeVoucherGranted = false;
      try {
        const eligibleRes = await voucherApi.getEligibleFeed();
        if (eligibleRes.success && Array.isArray(eligibleRes.data) && eligibleRes.data.length > 0) {
          const welcomeVoucher =
            eligibleRes.data.find(
              (v: any) =>
                v.scope === 'PLATFORM' || v.targetAudience === 'NEW_USER' || v.code?.includes('HUKI')
            ) || eligibleRes.data[0];
          if (welcomeVoucher?.id) {
            const saveRes = await voucherApi.saveVoucher(welcomeVoucher.id);
            if (saveRes.success) {
              welcomeVoucherGranted = true;
            }
          }
        }
      } catch {
        // Voucher error should not block onboarding completion
      }

      showToast({
        title: 'Thiết lập hoàn tất!',
        message: welcomeVoucherGranted
          ? 'Đã lưu sở thích & tặng voucher chào mừng vào kho voucher của bạn!'
          : 'Đã lưu đầy đủ hồ sơ sở thích đọc sách của bạn!',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/');
      }, 600);
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi yêu cầu.';
      setSubmitError(errMsg);
      showToast({
        title: 'Lưu hồ sơ thất bại',
        message: errMsg,
        type: 'error',
      });
    }
  };

  const isNextDisabled =
    (currentStep === 1 && selectedGoals.length === 0) ||
    (currentStep === 2 && selectedGenres.length < 3) ||
    (currentStep === 3 && selectedFormats.length === 0);

  const userName = user?.fullName || (user as { name?: string })?.name || 'Bạn đọc';

  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full bg-[#fbf9f4] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#003b2b] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold text-[#17201f]">Đang kiểm tra trạng thái tài khoản...</h2>
        <p className="text-xs text-[#737373] mt-1">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#fbf9f4] flex flex-col lg:flex-row font-sans antialiased text-[#17201f]">
      {/* 1. Left Vertical Stepper */}
      <OnboardingSidebar
        currentStep={currentStep}
        onSelectStep={(step) => {
          setSubmitError(null);
          setCurrentStep(step);
        }}
      />

      {/* 2. Right Content Area (Responsive scroll for mobile and low-height screens) */}
      <div className="flex-1 flex flex-col justify-between min-w-0 min-h-screen lg:h-screen lg:overflow-hidden bg-[#fbf9f4]">
        {/* Top Header */}
        <header className="px-6 lg:px-12 py-3.5 border-b border-[#e5e2db] bg-white/80 backdrop-blur-xs flex items-center justify-between gap-4 flex-shrink-0">
          <div className="text-xs text-[#737373]">
            Xin chào, <strong className="text-[#17201f]">{userName}</strong>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-xs font-medium text-[#737373] hover:text-[#17201f] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <span>Bỏ qua bước này</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </header>

        {/* Center Main Step Body (Scrollable container) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-12 pt-6 sm:pt-8 pb-6 overflow-y-auto flex flex-col justify-start max-w-5xl w-full mx-auto">
          {submitError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-red-600">error</span>
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={currentStep === 5 ? handleFinish : handleSkip}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}
          {currentStep === 1 && (
            <Step1Goals
              selectedGoals={selectedGoals}
              onToggleGoal={toggleGoal}
            />
          )}

          {currentStep === 2 && (
            <Step2Genres
              selectedGenres={selectedGenres}
              onToggleGenre={toggleGenre}
            />
          )}

          {currentStep === 3 && (
            <Step3Formats
              selectedFormats={selectedFormats}
              selectedTheme={selectedTheme}
              onToggleFormat={toggleFormat}
              onSelectTheme={setSelectedTheme}
            />
          )}

          {currentStep === 4 && (
            <Step4Habits
              dailyMinutes={dailyMinutes}
              yearlyBooksTarget={yearlyBooksTarget}
              preferredTime={preferredTime}
              onSelectDailyMinutes={setDailyMinutes}
              onSelectYearlyTarget={setYearlyBooksTarget}
              onSelectPreferredTime={setPreferredTime}
            />
          )}

          {currentStep === 5 && (
            <Step5WelcomeGift
              userName={userName}
              selectedGoals={selectedGoals}
              selectedGenres={selectedGenres}
              selectedFormats={selectedFormats}
              dailyMinutes={dailyMinutes}
              yearlyBooksTarget={yearlyBooksTarget}
            />
          )}
        </main>

        {/* Fixed Bottom Footer Action Bar */}
        <footer className="px-6 lg:px-12 py-3.5 border-t border-[#e5e2db] bg-white/90 backdrop-blur-xs flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Back Button */}
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#e5e2db] hover:border-gray-400 bg-white text-xs font-semibold text-[#17201f] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Quay lại</span>
                </button>
              )}
            </div>

            {/* Step Counter */}
            <div className="text-xs text-[#737373]">
              Bước <strong className="text-[#17201f]">{currentStep}</strong> / 5
            </div>

            {/* Next / Finish Button */}
            <div>
              {currentStep === 5 ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#003b2b] hover:bg-[#00281d] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Đang hoàn tất...' : 'Bắt đầu khám phá'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#003b2b] hover:bg-[#00281d] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Tiếp tục</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
