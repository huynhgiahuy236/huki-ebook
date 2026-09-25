"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../context/ToastContext";
import { voucherApi, Voucher } from "../../api/voucherApi";
import { AdminStatusBadge } from './AdminUI';

export function AdminVouchersView() {
  const { showToast } = useToast();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'TYPE' | 'AUDIENCE' | 'NONE'>('TYPE');

  // In-Page Expandable Studio Form (100% In-Page, Zero Modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState<{
    code: string;
    name: string;
    description: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value: number;
    minOrderAmount: number;
    maxDiscountAmount: number;
    targetAudience: 'ALL' | 'NEW_CUSTOMERS_ONLY' | 'FOLLOWERS_ONLY';
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
    targetAudience: "ALL",
    totalUsage: 1000,
    maxUsagePerUser: 1,
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
  });
  const [voucherErrors, setVoucherErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await voucherApi.getAllVouchers({ scope: 'PLATFORM' });
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.items)
          ? (res.data as any).items
          : [];
        setVouchers(list);
      }
    } catch (err) {
      console.error("Failed to load platform vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const now = new Date();
    const activeCount = vouchers.filter((v: any) => {
      const isLive = v.status === 'ACTIVE' && new Date(v.startsAt) <= now && new Date(v.expiresAt) >= now;
      return isLive;
    }).length;

    const totalIssued = vouchers.reduce((sum, v: any) => sum + (v.totalUsage || 0), 0);
    const totalUsed = vouchers.reduce((sum, v: any) => sum + (v.currentUsage || 0), 0);
    const estimatedDisbursed = vouchers.reduce((sum, v: any) => {
      const avgVal = v.type === 'PERCENTAGE' ? (v.maxDiscountAmount || 25000) : (v.value || 0);
      return sum + (v.currentUsage || 0) * avgVal;
    }, 0);

    return {
      activeCount,
      totalIssued,
      totalUsed,
      estimatedDisbursed,
    };
  }, [vouchers]);

  // Tab & Search Filtering
  const filteredVouchers = useMemo(() => {
    const now = new Date();
    return vouchers.filter((v: any) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = v.code?.toLowerCase().includes(q);
        const matchName = v.name?.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }

      // Tabs
      const starts = new Date(v.startsAt);
      const expires = new Date(v.expiresAt);

      if (activeTab === 'ACTIVE') {
        return v.status === 'ACTIVE' && starts <= now && expires >= now;
      }
      if (activeTab === 'UPCOMING') {
        return starts > now;
      }
      if (activeTab === 'EXPIRED') {
        return expires < now || v.status === 'USED_UP' || v.status === 'INACTIVE';
      }
      return true;
    });
  }, [vouchers, activeTab, searchQuery]);

  // Grouped Data Table (By Type or Target Audience)
  const groupedVouchers = useMemo(() => {
    if (groupBy === 'NONE') {
      return [{ groupKey: 'ALL', title: 'Tất Cả Voucher Toàn Sàn', icon: 'confirmation_number', items: filteredVouchers }];
    }

    if (groupBy === 'TYPE') {
      const groups: Record<string, { title: string; items: any[]; icon: string }> = {
        FREE_SHIPPING: { title: 'Mã Miễn Phí Vận Chuyển (Freeship Sàn)', items: [], icon: 'local_shipping' },
        PERCENTAGE: { title: 'Mã Giảm Giá Theo Phần Trăm (%)', items: [], icon: 'percent' },
        FIXED_AMOUNT: { title: 'Mã Giảm Giá Tiền Mặt Cố Định (₫)', items: [], icon: 'payments' },
      };

      filteredVouchers.forEach((v) => {
        if (groups[v.type]) {
          groups[v.type].items.push(v);
        } else {
          groups.PERCENTAGE.items.push(v);
        }
      });

      return Object.entries(groups)
        .filter(([_, g]) => g.items.length > 0)
        .map(([k, g]) => ({ groupKey: k, title: g.title, icon: g.icon, items: g.items }));
    }

    if (groupBy === 'AUDIENCE') {
      const groups: Record<string, { title: string; items: any[]; icon: string }> = {
        ALL: { title: 'Dành Cho Tất Cả Bạn Đọc', items: [], icon: 'groups' },
        NEW_CUSTOMERS_ONLY: { title: 'Dành Riêng Cho Khách Hàng Mới (Đơn Đầu Tiên)', items: [], icon: 'person_add' },
        FOLLOWERS_ONLY: { title: 'Dành Cho Độc Giả Thân Thiết / Đã Theo Dõi', items: [], icon: 'verified' },
      };

      filteredVouchers.forEach((v: any) => {
        const aud = v.targetAudience || 'ALL';
        if (groups[aud]) {
          groups[aud].items.push(v);
        } else {
          groups.ALL.items.push(v);
        }
      });

      return Object.entries(groups)
        .filter(([_, g]) => g.items.length > 0)
        .map(([k, g]) => ({ groupKey: k, title: g.title, icon: g.icon, items: g.items }));
    }

    return [{ groupKey: 'ALL', title: 'Danh Sách Voucher', icon: 'confirmation_number', items: filteredVouchers }];
  }, [filteredVouchers, groupBy]);

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

    const s = new Date(voucherForm.startsAt).getTime();
    const e = new Date(voucherForm.expiresAt).getTime();
    if (e <= s) {
      errs.expiresAt = "Thời gian hết hạn phải sau thời gian bắt đầu.";
    }

    setVoucherErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateVoucherForm()) {
      showToast?.("Vui lòng kiểm tra lại các trường thông tin trên form voucher!", "warning");
      return;
    }
    try {
      setSubmitting(true);
      const res = await voucherApi.createAdminVoucher({
        code: voucherForm.code.trim().toUpperCase(),
        name: voucherForm.name.trim(),
        description: voucherForm.description.trim() || undefined,
        type: voucherForm.type,
        value: Number(voucherForm.value),
        minOrderAmount: Number(voucherForm.minOrderAmount || 0),
        maxDiscountAmount: voucherForm.type === 'PERCENTAGE' && Number(voucherForm.maxDiscountAmount) > 0 ? Number(voucherForm.maxDiscountAmount) : undefined,
        targetAudience: voucherForm.targetAudience,
        totalUsage: Number(voucherForm.totalUsage || 0),
        maxUsagePerUser: Number(voucherForm.maxUsagePerUser || 1),
        scope: 'PLATFORM',
        startsAt: new Date(voucherForm.startsAt).toISOString(),
        expiresAt: new Date(voucherForm.expiresAt).toISOString(),
      });
      if (res.success) {
        showToast?.(`⚡ Đã tạo voucher sàn ${voucherForm.code.toUpperCase()} thành công!`, "success");
        setIsFormOpen(false);
        setVoucherErrors({});
        setVoucherForm({
          code: "",
          name: "",
          description: "",
          type: "PERCENTAGE",
          value: 15,
          minOrderAmount: 100000,
          maxDiscountAmount: 50000,
          targetAudience: "ALL",
          totalUsage: 1000,
          maxUsagePerUser: 1,
          startsAt: new Date().toISOString().slice(0, 16),
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        });
        fetchVouchers();
      } else {
        const errorMsg = res.error?.message || (res as any)?.message || "Không thể tạo voucher!";
        showToast?.(errorMsg, "error");
      }
    } catch (err: any) {
      showToast?.(err?.message || "Lỗi kết nối khi tạo voucher!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVoucherStatus = async (v: any) => {
    const nextStatus = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await voucherApi.updateAdminVoucher(v.id, { status: nextStatus });
      if (res.success) {
        showToast?.(`Đã chuyển trạng thái voucher ${v.code} sang ${nextStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}`, "success");
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
        showToast?.((res as any)?.message || "Không thể xóa voucher đã phát sinh lượt dùng!", "error");
      }
    } catch {
      showToast?.("Không thể xóa voucher", "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-2xl">confirmation_number</span>
            <span>Mã Giảm Giá Sàn HUKI (Platform Vouchers Hub)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Phát hành và điều hành toàn bộ chiến dịch Voucher toàn sàn, mã Freeship và ưu đãi độc quyền do Sàn tài trợ 100%
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 ${
            isFormOpen
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-[#00875A] hover:bg-[#00734c] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isFormOpen ? "expand_less" : "add_circle"}
          </span>
          <span>{isFormOpen ? "Đóng Studio Phát Hành" : "Phát Hành Voucher Sàn Mới"}</span>
        </button>
      </div>

      {/* 2. 4 TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl">bolt</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Voucher Đang Live</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-0.5">{stats.activeCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <span className="material-symbols-outlined text-2xl">local_activity</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Tổng Lượt Phát Hành</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-0.5">{stats.totalIssued.toLocaleString('vi-VN')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Lượt Đã Dùng</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-0.5">{stats.totalUsed.toLocaleString('vi-VN')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <span className="material-symbols-outlined text-2xl">savings</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Ngân Sách Sàn Đã Chi</span>
            <div className="text-lg font-black text-amber-700 font-mono mt-0.5">{stats.estimatedDisbursed.toLocaleString('vi-VN')}₫</div>
          </div>
        </div>
      </div>

      {/* 3. IN-PAGE EXPANDABLE STUDIO FORM (100% IN-PAGE, ZERO MODAL) */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold border border-emerald-200">
                <span className="material-symbols-outlined text-xl">add_card</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Studio Thiết Lập &amp; Phát Hành Voucher Sàn Mới
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thiết lập mã giảm giá, kiểm soát trần khuyến mãi và lựa chọn phân khúc đối tượng thụ hưởng
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-5 pt-5 text-xs">
            {/* 4 Cards Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Thông tin cơ bản */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-gray-800 text-xs border-b border-gray-200 pb-2">
                  <span className="material-symbols-outlined text-base text-gray-600">badge</span>
                  <span>1. Thông Tin Nhận Diện</span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Mã Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HUKISALE25"
                    value={voucherForm.code}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-black uppercase text-xs focus:border-[#00875A] focus:outline-none"
                  />
                  {voucherErrors.code && (
                    <p className="text-red-500 text-[10.5px] mt-1">{voucherErrors.code}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Tên Chiến Dịch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Giảm 25% Đơn Đầu Tiên"
                    value={voucherForm.name}
                    onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium text-xs focus:border-[#00875A] focus:outline-none"
                  />
                  {voucherErrors.name && (
                    <p className="text-red-500 text-[10.5px] mt-1">{voucherErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Mô Tả Hiển Thị</label>
                  <input
                    type="text"
                    placeholder="VD: Áp dụng cho mọi đơn hàng sách"
                    value={voucherForm.description}
                    onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Card 2: Thiết lập mức giảm */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs border-b border-emerald-200 pb-2">
                  <span className="material-symbols-outlined text-base text-emerald-700">payments</span>
                  <span>2. Mức Giảm Giá</span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Loại Ưu Đãi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={voucherForm.type}
                    onChange={(e: any) => setVoucherForm({ ...voucherForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-bold text-xs focus:border-[#00875A] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Giảm theo tỷ lệ (%)</option>
                    <option value="FIXED_AMOUNT">Giảm tiền mặt cố định (₫)</option>
                    <option value="FREE_SHIPPING">Miễn phí vận chuyển (Freeship)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {voucherForm.type === 'PERCENTAGE'
                      ? 'Tỷ Lệ Giảm (%)'
                      : voucherForm.type === 'FREE_SHIPPING'
                      ? 'Phí Ship Giảm Tối Đa (₫)'
                      : 'Số Tiền Giảm (₫)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={voucherForm.value}
                    onChange={(e) => setVoucherForm({ ...voucherForm, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-black text-xs text-emerald-700 focus:border-[#00875A] focus:outline-none"
                  />
                  {voucherErrors.value && (
                    <p className="text-red-500 text-[10.5px] mt-1">{voucherErrors.value}</p>
                  )}
                </div>

                {voucherForm.type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Mức Giảm Tối Đa (Trần Giảm ₫)
                    </label>
                    <input
                      type="number"
                      placeholder="VD: 50000"
                      value={voucherForm.maxDiscountAmount}
                      onChange={(e) =>
                        setVoucherForm({ ...voucherForm, maxDiscountAmount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs focus:border-[#00875A] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Card 3: Phân khúc đối tượng & Hạn mức */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs border-b border-blue-200 pb-2">
                  <span className="material-symbols-outlined text-base text-blue-700">target</span>
                  <span>3. Phân Khúc &amp; Hạn Mức</span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Đối Tượng Thụ Hưởng (Shopee Style)
                  </label>
                  <select
                    value={voucherForm.targetAudience}
                    onChange={(e: any) =>
                      setVoucherForm({ ...voucherForm, targetAudience: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-bold text-xs text-blue-900 focus:border-[#00875A] focus:outline-none"
                  >
                    <option value="ALL">Toàn bộ bạn đọc (Tất cả)</option>
                    <option value="NEW_CUSTOMERS_ONLY">Chỉ độc giả mới (Đơn đầu tiên)</option>
                    <option value="FOLLOWERS_ONLY">Độc giả thân thiết / Đã theo dõi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Đơn Hàng Tối Thiểu (₫)
                  </label>
                  <input
                    type="number"
                    value={voucherForm.minOrderAmount}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Lượt Dùng / Mỗi Bạn Đọc
                  </label>
                  <input
                    type="number"
                    value={voucherForm.maxUsagePerUser}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, maxUsagePerUser: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Card 4: Ngân sách & Thời hạn */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs border-b border-amber-200 pb-2">
                  <span className="material-symbols-outlined text-base text-amber-700">schedule</span>
                  <span>4. Ngân Sách &amp; Thời Gian</span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Tổng Lượt Phát Hành Sàn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={voucherForm.totalUsage}
                    onChange={(e) =>
                      setVoucherForm({ ...voucherForm, totalUsage: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs text-amber-900 focus:border-[#00875A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Bắt Đầu</label>
                  <input
                    type="datetime-local"
                    value={voucherForm.startsAt}
                    onChange={(e) => setVoucherForm({ ...voucherForm, startsAt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Hết Hạn</label>
                  <input
                    type="datetime-local"
                    value={voucherForm.expiresAt}
                    onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? (
                  <span>Đang phát hành...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>Xác Nhận Phát Hành Voucher Sàn</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. FILTER & GROUPING TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Tất Cả', count: vouchers.length },
            { id: 'ACTIVE', label: 'Đang Hoạt Động', count: stats.activeCount },
            { id: 'UPCOMING', label: 'Đã Lên Lịch', count: vouchers.filter((v: any) => new Date(v.startsAt) > new Date()).length },
            { id: 'EXPIRED', label: 'Hết Lượt / Tạm Dừng', count: vouchers.filter((v: any) => new Date(v.expiresAt) < new Date() || v.status === 'INACTIVE' || v.status === 'USED_UP').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-[#00875A] text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Group By Selector */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
            <span className="material-symbols-outlined text-sm">table_rows</span>
            <span>Nhóm theo:</span>
            <select
              value={groupBy}
              onChange={(e: any) => setGroupBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:border-[#00875A]"
            >
              <option value="TYPE">Loại Giảm Giá</option>
              <option value="AUDIENCE">Đối Tượng Bạn Đọc</option>
              <option value="NONE">Không Nhóm (Bảng phẳng)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Tìm theo mã, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#00875A]"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-sm">
              search
            </span>
          </div>
        </div>
      </div>

      {/* 5. GROUPED DATA TABLES (Chi tiết, tường minh, không lơ là) */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 mt-2 font-medium">Đang tải dữ liệu mã giảm giá...</p>
        </div>
      ) : groupedVouchers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300">confirmation_number</span>
          <h3 className="text-sm font-bold text-gray-700 mt-2">Không tìm thấy voucher phù hợp</h3>
          <p className="text-xs text-gray-500 mt-1">Bấm "Phát Hành Voucher Sàn Mới" để tạo mã ưu đãi đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedVouchers.map((group) => (
            <div
              key={group.groupKey}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-lg">
                    {group.icon || "confirmation_number"}
                  </span>
                  <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm">
                    {group.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[10.5px]">
                    {group.items.length} mã
                  </span>
                </div>
              </div>

              {/* Group Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Mã Voucher</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Tên Chiến Dịch &amp; Mức Giảm</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Đối Tượng</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Đơn Tối Thiểu</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Tiến Độ Lượt Dùng</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Thời Hạn</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.items.map((v: any, idx: number) => {
                      const isPercentage = v.type === 'PERCENTAGE';
                      const isFreeship = v.type === 'FREE_SHIPPING';
                      const discountLabel = isPercentage
                        ? `Giảm ${v.value}% (tối đa ${Number(v.maxDiscountAmount || 0).toLocaleString('vi-VN')}đ)`
                        : isFreeship
                        ? `Miễn phí vận chuyển (tối đa ${Number(v.value || 0).toLocaleString('vi-VN')}đ)`
                        : `Giảm ${Number(v.value || 0).toLocaleString('vi-VN')}đ`;

                      const usagePercent = v.totalUsage > 0 ? Math.min(100, Math.round(((v.currentUsage || 0) / v.totalUsage) * 100)) : 0;

                      const targetAudienceLabel =
                        v.targetAudience === 'NEW_CUSTOMERS_ONLY'
                          ? 'Khách mới'
                          : v.targetAudience === 'FOLLOWERS_ONLY'
                          ? 'Đã theo dõi'
                          : 'Tất cả bạn đọc';

                      return (
                        <tr
                          key={v.id || v.code}
                          className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                        >
                          <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                              {v.code}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-bold text-gray-900 block">{v.name}</span>
                            <span className="text-[10.5px] text-gray-500">{discountLabel}</span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                              v.targetAudience === 'NEW_CUSTOMERS_ONLY'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : v.targetAudience === 'FOLLOWERS_ONLY'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {targetAudienceLabel}
                            </span>
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
                            ) : v.status === 'USED_UP' ? (
                              <AdminStatusBadge status="neutral" label="Đã Hết Lượt" />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
