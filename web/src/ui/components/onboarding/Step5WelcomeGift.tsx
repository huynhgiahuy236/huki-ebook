"use client";

import React from 'react';
import { ONBOARDING_GENRES } from './onboardingData';

interface Step5WelcomeGiftProps {
  userName: string;
  selectedGoals: string[];
  selectedGenres: string[];
  selectedFormats: string[];
  dailyMinutes: number;
  yearlyBooksTarget: number;
}

export const Step5WelcomeGift: React.FC<Step5WelcomeGiftProps> = ({
  userName,
  selectedGenres,
  dailyMinutes,
  yearlyBooksTarget,
}) => {
  const selectedGenreObjects = ONBOARDING_GENRES.filter((g) => selectedGenres.includes(g.id));

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Fixed Consistent Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[48px] flex-shrink-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17201f] leading-tight">
            Chào mừng {userName || 'bạn'} đến với HuKi!
          </h1>
          <p className="text-xs text-[#6b7280]">
            Hồ sơ đọc sách của bạn đã hoàn tất thiết lập
          </p>
        </div>
      </div>

      {/* Summary & Gifts Container */}
      <div className="max-h-[400px] overflow-y-auto pr-1.5 py-1 space-y-4 scrollbar-thin">
        {/* Profile Summary Card */}
        <div className="bg-white rounded-2xl border border-[#e5e2db] p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e2db]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006953] text-white flex items-center justify-center font-bold text-sm">
                {userName ? userName.charAt(0).toUpperCase() : 'H'}
              </div>
              <div>
                <div className="font-bold text-sm text-[#17201f]">{userName || 'Độc giả HuKi'}</div>
                <div className="text-[11px] text-[#006953] font-medium">Thành viên mới</div>
              </div>
            </div>

            <div className="text-right text-xs">
              <div className="text-[#737373]">Mục tiêu: <strong className="text-[#17201f]">{yearlyBooksTarget} cuốn/năm</strong></div>
              <div className="text-[#737373]">Mỗi ngày: <strong className="text-[#17201f]">{dailyMinutes > 0 ? `${dailyMinutes} phút` : 'Linh hoạt'}</strong></div>
            </div>
          </div>

          {/* Selected Tags */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Thể loại quan tâm ({selectedGenreObjects.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedGenreObjects.map((g) => (
                <span
                  key={g.id}
                  className="px-2.5 py-1 rounded-full bg-[#f4f2eb] text-xs text-[#17201f] font-medium"
                >
                  {g.icon} {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Welcome Voucher & Coin Reward */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-1">
            <div className="text-[10px] font-bold text-[#166534] uppercase tracking-wider">VOUCHER CHÀO MỪNG</div>
            <div className="text-xl font-bold text-[#14532d]">50.000đ</div>
            <div className="text-xs text-[#166534]/80">Đã tự động thêm vào kho voucher của bạn</div>
          </div>

          <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] space-y-1">
            <div className="text-[10px] font-bold text-[#92400e] uppercase tracking-wider">XU TÍCH LŨY</div>
            <div className="text-xl font-bold text-[#78350f]">+100 Xu</div>
            <div className="text-xs text-[#92400e]/80">Đã cộng vào ví xu thành viên HuKi</div>
          </div>
        </div>
      </div>
    </div>
  );
};
