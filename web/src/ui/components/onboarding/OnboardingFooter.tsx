"use client";

import React from 'react';

interface OnboardingFooterProps {
  currentStep: number;
  totalSteps: number;
  isNextDisabled: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  currentStep,
  totalSteps,
  isNextDisabled,
  isSubmitting,
  onBack,
  onNext,
  onFinish,
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="w-full bg-white/90 backdrop-blur-md border-t border-[#e8e5df] sticky bottom-0 z-30 px-4 sm:px-8 py-3.5 mt-8 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Back Button */}
        <div>
          {!isFirstStep && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#e8e5df] hover:border-gray-400 bg-white text-xs sm:text-sm font-bold text-[#17201f] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Quay Lại</span>
            </button>
          )}
        </div>

        {/* Step Indicator Text */}
        <div className="text-xs font-semibold text-[#6b7280]">
          Bước <strong className="text-[#17201f]">{currentStep}</strong> / {totalSteps}
        </div>

        {/* Next / Finish Button */}
        <div>
          {isLastStep ? (
            <button
              type="button"
              onClick={onFinish}
              disabled={isSubmitting}
              className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#003b2b] to-[#006953] hover:from-[#00281d] hover:to-[#00523c] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              <span>{isSubmitting ? 'Đang kích hoạt...' : 'Vào Trang Chủ Khám Phá Ngay'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={isNextDisabled || isSubmitting}
              className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-[#003b2b] hover:bg-[#00523c] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Tiếp Tục</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
