"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { businessApi } from '@/ui/api/businessApi';
import { useToast } from '@/ui/context/ToastContext';

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
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});

  // Khôi phục trạng thái theo dõi từ localStorage & backend API
  useEffect(() => {
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      if (raw) {
        setFollowedIds(JSON.parse(raw));
      }
    } catch {}

    const syncRemoteFollowed = async () => {
      try {
        const res = await businessApi.getMyFollowedBusinessIds();
        if (res && res.data && Array.isArray(res.data)) {
          const remoteMap: Record<string, boolean> = {};
          res.data.forEach((id: string) => {
            remoteMap[id] = true;
          });
          setFollowedIds((prev) => {
            const merged = { ...prev, ...remoteMap };
            try {
              localStorage.setItem('huki_followed_stores', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {
        // Guest mode hoặc chưa đăng nhập thì dùng local map
      }
    };
    syncRemoteFollowed();
  }, []);

  const toggleFollow = useCallback(async (storeId: string, storeName: string) => {
    const isCurrentlyFollowed = Boolean(followedIds[storeId]);
    const nextState = !isCurrentlyFollowed;

    setFollowedIds((prev) => {
      const updated = { ...prev, [storeId]: nextState };
      try {
        localStorage.setItem('huki_followed_stores', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (nextState) {
      showToast(`Đã theo dõi ${storeName}! Bạn sẽ nhận được các thông báo ra mắt sách mới nhất.`, 'success');
      try {
        await businessApi.followBusiness(storeId);
      } catch (err) {
        console.warn('Sync follow store to backend failed:', err);
      }
    } else {
      showToast(`Đã bỏ theo dõi ${storeName}.`, 'info');
      try {
        await businessApi.unfollowBusiness(storeId);
      } catch (err) {
        console.warn('Sync unfollow store to backend failed:', err);
      }
    }
  }, [followedIds, showToast]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await businessApi.getPublicBusinesses({ limit: 10 });
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const colors = [
            'bg-emerald-600 text-white',
            'bg-amber-600 text-white',
            'bg-rose-600 text-white',
            'bg-blue-600 text-white',
            'bg-teal-700 text-white',
          ];
          const mapped: Store[] = res.data.slice(0, 5).map((b, i) => {
            const code = b.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'HB';
            return {
              id: b.slug || b.id,
              name: b.name,
              displayName: b.displayName || b.name,
              code,
              color: colors[i % colors.length],
              followers: 'Đang mở bán',
              rating: 5.0,
              reviewCount: 100,
              isVerified: true,
            };
          });
          setStores(mapped);
          return;
        }

        // Fallback danh sách NXB đối tác chính thức tiêu chuẩn
        setStores([
          {
            id: 'nxb-tre',
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
            id: 'nha-nam',
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
            id: 'nxb-kim-dong',
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
            id: 'alpha-books',
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
            id: 'first-news',
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
        {stores.map((store) => {
          const isFollowed = Boolean(followedIds[store.id]);
          return (
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
                  ★ {store.rating} ({store.reviewCount.toLocaleString()})
                </span>
                {isFollowed ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFollow(store.id, store.name);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                    title={`Nhấp để bỏ theo dõi ${store.name}`}
                  >
                    <span className="material-symbols-outlined text-[12px] text-emerald-600">check</span>
                    <span>Đang theo dõi</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFollow(store.id, store.name);
                    }}
                    className="text-[10px] font-bold text-[#003B2B] hover:text-[#00281d] hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
                    title={`Nhấp để theo dõi ${store.name}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                    <span>Theo dõi</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
