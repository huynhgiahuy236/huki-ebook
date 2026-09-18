"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { businessApi } from '@/ui/api/businessApi';

interface Store {
  id: string;
  name: string;
  displayName: string;
  code: string;
  color: string;
  followers: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export default function FeaturedStoresSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // TODO: Fetch from businessApi when endpoint available
        // For now, use placeholder data
        setStores([
          {
            id: 'store-tre',
            name: 'NXB Trẻ',
            displayName: 'Nhà Xuất Bản Trẻ',
            code: 'TRẺ',
            color: 'bg-emerald-600 text-white',
            followers: '42.5k người theo dõi',
            rating: 4.9,
            reviewCount: 12500,
            isVerified: true,
          },
          {
            id: 'store-nhanam',
            name: 'Nhã Nam',
            displayName: 'Nhã Nam Publishing',
            code: 'NN',
            color: 'bg-amber-600 text-white',
            followers: '68.2k người theo dõi',
            rating: 5.0,
            reviewCount: 28400,
            isVerified: true,
          },
          {
            id: 'store-kimdong',
            name: 'Kim Đồng',
            displayName: 'NXB Kim Đồng',
            code: 'KĐ',
            color: 'bg-rose-600 text-white',
            followers: '51.9k người theo dõi',
            rating: 4.9,
            reviewCount: 19100,
            isVerified: true,
          },
          {
            id: 'store-alpha',
            name: 'Alpha Books',
            displayName: 'Alpha Books Official',
            code: 'αB',
            color: 'bg-blue-600 text-white',
            followers: '39.1k người theo dõi',
            rating: 4.8,
            reviewCount: 14200,
            isVerified: true,
          },
          {
            id: 'store-firstnews',
            name: 'First News',
            displayName: 'First News Trí Việt',
            code: 'FN',
            color: 'bg-teal-700 text-white',
            followers: '45.8k người theo dõi',
            rating: 4.9,
            reviewCount: 16700,
            isVerified: true,
          },
        ]);
      } catch (err) {
        console.warn('Stores fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#003B2B] text-[22px]">storefront</span>
          <div>
            <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">Gian Hàng NXB & Đối Tác Chính Hãng</h2>
            <p className="text-[11px] text-gray-500">100% sách thật bản quyền</p>
          </div>
        </div>
        <Link href="/stores" className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5">
          <span>Xem tất cả</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col justify-between hover:border-[#003B2B]/30 hover:shadow-sm transition-all"
          >
            <Link href={`/shop/${store.id}`} className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl ${store.color} flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0`}>
                {store.code}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-[12.5px] font-bold text-gray-900 truncate">{store.name}</h4>
                  {store.isVerified && (
                    <span className="material-symbols-outlined text-[14px] text-[#003B2B] fill-icon shrink-0">verified</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 block truncate">{store.followers}</span>
              </div>
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                ⭐ {store.rating} ({store.reviewCount.toLocaleString()})
              </span>
              <button className="text-[10px] font-bold text-[#003B2B] hover:underline">
                Theo dõi
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
