"use client";

import React from 'react';
import { ONBOARDING_GOALS } from './onboardingData';

interface Step1GoalsProps {
  selectedGoals: string[];
  onToggleGoal: (goalId: string) => void;
}

export const Step1Goals: React.FC<Step1GoalsProps> = ({
  selectedGoals,
  onToggleGoal,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Fixed Consistent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[48px] flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17201f] leading-tight">
            Bạn muốn trải nghiệm điều gì tại HuKi?
          </h1>
          <p className="text-xs text-[#6b7280]">
            Chọn mục đích chính của bạn (có thể chọn nhiều hơn 1)
          </p>
        </div>
      </div>

      {/* Goal Items Container */}
      <div className="max-h-[400px] overflow-y-auto pr-1.5 py-1 space-y-2.5 scrollbar-thin">
        {ONBOARDING_GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onToggleGoal(goal.id)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between gap-4 cursor-pointer ${
                isSelected
                  ? 'bg-[#003b2b] text-white border-[#003b2b] shadow-xs'
                  : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-[#003b2b]/40'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`material-symbols-outlined text-2xl ${
                    isSelected ? 'text-[#94f5d6]' : 'text-[#006953]'
                  }`}
                >
                  {goal.icon}
                </span>
                <div>
                  <div className="font-bold text-sm leading-tight">{goal.title}</div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#6b7280]'}`}>
                    {goal.desc}
                  </div>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-[#94f5d6] text-[#003b2b]' : 'border border-gray-300'
                }`}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-xs font-bold">check</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
