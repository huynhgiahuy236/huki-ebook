"use client";

import React from 'react';
import { ONBOARDING_FORMATS, ONBOARDING_THEMES } from './onboardingData';

interface Step3FormatsProps {
  selectedFormats: string[];
  selectedTheme: 'LIGHT' | 'DARK' | 'SEPIA';
  onToggleFormat: (formatId: string) => void;
  onSelectTheme: (theme: 'LIGHT' | 'DARK' | 'SEPIA') => void;
}

export const Step3Formats: React.FC<Step3FormatsProps> = ({
  selectedFormats,
  selectedTheme,
  onToggleFormat,
  onSelectTheme,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Fixed Consistent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[48px] flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17201f] leading-tight">
            Định dạng &amp; Giao diện đọc sách
          </h1>
          <p className="text-xs text-[#6b7280]">
            Thiết lập cách bạn muốn thưởng thức các tác phẩm
          </p>
        </div>
      </div>

      {/* Formats Container */}
      <div className="max-h-[400px] overflow-y-auto pr-1.5 py-1 space-y-5 scrollbar-thin">
        {/* Formats 4 items per row */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
            1. Định dạng ưa chuộng
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ONBOARDING_FORMATS.map((format) => {
              const isSelected = selectedFormats.includes(format.id);

              return (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => onToggleFormat(format.id)}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#003b2b] text-white border-[#003b2b] shadow-2xs font-semibold'
                      : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        isSelected ? 'text-[#94f5d6]' : 'text-[#006953]'
                      }`}
                    >
                      {format.icon}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-[#94f5d6] text-[#003b2b]' : 'border border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-xs sm:text-sm">{format.name}</div>
                    <div className={`text-[11px] mt-0.5 leading-snug ${isSelected ? 'text-white/80' : 'text-[#737373]'}`}>
                      {format.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
            2. Màu nền đọc sách (Reader Mode)
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-w-lg">
            {ONBOARDING_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'border-[#006953] ring-1 ring-[#006953] bg-white shadow-2xs font-bold'
                      : 'border-[#e5e2db] bg-white text-[#525252] hover:border-gray-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border ${theme.borderClass} ${theme.bgClass}`} />
                  <span className="text-xs">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
