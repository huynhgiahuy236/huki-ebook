"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export default function AffiliateRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const shortCode = String(params?.shortCode || '');

  const [status, setStatus] = useState<'LOADING' | 'REDIRECTING' | 'NOT_FOUND' | 'ERROR'>('LOADING');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!shortCode) return;

    let isMounted = true;

    const resolveLink = async () => {
      try {
        const res = await affiliateApi.resolveShortCode(shortCode);

        if (!isMounted) return;

        if (res.success && res.data?.targetUrl) {
          const destination = res.data.targetUrl;
          setTargetUrl(destination);

          // If cookieToken returned, store in cookie and localStorage
          if (res.data.cookieToken) {
            const token = res.data.cookieToken;
            const maxAge = res.data.cookieMaxAgeSeconds || 30 * 86400;
            document.cookie = `huki_aff_click=${encodeURIComponent(
              token,
            )}; path=/; max-age=${maxAge}; SameSite=Lax`;

            try {
              localStorage.setItem('huki_aff_click', token);
              localStorage.setItem('huki_aff_click_time', Date.now().toString());
            } catch (e) {
              // Ignore localStorage error if disabled
            }

            // Realtime notification for active affiliate dashboard tabs
            try {
              realtimeSyncBus.publish('AFFILIATE_CLICK_RECORDED', {
                shortCode,
                profileId: res.data.profileId,
                targetUrl: destination,
              });
            } catch (e) {}
          }

          setStatus('REDIRECTING');

          // Smooth redirect
          setTimeout(() => {
            if (isMounted) {
              if (destination.startsWith('http://') || destination.startsWith('https://')) {
                window.location.href = destination;
              } else {
                router.replace(destination);
              }
            }
          }, 400);
        } else {
          setStatus('NOT_FOUND');
          setErrorMessage('Liên kết tiếp thị không tồn tại hoặc đã ngừng hoạt động.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('NOT_FOUND');
        setErrorMessage(err.message || 'Không thể phân giải liên kết.');
      }
    };

    resolveLink();

    return () => {
      isMounted = false;
    };
  }, [shortCode, router]);

  if (status === 'LOADING' || status === 'REDIRECTING') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <span className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Đang chuyển hướng tới HuKi...
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Mã liên kết: <span className="font-mono font-bold text-emerald-800">{shortCode}</span>
            </p>
          </div>

          <p className="text-xs text-slate-600">
            Hệ thống đang chuẩn bị trang đích cho bạn. Vui lòng chờ trong giây lát.
          </p>

          {targetUrl && (
            <div className="pt-2">
              <a
                href={targetUrl}
                className="text-xs font-bold text-emerald-800 hover:underline"
              >
                Nhấn vào đây nếu không tự động chuyển hướng
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <span className="material-symbols-outlined text-3xl">link_off</span>
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Liên Kết Không Khả Dụng
          </h1>
          <p className="text-xs font-mono text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg inline-block mt-1">
            Mã: {shortCode}
          </p>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {errorMessage || 'Liên kết tiếp thị liên kết này không tồn tại, đã hết hạn hoặc đã bị đối tác tạm ngưng.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm"
          >
            Về Trang Chủ HuKi
          </Link>
          <Link
            href="/affiliate"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Chương Trình Tiếp Thị
          </Link>
        </div>
      </div>
    </div>
  );
}
