"use client";

import React, { useState, useMemo } from 'react';
import { ONBOARDING_GENRES, ONBOARDING_CATEGORIES } from './onboardingData';

interface Step2GenresProps {
  selectedGenres: string[];
  onToggleGenre: (genreId: string) => void;
}

export const Step2Genres: React.FC<Step2GenresProps> = ({
  selectedGenres,
  onToggleGenre,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');

  const filteredGenres = useMemo(() => {
    if (activeCategory === 'Tất cả') return ONBOARDING_GENRES;
    return ONBOARDING_GENRES.filter((g) => g.category === activeCategory);
  }, [activeCategory]);

  const minRequired = 3;
  const isMinMet = selectedGenres.length >= minRequired;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Fixed Consistent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[48px] flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17201f] leading-tight">
            Chọn các thể loại bạn yêu thích
          </h1>
          <p className="text-xs text-[#6b7280]">
            Chọn ít nhất <strong>{minRequired} thể loại</strong> để nhận gợi ý sách phù hợp
          </p>
        </div>

        <div>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
              isMinMet
                ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
            }`}
          >
            {isMinMet ? (
              <>
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Đã chọn {selectedGenres.length}</span>
              </>
            ) : (
              <span>Chọn thêm {minRequired - selectedGenres.length} ({selectedGenres.length}/{minRequired})</span>
            )}
          </span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-shrink-0">
        {ONBOARDING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#17201f] text-white font-semibold shadow-2xs'
                : 'bg-white text-[#525252] border border-[#e5e2db] hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Container */}
      <div className="max-h-[360px] overflow-y-auto pr-1.5 py-1 scrollbar-thin">
        <div className="flex flex-wrap gap-2.5">
          {filteredGenres.map((item) => {
            const isSelected = selectedGenres.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleGenre(item.id)}
                className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2.5 select-none text-left whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#003b2b] text-white border-[#003b2b] shadow-2xs font-semibold scale-[1.01]'
                    : 'bg-white text-[#17201f] border-[#e5e2db] hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ml-1 ${
                    isSelected ? 'bg-[#94f5d6] text-[#003b2b]' : 'border border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
