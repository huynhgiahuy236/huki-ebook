"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../context/ToastContext";
import { flashSaleApi } from "../../api/flashSaleApi";
import { catalogApi } from "../../api/catalogApi";
import { voucherApi, Voucher } from "../../api/voucherApi";
import { useSmartFormCollapse } from "../../utils/formHooks";
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

export function AdminMarketingView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("flash_sales");

  // Flash Sale State
  const [flashSales, setFlashSales] = useState<any[]>([]);
  const [loadingFlashSales, setLoadingFlashSales] = useState(false);
  const [catalogBooks, setCatalogBooks] = useState<any[]>([]);

  // Vouchers pagination
  const [currentPageVouchers, setCurrentPageVouchers] = useState(1);
  const pageSize = 10;

  // Create Campaign In-Page Form State & Errors
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    bannerUrl: "",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const isCreateDirty =
    createForm.name.trim().length > 0 ||
    createForm.description.trim().length > 0 ||
    createForm.bannerUrl.trim().length > 0;

  const createFormRef = useSmartFormCollapse<HTMLDivElement>({
    isOpen: showCreateModal,
    onClose: () => {
      setShowCreateModal(false);
      setCreateErrors({});
    },
    isDirty: isCreateDirty,
  });

  // Add Item to Slot In-Page Form State & Errors
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedSlotForAdd, setSelectedSlotForAdd] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    bookId: "",
    originalPrice: 200000,
    salePrice: 79000,
    stock: 20,
    maxPerUser: 1,
  });
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const isItemDirty = !!itemForm.bookId || itemForm.stock !== 20 || itemForm.maxPerUser !== 1;

  const itemFormRef = useSmartFormCollapse<HTMLDivElement>({
    isOpen: showAddItemModal && !!selectedSlotForAdd,
    onClose: () => {
      setShowAddItemModal(false);
      setItemErrors({});
    },
    isDirty: isItemDirty,
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

  // Real Voucher State & Errors
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showCreateVoucherModal, setShowCreateVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState<{
    code: string;
    name: string;
    description: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value: number;
    minOrderAmount: number;
    maxDiscountAmount: number;
    totalUsage: number;
    maxUsagePerUser: number;
    startsAt: string;
    expiresAt: string;
  }>({
    code: "",
    name: "",
    description: "",
    type: "PERCENTAGE",
    value: 15,
    minOrderAmount: 100000,
    maxDiscountAmount: 50000,
    totalUsage: 1000,
    maxUsagePerUser: 1,
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
  });
  const [voucherErrors, setVoucherErrors] = useState<Record<string, string>>({});

  const isVoucherDirty =
    voucherForm.code.trim().length > 0 ||
    voucherForm.name.trim().length > 0 ||
    voucherForm.description.trim().length > 0;

  const voucherFormRef = useSmartFormCollapse<HTMLDivElement>({
    isOpen: showCreateVoucherModal,
    onClose: () => {
      setShowCreateVoucherModal(false);
      setVoucherErrors({});
    },
    isDirty: isVoucherDirty,
  });

  useEffect(() => {
    fetchFlashSales();
    fetchVouchers();
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

  const fetchVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const res = await voucherApi.getAllVouchers({ scope: 'PLATFORM' });
      if (res.success && res.data) {
        setVouchers(res.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load platform vouchers:", err);
    } finally {
      setLoadingVouchers(false);
    }
  };

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

  const validateCreateForm = () => {
    const errs: Record<string, string> = {};
    if (!createForm.name.trim()) {
      errs.name = "Tên sự kiện flash sale không được để trống.";
    } else if (createForm.name.trim().length < 5) {
      errs.name = "Tên sự kiện phải có ít nhất 5 ký tự.";
    }

    if (createForm.bannerUrl.trim()) {
      try {
        new URL(createForm.bannerUrl.trim());
      } catch {
        errs.bannerUrl = "URL banner không đúng định dạng hợp lệ (vd: https://...).";
      }
    }

    if (!createForm.startsAt) {
      errs.startsAt = "Vui lòng chọn thời gian bắt đầu.";
    }
    if (!createForm.endsAt) {
      errs.endsAt = "Vui lòng chọn thời gian kết thúc.";
    }

    if (createForm.startsAt && createForm.endsAt) {
      const s = new Date(createForm.startsAt).getTime();
      const e = new Date(createForm.endsAt).getTime();
      if (e <= s) {
        errs.endsAt = "Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.";
      }
    }

    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateCampaign = async (e: any) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      showToast?.("Vui lòng kiểm tra lại các trường lỗi trên form!", "warning");
      return;
    }

    try {
      const res = await flashSaleApi.createFlashSale({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        bannerUrl: createForm.bannerUrl.trim() || undefined,
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: new Date(createForm.endsAt).toISOString(),
      });

      if (res.success) {
        showToast?.(
          `⚡ Đã tạo thành công khung giờ "${createForm.name}"!`,
          "success",
        );
        setShowCreateModal(false);
        setCreateErrors({});
        setCreateForm({
          name: "",
          description: "",
          bannerUrl: "",
          startsAt: new Date().toISOString().slice(0, 16),
          endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
        });
        fetchFlashSales();
      } else {
        showToast?.(res.error?.message || "Không thể tạo khung giờ Flash Sale", "error");
      }
    } catch {
      showToast?.("Lỗi máy chủ khi tạo khung giờ Flash Sale", "error");
    }
  };

  const handleToggleFlashSaleStatus = async (slot: any) => {
    const nextStatus = slot.status === "ACTIVE" ? "SCHEDULED" : "ACTIVE";
    try {
      const res = await flashSaleApi.updateStatus(slot.id, nextStatus);
      if (res.success) {
        showToast?.(
          `Đã chuyển trạng thái khung giờ sang: ${nextStatus === "ACTIVE" ? "ĐANG LIVE" : "TẠM DỪNG"}`,
          "success",
        );
        fetchFlashSales();
      }
    } catch {
      showToast?.("Lỗi cập nhật trạng thái Flash Sale", "error");
    }
  };

  const handleDeleteFlashSale = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khung giờ Flash Sale "${name}"?`)) return;
    try {
      const res = await flashSaleApi.deleteFlashSale(id);
      if (res.success) {
        showToast?.(`Đã xóa khung giờ "${name}"`, "success");
        fetchFlashSales();
      }
    } catch {
      showToast?.("Không thể xóa khung giờ", "error");
    }
  };

  const handleAddItemToSlot = async (e: any) => {
    e.preventDefault();
    if (!selectedSlotForAdd) return;

    if (!itemForm.bookId) {
      setItemErrors({ bookId: "Vui lòng chọn đầu sách khuyến mãi!" });
      return;
    }

    try {
      const res = await flashSaleApi.addItem({
        flashSaleId: selectedSlotForAdd.id,
        bookId: itemForm.bookId,
        originalPrice: itemForm.originalPrice,
        salePrice: itemForm.salePrice,
        stock: itemForm.stock,
        maxPerUser: itemForm.maxPerUser,
      });

      if (res.success) {
        showToast?.("Đã thêm sách vào khung giờ Flash Sale!", "success");
        setShowAddItemModal(false);
        setItemErrors({});
        setItemForm({
          bookId: "",
          originalPrice: 200000,
          salePrice: 79000,
          stock: 20,
          maxPerUser: 1,
        });
        fetchFlashSales();
      } else {
        showToast?.(res.error?.message || "Không thể thêm sách vào khung giờ", "error");
      }
    } catch {
      showToast?.("Lỗi kết nối khi thêm sách vào Flash Sale", "error");
    }
  };

  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "hidden" : "active" } : b)),
    );
    showToast?.("Đã cập nhật trạng thái hiển thị banner.", "info");
  };

  const validateVoucherForm = () => {
    const errs: Record<string, string> = {};
    if (!voucherForm.code.trim()) {
      errs.code = "Mã voucher không được để trống.";
    } else if (voucherForm.code.trim().length < 3) {
      errs.code = "Mã voucher phải có ít nhất 3 ký tự.";
    }

    if (!voucherForm.name.trim()) {
      errs.name = "Tên chiến dịch không được để trống.";
    }

    if (voucherForm.type === "PERCENTAGE") {
      if (!voucherForm.value || voucherForm.value < 1 || voucherForm.value > 100) {
        errs.value = "Tỷ lệ giảm giá (%) phải từ 1% đến 100%.";
      }
    } else if (voucherForm.type === "FIXED_AMOUNT") {
      if (!voucherForm.value || voucherForm.value < 1000) {
        errs.value = "Số tiền giảm cố định phải từ 1,000₫ trở lên.";
      }
    }

    if (voucherForm.totalUsage <= 0) {
      errs.totalUsage = "Tổng số lượt phát hành phải ít nhất là 1 lượt.";
    }

    setVoucherErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateVoucherForm()) {
      showToast?.("Vui lòng kiểm tra lại các trường lỗi trên form voucher!", "warning");
      return;
    }
    try {
      const res = await voucherApi.createAdminVoucher({
        code: voucherForm.code.trim().toUpperCase(),
        name: voucherForm.name.trim(),
        description: voucherForm.description.trim() || undefined,
        type: voucherForm.type,
        value: Number(voucherForm.value),
        minOrderAmount: Number(voucherForm.minOrderAmount || 0),
        maxDiscountAmount: voucherForm.type === 'PERCENTAGE' ? Number(voucherForm.maxDiscountAmount || 0) : undefined,
        totalUsage: Number(voucherForm.totalUsage || 0),
        maxUsagePerUser: Number(voucherForm.maxUsagePerUser || 1),
        scope: 'PLATFORM',
        startsAt: new Date(voucherForm.startsAt).toISOString(),
        expiresAt: new Date(voucherForm.expiresAt).toISOString(),
      });
      if (res.success) {
        showToast?.(`⚡ Đã tạo voucher sàn ${voucherForm.code.toUpperCase()} thành công!`, "success");
        setShowCreateVoucherModal(false);
        setVoucherErrors({});
        setVoucherForm({
          code: "",
          name: "",
          description: "",
          type: "PERCENTAGE",
          value: 15,
          minOrderAmount: 100000,
          maxDiscountAmount: 50000,
          totalUsage: 1000,
          maxUsagePerUser: 1,
          startsAt: new Date().toISOString().slice(0, 16),
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        });
        fetchVouchers();
      } else {
        showToast?.((res as any)?.message || "Không thể tạo voucher!", "error");
      }
    } catch {
      showToast?.("Lỗi kết nối khi tạo voucher!", "error");
    }
  };

  const handleToggleVoucherStatus = async (v: any) => {
    const nextStatus = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await voucherApi.updateAdminVoucher(v.id, { status: nextStatus });
      if (res.success) {
        showToast?.(`Đã chuyển trạng thái voucher ${v.code} thành ${nextStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}`, "success");
        fetchVouchers();
      }
    } catch {
      showToast?.("Không thể cập nhật trạng thái voucher", "error");
    }
  };

  const handleDeleteVoucher = async (v: any) => {
    if (!window.confirm(`Bạn có chắc muốn xóa voucher ${v.code}?`)) return;
    try {
      const res = await voucherApi.deleteAdminVoucher(v.id);
      if (res.success) {
        showToast?.(`Đã xóa voucher ${v.code}`, "success");
        fetchVouchers();
      } else {
        showToast?.((res as any)?.message || "Không thể xóa voucher đã có lượt dùng!", "error");
      }
    } catch {
      showToast?.("Không thể xóa voucher", "error");
    }
  };

  // Vouchers Pagination
  const totalPagesVouchers = Math.ceil(vouchers.length / pageSize) || 1;
  const paginatedVouchers = useMemo(() => {
    const start = (currentPageVouchers - 1) * pageSize;
    return vouchers.slice(start, start + pageSize);
  }, [vouchers, currentPageVouchers, pageSize]);

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Lý Flash Sale, Banner &amp; Voucher
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Thiết lập chiến dịch khuyến mãi toàn sàn, khung giờ Flash Sale và mã giảm giá</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === "flash_sales" ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Tạo Khung Giờ Flash Sale Mới</span>
            </button>
          ) : activeTab === "vouchers" ? (
            <button
              onClick={() => setShowCreateVoucherModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Tạo Voucher Sàn Mới</span>
            </button>
          ) : (
            <button
              onClick={() => showToast?.("Mở cửa sổ thêm banner mới...", "info")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
              <span>Thêm Banner Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2.5">
        <button
          onClick={() => setActiveTab("flash_sales")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "flash_sales"
              ? "bg-[#00875A] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span className="material-symbols-outlined text-sm">bolt</span>
          <span>Flash Sale Giờ Vàng ({flashSales.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "banners"
              ? "bg-[#00875A] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span className="material-symbols-outlined text-sm">view_carousel</span>
          <span>Banner Hero Slider ({banners.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vouchers"
              ? "bg-[#00875A] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span className="material-symbols-outlined text-sm">confirmation_number</span>
          <span>Mã Giảm Giá Sàn ({vouchers.length})</span>
        </button>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === "flash_sales" ? (
        <div className="space-y-5">
          {loadingFlashSales ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-8 h-8 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Đang tải danh sách khung giờ Flash Sale...
              </p>
            </div>
          ) : flashSales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                bolt
              </span>
              <h3 className="text-sm font-bold text-gray-700 mt-2">
                Chưa có khung giờ Flash Sale nào
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Bấm "Tạo Khung Giờ Flash Sale Mới" để bắt đầu thiết lập!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {flashSales.map((slot: any) => (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden"
                >
                  {/* Slot Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          slot.status === "ACTIVE"
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          bolt
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-gray-900 text-sm">
                            {slot.name}
                          </h3>
                          {slot.status === "ACTIVE" ? (
                            <AdminStatusBadge status="danger" label="ĐANG DIỄN RA" icon="bolt" />
                          ) : slot.status === "SCHEDULED" ? (
                            <AdminStatusBadge status="warning" label="ĐÃ LÊN LỊCH" icon="schedule" />
                          ) : (
                            <AdminStatusBadge status="neutral" label="ĐÃ KẾT THÚC" />
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 font-mono">
                          <span>
                            Bắt đầu: <strong>{new Date(slot.startsAt).toLocaleString("vi-VN")}</strong>
                          </span>
                          <span>-</span>
                          <span>
                            Kết thúc: <strong>{new Date(slot.endsAt).toLocaleString("vi-VN")}</strong>
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
                        className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
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
                      <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                        <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                          <tr>
                            <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Mã Sách</th>
                            <th className="py-3 px-3 whitespace-nowrap text-right">Giá Gốc</th>
                            <th className="py-3 px-3 whitespace-nowrap text-right">Giá Flash Sale</th>
                            <th className="py-3 px-3 whitespace-nowrap text-center">Giảm Giá</th>
                            <th className="py-3 px-3 whitespace-nowrap text-center">Tồn Kho</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Tiến Độ Bán</th>
                            <th className="py-3 px-4 whitespace-nowrap text-center">Hạn Mức Mua</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {slot.items.map((item: any, idx: number) => (
                            <tr
                              key={item.id}
                              className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                            >
                              <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-bold text-gray-800">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                  {item.bookId.slice(0, 10)}...
                                </span>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-right text-gray-400 line-through font-mono">
                                {Number(item.originalPrice).toLocaleString("vi-VN")}₫
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-right font-extrabold text-rose-600 font-mono">
                                {Number(item.salePrice).toLocaleString("vi-VN")}₫
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-center font-bold text-emerald-600">
                                -{item.discountPercent}%
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap text-center font-semibold text-gray-800">
                                {item.stock} cuốn
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-rose-500 h-full rounded-full"
                                      style={{
                                        width: `${item.soldPercent || 0}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-700">
                                    {item.sold || 0} đã bán
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-center">
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10.5px] border border-amber-200">
                                  Max {item.maxPerUser || 1} cuốn/khách
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400">
                      Chưa có sách nào trong khung giờ này. Hãy bấm "Thêm Sách" để gán sản phẩm khuyến mãi!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "banners" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map((b: any) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="h-40 relative bg-gray-900 overflow-hidden">
                  <img
                    src={b.bgImage}
                    alt={b.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-gray-900 font-extrabold text-[10px] shadow-sm">
                      {b.badge}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    {b.status === "active" ? (
                      <AdminStatusBadge status="success" label="Đang Chạy" />
                    ) : (
                      <AdminStatusBadge status="neutral" label="Tạm Ẩn" />
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <h3 className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">
                    {b.title}
                  </h3>
                  <p className="text-gray-500 text-[11px] line-clamp-2">
                    {b.subtitle}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[10.5px] text-gray-500 border-t border-gray-100">
                    <span>
                      Đường dẫn: <strong className="text-[#00875A]">{b.link}</strong>
                    </span>
                    <span>
                      <strong>{b.clicks.toLocaleString()}</strong> click
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">
                  Thứ tự: #{b.order}
                </span>
                <button
                  onClick={() => handleToggleBanner(b.id)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {b.status === "active" ? "Ẩn Banner" : "Hiển Thị"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AdminTableContainer>
          {loadingVouchers ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">Chưa Có Voucher Sàn Nào</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Bấm "Tạo Voucher Sàn Mới" để thêm mã khuyến mãi.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
                <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Mã Voucher</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Tên &amp; Loại Giảm Giá</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Đơn Tối Thiểu</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Tiến Độ Sử Dụng</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Hạn Dùng</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedVouchers.map((v: any, idx: number) => {
                    const itemIndex = (currentPageVouchers - 1) * pageSize + idx + 1;
                    const isPercentage = v.type === 'PERCENTAGE';
                    const isFreeship = v.type === 'FREE_SHIPPING';
                    const discountLabel = isPercentage
                      ? `Giảm ${v.value}% (tối đa ${Number(v.maxDiscountAmount || 0).toLocaleString('vi-VN')}đ)`
                      : isFreeship
                      ? `Miễn phí vận chuyển (tối đa ${Number(v.value || 0).toLocaleString('vi-VN')}đ)`
                      : `Giảm ${Number(v.value || 0).toLocaleString('vi-VN')}đ`;

                    const usagePercent = v.totalUsage > 0 ? Math.min(100, Math.round(((v.currentUsage || 0) / v.totalUsage) * 100)) : 0;

                    return (
                      <tr
                        key={v.id || v.code}
                        className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                          {itemIndex}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {v.code}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-gray-900 block">{v.name}</span>
                          <span className="text-[10.5px] text-gray-500">{discountLabel}</span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 font-mono">
                          {Number(v.minOrderAmount || 0) > 0 ? `${Number(v.minOrderAmount).toLocaleString('vi-VN')}đ` : 'Không giới hạn'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 max-w-[130px]">
                            <span className="text-[10.5px] font-bold text-gray-800">
                              {v.currentUsage || 0} / {v.totalUsage > 0 ? `${v.totalUsage} lượt` : 'Không giới hạn'}
                            </span>
                            {v.totalUsage > 0 && (
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${usagePercent}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                          {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-center">
                          {v.status === 'ACTIVE' ? (
                            <AdminStatusBadge status="success" label="Đang Hoạt Động" icon="check_circle" />
                          ) : (
                            <AdminStatusBadge status="neutral" label="Tạm Dừng" />
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleVoucherStatus(v)}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs cursor-pointer"
                            >
                              {v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(v)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination
            currentPage={currentPageVouchers}
            totalPages={totalPagesVouchers}
            totalItems={vouchers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPageVouchers}
            itemLabel="voucher"
          />
        </AdminTableContainer>
      )}

      {/* IN-PAGE FORM: TẠO KHUNG GIỜ FLASH SALE MỚI */}
      {showCreateModal && (
        <div ref={createFormRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Thiết Lập Khung Giờ Flash Sale Mới
                </h3>
                <p className="text-xs text-gray-500">Khởi tạo sự kiện khuyến mãi giờ vàng toàn sàn HUKI</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreateErrors({});
              }}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tên Khung Giờ / Sự Kiện Flash Sale <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e: any) => {
                  setCreateForm((prev: any) => ({ ...prev, name: e.target.value }));
                  if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ví dụ: Flash Sale Giáng Sinh 20H - 24H 🎄"
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                  createErrors.name ? "border-rose-400 focus:border-rose-500 focus:bg-white bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                }`}
              />
              {createErrors.name && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  <span>{createErrors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
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
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Thời Gian Bắt Đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.startsAt}
                  onChange={(e: any) => {
                    setCreateForm((prev: any) => ({
                      ...prev,
                      startsAt: e.target.value,
                    }));
                    if (createErrors.startsAt) setCreateErrors((prev) => ({ ...prev, startsAt: "" }));
                  }}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                    createErrors.startsAt ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Thời Gian Kết Thúc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.endsAt}
                  onChange={(e: any) => {
                    setCreateForm((prev: any) => ({
                      ...prev,
                      endsAt: e.target.value,
                    }));
                    if (createErrors.endsAt) setCreateErrors((prev) => ({ ...prev, endsAt: "" }));
                  }}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                    createErrors.endsAt ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateErrors({});
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Xác Nhận Tạo Khung Giờ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IN-PAGE FORM: THÊM SÁCH VÀO KHUNG GIỜ FLASH SALE */}
      {showAddItemModal && selectedSlotForAdd && (
        <div ref={itemFormRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Thêm Sách Vào Khung Giờ Flash Sale
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  Sự kiện: {selectedSlotForAdd.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAddItemModal(false);
                setItemErrors({});
              }}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleAddItemToSlot} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Chọn Sách Từ Hệ Thống <span className="text-rose-500">*</span>
              </label>
              <select
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
                  if (itemErrors.bookId) setItemErrors((prev) => ({ ...prev, bookId: "" }));
                }}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                  itemErrors.bookId ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                }`}
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
                      {Number(book.available ?? book.stock ?? 0)} cuốn)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Giá Gốc (₫) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={itemForm.originalPrice}
                  onChange={(e: any) => {
                    setItemForm((prev: any) => ({
                      ...prev,
                      originalPrice: Number(e.target.value),
                    }));
                    if (itemErrors.originalPrice) setItemErrors((prev) => ({ ...prev, originalPrice: "" }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Giá Flash Sale (₫) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={itemForm.salePrice}
                  onChange={(e: any) => {
                    setItemForm((prev: any) => ({
                      ...prev,
                      salePrice: Number(e.target.value),
                    }));
                    if (itemErrors.salePrice) setItemErrors((prev) => ({ ...prev, salePrice: "" }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 font-bold text-rose-600 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số Lượng Suất Bán (Stock) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={itemForm.stock}
                  onChange={(e: any) => {
                    setItemForm((prev: any) => ({
                      ...prev,
                      stock: Number(e.target.value),
                    }));
                    if (itemErrors.stock) setItemErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Hạn Mức/Khách Mua (Max Per User)
                </label>
                <input
                  type="number"
                  min={1}
                  value={itemForm.maxPerUser}
                  onChange={(e: any) => {
                    setItemForm((prev: any) => ({
                      ...prev,
                      maxPerUser: Number(e.target.value),
                    }));
                    if (itemErrors.maxPerUser) setItemErrors((prev) => ({ ...prev, maxPerUser: "" }));
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddItemModal(false);
                  setItemErrors({});
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Xác Nhận Thêm Sách</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IN-PAGE FORM: TẠO VOUCHER TOÀN SÀN MỚI */}
      {showCreateVoucherModal && (
        <div ref={voucherFormRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Thiết Lập Voucher Khuyến Mãi Sàn Mới
                </h3>
                <p className="text-xs text-gray-500">Phát hành mã giảm giá áp dụng toàn sàn hoặc tài trợ vận chuyển</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateVoucherModal(false);
                setVoucherErrors({});
              }}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Mã Voucher (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: HUKIDISCOUNT20"
                  value={voucherForm.code}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() });
                    if (voucherErrors.code) setVoucherErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono uppercase bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                    voucherErrors.code ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Loại Giảm Giá <span className="text-rose-500">*</span>
                </label>
                <select
                  value={voucherForm.type}
                  onChange={(e: any) => setVoucherForm({ ...voucherForm, type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="PERCENTAGE">Giảm theo % (PERCENTAGE)</option>
                  <option value="FIXED_AMOUNT">Giảm tiền mặt (FIXED_AMOUNT)</option>
                  <option value="FREE_SHIPPING">Miễn phí vận chuyển (FREE_SHIPPING)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">
                Tên Hiển Thị Chiến Dịch <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Tri ân Độc giả Tháng 9 - Giảm 20%"
                value={voucherForm.name}
                onChange={(e) => {
                  setVoucherForm({ ...voucherForm, name: e.target.value });
                  if (voucherErrors.name) setVoucherErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={`w-full px-3.5 py-2 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none transition-all ${
                  voucherErrors.name ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  {voucherForm.type === 'PERCENTAGE' ? 'Tỷ lệ giảm (%) *' : 'Số tiền giảm (VNĐ) *'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={voucherForm.value}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, value: Number(e.target.value) });
                    if (voucherErrors.value) setVoucherErrors((prev) => ({ ...prev, value: "" }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
              {voucherForm.type === 'PERCENTAGE' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Giảm tối đa (VNĐ)</label>
                  <input
                    type="number"
                    min={0}
                    value={voucherForm.maxDiscountAmount}
                    onChange={(e) => {
                      setVoucherForm({ ...voucherForm, maxDiscountAmount: Number(e.target.value) });
                      if (voucherErrors.maxDiscountAmount) setVoucherErrors((prev) => ({ ...prev, maxDiscountAmount: "" }));
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Đơn tối thiểu (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={voucherForm.minOrderAmount}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) });
                    if (voucherErrors.minOrderAmount) setVoucherErrors((prev) => ({ ...prev, minOrderAmount: "" }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tổng lượt dùng toàn sàn</label>
                <input
                  type="number"
                  min={1}
                  value={voucherForm.totalUsage}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, totalUsage: Number(e.target.value) });
                    if (voucherErrors.totalUsage) setVoucherErrors((prev) => ({ ...prev, totalUsage: "" }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Bắt đầu từ</label>
                <input
                  type="datetime-local"
                  value={voucherForm.startsAt}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, startsAt: e.target.value });
                    if (voucherErrors.startsAt) setVoucherErrors((prev) => ({ ...prev, startsAt: "" }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Hết hạn vào</label>
                <input
                  type="datetime-local"
                  value={voucherForm.expiresAt}
                  onChange={(e) => {
                    setVoucherForm({ ...voucherForm, expiresAt: e.target.value });
                    if (voucherErrors.expiresAt) setVoucherErrors((prev) => ({ ...prev, expiresAt: "" }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateVoucherModal(false);
                  setVoucherErrors({});
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold text-gray-700 cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Lưu &amp; Kích Hoạt Voucher</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminMarketingView;
