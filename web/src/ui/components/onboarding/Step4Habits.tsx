"use client";

import React from 'react';
import {
  READING_DAILY_TARGETS,
  READING_YEARLY_TARGETS,
  READING_TIME_PREFERENCES,
} from './onboardingData';

interface Step4HabitsProps {
  dailyMinutes: number;
  yearlyBooksTarget: number;
  preferredTime: 'MORNING' | 'NOON' | 'NIGHT' | 'FLEXIBLE';
  onSelectDailyMinutes: (mins: number) => void;
  onSelectYearlyTarget: (books: number) => void;
  onSelectPreferredTime: (time: 'MORNING' | 'NOON' | 'NIGHT' | 'FLEXIBLE') => void;
}

export const Step4Habits: React.FC<Step4HabitsProps> = ({
  dailyMinutes,
  yearlyBooksTarget,
  preferredTime,
  onSelectDailyMinutes,
  onSelectYearlyTarget,
  onSelectPreferredTime,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Fixed Consistent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[48px] flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17201f] leading-tight">
            Đặt mục tiêu đọc sách
          </h1>
          <p className="text-xs text-[#6b7280]">
            HuKi sẽ giúp bạn theo dõi chuỗi ngày đọc sách (Reading Streak)
          </p>
        </div>
      </div>

      {/* Habits Items Container */}
      <div className="max-h-[400px] overflow-y-auto pr-1.5 py-1 space-y-4 scrollbar-thin">
        {/* 1. Daily Target */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
            1. Thời gian đọc mỗi ngày
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {READING_DAILY_TARGETS.map((opt) => {
              const isSelected = dailyMinutes === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectDailyMinutes(opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#003b2b] text-white border-[#003b2b] font-bold shadow-2xs'
                      : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737373]'}`}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Yearly Target */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
            2. Mục tiêu số lượng sách trong năm
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-lg">
            {READING_YEARLY_TARGETS.map((opt) => {
              const isSelected = yearlyBooksTarget === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectYearlyTarget(opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#003b2b] text-white border-[#003b2b] font-bold shadow-2xs'
                      : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737373]'}`}>
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Preferred Time */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
            3. Thời điểm bạn thích đọc nhất
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-lg">
            {READING_TIME_PREFERENCES.map((opt) => {
              const isSelected = preferredTime === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectPreferredTime(opt.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-[#003b2b] text-white border-[#003b2b] font-bold shadow-2xs'
                      : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-gray-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{opt.icon}</span>
                  <span className="text-xs sm:text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
