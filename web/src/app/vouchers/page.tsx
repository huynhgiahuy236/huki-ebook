"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/ui/context/AuthContext";
import { useToast } from "@/ui/context/ToastContext";
import { voucherApi, Voucher, StoreInfo } from "@/ui/api/voucherApi";
import { formatFollowerRequirement } from "@/ui/api/sellerVoucherApi";

export default function VouchersPage() {
  const { isLoggedIn } = (useAuth() || {}) as any;
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"HUKI" | "SHOP" | "WALLET">("HUKI");
  const [walletSubTab, setWalletSubTab] = useState<"ALL" | "FREESHIP" | "DISCOUNT" | "SHOP">("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Data states
  const [platformVouchers, setPlatformVouchers] = useState<(Voucher & { isSaved?: boolean })[]>([]);
  const [shopVouchersGrouped, setShopVouchersGrouped] = useState<
    Array<{ store: StoreInfo; vouchers: (Voucher & { isSaved?: boolean })[] }>
  >([]);
  const [walletData, setWalletData] = useState<{
    platform: { freeship: any[]; discount: any[]; all: any[] };
    stores: Array<{ store: StoreInfo; vouchers: any[] }>;
    totalCount: number;
  }>({
    platform: { freeship: [], discount: [], all: [] },
    stores: [],
    totalCount: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, walletRes] = await Promise.all([
        voucherApi.getEligibleFeed(),
        isLoggedIn ? voucherApi.getWalletVouchers() : Promise.resolve({ success: false, data: null }),
      ]);

      if (feedRes.success && feedRes.data) {
        setPlatformVouchers(feedRes.data.platformVouchers || []);
        setShopVouchersGrouped(feedRes.data.shopVouchersGrouped || []);
      }

      if (walletRes.success && walletRes.data) {
        setWalletData(walletRes.data);
      } else {
        setWalletData({
          platform: { freeship: [], discount: [], all: [] },
          stores: [],
          totalCount: 0,
        });
      }
    } catch (err) {
      console.warn("Error fetching vouchers:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Save Voucher
  const handleSaveVoucher = async (voucher: Voucher) => {
    if (!isLoggedIn) {
      showToast({ title: "Thông báo", message: "Vui lòng đăng nhập để lưu voucher vào ví!" }, "warning");
      return;
    }
    setSavingId(voucher.id);
    try {
      const res = await voucherApi.saveVoucher(voucher.id);
      if (res.success) {
        showToast({ title: "Thành công!", message: `Đã lưu voucher ${voucher.code} vào Ví của bạn` }, "success");
        // Update local state
        setPlatformVouchers((prev) =>
          prev.map((v) => (v.id === voucher.id ? { ...v, isSaved: true } : v))
        );
        setShopVouchersGrouped((prev) =>
          prev.map((group) => ({
            ...group,
            vouchers: group.vouchers.map((v) => (v.id === voucher.id ? { ...v, isSaved: true } : v)),
          }))
        );
        // Refresh wallet
        const walletRes = await voucherApi.getWalletVouchers();
        if (walletRes.success && walletRes.data) {
          setWalletData(walletRes.data);
        }
      } else {
        showToast({ title: "Không thể lưu mã", message: (res as any)?.message || "Vui lòng thử lại sau" }, "error");
      }
    } catch (err: any) {
      showToast({ title: "Lỗi", message: err?.message || "Không thể kết nối đến máy chủ" }, "error");
    } finally {
      setSavingId(null);
    }
  };

  // Format Helper
  const formatDiscount = (type: string, value: number) => {
    if (type === "PERCENTAGE") return `Giảm ${value}%`;
    if (type === "FREE_SHIPPING") return "Freeship";
    return `Giảm ${value.toLocaleString("vi-VN")}đ`;
  };

  const formatExpiry = (expiresAt: string) => {
    try {
      const d = new Date(expiresAt);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return "Hôm nay hết hạn";
      if (diffDays === 1) return "Còn 1 ngày";
      if (diffDays <= 5) return `Còn ${diffDays} ngày`;
      return `HSD: ${d.toLocaleDateString("vi-VN")}`;
    } catch {
      return "HSD: Sắp hết hạn";
    }
  };

  // Filtered Platform Vouchers
  const filteredPlatformVouchers = useMemo(() => {
    if (!searchQuery.trim()) return platformVouchers;
    const q = searchQuery.toLowerCase().trim();
    return platformVouchers.filter(
      (v) =>
        v.code?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
    );
  }, [platformVouchers, searchQuery]);

  // Filtered Shop Groups
  const filteredShopGroups = useMemo(() => {
    if (!searchQuery.trim()) return shopVouchersGrouped;
    const q = searchQuery.toLowerCase().trim();
    return shopVouchersGrouped
      .map((group) => {
        const storeMatch = group.store.name?.toLowerCase().includes(q);
        const matchedVouchers = group.vouchers.filter(
          (v) =>
            storeMatch ||
            v.code?.toLowerCase().includes(q) ||
            v.name?.toLowerCase().includes(q) ||
            v.description?.toLowerCase().includes(q)
        );
        return { ...group, vouchers: matchedVouchers };
      })
      .filter((group) => group.vouchers.length > 0);
  }, [shopVouchersGrouped, searchQuery]);

  // Wallet Vouchers Display
  const walletPlatformFreeship = walletData.platform?.freeship || [];
  const walletPlatformDiscount = walletData.platform?.discount || [];
  const walletStores = walletData.stores || [];

  return (
    <main className="min-h-screen bg-gray-50/50 pb-16">
      {/* Top Banner & Header */}
      <section className="bg-gradient-to-r from-[#003B2B] via-[#004D38] to-[#002f22] text-white py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/70 mb-3 font-medium">
            <Link href="/" className="hover:text-white transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Mã Giảm Giá & Ưu Đãi</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[32px] text-amber-300">
                  confirmation_number
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Kho Voucher & Mã Giảm Giá
                </h1>
              </div>
              <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
                Thu thập các mã ưu đãi độc quyền từ Sàn HUKI và các Gian Hàng đối tác. Lưu vào ví để áp dụng tự động khi thanh toán!
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Tìm kiếm mã hoặc tên shop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-gray-900 focus:border-white transition-all shadow-inner"
              />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-white/60 text-[20px]">
                search
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("HUKI")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === "HUKI"
                ? "bg-[#003B2B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">verified</span>
            <span>HUKI Vouchers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "HUKI" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {platformVouchers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("SHOP")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === "SHOP"
                ? "bg-[#003B2B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">storefront</span>
            <span>Shop Vouchers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "SHOP" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {shopVouchersGrouped.reduce((sum, g) => sum + g.vouchers.length, 0)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("WALLET")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === "WALLET"
                ? "bg-[#003B2B] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">account_balance_wallet</span>
            <span>Ví Voucher Của Tôi</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "WALLET" ? "bg-amber-400 text-[#003B2B]" : "bg-amber-100 text-amber-800"
              }`}
            >
              {walletData.totalCount || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: HUKI Vouchers */}
        {activeTab === "HUKI" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Voucher Do Sàn HUKI Tài Trợ
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Áp dụng trên toàn bộ sách đủ điều kiện mua sắm trên Sàn HUKI
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-36 bg-gray-200/70 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredPlatformVouchers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <span className="material-symbols-outlined text-gray-300 text-6xl">
                  sentiment_dissatisfied
                </span>
                <p className="text-gray-600 font-bold mt-2">Hiện chưa có voucher sàn phù hợp</p>
                <p className="text-xs text-gray-400 mt-1">
                  Hãy quay lại sau để đón nhận các ưu đãi hấp dẫn từ HUKI nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlatformVouchers.map((voucher) => {
                  const isFreeship = voucher.type === "FREE_SHIPPING";
                  return (
                    <div
                      key={voucher.id}
                      className={`relative bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                        isFreeship
                          ? "border-cyan-200 hover:border-cyan-400 bg-gradient-to-br from-white to-cyan-50/30"
                          : "border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-white to-emerald-50/30"
                      }`}
                    >
                      {/* Top Row: Icon + Code + Value */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isFreeship
                                  ? "bg-cyan-100 text-cyan-700"
                                  : "bg-emerald-100 text-[#003B2B]"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[22px]">
                                {isFreeship ? "local_shipping" : "percent"}
                              </span>
                            </div>
                            <div>
                              <span
                                className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  isFreeship
                                    ? "bg-cyan-100 text-cyan-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isFreeship ? "Freeship Sàn" : "Voucher Sàn"}
                              </span>
                              <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">
                                {voucher.name}
                              </h3>
                            </div>
                          </div>
                        </div>

                        {/* Discount Highlight */}
                        <div className="my-2 bg-gray-50 rounded-xl p-2.5 border border-dashed border-gray-200">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-[#003B2B]">
                              {formatDiscount(voucher.type, voucher.value)}
                            </span>
                            {voucher.maxDiscountAmount && voucher.type === "PERCENTAGE" && (
                              <span className="text-xs text-gray-500 font-medium">
                                (Tối đa {voucher.maxDiscountAmount.toLocaleString("vi-VN")}đ)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                            {voucher.minOrderAmount && voucher.minOrderAmount > 0
                              ? `Đơn tối thiểu ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`
                              : "Áp dụng cho mọi đơn hàng"}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Expiry + Save Button */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-2">
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-gray-400">
                            schedule
                          </span>
                          <span>{formatExpiry(voucher.expiresAt)}</span>
                        </div>

                        <button
                          onClick={() => handleSaveVoucher(voucher)}
                          disabled={voucher.isSaved || savingId === voucher.id}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                            voucher.isSaved
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200"
                              : "bg-[#003B2B] text-white hover:bg-[#002f22]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {voucher.isSaved ? "check_circle" : "bookmark_add"}
                          </span>
                          <span>{voucher.isSaved ? "Đã Trong Ví" : "Lưu Mã"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shop Vouchers (Grouped By Store) */}
        {activeTab === "SHOP" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Voucher Riêng Từ Các Cửa Hàng
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Các mã giảm giá được phân chia độc quyền theo từng gian hàng đối tác
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 bg-gray-200/70 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredShopGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <span className="material-symbols-outlined text-gray-300 text-6xl">
                  store_mall_directory
                </span>
                <p className="text-gray-600 font-bold mt-2">Chưa có voucher gian hàng phù hợp</p>
                <p className="text-xs text-gray-400 mt-1">
                  Hãy nhấn theo dõi thêm nhiều Shop để nhận các ưu đãi Fan cứng độc quyền nhé!
                </p>
              </div>
            ) : (
              filteredShopGroups.map((group) => {
                const store = group.store;
                return (
                  <div
                    key={store.id}
                    className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
                  >
                    {/* Store Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-amber-50/30 p-4 border-b border-gray-200/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base border border-amber-200 shrink-0">
                          {store.logo ? (
                            <img
                              src={store.logo}
                              alt={store.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            store.name?.charAt(0) || "S"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                              {store.name}
                            </h3>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Đối Tác
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {group.vouchers.length} mã ưu đãi sẵn sàng
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/shop/${store.id}`}
                        className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:text-[#003B2B] hover:border-[#003B2B] transition-all flex items-center gap-1 shadow-sm shrink-0"
                      >
                        <span>Ghé Gian Hàng</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>

                    {/* Vouchers Grid */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {group.vouchers.map((voucher) => {
                        const isFollowerVoucher = voucher.targetAudience === "FOLLOWERS_ONLY";
                        const req = formatFollowerRequirement(voucher.minFollowDays);

                        return (
                          <div
                            key={voucher.id}
                            className="bg-white rounded-xl p-3.5 border border-dashed border-gray-300 hover:border-amber-400 hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span className="font-mono text-xs font-black bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                  {voucher.code}
                                </span>
                                {isFollowerVoucher && (
                                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">
                                      favorite
                                    </span>
                                    {req.badge}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                                {voucher.name}
                              </h4>
                              <p className="text-base font-black text-[#003B2B] mt-1">
                                {formatDiscount(voucher.type, voucher.value)}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {voucher.minOrderAmount && voucher.minOrderAmount > 0
                                  ? `Đơn từ ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`
                                  : "Không giới hạn giá trị đơn"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100 mt-3">
                              <span className="text-[10.5px] text-gray-400 font-medium">
                                {formatExpiry(voucher.expiresAt)}
                              </span>

                              <button
                                onClick={() => handleSaveVoucher(voucher)}
                                disabled={voucher.isSaved || savingId === voucher.id}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                                  voucher.isSaved
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                    : "bg-[#003B2B] text-white hover:bg-[#002f22]"
                                }`}
                              >
                                <span>{voucher.isSaved ? "Đã Lưu" : "Lưu Mã"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Ví Voucher (My Wallet) */}
        {activeTab === "WALLET" && (
          <div className="mt-6 space-y-6">
            {/* Wallet Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setWalletSubTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  walletSubTab === "ALL"
                    ? "bg-[#003B2B] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tất cả ({walletData.totalCount})
              </button>
              <button
                onClick={() => setWalletSubTab("FREESHIP")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  walletSubTab === "FREESHIP"
                    ? "bg-[#003B2B] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🚚 Freeship Sàn ({walletPlatformFreeship.length})
              </button>
              <button
                onClick={() => setWalletSubTab("DISCOUNT")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  walletSubTab === "DISCOUNT"
                    ? "bg-[#003B2B] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🏷️ Giảm Giá Sàn ({walletPlatformDiscount.length})
              </button>
              <button
                onClick={() => setWalletSubTab("SHOP")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  walletSubTab === "SHOP"
                    ? "bg-[#003B2B] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🏪 Voucher Shop ({walletStores.reduce((sum, s) => sum + s.vouchers.length, 0)})
              </button>
            </div>

            {!isLoggedIn ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <span className="material-symbols-outlined text-amber-500 text-6xl">
                  lock
                </span>
                <p className="text-gray-900 font-bold text-base mt-2">
                  Vui lòng đăng nhập để xem Ví Voucher
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Đăng nhập để xem danh sách các mã giảm giá bạn đã thu thập và áp dụng khi thanh toán.
                </p>
                <Link
                  href="/auth/login"
                  className="mt-4 inline-flex px-6 py-2.5 rounded-xl bg-[#003B2B] text-white text-xs font-bold hover:bg-[#002f22] transition-all shadow-sm"
                >
                  Đăng Nhập Ngay
                </Link>
              </div>
            ) : walletData.totalCount === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <span className="material-symbols-outlined text-gray-300 text-6xl">
                  account_balance_wallet
                </span>
                <p className="text-gray-700 font-bold mt-2">Ví voucher của bạn đang trống</p>
                <p className="text-xs text-gray-400 mt-1">
                  Hãy ghé tab HUKI Vouchers hoặc Shop Vouchers để lưu mã ưu đãi vào ví nhé!
                </p>
                <button
                  onClick={() => setActiveTab("HUKI")}
                  className="mt-4 inline-flex px-5 py-2.5 rounded-xl bg-[#003B2B] text-white text-xs font-bold hover:bg-[#002f22] transition-all"
                >
                  Khám Phá Voucher Ngay
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* CẤP 1: VOUCHER SÀN HUKI */}
                {(walletSubTab === "ALL" || walletSubTab === "FREESHIP" || walletSubTab === "DISCOUNT") &&
                  (walletPlatformFreeship.length > 0 || walletPlatformDiscount.length > 0) && (
                    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <span className="material-symbols-outlined text-[#003B2B]">verified</span>
                        <h3 className="font-bold text-gray-900 text-base">Voucher Sàn HUKI</h3>
                        <span className="text-xs text-gray-400 font-normal">
                          (Dùng được cho đơn hàng toàn sàn)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(walletSubTab === "ALL" || walletSubTab === "FREESHIP"
                          ? walletPlatformFreeship
                          : []
                        ).map((voucher) => (
                          <div
                            key={voucher.id}
                            className="bg-cyan-50/40 rounded-xl p-3.5 border border-cyan-200 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                                  Freeship Sàn
                                </span>
                                <span className="font-mono text-xs font-bold text-cyan-900">
                                  {voucher.code}
                                </span>
                              </div>
                              <h4 className="font-bold text-gray-900 text-sm mt-1.5">{voucher.name}</h4>
                              <p className="text-base font-black text-cyan-800 mt-1">
                                Miễn phí vận chuyển
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {voucher.minOrderAmount
                                  ? `Đơn từ ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`
                                  : "Mọi đơn hàng"}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-cyan-100 mt-3">
                              <span className="text-[10.5px] text-gray-400">
                                {formatExpiry(voucher.expiresAt)}
                              </span>
                              <Link
                                href="/cart"
                                className="px-3 py-1.5 rounded-lg bg-[#003B2B] text-white text-xs font-bold hover:bg-[#002f22]"
                              >
                                Dùng Ngay
                              </Link>
                            </div>
                          </div>
                        ))}

                        {(walletSubTab === "ALL" || walletSubTab === "DISCOUNT"
                          ? walletPlatformDiscount
                          : []
                        ).map((voucher) => (
                          <div
                            key={voucher.id}
                            className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-200 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Giảm Giá Sàn
                                </span>
                                <span className="font-mono text-xs font-bold text-emerald-900">
                                  {voucher.code}
                                </span>
                              </div>
                              <h4 className="font-bold text-gray-900 text-sm mt-1.5">{voucher.name}</h4>
                              <p className="text-base font-black text-[#003B2B] mt-1">
                                {formatDiscount(voucher.type, voucher.value)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {voucher.minOrderAmount
                                  ? `Đơn từ ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`
                                  : "Mọi đơn hàng"}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-emerald-100 mt-3">
                              <span className="text-[10.5px] text-gray-400">
                                {formatExpiry(voucher.expiresAt)}
                              </span>
                              <Link
                                href="/cart"
                                className="px-3 py-1.5 rounded-lg bg-[#003B2B] text-white text-xs font-bold hover:bg-[#002f22]"
                              >
                                Dùng Ngay
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* CẤP 2: VOUCHER GIAN HÀNG */}
                {(walletSubTab === "ALL" || walletSubTab === "SHOP") &&
                  walletStores.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600">storefront</span>
                        <h3 className="font-bold text-gray-900 text-base">Voucher Các Gian Hàng</h3>
                      </div>

                      {walletStores.map((group) => (
                        <div
                          key={group.store.id}
                          className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                {group.store.name?.charAt(0) || "S"}
                              </div>
                              <span className="font-bold text-sm text-gray-900">{group.store.name}</span>
                            </div>
                            <Link
                              href={`/shop/${group.store.id}`}
                              className="text-xs text-[#003B2B] font-bold hover:underline"
                            >
                              Xem Shop &rarr;
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.vouchers.map((voucher) => (
                              <div
                                key={voucher.id}
                                className="bg-amber-50/40 rounded-xl p-3 border border-amber-200 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-black text-amber-900">
                                      {voucher.code}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-xs text-gray-900 mt-1 line-clamp-1">
                                    {voucher.name}
                                  </h5>
                                  <p className="text-base font-black text-[#003B2B] mt-0.5">
                                    {formatDiscount(voucher.type, voucher.value)}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {voucher.minOrderAmount
                                      ? `Đơn từ ${voucher.minOrderAmount.toLocaleString("vi-VN")}đ`
                                      : "Mọi đơn hàng"}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-amber-100 mt-2.5">
                                  <span className="text-[10px] text-gray-400">
                                    {formatExpiry(voucher.expiresAt)}
                                  </span>
                                  <Link
                                    href={`/shop/${group.store.id}`}
                                    className="px-3 py-1 rounded-lg bg-[#003B2B] text-white text-[11px] font-bold hover:bg-[#002f22]"
                                  >
                                    Mua Ngay
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
