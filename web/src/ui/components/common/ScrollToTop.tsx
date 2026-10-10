"use client";

import React, { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-4 sm:bottom-6 sm:right-6 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#003B2B] to-[#006953] text-white border-2 border-emerald-400/40 shadow-xl shadow-emerald-950/25 hover:shadow-2xl hover:scale-110 hover:border-emerald-300 transition-all duration-300 flex items-center justify-center cursor-pointer group active:scale-95 animate-in fade-in slide-in-from-bottom-2"
      title="Cuộn lên đầu trang"
      aria-label="Cuộn lên đầu trang"
    >
      <span className="material-symbols-outlined text-2xl sm:text-[26px] text-white transition-transform duration-200 group-hover:-translate-y-1">
        arrow_upward
      </span>
    </button>
  );
}
