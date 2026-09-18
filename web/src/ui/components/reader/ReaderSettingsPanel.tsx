'use client';

import React from 'react';
import { useReaderSettings } from '../../../hooks/useReaderSettings';

export default function ReaderSettingsPanel() {
  const {
    settings,
    setTheme,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setMargin,
    setIsSettingsOpen,
    resetToDefault,
    fontFamilies,
    fontSizes,
    lineHeights,
    margins,
    themes,
  } = useReaderSettings();

  if (!settings.isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Click outside to close */}
      <div
        className="absolute inset-0"
        onClick={() => setIsSettingsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md bg-[#18181b] border border-zinc-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-700/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">format_size</span>
            <h2 className="font-editorial text-lg sm:text-xl font-bold text-white">Tùy Chỉnh Hiển Thị &amp; Phông Chữ</h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng bảng tùy chỉnh"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Live Typography Preview Box */}
        <div
          className="rounded-2xl p-4 transition-all duration-300 border border-white/10 shadow-inner"
          style={{
            backgroundColor:
              settings.theme === 'sepia'
                ? '#f4ecd8'
                : settings.theme === 'warm'
                ? '#fdfbf7'
                : settings.theme === 'light'
                ? '#ffffff'
                : '#27272a',
            color:
              settings.theme === 'sepia'
                ? '#3f392f'
                : settings.theme === 'warm'
                ? '#1f2937'
                : settings.theme === 'light'
                ? '#111827'
                : '#f3f4f6',
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            paddingLeft: settings.margin === 'compact' ? '12px' : settings.margin === 'wide' ? '28px' : '20px',
            paddingRight: settings.margin === 'compact' ? '12px' : settings.margin === 'wide' ? '28px' : '20px',
          }}
        >
          <p className="font-semibold text-[0.8em] opacity-60 mb-1 uppercase tracking-wider">Xem trước văn bản trực tiếp:</p>
          <p className="leading-relaxed">
            &ldquo;Sách mở ra trước mắt chúng ta những chân trời mới. Đọc sách là cách nhanh nhất để trò chuyện cùng những bộ óc vĩ đại nhất của nhân loại.&rdquo;
          </p>
        </div>

        {/* Theme Mode Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Chế độ màu nền
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  settings.theme === t.id
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                    : 'border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: t.bg }}
                />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Family Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Kiểu phông chữ (Typography)
          </label>
          <div className="space-y-1.5">
            {fontFamilies.map((f) => (
              <button
                key={f.id}
                onClick={() => setFontFamily(f.value)}
                className={`w-full py-2 px-3.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                  settings.fontFamily === f.value
                    ? 'border-emerald-500 bg-emerald-500/15 text-white font-bold'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
                }`}
                style={{ fontFamily: f.value }}
              >
                <span>{f.name}</span>
                {settings.fontFamily === f.value && (
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Cỡ chữ ({settings.fontSize}px)
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontSize(Math.max(12, settings.fontSize - 1))}
                disabled={settings.fontSize <= 12}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer transition-colors text-xs font-bold"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(Math.min(24, settings.fontSize + 1))}
                disabled={settings.fontSize >= 24}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer transition-colors text-xs font-bold"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {fontSizes.map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  settings.fontSize === sz
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height & Margin Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Line Height */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Khoảng cách dòng
            </label>
            <div className="flex items-center gap-1.5">
              {lineHeights.map((lh) => (
                <button
                  key={lh}
                  onClick={() => setLineHeight(lh)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings.lineHeight === lh
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {lh}x
                </button>
              ))}
            </div>
          </div>

          {/* Margin */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Lề trang
            </label>
            <div className="flex items-center gap-1.5">
              {margins.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMargin(m.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings.margin === m.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {m.id === 'compact' ? 'Hẹp' : m.id === 'wide' ? 'Rộng' : 'Vừa'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-700/60 flex items-center justify-between">
          <button
            onClick={resetToDefault}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Đặt lại mặc định
          </button>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
}
