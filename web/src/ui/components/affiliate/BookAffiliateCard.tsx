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
        const [commRes, profileRes] = await Promise.allSettled([
          affiliateApi.getBookAffiliateCommissionCard(bookId),
          isLoggedIn ? affiliateApi.getMyProfile() : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        let cardData = null;
        if (commRes.status === 'fulfilled' && commRes.value?.success && commRes.value.data) {
          cardData = commRes.value.data;
        }

        // If user has an active profile verified by getMyProfile
        let isUserActiveAffiliate = Boolean(cardData?.isAffiliateActive);
        if (
          profileRes.status === 'fulfilled' &&
          profileRes.value &&
          (profileRes.value as any)?.success &&
          (profileRes.value as any)?.data?.profile?.status === 'ACTIVE'
        ) {
          isUserActiveAffiliate = true;
        }

        if (cardData) {
          setData({
            ...cardData,
            isAffiliateActive: isUserActiveAffiliate,
          });
          if (cardData.existingShortUrl) {
            setActiveShortUrl(cardData.existingShortUrl);
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
  }, [bookId, isLoggedIn]);

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
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
        navigator.clipboard.writeText(`${origin}${res.data.shortUrl}`);
        setCopied(true);
        showToast('Tạo và sao chép link tiếp thị thành công!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } else {
        showToast(res.error?.message || 'Không thể tạo liên kết cho cuốn sách này.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối khi tạo liên kết tiếp thị.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!activeShortUrl) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
    const fullUrl = `${origin}${activeShortUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    showToast('Đã sao chép link tiếp thị vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className={`mt-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 animate-pulse space-y-2 font-sans ${className}`}>
        <div className="h-3.5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  // Sách không mở hoa hồng
  if (data && !data.isEligible) {
    return null;
  }

  const effectiveRate = data?.effectiveRate || 10;
  const estimatedAmount = data?.estimatedCommissionAmount || 0;

  // Branch 1: User là Đối tác CTV ACTIVE -> Card hoa hồng thật + tạo link nhanh
  if (data?.isAffiliateActive) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
    const fullUrl = activeShortUrl ? `${origin}${activeShortUrl}` : '';

    return (
      <div className={`mt-3 p-3.5 bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white rounded-2xl border border-emerald-200 shadow-2xs font-sans space-y-2.5 ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[16px]">share_reviews</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 justify-between">
              <span className="text-xs font-bold text-emerald-950 truncate">
                Tiếp Thị &amp; Nhận Hoa Hồng
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                Đối tác
              </span>
            </div>
            <span className="text-[11px] text-gray-500 block truncate">
              Mức hoa hồng: <strong className="text-emerald-800 font-extrabold">{effectiveRate}%</strong>
              {estimatedAmount > 0 && ` (~${estimatedAmount.toLocaleString('vi-VN')} đ/cuốn)`}
            </span>
          </div>
        </div>

        {/* Action Section */}
        {activeShortUrl ? (
          <div className="space-y-2 pt-1 border-t border-emerald-100">
            <div className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 text-[11px] font-mono text-emerald-950 truncate">
              {fullUrl}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Đã Chép Link!' : 'Sao Chép Link'}</span>
              </button>
              <a
                href={activeShortUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 flex items-center justify-center shrink-0"
                title="Mở thử nghiệm link tiếp thị"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="pt-1 border-t border-emerald-100">
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateLink}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                  <span>Đang tạo link...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">share</span>
                  <span>Lấy Link Tiếp Thị Ngay</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Branch 2: Chưa là CTV (hoặc khách) -> Banner mời tham gia chương trình affiliate (Full-width, clean vertical stack)
  return (
    <div className={`mt-3 p-3.5 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white rounded-2xl border border-amber-200 shadow-2xs font-sans space-y-2.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[16px]">monetization_on</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-gray-900 truncate">
            Tiếp Thị &amp; Kiếm Tiền
          </h4>
          <span className="text-[10px] text-amber-800 font-bold block">
            Hoa hồng lên tới {effectiveRate}%
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-600 leading-relaxed">
        Chia sẻ cuốn sách này đến bạn bè hoặc cộng đồng để nhận hoa hồng lên tới <strong className="text-emerald-700 font-bold">{effectiveRate}%</strong> khi có người mua.
      </p>

      {/* Full-width Action Link */}
      <Link
        href={isLoggedIn ? '/account/affiliate/application' : '/affiliate'}
        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-center"
      >
        <span className="material-symbols-outlined text-[15px]">campaign</span>
        <span>Tham Gia Làm Đối Tác CTV</span>
      </Link>
    </div>
  );
}
