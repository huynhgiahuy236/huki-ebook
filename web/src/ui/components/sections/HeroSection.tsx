"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogApi, toCatalogBook } from '@/ui/api/catalogApi';

interface HeroSlide {
  id: string;
  badge: string;
  icon: string;
  title: string;
  description: string;
  bgImage?: string;
  overlay: string;
  primaryBtn: { text: string; href: string };
  secondaryBtn: { text: string; href: string };
}

export default function HeroSection() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default slides as fallback
  const defaultSlides: HeroSlide[] = [
    {
      id: 'default-1',
      badge: 'HUKI EBOOK - Sàn Sách Chính Hãng',
      icon: 'auto_awesome',
      title: 'Khám phá kho tri thức\nbất tận',
      description: 'Hơn 50.000 đầu sách tuyển chọn từ các NXB uy tín. Giao nhanh 2H nội thành.',
      primaryBtn: { text: 'Khám phá ngay', href: '/books' },
      secondaryBtn: { text: 'Đọc thử Ebook', href: '/books?format=ebook' },
      overlay: 'linear-gradient(to right, rgba(0, 42, 32, 0.94) 0%, rgba(0, 42, 32, 0.82) 48%, rgba(0, 42, 32, 0.2) 100%)',
    },
  ];

  useEffect(() => {
    // TODO: Fetch banners from API when available
    // For now, use default slides
    setSlides(defaultSlides);
    setIsLoading(false);
  }, []);

  // Auto-rotate slides
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, slides.length]);

  if (isLoading) {
    return (
      <div className="h-[340px] bg-gradient-to-r from-[#003B2B] to-[#005140] animate-pulse rounded-2xl" />
    );
  }

  const currentSlide = slides[activeSlide] || defaultSlides[0];

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundImage: currentSlide.overlay,
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
      }}
      className="relative rounded-2xl p-6 sm:p-8 text-white overflow-hidden flex flex-col justify-between min-h-[340px] transition-all duration-700"
    >
      {/* Background Image */}
      {currentSlide.bgImage && (
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url('${currentSlide.bgImage}')`, backgroundSize: 'cover' }}
        />
      )}

      {/* Ambient Glow */}
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-10 bottom-0 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-emerald-100 text-[11px] font-semibold mb-3 shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-amber-300">
              {currentSlide.icon}
            </span>
            <span>{currentSlide.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight font-editorial whitespace-pre-line drop-shadow-md">
            {currentSlide.title}
          </h1>
          <p className="text-xs sm:text-[13px] text-white/90 mt-2.5 leading-relaxed max-w-sm drop-shadow-sm font-medium">
            {currentSlide.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-6">
          <Link
            href={currentSlide.primaryBtn.href}
            className="px-4 py-2 rounded-xl bg-[#c58f5e] hover:bg-[#b07d4f] text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 transform hover:-translate-y-0.5"
          >
            <span>{currentSlide.primaryBtn.text}</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
          <Link
            href={currentSlide.secondaryBtn.href}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/25 transition-all transform hover:-translate-y-0.5"
          >
            {currentSlide.secondaryBtn.text}
          </Link>
        </div>
      </div>

      {/* Slide Controls */}
      {slides.length > 1 && (
        <div className="relative z-10 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  activeSlide === idx ? 'w-6 h-1.5 bg-white shadow-xs' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSlide(prev => (prev - 1 + slides.length) % slides.length)}
              className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center backdrop-blur-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_left</span>
            </button>
            <button
              onClick={() => setActiveSlide(prev => (prev + 1) % slides.length)}
              className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center backdrop-blur-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
