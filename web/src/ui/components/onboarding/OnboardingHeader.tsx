"use client";

import React from 'react';
import Link from 'next/navigation';

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onSkip: () => void;
  onSelectStep?: (step: number) => void;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  onSkip,
  onSelectStep,
}) => {
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#e8e5df] sticky top-0 z-30 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003b2b] to-[#006953] flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-xl text-[#94f5d6]">menu_book</span>
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-[#17201f] flex items-center gap-1.5">
              <span>HUKI EBOOK</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#fea619]/15 text-[#9e5d00] uppercase tracking-wider">
                Khởi đầu
              </span>
            </div>
            <div className="text-[11px] text-[#6b7280]">Cá nhân hóa trải nghiệm đọc</div>
          </div>
        </div>

        {/* Step Indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => isCompleted && onSelectStep && onSelectStep(stepNum)}
                disabled={!isCompleted}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-[#003b2b] text-white shadow-xs font-bold'
                    : isCompleted
                    ? 'bg-[#f2fbf9] text-[#006953] border border-[#94f5d6] hover:bg-[#94f5d6]/20 cursor-pointer'
                    : 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrent ? 'bg-[#94f5d6] text-[#003b2b] font-bold' : isCompleted ? 'bg-[#006953] text-white' : 'bg-[#d1d5db] text-white'
                }`}>
                  {isCompleted ? '✓' : stepNum}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Skip button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-[#6b7280] hover:text-[#17201f] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Bỏ qua</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full bg-[#e8e5df] h-1.5 rounded-full mt-3 overflow-hidden max-w-4xl mx-auto">
        <div
          className="bg-gradient-to-r from-[#006953] to-[#fea619] h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
};
