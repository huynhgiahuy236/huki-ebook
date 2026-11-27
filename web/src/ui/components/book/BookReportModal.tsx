"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  bookModerationService,
  BookReportReason,
  BOOK_REPORT_REASON_LABELS,
} from '@/ui/services/bookModerationService';

export interface BookReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    author?: string;
    cover?: string;
    publisher?: string;
    sellerId?: string;
    sellerName?: string;
    isbn?: string;
    format?: string;
    price?: number;
  };
}

export default function BookReportModal({ isOpen, onClose, book }: BookReportModalProps) {
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [selectedReason, setSelectedReason] = useState<BookReportReason>('COPYRIGHT');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg('Vui lòng nhập mô tả chi tiết vi phạm ít nhất 10 ký tự để BQT có căn cứ xác minh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await bookModerationService.submitReport({
        bookId: book.id,
        bookTitle: book.title,
        bookCover: book.cover,
        author: book.author,
        publisher: book.publisher,
        sellerId: book.sellerId,
        sellerName: book.sellerName,
        isbn: book.isbn,
        format: book.format,
        price: book.price,
        reporterId: user?.id || 'anonymous-user',
        reporterName: user?.fullName || user?.name || user?.email || 'Độc giả HuKi',
        reporterEmail: user?.email,
        reason: selectedReason,
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });

      showToast({
        title: 'Báo cáo thành công',
        message: 'Cảm ơn bạn! Ban Quản Trị HuKi sẽ tiến hành rà soát tác phẩm và xử lý vi phạm kịp thời.',
        type: 'success',
      });

      setDescription('');
      setEvidenceUrl('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi báo cáo lúc này, vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-[24px]">flag</span>
              <span>Báo Cáo Tác Phẩm Vi Phạm Tiêu Chuẩn</span>
            </h2>
            <p className="text-xs text-slate-500">
              Gửi phản ánh trực tiếp tới Ban Quản Trị HuKi để bảo vệ quyền tác giả, tính chính xác và an toàn cộng đồng bạn đọc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        {/* Book Preview Summary */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs">
          <img
            src={book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&auto=format&fit=crop&q=80'}
            alt={book.title}
            className="w-12 h-16 object-cover rounded-xl shadow-xs shrink-0 border border-slate-200"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">{book.title}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Tác giả: <strong className="text-slate-700">{book.author || 'Đang cập nhật'}</strong></span>
              <span>•</span>
              <span>ISBN: <strong className="text-slate-700">{book.isbn || 'Chưa cấp'}</strong></span>
            </div>
            <div className="flex items-center gap-2 pt-0.5 text-xs">
              <span className="text-[#00875A] font-bold">Gian hàng: {book.sellerName || book.publisher || 'Đối tác HuKi'}</span>
              {book.price !== undefined && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-700 font-semibold">{book.price.toLocaleString('vi-VN')} đ</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Auth Check Warning */}
        {!isLoggedIn ? (
          <div className="py-8 px-6 text-center space-y-4 bg-amber-50/70 rounded-2xl border border-amber-200/80">
            <span className="material-symbols-outlined text-[36px] text-amber-600 block mx-auto">lock</span>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-amber-900">Yêu cầu đăng nhập tài khoản</h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                Để bảo vệ tính minh bạch và tránh các hành vi spam phản ánh đối thủ, quý độc giả vui lòng đăng nhập trước khi gửi báo cáo vi phạm.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/login?redirect=/book/${book.id}`}
                className="inline-flex items-center gap-2 bg-[#00875A] hover:bg-[#00704A] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">login</span>
                <span>Đăng Nhập Ngay</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1.5 text-xs">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-rose-600 shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Select Reason: 2 columns grid for comfortable spacious UI */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800 text-xs">
                Lý Do Phản Ánh Vi Phạm <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(BOOK_REPORT_REASON_LABELS) as BookReportReason[]).map((rKey) => {
                  const meta = BOOK_REPORT_REASON_LABELS[rKey];
                  const isChecked = selectedReason === rKey;
                  return (
                    <label
                      key={rKey}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'border-[#00875A] bg-emerald-50/80 shadow-2xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        checked={isChecked}
                        onChange={() => setSelectedReason(rKey)}
                        className="mt-0.5 text-[#00875A] w-4 h-4 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className={`font-bold block text-xs ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-500 leading-snug block">
                          {meta.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-800 text-xs">
                Mô Tả Chi Tiết &amp; Dẫn Chứng Cụ Thể <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Vui lòng cung cấp chi tiết số trang sách, đoạn văn hoặc dấu hiệu vi phạm..."
                className="w-full p-3 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-800 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] leading-relaxed text-xs transition-colors resize-none"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Yêu cầu tối thiểu 10 ký tự</span>
                <span className={description.trim().length >= 10 ? 'text-[#00875A] font-semibold' : ''}>
                  {description.trim().length} ký tự
                </span>
              </div>
            </div>

            {/* Optional Evidence URL */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 text-xs">
                Đường Dẫn Bằng Chứng Đối Chiếu (Không bắt buộc)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Ví dụ: Link bài viết bản quyền gốc, link đối chiếu sách NXB chính thống..."
                className="w-full h-10 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-800 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] text-xs transition-colors"
              />
            </div>

            {/* Disclaimer */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 leading-relaxed flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#00875A] shrink-0">verified_user</span>
              <span>
                Báo cáo của bạn được gửi bảo mật đến Ban Quản Trị Hệ Thống. Thông tin danh tính của bạn sẽ được bảo vệ tuyệt đối theo chính sách người dùng.
              </span>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || description.trim().length < 10}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow active:scale-98 inline-flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Gửi Báo Cáo Vi Phạm</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
