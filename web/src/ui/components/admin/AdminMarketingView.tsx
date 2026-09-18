"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { flashSaleApi } from "../../api/flashSaleApi";
import { catalogApi } from "../../api/catalogApi";

export function AdminMarketingView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("flash_sales");

  // Flash Sale State
  const [flashSales, setFlashSales] = useState<any[]>([]);;
  const [loadingFlashSales, setLoadingFlashSales] = useState(false);
  const [catalogBooks, setCatalogBooks] = useState<any[]>([]);;

  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    bannerUrl: "",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
  });

  // Add Item to Slot Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    bookId: "",
    originalPrice: 200000,
    salePrice: 79000,
    stock: 20,
    maxPerUser: 1,
  });

  const [banners, setBanners] = useState([
    {
      id: "BAN-01",
      title: "Tuần Lễ Văn Học Kinh Điển & Tinh Hoa Tri Thức 2026",
      subtitle: "Giảm đến 40% cho tất cả tuyệt tác văn chương thế giới",
      link: "/books?category=van-hoc",
      badge: "ĐẠI HỘI SÁCH",
      bgImage: "/banners/hero-classic.jpg",
      status: "active",
      clicks: 14280,
      order: 1,
    },
    {
      id: "BAN-02",
      title: "Hội Sách Bản Quyền Alpha Books x HUKI",
      subtitle: "Tặng ngay Ebook DRM độc quyền khi đặt trước sách in",
      link: "/shop/pub-4",
      badge: "ƯU ĐÃI ĐỘC QUYỀN",
      bgImage: "/banners/hero-alpha.jpg",
      status: "active",
      clicks: 9840,
      order: 2,
    },
    {
      id: "BAN-03",
      title: "Kỷ Nguyên Sách Hybrid: Đọc Ngay Khi Chờ Giao",
      subtitle: "Trải nghiệm sách giấy liền tay, đọc số tức thì",
      link: "/books?format=hybrid",
      badge: "TÍNH NĂNG MỚI",
      bgImage: "/banners/hero-hybrid.jpg",
      status: "active",
      clicks: 18450,
      order: 3,
    },
  ]);

  const [vouchers, setVouchers] = useState([
    {
      code: "HUKIFREESHIP",
      discount: "Miễn phí giao hàng 2H (tối đa 30.000₫)",
      minOrder: "150.000₫",
      used: 3420,
      total: 5000,
      expiry: "30/06/2026",
      status: "active",
    },
    {
      code: "HUKIDRM20",
      discount: "Giảm 20% Ebook DRM toàn sàn",
      minOrder: "0₫",
      used: 1290,
      total: 2000,
      expiry: "30/06/2026",
      status: "active",
    },
    {
      code: "WELCOME50K",
      discount: "Giảm 50.000₫ cho đơn đầu tiên",
      minOrder: "200.000₫",
      used: 890,
      total: 1000,
      expiry: "15/07/2026",
      status: "active",
    },
  ]);

  useEffect(() => {
    fetchFlashSales();
    catalogApi
      .getPublicBooks({ limit: 50 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCatalogBooks(res.data);
        }
      })
      .catch((err) =>
        console.warn("Could not load books for admin marketing:", err),
      );
  }, []);

  const fetchFlashSales = async () => {
    try {
      setLoadingFlashSales(true);
      const res = await flashSaleApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        setFlashSales(res.data);
      }
    } catch (err) {
      console.error("Failed to load flash sales:", err);
    } finally {
      setLoadingFlashSales(false);
    }
  };

  const handleCreateCampaign = async (e: any) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      showToast?.("Vui lòng nhập tên khung giờ Flash Sale!", "warning");
      return;
    }

    try {
      const res = await flashSaleApi.createFlashSale({
        name: createForm.name,
        description: createForm.description,
        bannerUrl: createForm.bannerUrl || undefined,
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: new Date(createForm.endsAt).toISOString(),
      });

      if (res.success) {
        showToast?.(
          `⚡ Đã tạo thành công khung giờ "${createForm.name}"!`,
          "success",
        );
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          description: "",
          bannerUrl: "",
          startsAt: new Date().toISOString().slice(0, 16),
          endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
        });
        fetchFlashSales();
      } else {
        showToast?.((res as any)?.message || "Không thể tạo chiến dịch!", "error");
      }
    } catch (err) {
      showToast?.("Lỗi kết nối khi tạo Flash Sale!", "error");
    }
  };

  const handleAddItemToSlot = async (e: any) => {
    e.preventDefault();
    if (!selectedSlotForAdd || !itemForm.bookId) {
      showToast?.("Vui lòng chọn sách để thêm vào Flash Sale!", "warning");
      return;
    }

    try {
      const res = await flashSaleApi.addItem({
        flashSaleId: selectedSlotForAdd.id,
        bookId: itemForm.bookId,
        originalPrice: Number(itemForm.originalPrice),
        salePrice: Number(itemForm.salePrice),
        stock: Number(itemForm.stock),
        maxPerUser: Number(itemForm.maxPerUser || 1),
      });

      if (res.success) {
        showToast?.(
          "⚡ Đã thêm sách vào khung giờ Flash Sale thành công!",
          "success",
        );
        setShowAddItemModal(false);
        setItemForm({
          bookId: "",
          originalPrice: 200000,
          salePrice: 79000,
          stock: 20,
          maxPerUser: 1,
        });
        fetchFlashSales();
      } else {
        showToast?.((res as any)?.message || "Không thể thêm sách!", "error");
      }
    } catch (err) {
      showToast?.("Lỗi khi thêm sách vào Flash Sale!", "error");
    }
  };

  const handleToggleFlashSaleStatus = async (slot: any) => {
    const newStatus = slot.status === "ACTIVE" ? "ENDED" : "ACTIVE";
    try {
      const res = await flashSaleApi.updateStatus(slot.id, newStatus);
      if (res.success) {
        showToast?.(
          `Đã chuyển trạng thái khung giờ sang ${newStatus}!`,
          "success",
        );
        fetchFlashSales();
      }
    } catch (err) {
      showToast?.("Không thể cập nhật trạng thái Flash Sale!", "error");
    }
  };

  const handleDeleteFlashSale = async (id: any, name: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khung giờ Flash Sale "${name}"?`))
      return;
    try {
      const res = await flashSaleApi.deleteFlashSale(id);
      if (res.success) {
        showToast?.(`Đã xóa khung giờ "${name}"!`, "success");
        fetchFlashSales();
      }
    } catch (err) {
      showToast?.("Không thể xóa Flash Sale!", "error");
    }
  };

  const handleToggleBanner = (id: any) => {
    setBanners((prev: any) =>
      prev.map((b: any) => {
        if (b.id === id) {
          const newStatus = b.status === "active" ? "inactive" : "active";
          return { ...b, status: newStatus };
        }
        return b;
      }),
    );
    showToast?.(
      "Đã cập nhật trạng thái hiển thị banner trên trang chủ!",
      "success",
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">
              Tiếp Thị &amp; Tăng Trưởng
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
              MARKETING &amp; CHIẾN DỊCH TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Quản Lý Flash Sale Giờ Vàng, Banner &amp; Voucher
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Điều phối các khung giờ vàng Flash Sale đếm ngược, kiểm soát hạn
            ngạch mua mỗi độc giả và banner nổi bật trên toàn sàn HUKI.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === "flash_sales" ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                bolt
              </span>
              <span>Tạo Khung Giờ Flash Sale Mới</span>
            </button>
          ) : (
            <button
              onClick={() => showToast?.("Mở cửa sổ thêm banner mới...", "info")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                add_photo_alternate
              </span>
              <span>Thêm Banner Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-2 p-1 bg-white border border-[#E2E8F0] rounded-2xl w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab("flash_sales")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "flash_sales"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="material-symbols-outlined text-sm">bolt</span>
          <span>Flash Sale Giờ Vàng ({flashSales.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "banners"
              ? "bg-[#00875A] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Banner Hero Slider ({banners.length})
        </button>
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vouchers"
              ? "bg-[#00875A] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mã Giảm Giá Sàn ({vouchers.length})
        </button>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === "flash_sales" ? (
        <div className="space-y-6">
          {loadingFlashSales ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Đang tải danh sách khung giờ Flash Sale...
              </p>
            </div>
          ) : flashSales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">
                bolt
              </span>
              <h3 className="text-sm font-bold text-slate-700 mt-2">
                Chưa có khung giờ Flash Sale nào
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bấm "Tạo Khung Giờ Flash Sale Mới" để bắt đầu thiết lập!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {flashSales.map((slot: any) => (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Slot Header */}
                  <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          slot.status === "ACTIVE"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          bolt
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {slot.name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                              slot.status === "ACTIVE"
                                ? "bg-rose-500 text-white animate-pulse"
                                : slot.status === "SCHEDULED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {slot.status === "ACTIVE"
                              ? "ĐANG DIỄN RA"
                              : slot.status === "SCHEDULED"
                                ? "ĐÃ LÊN LỊCH"
                                : "ĐÃ KẾT THÚC"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>
                            Bắt đầu:{" "}
                            <strong>
                              {new Date(slot.startsAt).toLocaleString("vi-VN")}
                            </strong>
                          </span>
                          <span>-</span>
                          <span>
                            Kết thúc:{" "}
                            <strong>
                              {new Date(slot.endsAt).toLocaleString("vi-VN")}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSlotForAdd(slot);
                          setShowAddItemModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add_shopping_cart
                        </span>
                        <span>Thêm Sách ({slot.items?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => handleToggleFlashSaleStatus(slot)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer border transition-colors ${
                          slot.status === "ACTIVE"
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {slot.status === "ACTIVE"
                          ? "Tạm Dừng"
                          : "Kích Hoạt Live"}
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteFlashSale(slot.id, slot.name)
                        }
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
                        title="Xóa khung giờ"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Slot Items Table */}
                  {slot.items && slot.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-4">Tác Phẩm / Mã Sách</th>
                            <th className="py-3 px-3">Giá Gốc</th>
                            <th className="py-3 px-3">Giá Flash Sale</th>
                            <th className="py-3 px-3">Giảm Giá</th>
                            <th className="py-3 px-3">Tồn Kho Khung Giờ</th>
                            <th className="py-3 px-3">Tiến Độ Bán</th>
                            <th className="py-3 px-3">Hạn Mức Mua</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {slot.items.map((item: any) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/60 transition-colors"
                            >
                              <td className="py-3 px-4 font-bold text-slate-800">
                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                  {item.bookId.slice(0, 8)}...
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-400 line-through">
                                {Number(item.originalPrice).toLocaleString(
                                  "vi-VN",
                                )}
                                ₫
                              </td>
                              <td className="py-3 px-3 font-extrabold text-rose-600 text-sm">
                                {Number(item.salePrice).toLocaleString("vi-VN")}
                                ₫
                              </td>
                              <td className="py-3 px-3 font-bold text-emerald-600">
                                -{item.discountPercent}%
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {item.stock} cuốn
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-rose-500 h-full rounded-full"
                                      style={{
                                        width: `${item.soldPercent || 0}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-700">
                                    {item.sold || 0} đã bán
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 font-bold text-[10px] border border-yellow-200">
                                  Max {item.maxPerUser || 1} cuốn/khách
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Chưa có sách nào trong khung giờ này. Hãy bấm "Thêm Sách"
                      để gán sản phẩm khuyến mãi!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "banners" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {banners.map((b: any) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="h-44 relative bg-gray-900 overflow-hidden">
                  <img
                    src={b.bgImage}
                    alt={b.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-gray-900 font-extrabold text-[10px] shadow-sm">
                      {b.badge}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === "active"
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {b.status === "active" ? "Đang Chạy" : "Tạm Ẩn"}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                    {b.title}
                  </h3>
                  <p className="text-gray-500 text-xs line-clamp-2">
                    {b.subtitle}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
                    <span>
                      Đường dẫn:{" "}
                      <strong className="text-[#00875A]">{b.link}</strong>
                    </span>
                    <span>
                      <strong>{b.clicks.toLocaleString()}</strong> lượt click
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  Thứ tự: #{b.order}
                </span>
                <button
                  onClick={() => handleToggleBanner(b.id)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {b.status === "active" ? "Ẩn Banner" : "Hiển Thị"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Mã Voucher</th>
                <th className="py-3.5 px-3">Mức Giảm Giá</th>
                <th className="py-3.5 px-3">Đơn Tối Thiểu</th>
                <th className="py-3.5 px-3">Tiến Độ Sử Dụng</th>
                <th className="py-3.5 px-3">Hạn Dùng</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map((v) => (
                <tr
                  key={v.code}
                  className="hover:bg-[#F9FAFB] transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {v.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-gray-900">
                    {v.discount}
                  </td>
                  <td className="py-3.5 px-3 text-gray-600">{v.minOrder}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 max-w-[140px]">
                      <span className="text-[11px] font-bold text-gray-800">
                        {v.used} / {v.total} lượt
                      </span>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#00875A] h-full rounded-full"
                          style={{ width: `${(v.used / v.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-gray-500">{v.expiry}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      Đang Hoạt Động
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() =>
                        showToast?.(
                          `Đã sao chép liên kết chia sẻ voucher ${v.code}`,
                          "success",
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
                    >
                      Chia Sẻ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. MODAL: TẠO KHUNG GIỜ FLASH SALE MỚI (Tùy Chọn Tên & Thời Gian) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-2xl">
                  bolt
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Tạo Khung Giờ Flash Sale Mới
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Khung Giờ / Sự Kiện Flash Sale *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e: any) =>
                    setCreateForm((prev: any) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ví dụ: Flash Sale Giáng Sinh 20H - 24H 🎄"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô Tả Chiến Dịch
                </label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e: any) =>
                    setCreateForm((prev: any) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Giảm giá sốc đến 70% các đầu sách bán chạy"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Tiếp Thị (URL)
                </label>
                <input
                  type="url"
                  value={createForm.bannerUrl}
                  onChange={(e: any) =>
                    setCreateForm((prev: any) => ({
                      ...prev,
                      bannerUrl: e.target.value,
                    }))
                  }
                  placeholder="https://cdn.example.com/flash-sale-banner.jpg"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời Gian Bắt Đầu *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.startsAt}
                    onChange={(e: any) =>
                      setCreateForm((prev: any) => ({
                        ...prev,
                        startsAt: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời Gian Kết Thúc *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.endsAt}
                    onChange={(e: any) =>
                      setCreateForm((prev: any) => ({
                        ...prev,
                        endsAt: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-sm hover:shadow-md cursor-pointer"
                >
                  Xác Nhận Tạo Khung Giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: THÊM SÁCH VÀO KHUNG GIỜ FLASH SALE */}
      {showAddItemModal && selectedSlotForAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Thêm Sách Vào Flash Sale
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  {selectedSlotForAdd.name}
                </p>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddItemToSlot} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Sách Từ Hệ Thống *
                </label>
                <select
                  required
                  value={itemForm.bookId}
                  onChange={(e: any) => {
                    const selectedBook = catalogBooks.find(
                      (b: any) => b.id === e.target.value,
                    );
                    const origPrice = selectedBook
                      ? Number(selectedBook.price)
                      : 200000;
                    const availableStock = selectedBook
                      ? Number(
                          selectedBook.available ?? selectedBook.stock ?? 0,
                        )
                      : 0;
                    setItemForm((prev: any) => ({
                      ...prev,
                      bookId: e.target.value,
                      originalPrice: origPrice,
                      salePrice: Math.floor(origPrice * 0.4),
                      stock: Math.max(
                        1,
                        Math.min(prev.stock, availableStock || 1),
                      ),
                    }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Chọn đầu sách khuyến mãi --</option>
                  {catalogBooks
                    .filter(
                      (book) => Number(book.available ?? book.stock ?? 0) > 0,
                    )
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} (
                        {Number(book.price).toLocaleString("vi-VN")}₫ · còn{" "}
                        {Number(book.available ?? book.stock ?? 0)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá Gốc (₫) *
                  </label>
                  <input
                    type="number"
                    required
                    value={itemForm.originalPrice}
                    onChange={(e: any) =>
                      setItemForm((prev: any) => ({
                        ...prev,
                        originalPrice: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá Flash Sale (₫) *
                  </label>
                  <input
                    type="number"
                    required
                    value={itemForm.salePrice}
                    onChange={(e: any) =>
                      setItemForm((prev: any) => ({
                        ...prev,
                        salePrice: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Lượng Suất Bán (Stock) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Number(
                      catalogBooks.find((book) => book.id === itemForm.bookId)
                        ?.available ?? Number.MAX_SAFE_INTEGER,
                    )}
                    value={itemForm.stock}
                    onChange={(e: any) =>
                      setItemForm((prev: any) => ({
                        ...prev,
                        stock: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hạn Mức/Khách (Max Per User)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={itemForm.maxPerUser}
                    onChange={(e: any) =>
                      setItemForm((prev: any) => ({
                        ...prev,
                        maxPerUser: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-sm hover:shadow-md cursor-pointer"
                >
                  Xác Nhận Thêm Sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMarketingView;
