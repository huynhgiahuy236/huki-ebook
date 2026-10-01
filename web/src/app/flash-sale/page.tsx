'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/ui/context/CartContext";
import { useToast } from "@/ui/context/ToastContext";
import { useAuth } from "@/ui/context/AuthContext";
import {
  flashSaleApi,
  type FlashSaleSlot,
  type FlashSaleItem,
  type ShopFlashSaleGroup,
} from "@/ui/api/flashSaleApi";
import { catalogApi, type BookData } from "@/ui/api/catalogApi";

interface DisplayFlashItem extends FlashSaleItem {
  title: string;
  coverUrl: string;
  slug: string;
  author: string;
  format: string;
}

interface TimerInfo {
  mode: "active" | "upcoming" | "ended";
  diff: number;
  h: string;
  m: string;
  s: string;
}

export default function FlashSalePage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  // Tab State: 'huki' (Sàn Huki) vs 'shops' (Cửa Hàng)
  const [activeTab, setActiveTab] = useState<"huki" | "shops">("huki");

  const [platformSlots, setPlatformSlots] = useState<FlashSaleSlot[]>([]);
  const [shopGroups, setShopGroups] = useState<ShopFlashSaleGroup[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogBooks, setCatalogBooks] = useState<BookData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, TimerInfo>>({});
  const previousModes = useRef<Record<string, string>>({});

  // Fetch slots and catalog fallback books
  useEffect(() => {
    fetchSlots();
    catalogApi
      .getPublicBooks({ limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCatalogBooks(res.data);
        }
      })
      .catch((err) => console.warn("Could not fetch catalog:", err));
  }, []);

  useEffect(() => {
    const poller = setInterval(() => fetchSlots(false), 10_000);
    return () => clearInterval(poller);
  }, []);

  const fetchSlots = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // 1. Fetch Platform slots and Shop flash sales in parallel
      const [platformRes, shopsRes] = await Promise.all([
        flashSaleApi.getTimeSlots("PLATFORM"),
        flashSaleApi.getGroupedShopFlashSales(),
      ]);

      const now = Date.now();

      if (platformRes.success && Array.isArray(platformRes.data)) {
        const activePlatformSlots = platformRes.data.filter((s) => {
          const end = new Date(s.endsAt).getTime();
          return now <= end && (s.items?.length ?? 0) > 0;
        });

        setPlatformSlots(activePlatformSlots);

        setActiveSlotId((current) => {
          if (current && activePlatformSlots.some((slot) => slot.id === current)) {
            return current;
          }
          return activePlatformSlots[0]?.id || null;
        });
      }

      if (shopsRes.success && Array.isArray(shopsRes.data)) {
        const filteredShopGroups = shopsRes.data
          .map((group) => ({
            ...group,
            campaigns: group.campaigns.filter((c) => {
              const end = new Date(c.endsAt).getTime();
              return now <= end && (c.items?.length ?? 0) > 0;
            }),
          }))
          .filter((group) => group.campaigns.length > 0);

        setShopGroups(filteredShopGroups);
      }
    } catch (err) {
      console.error("Error loading flash sale slots:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Collect all slots for countdown timer
  const allTimerSlots = useMemo(() => {
    const list = [...platformSlots];
    shopGroups.forEach((group) => {
      group.campaigns.forEach((camp) => {
        if (!list.some((s) => s.id === camp.id)) {
          list.push(camp);
        }
      });
    });
    return list;
  }, [platformSlots, shopGroups]);

  // Timer countdown hook
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const updated: Record<string, TimerInfo> = {};

      allTimerSlots.forEach((slot) => {
        const start = new Date(slot.startsAt).getTime();
        const end = new Date(slot.endsAt).getTime();

        let diff = 0;
        let mode: "active" | "upcoming" | "ended" = "ended";

        if (now < start) {
          diff = Math.max(0, Math.floor((start - now) / 1000));
          mode = "upcoming";
        } else if (now >= start && now <= end) {
          diff = Math.max(0, Math.floor((end - now) / 1000));
          mode = "active";
        } else {
          diff = 0;
          mode = "ended";
        }

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        updated[slot.id] = {
          mode,
          diff,
          h: String(hours).padStart(2, "0"),
          m: String(minutes).padStart(2, "0"),
          s: String(seconds).padStart(2, "0"),
        };
      });

      setTimeRemaining(updated);
      previousModes.current = Object.fromEntries(
        Object.entries(updated).map(([id, timer]) => [id, timer.mode]),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [allTimerSlots]);

  const currentPlatformSlot = useMemo(() => {
    return (
      platformSlots.find((s) => s.id === activeSlotId) ||
      platformSlots[0] ||
      null
    );
  }, [platformSlots, activeSlotId]);

  const isPlatformCountdownUrgent = Boolean(
    currentPlatformSlot &&
      timeRemaining[currentPlatformSlot.id]?.mode === "active" &&
      timeRemaining[currentPlatformSlot.id]?.diff < 600,
  );

  // Helper to map item data with catalog
  const mapItemData = (item: FlashSaleItem): DisplayFlashItem => {
    const matchedBook = catalogBooks.find((b) => b.id === item.bookId);
    return {
      ...item,
      title:
        item.bookTitle ||
        matchedBook?.title ||
        `Tác phẩm Flash Sale #${item.bookId.slice(0, 6)}`,
      coverUrl:
        item.coverUrl ||
        matchedBook?.coverUrl ||
        matchedBook?.cover ||
        (matchedBook as any)?.coverImage ||
        "/banners/hero-library.jpg",
      slug: item.bookSlug || matchedBook?.slug || item.bookId,
      author:
        (item as any).author ||
        matchedBook?.author?.name ||
        (matchedBook as any)?.author ||
        (matchedBook as any)?.authorName ||
        "Tác giả HUKI",
      format: (item as any).format || matchedBook?.format || "PHYSICAL",
    };
  };

  const platformDisplayItems: DisplayFlashItem[] = useMemo(() => {
    if (!currentPlatformSlot || !currentPlatformSlot.items) return [];
    return currentPlatformSlot.items.map(mapItemData);
  }, [currentPlatformSlot, catalogBooks]);

  const handleAddToCart = async (item: DisplayFlashItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.isSoldOut || item.stock <= 0) {
      showToast("Sản phẩm đã hết suất Flash Sale!", "warning");
      return;
    }

    try {
      if (isLoggedIn && user?.id) {
        const quotaCheck = await flashSaleApi.validateQuota({
          userId: user.id,
          bookId: item.bookId,
          flashSaleId: item.flashSaleId,
          quantity: 1,
        });

        if (quotaCheck.success && quotaCheck.data && !quotaCheck.data.allowed) {
          showToast(
            quotaCheck.data.reason ||
              "Bạn đã đạt giới hạn mua sản phẩm Flash Sale này!",
            "warning",
          );
          return;
        }
      }

      await addToCart(
        {
          id: `${item.bookId}-flash-sale`,
          title: item.title,
          author: item.author,
          price: item.salePrice,
          originalPricePaper: item.originalPrice,
          cover: item.coverUrl,
          storeId: (item as any).storeId || (item as any).book?.storeId || "huki-official",
        },
        item.format === "DIGITAL" ? "ebook" : "paper",
        1,
      );
      showToast(
        `🛒 Đã thêm "${item.title}" vào giỏ hàng thành công!`,
        "success",
      );
    } catch {
      showToast(
        "Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!",
        "error",
      );
    }
  };

  const handleBuyNow = async (item: DisplayFlashItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (item.isSoldOut || item.stock <= 0) {
      showToast("Sản phẩm đã hết suất Flash Sale!", "warning");
      return;
    }

    try {
      if (isLoggedIn && user?.id) {
        const quotaCheck = await flashSaleApi.validateQuota({
          userId: user.id,
          bookId: item.bookId,
          flashSaleId: item.flashSaleId,
          quantity: 1,
        });

        if (quotaCheck.success && quotaCheck.data && !quotaCheck.data.allowed) {
          showToast(
            quotaCheck.data.reason ||
              "Bạn đã đạt giới hạn mua sản phẩm Flash Sale này!",
            "warning",
          );
          return;
        }
      }

      const directItem = {
        id: `${item.bookId}-direct-flash-sale`,
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.salePrice,
        originalPrice: item.originalPrice,
        cover: item.coverUrl,
        quantity: 1,
        format: item.format || "PHYSICAL",
        type: item.format === "DIGITAL" ? "ebook" : "physical",
        storeId: (item as any).storeId || (item as any).book?.storeId || "huki-official",
        flashSaleId: item.flashSaleId,
        isFlashSale: true,
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem("huki_direct_checkout_item", JSON.stringify(directItem));
      }

      router.push("/checkout?direct=1");
    } catch {
      showToast(
        "Không thể tiến hành mua ngay. Vui lòng thử lại!",
        "error",
      );
    }
  };

  const totalPlatformItems = useMemo(() => {
    return platformSlots.reduce((sum, s) => sum + (s.items?.length || 0), 0);
  }, [platformSlots]);

  const totalShopCampaigns = useMemo(() => {
    return shopGroups.reduce((sum, g) => sum + g.campaigns.length, 0);
  }, [shopGroups]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* 1. HERO FLASH SALE BANNER */}
      <div
        className="relative bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#EA580C] text-white py-10 px-4 sm:px-8 overflow-hidden shadow-lg bg-cover bg-center"
        style={
          currentPlatformSlot?.bannerUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(127,29,29,.96), rgba(220,38,38,.84), rgba(234,88,12,.72)), url(${currentPlatformSlot.bannerUrl})`,
              }
            : undefined
        }
      >
        {/* Ambient Lighting & Particles */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-900/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1440px] mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-black tracking-wide border border-white/20">
              <span className="material-symbols-outlined text-amber-300 text-sm animate-bounce">
                bolt
              </span>
              <span>ĐẶC QUYỀN HỘI VIÊN HUKI EBOOK</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
              ⚡ FLASH SALE GIỜ VÀNG
            </h1>
            <p className="text-sm sm:text-base text-red-100 max-w-2xl leading-relaxed">
              Khám phá các đợt Flash Sale trợ giá từ <span className="font-extrabold text-yellow-300">Sàn HUKI</span> và các chương trình giờ vàng độc quyền từ các <span className="font-extrabold text-amber-200">Cửa hàng đối tác</span>!
            </p>
          </div>

          {/* Header Stats */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-inner shrink-0">
            <div className="text-center px-3 border-r border-white/20">
              <div className="text-2xl sm:text-3xl font-black text-yellow-300">
                70%
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                Giảm Tối Đa
              </div>
            </div>
            <div className="text-center px-3 border-r border-white/20">
              <div className="text-2xl sm:text-3xl font-black text-white">
                {platformSlots.length}
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                Khung Giờ Sàn
              </div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                {shopGroups.length}
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                Shop Đang Sale
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* =========================================================================
            MAIN TABS SELECTOR: HUKI FLASH SALE VS SHOPS FLASH SALE
        ========================================================================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-2.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Tab 1: Huki Flash Sale */}
            <button
              type="button"
              onClick={() => setActiveTab("huki")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "huki"
                  ? "bg-gradient-to-r from-[#ac2c19] to-[#c73924] text-white shadow-md shadow-red-500/20 scale-[1.02]"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">
                local_fire_department
              </span>
              <span>Huki Flash Sale</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "huki"
                    ? "bg-white/25 text-white"
                    : "bg-red-100 text-[#ac2c19]"
                }`}
              >
                {totalPlatformItems} sách
              </span>
            </button>

            {/* Tab 2: Shops Flash Sale */}
            <button
              type="button"
              onClick={() => setActiveTab("shops")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "shops"
                  ? "bg-gradient-to-r from-[#003B2B] to-[#005a41] text-white shadow-md shadow-emerald-900/20 scale-[1.02]"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">
                storefront
              </span>
              <span>Shops Flash Sale</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "shops"
                    ? "bg-white/25 text-white"
                    : "bg-emerald-100 text-[#003B2B]"
                }`}
              >
                {shopGroups.length} Shop ({totalShopCampaigns} đợt)
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden md:flex items-center gap-2 px-3">
            <span className="material-symbols-outlined text-amber-500 text-base">
              verified
            </span>
            <span>Cam kết 100% sách thật bản quyền • Giao nhanh toàn quốc</span>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: HUKI FLASH SALE CONTENT
        ========================================================================= */}
        {activeTab === "huki" && (
          <div>
            {/* 2. TIMELINE TABS (PLATFORM SLOTS) */}
            {platformSlots.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-3.5 mb-6 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                  {platformSlots.map((slot) => {
                    const timer = timeRemaining[slot.id] || {
                      mode: "ended",
                      diff: 0,
                      h: "00",
                      m: "00",
                      s: "00",
                    };
                    const isSelected = slot.id === (activeSlotId || currentPlatformSlot?.id);
                    const isActive = timer.mode === "active";
                    const isUpcoming = timer.mode === "upcoming";
                    const startTime = new Date(slot.startsAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const endTime = new Date(slot.endsAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const dateStr = new Date(slot.startsAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    });

                    return (
                      <button
                        key={slot.id}
                        onClick={() => setActiveSlotId(slot.id)}
                        className={`flex flex-col items-center justify-center px-6 py-3 rounded-2xl transition-all cursor-pointer border shrink-0 ${
                          isSelected
                            ? "bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white border-transparent shadow-md scale-102 ring-2 ring-orange-400/50"
                            : "bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-black text-sm">
                          {isActive && (
                            <span className="material-symbols-outlined text-yellow-300 text-base animate-pulse">
                              bolt
                            </span>
                          )}
                          <span>{slot.name}</span>
                        </div>
                        <div className="text-[11px] font-semibold mt-1 flex items-center gap-1.5 opacity-90">
                          <span className="font-mono text-[10px] opacity-85">
                            {startTime} - {endTime} ({dateStr})
                          </span>
                          <span>•</span>
                          {isActive ? (
                            <span className="text-yellow-200 font-bold flex items-center gap-1">
                              <span>Đang Diễn Ra</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping"></span>
                            </span>
                          ) : isUpcoming ? (
                            <span
                              className={
                                isSelected ? "text-amber-100 font-bold" : "text-orange-600 font-bold"
                              }
                            >
                              Sắp Diễn Ra ⏳
                            </span>
                          ) : (
                            <span className="opacity-60">Đã Kết Thúc</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ACTIVE SESSION COUNTDOWN HEADER */}
            {currentPlatformSlot && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">
                      timer
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>{currentPlatformSlot.name}</span>
                      {timeRemaining[currentPlatformSlot.id]?.mode === "active" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-wider animate-pulse">
                          SÀN HUKI TRỢ GIÁ
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {currentPlatformSlot.description ||
                        "Chương trình Flash Sale độc quyền do Sàn Huki Ebook trợ giá toàn quốc."}
                    </p>
                  </div>
                </div>

                {/* Countdown Box */}
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shrink-0 ${
                    isPlatformCountdownUrgent
                      ? "bg-red-950/80 border-red-500 animate-pulse"
                      : "bg-slate-800/80 border-slate-700"
                  }`}
                >
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                    {timeRemaining[currentPlatformSlot.id]?.mode === "upcoming"
                      ? "Bắt đầu trong:"
                      : timeRemaining[currentPlatformSlot.id]?.mode === "active"
                        ? "Kết thúc trong:"
                        : "Trạng thái:"}
                  </span>

                  {timeRemaining[currentPlatformSlot.id]?.mode !== "ended" ? (
                    <div className="flex items-center gap-1.5 font-mono text-sm font-black">
                      <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                        {timeRemaining[currentPlatformSlot.id]?.h || "00"}
                      </span>
                      <span className="text-rose-400 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                        {timeRemaining[currentPlatformSlot.id]?.m || "00"}
                      </span>
                      <span className="text-rose-400 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                        {timeRemaining[currentPlatformSlot.id]?.s || "00"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      ĐÃ KẾT THÚC
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 4. FLASH SALE BOOKS GRID (PLATFORM) */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500">
                  Đang tải danh sách Flash Sale Sàn...
                </p>
              </div>
            ) : platformDisplayItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">
                    timer
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Chưa có đợt Flash Sale nào từ Sàn HUKI
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Các chương trình Flash Sale của sàn sẽ tự động xuất hiện ngay khi mở bán. Bạn cũng có thể xem các đợt sale từ các Cửa hàng tại tab <strong>Shops Flash Sale</strong>.
                </p>
              </div>
            ) : timeRemaining[currentPlatformSlot?.id || ""]?.mode === "upcoming" ? (
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-amber-300 relative overflow-hidden my-4">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                    <span className="material-symbols-outlined text-3xl animate-bounce">
                      schedule
                    </span>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-300 text-slate-900 text-[11px] font-black tracking-wider uppercase mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                      <span>SẮP MỞ BÁN - CÔNG BỐ TRƯỚC</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-xs">
                      {currentPlatformSlot?.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-xl">
                      {currentPlatformSlot?.description || "Toàn bộ danh sách sách giảm giá sốc sẽ chính thức xuất hiện khi đồng hồ đếm ngược kết thúc!"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2 shrink-0 relative z-10">
                  <div className="text-xs font-bold text-yellow-200 uppercase tracking-widest">
                    Mở bán chính thức sau:
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-black bg-slate-950/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 shadow-inner">
                    <span className="text-yellow-300">{timeRemaining[currentPlatformSlot?.id || ""]?.m || "00"}</span>
                    <span className="text-white/60 animate-pulse">:</span>
                    <span className="text-yellow-300">{timeRemaining[currentPlatformSlot?.id || ""]?.s || "00"}</span>
                  </div>
                  <div className="text-[11px] font-extrabold text-white bg-white/20 px-3 py-1 rounded-full border border-white/20">
                    Giảm giá lên đến {Math.max(...platformDisplayItems.map((i) => i.discountPercent || 30), 30)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {platformDisplayItems.map((item) => {
                  const isSlotActive =
                    timeRemaining[currentPlatformSlot?.id || ""]?.mode === "active";
                  const isSlotUpcoming =
                    timeRemaining[currentPlatformSlot?.id || ""]?.mode === "upcoming";
                  const isSoldOut = item.isSoldOut || item.stock <= 0;

                  return (
                    <div
                      key={item.id}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Top Image + Badges */}
                      <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Discount Badge */}
                        <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-md flex items-center gap-0.5">
                          <span>-{item.discountPercent}%</span>
                        </div>

                        {/* Quota Badge */}
                        <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-sm text-yellow-300 font-bold text-[10px] px-2 py-0.5 rounded-md border border-yellow-300/30">
                          Tối đa {item.maxPerUser || 1} cuốn
                        </div>

                        {/* Sold Out Overlay */}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                            <span className="material-symbols-outlined text-3xl text-red-400">
                              sentiment_dissatisfied
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider mt-1">
                              ĐÃ HẾT SUẤT SALE
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info Section */}
                      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium line-clamp-1">
                            {item.author}
                          </div>
                          <Link
                            href={`/book/${item.slug}`}
                            className="font-bold text-slate-800 text-sm line-clamp-2 hover:text-rose-600 transition-colors leading-snug mt-0.5"
                          >
                            {item.title}
                          </Link>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          {/* Price Row */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-rose-600">
                              {item.salePrice.toLocaleString("vi-VN")}₫
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              {item.originalPrice.toLocaleString("vi-VN")}₫
                            </span>
                          </div>

                          {/* Stock Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-rose-600 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">
                                  local_fire_department
                                </span>
                                <span>
                                  {isSoldOut
                                    ? "ĐÃ BÁN HẾT 100%"
                                    : item.soldPercent >= 90
                                      ? `Sắp hết hàng - Còn ${item.stock} cuốn`
                                      : item.soldPercent >= 50
                                        ? `Đang bán rất chạy 🔥 (${item.soldPercent}%)`
                                        : `Đã bán ${item.sold} cuốn`}
                                </span>
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                Còn {item.stock}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isSoldOut
                                    ? "bg-slate-400"
                                    : "bg-gradient-to-r from-amber-500 to-rose-600"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(8, item.soldPercent))}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          {/* Action Button */}
                          {isSoldOut ? (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed uppercase"
                            >
                              Hết Suất Ưu Đãi
                            </button>
                          ) : isSlotActive ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleBuyNow(item, e)}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  shopping_bag
                                </span>
                                <span>Mua Ngay</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAddToCart(item, e)}
                                title="Thêm vào giỏ hàng"
                                className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-base">
                                  add_shopping_cart
                                </span>
                              </button>
                            </div>
                          ) : isSlotUpcoming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(
                                    `⏳ Đợt Flash Sale sẽ chính thức mở bán sau ${timeRemaining[currentPlatformSlot?.id || ""]?.m || "00"}:${timeRemaining[currentPlatformSlot?.id || ""]?.s || "00"}!`,
                                    "info",
                                  )
                                }
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                              >
                                <span className="material-symbols-outlined text-sm animate-pulse">
                                  timer
                                </span>
                                <span>Sắp Mở Bán ({timeRemaining[currentPlatformSlot?.id || ""]?.m || "00"}:{timeRemaining[currentPlatformSlot?.id || ""]?.s || "00"})</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAddToCart(item, e)}
                                title="Thêm vào giỏ hàng trước"
                                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-base">
                                  add_shopping_cart
                                </span>
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed"
                            >
                              Khung Giờ Đã Kết Thúc
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: SHOPS FLASH SALE CONTENT (GROUPED BY STORE)
        ========================================================================= */}
        {activeTab === "shops" && (
          <div className="space-y-8">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500">
                  Đang tải danh sách Flash Sale từ các Cửa hàng...
                </p>
              </div>
            ) : shopGroups.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">
                    storefront
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Hiện chưa có Cửa hàng nào tổ chức Flash Sale
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Các gian hàng đối tác sẽ mở các khung giờ Flash Sale riêng định kỳ. Vui lòng quay lại sau!
                </p>
              </div>
            ) : (
              shopGroups.map((group) => {
                return (
                  <section
                    key={group.storeId}
                    className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col gap-5"
                  >
                    {/* Shop Header Block */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Constrained Avatar Box */}
                        <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-gradient-to-tr from-[#003B2B] to-emerald-600 p-0.5 shadow-sm shrink-0 overflow-hidden flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-2xl">
                            store
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                              {group.storeName}
                            </h2>
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <span className="material-symbols-outlined text-[12px]">
                                verified
                              </span>
                              <span>Shop Đối Tác</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {group.campaigns.length} đợt Flash Sale đang diễn ra
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <Link
                          href={`/shop/${group.storeId}`}
                          className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 transition-all"
                        >
                          <span>Xem Gian Hàng</span>
                          <span className="material-symbols-outlined text-[15px]">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </div>

                    {/* Campaigns belonging to this Shop */}
                    {group.campaigns.map((campaign) => {
                      const timer = timeRemaining[campaign.id] || {
                        mode: "active",
                        diff: campaign.remainingSeconds || 0,
                        h: String(Math.floor((campaign.remainingSeconds || 0) / 3600)).padStart(2, "0"),
                        m: String(Math.floor(((campaign.remainingSeconds || 0) % 3600) / 60)).padStart(2, "0"),
                        s: String((campaign.remainingSeconds || 0) % 60).padStart(2, "0"),
                      };
                      const items = campaign.items.map(mapItemData);

                      const isCampaignUpcoming = timer.mode === "upcoming";
                      const isCampaignActive = timer.mode === "active";
                      const maxDiscount = Math.max(...items.map((i) => i.discountPercent || 30), 30);

                      return (
                        <div key={campaign.id} className="space-y-4">
                          {isCampaignUpcoming ? (
                            /* TEASER CARD: Hiển thị 1 thẻ dài chứa tên, đếm ngược và % giảm giá */
                            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-amber-300 relative overflow-hidden my-2">
                              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                              <div className="flex items-center gap-4 relative z-10 min-w-0">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                                  <span className="material-symbols-outlined text-3xl animate-bounce">
                                    schedule
                                  </span>
                                </div>
                                <div>
                                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-300 text-slate-900 text-[11px] font-black tracking-wider uppercase mb-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                                    <span>SẮP MỞ BÁN - CÔNG BỐ TRƯỚC</span>
                                  </div>
                                  <h3 className="text-lg sm:text-xl font-black tracking-tight drop-shadow-xs">
                                    {campaign.name}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-amber-100 mt-0.5 max-w-xl">
                                    {campaign.description || "Toàn bộ danh sách sách giảm giá sẽ chính thức mở bán khi đồng hồ đếm ngược kết thúc!"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-center sm:items-end gap-2 shrink-0 relative z-10">
                                <div className="text-xs font-bold text-yellow-200 uppercase tracking-widest">
                                  Mở bán chính thức sau:
                                </div>
                                <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-black bg-slate-950/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 shadow-inner">
                                  <span className="text-yellow-300">{timer.m}</span>
                                  <span className="text-white/60 animate-pulse">:</span>
                                  <span className="text-yellow-300">{timer.s}</span>
                                </div>
                                <div className="text-[11px] font-extrabold text-white bg-white/20 px-3 py-1 rounded-full border border-white/20">
                                  Giảm giá lên đến {maxDiscount}%
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Campaign Title & Countdown Bar */}
                              <div className="bg-[#FAF3EE] rounded-2xl p-3.5 sm:p-4 border border-[#EADBCE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="bg-[#ac2c19] text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs shrink-0">
                                    <span className="material-symbols-outlined text-[15px]">
                                      local_fire_department
                                    </span>
                                    <span>{campaign.name}</span>
                                  </div>
                                  {campaign.description && (
                                    <span className="text-xs text-slate-600 line-clamp-1 truncate">
                                      {campaign.description}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs font-bold text-[#59413C] shrink-0">
                                  <span>Kết thúc sau:</span>
                                  <div className="flex items-center gap-1 font-mono text-xs">
                                    <span className="bg-[#17201F] text-white px-2 py-1 rounded-md font-bold">
                                      {timer.h}
                                    </span>
                                    <span>:</span>
                                    <span className="bg-[#17201F] text-white px-2 py-1 rounded-md font-bold">
                                      {timer.m}
                                    </span>
                                    <span>:</span>
                                    <span className="bg-[#17201F] text-white px-2 py-1 rounded-md font-bold">
                                      {timer.s}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Items Grid for this Shop Campaign */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                                {items.map((item) => {
                                  const isSoldOut = item.isSoldOut || item.stock <= 0;

                                  return (
                                    <div
                                      key={item.id}
                                      className="group bg-white rounded-xl border border-slate-200/90 p-3 flex flex-col justify-between hover:shadow-md hover:border-[#ac2c19]/40 transition-all relative"
                                    >
                                      <div>
                                        {/* Cover */}
                                        <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-slate-50 mb-2 flex items-center justify-center">
                                          <img
                                            src={item.coverUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute top-1.5 left-1.5 z-20 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[11px]">
                                              bolt
                                            </span>
                                            <span>FLASH SALE</span>
                                          </div>
                                        </div>

                                        {/* Title */}
                                        <h3
                                          className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight h-[30px] group-hover:text-[#ac2c19] transition-colors mb-1.5"
                                          title={item.title}
                                        >
                                          {item.title}
                                        </h3>

                                        {/* Price Row */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-sm font-extrabold text-rose-600">
                                            {item.salePrice.toLocaleString("vi-VN")}₫
                                          </span>
                                          <span className="bg-rose-600 text-white text-[9px] font-bold px-1 py-0.2 rounded">
                                            -{item.discountPercent}%
                                          </span>
                                        </div>
                                        <div className="text-[10.5px] text-slate-400 line-through mt-0.5">
                                          {item.originalPrice.toLocaleString("vi-VN")}₫
                                        </div>

                                        {/* Stock info */}
                                        <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
                                          <span>Đã bán {item.sold}</span>
                                          <span className="text-rose-600 font-bold">
                                            Còn {item.stock}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="mt-3 pt-1.5 border-t border-slate-100 flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => handleBuyNow(item, e)}
                                          disabled={isSoldOut}
                                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider disabled:bg-slate-200 disabled:cursor-not-allowed"
                                        >
                                          <span className="material-symbols-outlined text-[13px]">
                                            bolt
                                          </span>
                                          <span>Mua Ngay</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleAddToCart(item, e)}
                                          disabled={isSoldOut}
                                          title="Thêm vào giỏ hàng"
                                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <span className="material-symbols-outlined text-[15px]">
                                            add_shopping_cart
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
