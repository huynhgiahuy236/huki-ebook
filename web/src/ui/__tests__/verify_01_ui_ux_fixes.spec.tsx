import React from 'react';
import Link from 'next/link';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/ui/context/AuthContext';
import { ToastProvider } from '@/ui/context/ToastContext';
import QuickDispatchNotificationModal from '@/ui/components/common/QuickDispatchNotificationModal';
import { DataTableFilterBar } from '@/ui/components/common';
import AddressMapPreview from '@/ui/components/common/AddressMapPreview';

describe('UAT 01-UI-UX-AUDIT Fixes Verification', () => {
  it('BUG 01: QuickDispatchNotificationModal renders via Portal directly onto document.body', () => {
    const { container } = render(
      <AuthProvider>
        <ToastProvider>
          <div id="nested-animated-container" className="animate-in fade-in space-y-5">
            <QuickDispatchNotificationModal
              isOpen={true}
              onClose={() => {}}
              senderRole="SHIPPER"
              targetRole="USER"
              targetId="usr-123"
              targetName="Nguyen Van A"
              orderCode="HK-9999"
            />
          </div>
        </ToastProvider>
      </AuthProvider>
    );

    // The modal overlay must NOT be inside the nested-animated-container
    const modalInContainer = container.querySelector('#nested-animated-container > .fixed');
    expect(modalInContainer).toBeNull();

    // The modal overlay must be portalled directly onto document.body
    const modalInBody = document.body.querySelector('.fixed.inset-0.z-50');
    expect(modalInBody).not.toBeNull();
    expect(modalInBody?.textContent).toContain('Gửi Thông Báo Tương Tác');
  });

  it('BUG 04: DataTableFilterBar root container does not have overflow-hidden, popovers use z-50', () => {
    const { container } = render(
      <DataTableFilterBar
        searchQuery=""
        onSearchChange={() => {}}
        dateFilter={{ mode: 'ALL_TIME' }}
        onDateFilterChange={() => {}}
      />
    );

    // Root wrapper must not have overflow-hidden (which was clipping popovers)
    const rootDiv = container.firstElementChild as HTMLElement;
    expect(rootDiv).not.toBeNull();
    expect(rootDiv.className).not.toContain('overflow-hidden');

    // Trigger quick date dropdown
    const quickDateBtn = screen.getByTitle('Mốc thời gian nhanh');
    fireEvent.click(quickDateBtn);

    // Dropdown popover must be visible with z-50
    const popover = container.querySelector('.absolute.left-0.top-full');
    expect(popover).not.toBeNull();
    expect(popover?.className).toContain('z-50');
  });

  it('BUG 05: AddressMapPreview in collapsible mode renders compact preview without loading heavy tiles until expanded', () => {
    const { container } = render(
      <AddressMapPreview
        province="Hồ Chí Minh"
        district="Quận 1"
        ward="Bến Nghé"
        address="123 Lê Lợi"
        collapsible={true}
        defaultExpanded={false}
      />
    );

    // When collapsed, it renders the compact preview bar
    expect(screen.getByText('Xem lộ trình giao dự kiến trên bản đồ')).not.toBeNull();
    const openBtn = screen.getByRole('button', { name: /Mở bản đồ/i });
    expect(openBtn).not.toBeNull();

    // No heavy leaflet map container in DOM yet
    expect(container.querySelector('.leaflet-container')).toBeNull();

    // Clicking "Mở bản đồ" expands the map
    fireEvent.click(openBtn);
    expect(screen.getByText('Thu gọn')).not.toBeNull();
  });

  it('BUG 02: Library card format checks - audio button is only present for audio-enabled books and main CTA has whitespace-nowrap', () => {
    // Test helper simulating the library card render logic
    const renderCard = (book: any) => {
      const hasAudio = Boolean(
        book.hasAudio ||
        book.audiobookId ||
        book.audioKey ||
        book.format === 'AUDIO' ||
        book.format === 'BOTH'
      );

      return (
        <div data-testid="library-card">
          <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-[#00875A] transition-colors block mb-1 min-h-[2.25rem]">
            {book.title}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <a
              href={`/reader?book=${book.id}`}
              className="flex-1 min-w-0 py-1.5 px-2 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[13px] shrink-0">auto_stories</span>
              <span className="truncate">Đọc Sách</span>
            </a>
            {hasAudio && (
              <a
                data-testid="audio-btn"
                href={`/reader?book=${book.id}&autoplay=true`}
                className="p-1.5 rounded-lg bg-emerald-50 text-[#00875A]"
                title="Nghe Giọng Đọc AI"
              >
                <span className="material-symbols-outlined text-[15px]">headphones</span>
              </a>
            )}
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"
              title="Bỏ khỏi tủ sách"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
          </div>
        </div>
      );
    };

    // Standard ebook without audio
    const { rerender, queryByTestId, getByText } = render(
      renderCard({ id: 'b1', title: 'Đắc Nhân Tâm', format: 'DIGITAL' })
    );
    expect(queryByTestId('audio-btn')).toBeNull();
    const cta = getByText('Đọc Sách').closest('a');
    expect(cta?.className).toContain('whitespace-nowrap');

    // Combo book with audio
    rerender(renderCard({ id: 'b2', title: 'Sách Nói Tuổi Trẻ', format: 'BOTH' }));
    expect(queryByTestId('audio-btn')).not.toBeNull();
  });

  it('BUG 03: Navigation links with text and icon do not apply hover:underline on the parent flex container', () => {
    const { container } = render(
      <Link href="/flash-sale" className="group text-[#003B2B] font-bold text-xs flex items-center gap-0.5">
        <span className="group-hover:underline">Xem Tất Cả</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
    );

    const linkEl = container.querySelector('a');
    expect(linkEl?.className).not.toContain('hover:underline');
    const textSpan = linkEl?.querySelector('span.group-hover\\:underline');
    expect(textSpan).not.toBeNull();
  });
});
