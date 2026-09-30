"use client";

import React from 'react';

interface StepInfo {
  number: number;
  label: string;
  desc: string;
}

const STEPS: StepInfo[] = [
  { number: 1, label: 'Mục tiêu', desc: 'Nhu cầu khi đến HuKi' },
  { number: 2, label: 'Gu sách yêu thích', desc: 'Chọn các thể loại quan tâm' },
  { number: 3, label: 'Định dạng đọc', desc: 'EPUB, PDF & Giao diện đọc' },
  { number: 4, label: 'Thói quen đọc', desc: 'Mục tiêu thời gian mỗi ngày' },
  { number: 5, label: 'Hoàn tất & Quà tặng', desc: 'Nhận voucher & tủ sách' },
];

interface OnboardingSidebarProps {
  currentStep: number;
  onSelectStep: (stepNumber: number) => void;
}

export const OnboardingSidebar: React.FC<OnboardingSidebarProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <aside className="w-full lg:w-64 xl:w-72 bg-[#f8f7f2] border-r border-[#e5e2db] p-6 lg:p-8 flex flex-col justify-between flex-shrink-0">
      {/* Top: Minimal Brand & Step List */}
      <div className="space-y-8">
        {/* Brand Text */}
        <div className="space-y-1">
          <div className="font-bold text-sm tracking-widest uppercase text-[#006953]">
            HuKi Ebook
          </div>
          <div className="text-xs text-[#737373]">
            Thiết lập trải nghiệm cá nhân
          </div>
        </div>

        {/* Clean Vertical Stepper List */}
        <nav className="space-y-1.5" aria-label="Các bước thiết lập">
          {STEPS.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => isCompleted && onSelectStep(step.number)}
                disabled={!isCompleted && !isCurrent}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                  isCurrent
                    ? 'bg-[#003b2b] text-white font-bold shadow-xs'
                    : isCompleted
                    ? 'text-[#17201f] hover:bg-[#eae7df] cursor-pointer'
                    : 'text-[#9ca3af] cursor-not-allowed'
                }`}
              >
                {/* Step Indicator Dot/Number */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-[#94f5d6] text-[#003b2b]'
                      : isCompleted
                      ? 'bg-[#006953] text-white'
                      : 'bg-[#e5e2db] text-[#8c8c8c]'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </span>

                {/* Step Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{step.label}</div>
                  <div className={`text-[10px] truncate ${isCurrent ? 'text-[#94f5d6]' : 'text-[#8c8c8c]'}`}>
                    {step.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Perk Note */}
      <div className="pt-6 border-t border-[#e5e2db] text-xs text-[#525252] space-y-1">
        <div className="font-semibold text-[#006953] flex items-center gap-1">
          <span>🎁 Quà chào mừng:</span>
        </div>
        <div>Voucher <strong>50.000đ</strong> + <strong>100 Xu</strong> khi hoàn tất.</div>
      </div>
    </aside>
  );
};
