"use client";

import React from 'react';
import Link from 'next/link';

export default function SpecialCollectionSection() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #00382B 0%, #004D38 70%, #00271E 100%)',
      }}
      className="rounded-2xl text-white p-6 sm:p-8 lg:p-10 border border-white/15 relative overflow-hidden shadow-md"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <span className="bg-white/15 text-white text-[10.5px] font-bold px-2.5 py-0.5 rounded-full w-fit tracking-wider uppercase">
            BỘ SƯU TẬP ĐẶC BIỆT
          </span>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug text-white font-editorial">
            Đọc để hiểu mình – Tuyển tập Tâm lý học & Chữa lành
          </h3>
          <blockquote className="text-[13px] italic text-emerald-200 border-l-2 border-white/30 pl-3 my-0.5 leading-relaxed">
            "Khi bạn bắt đầu nhìn sâu vào bên trong chính mình, cả thế giới hỗn độn bên ngoài bỗng trở nên sáng tỏ."
          </blockquote>
          <p className="text-[12.5px] sm:text-[13.5px] text-white/90 max-w-xl leading-relaxed">
            Tuyển tập 24 tác phẩm kinh điển từ Carl Jung, Thích Nhất Hạnh, Erich Fromm và Viktor Frankl. Giảm ngay 30% khi mua trọn bộ.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Link
              href="/books?collection=psychology-healing"
              className="px-5 py-2.5 rounded-xl bg-white text-[#003B2B] text-[13px] font-bold hover:bg-gray-100 transition-all shadow-xs inline-flex items-center gap-2"
            >
              Khám phá bộ sưu tập
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
            <Link
              href="/books?format=ebook"
              className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold border border-white/30 transition-all backdrop-blur-sm"
            >
              Đọc thử Ebook miễn phí
            </Link>
          </div>
        </div>

        {/* Book Stack Decoration */}
        <div className="lg:col-span-4 flex justify-center items-center">
          <div className="relative w-[220px] h-[220px] flex items-center justify-center">
            {/* Book 1 - Back */}
            <div className="w-[120px] h-[175px] rounded-lg overflow-hidden shadow-xl absolute -left-2 transform -rotate-6 border border-white/30 bg-gradient-to-br from-amber-100 to-amber-200">
              <div className="w-full h-full flex items-center justify-center p-2">
                <div className="text-center">
                  <div className="text-[#003B2B] font-bold text-[10px]">TÂM LÝ HỌC</div>
                  <div className="text-[8px] text-gray-600">Về Tiền</div>
                </div>
              </div>
            </div>
            {/* Book 2 - Front */}
            <div className="w-[130px] h-[190px] rounded-lg overflow-hidden shadow-2xl relative z-10 border-2 border-white/40 bg-gradient-to-br from-emerald-100 to-emerald-200">
              <div className="w-full h-full flex items-center justify-center p-3">
                <div className="text-center">
                  <div className="text-[#003B2B] font-bold text-xs mb-1">NGHỆ THUẬT</div>
                  <div className="text-[10px] text-gray-600">Yêu & Được Yêu</div>
                  <div className="mt-3 text-[8px] text-gray-400">─────────────────</div>
                  <div className="text-[7px] text-gray-500 mt-1">Tác giả: Huki Books</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
