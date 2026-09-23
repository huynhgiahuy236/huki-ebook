"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { businessApi, StoreData } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

const initialForm = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

const statusLabels: Record<string, string> = {
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Bị từ chối',
  SUSPENDED: 'Tạm ngưng',
  CLOSED: 'Đã đóng',
};

export function SellerStoresView() {
  const router = useRouter();
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const businessId = user?.business?.id || activeBusinessId;
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');
    let currentBizId = businessId;
    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId?.(currentBizId);
        }
      } catch (err) {
        console.warn('Could not auto-fetch businessId', err);
      }
    }

    if (!currentBizId) {
      setError('Bạn chưa đăng ký doanh nghiệp hoặc hồ sơ chưa được kích hoạt.');
      setLoading(false);
      return;
    }

    const res = await businessApi.getMyStores(currentBizId);
    if (res.success) {
      setStores((res.data as StoreData[]) || []);
      setActiveBusinessId?.(currentBizId);
    } else {
      setError(res.error?.message || 'Không thể tải thông tin gian hàng.');
    }
    setLoading(false);
  }, [businessId, setActiveBusinessId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  if (loading) return <StateCard icon="progress_activity" title="Đang tải thông tin gian hàng…" spinning />;
  if (error) return <StateCard icon="error" title="Không thể tải thông tin gian hàng" description={error} action={loadStores} />;

  const primaryStore = stores[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-800 text-lg">storefront</span>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Kênh người bán HUKI</p>
          </div>
          <h1 className="mt-1 font-editorial text-2xl sm:text-3xl font-bold text-slate-900">Hồ Sơ Gian Hàng &amp; Cửa Hàng</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Mỗi tài khoản đối tác sở hữu 1 gian hàng chính thức duy nhất trên sàn HUKI Ebook.
          </p>
        </div>
      </header>

      {!primaryStore ? (
        <StateCard 
          icon="storefront" 
          title="Chưa có gian hàng" 
          description="Vui lòng hoàn tất hồ sơ đăng ký doanh nghiệp để kích hoạt gian hàng bán sách." 
          action={() => router.push('/seller/register')} 
          actionLabel="Đăng ký gian hàng" 
        />
      ) : (
        <div className="mt-8 space-y-6">
          {/* Main Store Information Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                  <span className="material-symbols-outlined text-3xl">store</span>
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-editorial text-xl sm:text-2xl font-bold text-slate-900">{primaryStore.name}</h2>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                      primaryStore.status === 'APPROVED' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : primaryStore.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {statusLabels[primaryStore.status] || primaryStore.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-mono">
                    Đường dẫn gian hàng: <strong className="text-slate-700">/shop/{primaryStore.slug}</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/shop/${primaryStore.slug || primaryStore.id}`}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">visibility</span>
                  <span>Xem trên sàn</span>
                </Link>
                <Link
                  href="/seller/business/settings"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#003b2b] px-4 text-xs font-semibold text-white hover:bg-[#002b1f] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  <span>Cập nhật gian hàng</span>
                </Link>
              </div>
            </div>

            {/* Store Details Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium">Mô tả gian hàng</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {primaryStore.description || 'Chưa cập nhật mô tả chi tiết.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium">Email liên hệ</span>
                <p className="text-slate-800 font-semibold">{primaryStore.email || user?.email || '—'}</p>
                <span className="text-slate-400 font-medium block pt-1">Số điện thoại</span>
                <p className="text-slate-800 font-semibold">{primaryStore.phone || user?.phone || '—'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-slate-400 font-medium">Địa chỉ hoạt động</span>
                <p className="text-slate-800 font-medium leading-relaxed">{primaryStore.address || '—'}</p>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
              <Link
                href="/seller/product/create-hybrid"
                className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>Đăng bán sách mới</span>
              </Link>
              <Link
                href="/seller/products"
                className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Quản lý danh mục sách</span>
              </Link>
              <Link
                href="/seller/inventory"
                className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-base">inventory</span>
                <span>Quản lý tồn kho</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StateCardProps {
  icon: string;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  spinning?: boolean;
}

function StateCard({ icon, title, description, action, actionLabel = 'Thử lại', spinning = false }: StateCardProps) {
  return (
    <section className="mx-auto my-16 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm" role="status">
      <span className={`material-symbols-outlined text-5xl text-[#003b2b] ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
      <h1 className="mt-4 font-editorial text-2xl font-bold text-slate-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {action && (
        <button 
          type="button" 
          onClick={action} 
          className="mt-6 min-h-11 rounded-xl bg-[#003b2b] hover:bg-[#002b1f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export default SellerStoresView;

