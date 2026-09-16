import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { flashSaleApi } from "../../api/flashSaleApi";
import { catalogApi } from "../../api/catalogApi";

export default function FlashSalePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  const [slots, setSlots] = useState([]);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({});
  const previousModes = useRef({});

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
      const res = await flashSaleApi.getTimeSlots();
      if (res.success && Array.isArray(res.data)) {
        setSlots(res.data);
        // Find first active slot, else first scheduled slot, else first slot
        const active =
          res.data.find((s) => s.status === "ACTIVE") || res.data[0];
        setActiveSlotId((current) =>
          current && res.data.some((slot) => slot.id === current)
            ? current
            : active?.id || null,
        );
      }
    } catch (err) {
      console.error("Error loading flash sale slots:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const updated = {};

      slots.forEach((slot) => {
        const start = new Date(slot.startsAt).getTime();
        const end = new Date(slot.endsAt).getTime();

        let diff = 0;
        let mode = "ended";

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
      setActiveSlotId((current) => {
        const previousMode = previousModes.current[current];
        if (
          current &&
          previousMode === "active" &&
          updated[current]?.mode === "ended"
        ) {
          return (
            slots.find((slot) => updated[slot.id]?.mode === "active")?.id ||
            slots.find((slot) => updated[slot.id]?.mode === "upcoming")?.id ||
            current
          );
        }
        return current;
      });
      previousModes.current = Object.fromEntries(
        Object.entries(updated).map(([id, timer]) => [id, timer.mode]),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [slots]);

  const currentSlot = useMemo(() => {
    return slots.find((s) => s.id === activeSlotId) || slots[0] || null;
  }, [slots, activeSlotId]);
  const isCountdownUrgent =
    timeRemaining[currentSlot?.id]?.mode === "active" &&
    timeRemaining[currentSlot?.id]?.diff < 600;

  // Merge slot items with catalog metadata (title, cover, slug)
  const displayItems = useMemo(() => {
    if (!currentSlot || !currentSlot.items) return [];

    return currentSlot.items.map((item) => {
      const matchedBook = catalogBooks.find((b) => b.id === item.bookId);
      return {
        ...item,
        title:
          matchedBook?.title ||
          item.bookTitle ||
          `Tác phẩm Flash Sale #${item.bookId.slice(0, 6)}`,
        coverUrl:
          matchedBook?.coverUrl ||
          item.coverUrl ||
          "/banners/book-placeholder.jpg",
        slug: matchedBook?.slug || item.bookSlug || item.bookId,
        author: matchedBook?.author?.name || "Tác giả HUKI",
        format: matchedBook?.format || "PHYSICAL",
      };
    });
  }, [currentSlot, catalogBooks]);

  const handleBuyNow = async (item) => {
    if (item.isSoldOut || item.stock <= 0) {
      showToast("Sản phẩm đã hết suất Flash Sale!", "warning");
      return;
    }

    try {
      // Validate quota with promotion service
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

      await addToCart({
        id: `${item.bookId}-flash-sale`,
        bookId: item.bookId,
        title: item.title,
        author: item.author,
        price: item.salePrice,
        originalPrice: item.originalPrice,
        cover: item.coverUrl,
        format: "Sách giấy",
        type: "physical",
        quantity: 1,
      });
      showToast(
        `⚡ Đã thêm "${item.title}" vào giỏ hàng với giá Flash Sale ${item.salePrice.toLocaleString("vi-VN")}₫!`,
        "success",
      );
      navigate("/checkout");
    } catch (err) {
      showToast(
        "Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!",
        "error",
      );
    }
  };

  const handleRemindMe = (slotName, itemTitle) => {
    showToast(
      `🔔 Đã đặt nhắc nhở cho "${itemTitle}" trong khung giờ ${slotName}!`,
      "info",
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* 1. HERO FLASH SALE BANNER */}
      <div
        className="relative bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#EA580C] text-white py-10 px-4 sm:px-8 overflow-hidden shadow-lg bg-cover bg-center"
        style={
          currentSlot?.bannerUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(127,29,29,.96), rgba(220,38,38,.84), rgba(234,88,12,.72)), url(${currentSlot.bannerUrl})`,
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
              Săn ngàn tựa sách Hot giảm sâu đến{" "}
              <span className="font-extrabold text-yellow-300">70%</span> theo
              từng khung giờ cố định và sự kiện đặc biệt. Số lượng có hạn, giới
              hạn 1 cuốn/khách hàng!
            </p>
          </div>

          {/* Header Stats / Quick summary */}
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
                {slots.length}
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                Khung Giờ
              </div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                100%
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                Sách Thật DRM
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* 2. TIMELINE TABS (KHUNG GIỜ FLASH SALE) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mb-6 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max">
            {slots.map((slot) => {
              const timer = timeRemaining[slot.id] || {
                mode: "ended",
                h: "00",
                m: "00",
                s: "00",
              };
              const isSelected = slot.id === activeSlotId;
              const isActive = timer.mode === "active";
              const isUpcoming = timer.mode === "upcoming";

              return (
                <button
                  key={slot.id}
                  onClick={() => setActiveSlotId(slot.id)}
                  className={`flex flex-col items-center justify-center px-6 py-3 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-gradient-to-br from-rose-600 to-red-600 text-white border-transparent shadow-md scale-102"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-sm">
                    {isActive && (
                      <span className="material-symbols-outlined text-yellow-300 text-sm animate-pulse">
                        bolt
                      </span>
                    )}
                    <span>{slot.name}</span>
                  </div>
                  <div className="text-[11px] font-semibold mt-0.5 opacity-90">
                    {isActive ? (
                      <span className="text-yellow-200 font-bold">
                        Đang Diễn Ra 🔥
                      </span>
                    ) : isUpcoming ? (
                      <span
                        className={isSelected ? "text-white" : "text-slate-500"}
                      >
                        Sắp Diễn Ra ⏳
                      </span>
                    ) : (
                      <span className="opacity-70">Đã Kết Thúc</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. ACTIVE SESSION COUNTDOWN HEADER */}
        {currentSlot && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-2xl">
                  timer
                </span>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>{currentSlot.name}</span>
                  {timeRemaining[currentSlot.id]?.mode === "active" && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-wider animate-pulse">
                      LIVE NOW
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {currentSlot.description ||
                    "Chương trình ưu đãi có hạn ngạch và tự động kết thúc khi hết giờ."}
                </p>
              </div>
            </div>

            {/* Countdown Box */}
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shrink-0 ${
                isCountdownUrgent
                  ? "bg-red-950/80 border-red-500 animate-pulse"
                  : "bg-slate-800/80 border-slate-700"
              }`}
            >
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                {timeRemaining[currentSlot.id]?.mode === "upcoming"
                  ? "Bắt đầu trong:"
                  : timeRemaining[currentSlot.id]?.mode === "active"
                    ? "Kết thúc trong:"
                    : "Trạng thái:"}
              </span>

              {timeRemaining[currentSlot.id]?.mode !== "ended" ? (
                <div className="flex items-center gap-1.5 font-mono text-sm font-black">
                  <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                    {timeRemaining[currentSlot.id]?.h || "00"}
                  </span>
                  <span className="text-rose-400 font-bold">:</span>
                  <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                    {timeRemaining[currentSlot.id]?.m || "00"}
                  </span>
                  <span className="text-rose-400 font-bold">:</span>
                  <span className="bg-rose-600 text-white px-2 py-1 rounded-lg shadow-inner">
                    {timeRemaining[currentSlot.id]?.s || "00"}
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

        {/* 4. FLASH SALE BOOKS GRID */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">
              Đang tải danh sách Flash Sale...
            </p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <span className="material-symbols-outlined text-5xl text-slate-300">
              inventory_2
            </span>
            <h3 className="text-base font-bold text-slate-700 mt-2">
              Chưa có sản phẩm trong khung giờ này
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Vui lòng chọn khung giờ khác hoặc quay lại sau!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {displayItems.map((item) => {
              const isSlotActive =
                timeRemaining[currentSlot?.id]?.mode === "active";
              const isSlotUpcoming =
                timeRemaining[currentSlot?.id]?.mode === "upcoming";
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
                        to={`/book/${item.slug}`}
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
                        <button
                          onClick={() => handleBuyNow(item)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                        >
                          <span className="material-symbols-outlined text-sm">
                            shopping_bag
                          </span>
                          <span>Mua Ngay</span>
                        </button>
                      ) : isSlotUpcoming ? (
                        <button
                          onClick={() =>
                            handleRemindMe(currentSlot.name, item.title)
                          }
                          className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">
                            notifications_active
                          </span>
                          <span>Nhắc Tôi</span>
                        </button>
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
    </div>
  );
}
