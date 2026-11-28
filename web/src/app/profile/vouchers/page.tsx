'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { voucherApi, type Voucher } from '@/ui/api/voucherApi';
import { useToast } from '@/ui/context/ToastContext';

type WalletTab = 'ALL' | 'FREESHIP' | 'DISCOUNT' | 'SHOP';

export default function ProfileVouchersPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WalletTab>('ALL');
  const [walletData, setWalletData] = useState<{
    platform: { freeship: Voucher[]; discount: Voucher[] };
    shop: Voucher[];
  }>({
    platform: { freeship: [], discount: [] },
    shop: [],
  });

  useEffect(() => {
    let mounted = true;
    voucherApi
      .getWalletVouchers()
      .then((res) => {
        if (mounted && res.success && res.data) {
          const shopVouchers = Array.isArray(res.data.stores)
            ? res.data.stores.flatMap((s) => s.vouchers || [])
            : [];
          setWalletData({
            platform: {
              freeship: res.data.platform?.freeship || [],
              discount: res.data.platform?.discount || [],
            },
            shop: shopVouchers,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allItems = useMemo(() => {
    const freeship = walletData.platform.freeship.map((v) => ({ ...v, _group: 'FREESHIP' as const }));
    const discount = walletData.platform.discount.map((v) => ({ ...v, _group: 'DISCOUNT' as const }));
    const shop = walletData.shop.map((v) => ({ ...v, _group: 'SHOP' as const }));
    return [...freeship, ...discount, ...shop];
  }, [walletData]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return allItems;
    return allItems.filter((v) => v._group === activeTab);
  }, [allItems, activeTab]);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    showToast(`Đã sao chép mã ${code}`, 'success');
  };

  return (
    <AccountLayout>
      <div className="p-6 sm:p-8 space-y-6">
        <div className="border-b border-gray-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ví Voucher / Mã Giảm Giá</h1>
            <p className="text-xs text-gray-500 mt-1">
              Danh sách mã giảm giá sàn và gian hàng bạn đã lưu để áp dụng khi thanh toán.
            </p>
          </div>
          <Link
            href="/vouchers"
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00281d] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Săn thêm voucher</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'ALL' as const, label: 'Tất cả', count: allItems.length },
            { id: 'FREESHIP' as const, label: 'Freeship', count: walletData.platform.freeship.length },
            { id: 'DISCOUNT' as const, label: 'Giảm giá sàn', count: walletData.platform.discount.length },
            { id: 'SHOP' as const, label: 'Gian hàng', count: walletData.shop.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#003B2B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">Chưa có mã giảm giá nào trong mục này</p>
            <p className="text-xs text-slate-500">Khám phá kho ưu đãi sàn và gian hàng để lưu mã sử dụng khi đặt sách.</p>
            <Link
              href="/vouchers"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#003B2B] text-white text-xs font-semibold hover:bg-[#00281d] transition-colors mt-1"
            >
              <span>Đi đến Kho Voucher</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((v) => (
              <div
                key={v.id || v.code}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#006953]/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#003B2B]">
                      {v.type === 'PERCENTAGE'
                        ? `Giảm ${v.value}%`
                        : `Giảm ${Number(v.value || 0).toLocaleString('vi-VN')}đ`}
                    </span>
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-700">
                      {v.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium truncate">
                    {v.name || `Mã ưu đãi ${v.code}`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Đơn từ {Number(v.minOrderAmount || 0).toLocaleString('vi-VN')}đ
                    {v.expiresAt ? ` • HSD: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : ''}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyCode(v.code)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#003B2B] text-xs font-semibold text-slate-700 hover:text-[#003B2B] transition-colors cursor-pointer"
                  >
                    Sao chép
                  </button>
                  <Link
                    href="/books"
                    className="px-3 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00281d] text-white text-xs font-semibold text-center transition-colors"
                  >
                    Dùng ngay
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
