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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-[20px]">flag</span>
              <span>Báo Cáo Sách Vi Phạm</span>
            </h2>
            <p className="text-xs text-slate-500">
              Gửi phản ánh trực tiếp tới Ban Quản Trị để bảo vệ bản quyền và cộng đồng bạn đọc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Book Preview Summary */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <img
            src={book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&auto=format&fit=crop&q=80'}
            alt={book.title}
            className="w-11 h-15 object-cover rounded-lg shadow-2xs shrink-0 border border-slate-200"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">{book.title}</h4>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">Tác giả: {book.author || 'Đang cập nhật'}</p>
            <p className="text-[10.5px] text-[#006953] font-semibold truncate mt-0.5">
              Gian hàng: {book.sellerName || book.publisher || 'Đối tác HuKi'}
            </p>
          </div>
        </div>

        {/* Auth Check Warning */}
        {!isLoggedIn ? (
          <div className="py-6 px-4 text-center space-y-4 bg-amber-50/60 rounded-2xl border border-amber-200/70">
            <span className="material-symbols-outlined text-[32px] text-amber-600 block mx-auto">lock</span>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">Yêu cầu đăng nhập tài khoản</h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-sm mx-auto">
                Để bảo vệ tính minh bạch và tránh spam báo cáo ảo, quý độc giả vui lòng đăng nhập trước khi gửi phản ánh vi phạm.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/login?redirect=/book/${book.id}`}
                className="inline-flex items-center gap-2 bg-[#00875A] hover:bg-[#00704A] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Đăng Nhập Ngay</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Select Reason */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800">
                Lý Do Báo Cáo Vi Phạm <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(BOOK_REPORT_REASON_LABELS) as BookReportReason[]).map((rKey) => {
                  const meta = BOOK_REPORT_REASON_LABELS[rKey];
                  const isChecked = selectedReason === rKey;
                  return (
                    <label
                      key={rKey}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-[#00875A] bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        checked={isChecked}
                        onChange={() => setSelectedReason(rKey)}
                        className="mt-0.5 text-[#00875A]"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className={`font-bold block ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10.5px] text-slate-500 leading-tight block">
                          {meta.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-800">
                Mô Tả Chi Tiết &amp; Dẫn Chứng <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Vui lòng cung cấp chi tiết trang sách, dấu hiệu vi phạm hoặc nguồn tài liệu đối chiếu..."
                className="w-full p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 leading-relaxed shadow-2xs text-xs"
                required
              />
              <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                <span>Tối thiểu 10 ký tự</span>
                <span>{description.trim().length} ký tự</span>
              </div>
            </div>

            {/* Optional Evidence URL */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                Đường Dẫn Bằng Chứng Đối Chiếu (Không bắt buộc)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Ví dụ: Link bài viết bản quyền gốc, link chứng minh sách lậu..."
                className="w-full h-9.5 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#00875A] shadow-2xs text-xs"
              />
            </div>

            {/* Disclaimer */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 leading-relaxed flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">shield</span>
              <span>
                Báo cáo của bạn được gửi bảo mật đến Ban Quản Trị Hệ Thống. Mọi thông tin người báo cáo đều được giữ kín.
              </span>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || description.trim().length < 10}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">send</span>
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
