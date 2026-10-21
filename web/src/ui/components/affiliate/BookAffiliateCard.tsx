'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';

export interface BookAffiliateCardProps {
  bookId: string;
  bookTitle?: string;
  className?: string;
}

export default function BookAffiliateCard({
  bookId,
  bookTitle,
  className = '',
}: BookAffiliateCardProps) {
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    bookId: string;
    title: string;
    price: number;
    format: string;
    isEligible: boolean;
    effectiveRate: number;
    estimatedCommissionAmount: number;
    isAffiliateActive: boolean;
    existingShortUrl: string | null;
    cookieDurationDays: number;
  } | null>(null);

  const [generating, setGenerating] = useState<boolean>(false);
  const [activeShortUrl, setActiveShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCommissionInfo = async () => {
      setLoading(true);
      try {
        const res = await affiliateApi.getBookAffiliateCommissionCard(bookId);
        if (isMounted && res.success && res.data) {
          setData(res.data);
          if (res.data.existingShortUrl) {
            setActiveShortUrl(res.data.existingShortUrl);
          }
        }
      } catch {
        // Silently handle if book has no commission info
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCommissionInfo();
    return () => {
      isMounted = false;
    };
  }, [bookId]);

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const res = await affiliateApi.createAffiliateLink({
        targetUrl: `/book/${bookId}`,
        targetBookId: bookId,
        campaignName: 'BookQuickShare',
      });

      if (res.success && res.data?.shortUrl) {
        setActiveShortUrl(res.data.shortUrl);
        showToast({
          type: 'success',
          title: 'Đã tạo liên kết tiếp thị',
          message: 'Liên kết rút gọn của bạn đã sẵn sàng để chia sẻ.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi tạo liên kết',
        message: err.message || 'Không thể tạo liên kết cho cuốn sách này.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!activeShortUrl) return;
    const fullUrl = `${window.location.origin}${activeShortUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    showToast({
      type: 'success',
      title: 'Đã sao chép liên kết',
      message: 'Liên kết tiếp thị đã được lưu vào bộ nhớ tạm.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className={`mt-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-pulse font-sans ${className}`}>
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-2/3" />
      </div>
    );
  }

  // Sách không mở hoa hồng
  if (data && !data.isEligible) {
    return null;
  }

  // Branch 1: User là Đối tác CTV ACTIVE -> Card hoa hồng thật + tạo link nhanh
  if (data?.isAffiliateActive) {
    return (
      <div className={`mt-3.5 p-4 bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white rounded-2xl border border-emerald-200 shadow-sm font-sans ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-lg">share_reviews</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                  Tiếp thị &amp; Nhận hoa hồng
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Đối tác chính thức
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mức hoa hồng: <span className="font-bold text-emerald-800">{data.effectiveRate}%</span> | Ước tính:{' '}
                <span className="font-bold text-emerald-800">
                  {data.estimatedCommissionAmount.toLocaleString('vi-VN')} đ
                </span>
                /cuốn
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-emerald-100/70">
          {activeShortUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}${activeShortUrl}` : activeShortUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Lưu phiên tiếp thị (Cookie window) trong {data.cookieDurationDays} ngày theo cơ chế Last-Click.
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateLink}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{generating ? 'Đang tạo liên kết...' : 'Tạo liên kết chia sẻ của bạn'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Branch 2: Chưa là CTV (hoặc khách) -> Banner mời tham gia chương trình affiliate
  return (
    <div className={`mt-3.5 p-3.5 bg-gradient-to-br from-amber-50/60 via-slate-50/50 to-white rounded-2xl border border-amber-200/80 shadow-xs font-sans ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">monetization_on</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Kiếm thêm thu nhập với Tiếp Thị Liên Kết
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Nhận hoa hồng lên tới {data?.effectiveRate || 10}% khi giới thiệu cuốn sách này tới độc giả và cộng đồng của bạn.
            </p>
          </div>
        </div>

        <Link
          href={isLoggedIn ? '/account/affiliate/register' : '/affiliate'}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap self-center"
        >
          Tham gia CTV
        </Link>
      </div>
    </div>
  );
}
