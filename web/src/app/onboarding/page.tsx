"use client";

import React, { useState } from 'react';
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

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    showToast({
      title: 'Đã lưu cấu hình cơ bản',
      message: 'Bạn có thể thay đổi lại sở thích trong Cài đặt tài khoản!',
      type: 'info',
    });
    router.push('/');
  };

  const handleFinish = () => {
    setIsSubmitting(true);

    try {
      const preferences = {
        primaryGoals: selectedGoals,
        favoriteGenres: selectedGenres,
        preferredFormats: selectedFormats,
        preferredTheme: selectedTheme,
        readingHabits: {
          dailyMinutes,
          yearlyBooksTarget,
          preferredTime,
        },
        hasCompletedOnboarding: true,
        completedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('huki_onboarding_preferences', JSON.stringify(preferences));
      }

      showToast({
        title: 'Thiết lập hoàn tất!',
        message: 'Đã lưu sở thích & kích hoạt voucher chào mừng 50.000đ!',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/');
      }, 600);
    } catch (err) {
      console.error('Failed to save preferences', err);
      router.push('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled =
    (currentStep === 1 && selectedGoals.length === 0) ||
    (currentStep === 2 && selectedGenres.length < 3) ||
    (currentStep === 3 && selectedFormats.length === 0);

  const userName = user?.fullName || (user as any)?.name || 'Bạn đọc';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fbf9f4] flex flex-col lg:flex-row font-sans antialiased text-[#17201f]">
      {/* 1. Left Vertical Stepper (Fixed height, no scroll) */}
      <OnboardingSidebar
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* 2. Right Content Area (Fixed layout) */}
      <div className="flex-1 flex flex-col justify-between min-w-0 h-full overflow-hidden bg-[#fbf9f4]">
        {/* Fixed Top Header */}
        <header className="px-6 lg:px-12 py-3.5 border-b border-[#e5e2db] bg-white/80 backdrop-blur-xs flex items-center justify-between gap-4 flex-shrink-0">
          <div className="text-xs text-[#737373]">
            Xin chào, <strong className="text-[#17201f]">{userName}</strong>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-[#737373] hover:text-[#17201f] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Bỏ qua bước này</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </header>

        {/* Center Main Step Body - Consistent Fixed Top Alignment */}
        <main className="flex-1 px-6 lg:px-12 pt-8 pb-4 overflow-hidden flex flex-col justify-start max-w-5xl w-full mx-auto">
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
