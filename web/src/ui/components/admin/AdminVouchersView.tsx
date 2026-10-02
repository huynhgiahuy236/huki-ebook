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
  const [expandedVoucherIds, setExpandedVoucherIds] = useState<Set<string>>(new Set());

  const toggleExpandVoucher = (id: string) => {
    setExpandedVoucherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    } else if (voucherForm.type === "FREE_SHIPPING") {
      if (!voucherForm.value || voucherForm.value < 1000) {
        errs.value = "Mức hỗ trợ cước vận chuyển (Freeship) phải từ 1,000₫ trở lên.";
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
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
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

      {/* 3. IN-PAGE EXPANDABLE STUDIO MASTER PANEL & CONFIGURATION TABLE */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold border border-emerald-200 shadow-xs">
                <span className="material-symbols-outlined text-2xl">confirmation_number</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg sm:text-xl font-editorial">
                  Studio Thiết Lập &amp; Phát Hành Voucher Sàn Mới
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thiết lập mã giảm giá toàn sàn, Freeship 100% hoặc hỗ trợ cước, kiểm soát ngân sách và theo dõi dòng tiền mô phỏng tức thì
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFormOpen(false)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateVoucher} className="space-y-6 pt-6">
            {/* UNIFIED MASTER CONFIGURATION TABLE */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-200 text-xs">
                  {/* ROW 1: LOẠI ƯU ĐÃI & THIẾT LẬP MỨC GIẢM */}
                  <tr className="bg-emerald-50/40">
                    <td className="w-1/4 p-4 font-bold text-gray-900 bg-emerald-50/70 border-r border-gray-200 align-top">
                      <div className="flex items-center gap-2 text-emerald-900 text-sm font-extrabold">
                        <span className="material-symbols-outlined text-emerald-700">payments</span>
                        <span>1. Loại Ưu Đãi &amp; Mức Giảm</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-normal mt-1 leading-relaxed">
                        Chọn hình thức giảm giá sách hoặc miễn phí cước vận chuyển (Freeship do Sàn tài trợ 100%).
                      </p>
                    </td>
                    <td className="p-5 space-y-4">
                      {/* Chọn 3 loại hình */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            id: 'PERCENTAGE',
                            label: 'Giảm theo % Giá Sách',
                            desc: 'Giảm theo % giá trị đơn (kèm trần)',
                            icon: 'percent',
                          },
                          {
                            id: 'FIXED_AMOUNT',
                            label: 'Giảm Số Tiền Cố Định (₫)',
                            desc: 'Trừ thẳng vào tiền sách (VD: 20k, 50k)',
                            icon: 'attach_money',
                          },
                          {
                            id: 'FREE_SHIPPING',
                            label: 'Miễn Phí Vận Chuyển (Freeship)',
                            desc: 'Sàn tài trợ 100% hoặc hỗ trợ cước ship',
                            icon: 'local_shipping',
                          },
                        ].map((mode) => (
                          <button
                            type="button"
                            key={mode.id}
                            onClick={() => {
                              const nextType = mode.id as any;
                              let defVal = voucherForm.value;
                              if (nextType === 'PERCENTAGE' && defVal > 100) defVal = 15;
                              if (nextType === 'FREE_SHIPPING' && defVal <= 100) defVal = 30000;
                              if (nextType === 'FIXED_AMOUNT' && defVal <= 100) defVal = 20000;
                              setVoucherForm({ ...voucherForm, type: nextType, value: defVal });
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              voucherForm.type === mode.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="font-bold text-xs">{mode.label}</span>
                              <span className="material-symbols-outlined text-base">
                                {mode.icon}
                              </span>
                            </div>
                            <span className={`text-[10.5px] ${voucherForm.type === mode.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                              {mode.desc}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Chi tiết mức giảm theo từng loại */}
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                        {voucherForm.type === 'FREE_SHIPPING' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-emerald-700 text-base">local_shipping</span>
                                <span>Chế độ Freeship:</span>
                              </label>
                              {/* Nút bấm chọn nhanh mức Freeship */}
                              <div className="flex flex-wrap items-center gap-2">
                                {[
                                  { label: '🌟 Miễn Phí 100% (Tối đa 100k)', val: 100000 },
                                  { label: '🚚 Chuẩn Sàn HUKI (30.000₫)', val: 30000 },
                                  { label: '⚡ Hỗ trợ 15.000₫', val: 15000 },
                                ].map((preset) => (
                                  <button
                                    type="button"
                                    key={preset.val}
                                    onClick={() => setVoucherForm({ ...voucherForm, value: preset.val })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      voucherForm.value === preset.val
                                        ? 'bg-[#00875A] text-white shadow-xs'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                              <div>
                                <label className="block text-gray-700 font-bold mb-1 text-xs">
                                  Mức Hỗ Trợ Cước Vận Chuyển Tối Đa (₫) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={voucherForm.value}
                                    onChange={(e) => setVoucherForm({ ...voucherForm, value: Number(e.target.value) })}
                                    placeholder="VD: 30000"
                                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-black text-sm text-emerald-700 focus:border-[#00875A] focus:outline-none"
                                  />
                                  <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                                </div>
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                  {voucherForm.value >= 100000
                                    ? 'Khách hàng được miễn phí 100% cước ship thông thường toàn quốc.'
                                    : `Sàn tài trợ cước tối đa ${voucherForm.value.toLocaleString('vi-VN')}₫ cho mỗi đơn hàng đủ điều kiện.`}
                                </span>
                              </div>

                              <div>
                                <label className="block text-gray-700 font-bold mb-1 text-xs">
                                  Đơn Hàng Tối Thiểu (₫)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={voucherForm.minOrderAmount}
                                    onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })}
                                    placeholder="VD: 100000"
                                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-sm text-gray-800 focus:border-[#00875A] focus:outline-none"
                                  />
                                  <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                                </div>
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                  {voucherForm.minOrderAmount > 0
                                    ? `Áp dụng khi tổng tiền sách từ ${voucherForm.minOrderAmount.toLocaleString('vi-VN')}₫ trở lên.`
                                    : 'Áp dụng cho mọi giá trị đơn hàng.'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : voucherForm.type === 'PERCENTAGE' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-gray-700 font-bold mb-1 text-xs">
                                Tỷ Lệ Giảm (%) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={voucherForm.value}
                                  onChange={(e) => setVoucherForm({ ...voucherForm, value: Number(e.target.value) })}
                                  placeholder="VD: 15"
                                  min={1}
                                  max={100}
                                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-black text-sm text-emerald-700 focus:border-[#00875A] focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">%</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-gray-700 font-bold mb-1 text-xs">
                                Trần Giảm Tối Đa (₫)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={voucherForm.maxDiscountAmount || ''}
                                  onChange={(e) => setVoucherForm({ ...voucherForm, maxDiscountAmount: Number(e.target.value) })}
                                  placeholder="VD: 50000"
                                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-sm text-gray-800 focus:border-[#00875A] focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-gray-700 font-bold mb-1 text-xs">
                                Đơn Hàng Tối Thiểu (₫)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={voucherForm.minOrderAmount}
                                  onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })}
                                  placeholder="VD: 100000"
                                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-sm text-gray-800 focus:border-[#00875A] focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-gray-700 font-bold mb-1 text-xs">
                                Số Tiền Giảm Cố Định (₫) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={voucherForm.value}
                                  onChange={(e) => setVoucherForm({ ...voucherForm, value: Number(e.target.value) })}
                                  placeholder="VD: 30000"
                                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-black text-sm text-emerald-700 focus:border-[#00875A] focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-gray-700 font-bold mb-1 text-xs">
                                Đơn Hàng Tối Thiểu (₫)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={voucherForm.minOrderAmount}
                                  onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })}
                                  placeholder="VD: 100000"
                                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-sm text-gray-800 focus:border-[#00875A] focus:outline-none"
                                />
                                <span className="absolute right-3 top-2.5 font-bold text-gray-400 text-xs">VNĐ</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {voucherErrors.value && (
                          <p className="text-red-500 text-xs font-semibold">{voucherErrors.value}</p>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ROW 2: THÔNG TIN NHẬN DIỆN CHIẾN DỊCH */}
                  <tr>
                    <td className="p-4 font-bold text-gray-900 bg-gray-50/70 border-r border-gray-200 align-top">
                      <div className="flex items-center gap-2 text-gray-900 text-sm font-extrabold">
                        <span className="material-symbols-outlined text-gray-700">badge</span>
                        <span>2. Nhận Diện &amp; Mô Tả</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-normal mt-1 leading-relaxed">
                        Mã hiển thị cho độc giả nhập tại bước thanh toán và tên hiển thị trên Banner / Ví Voucher.
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Mã Code Khuyến Mãi <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: FREESHIP30, HUKISALE"
                            value={voucherForm.code}
                            onChange={(e) =>
                              setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })
                            }
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-black uppercase text-sm text-emerald-800 focus:border-[#00875A] focus:outline-none"
                          />
                          {voucherErrors.code && (
                            <p className="text-red-500 text-xs mt-1">{voucherErrors.code}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Tên Chiến Dịch <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Miễn Phí Vận Chuyển Đơn Từ 100k"
                            value={voucherForm.name}
                            onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 font-semibold text-xs focus:border-[#00875A] focus:outline-none"
                          />
                          {voucherErrors.name && (
                            <p className="text-red-500 text-xs mt-1">{voucherErrors.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Mô Tả Hiển Thị / Ghi Chú
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Áp dụng toàn quốc cho mọi đơn sách HUKI"
                            value={voucherForm.description}
                            onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* ROW 3: ĐỐI TƯỢNG, HẠN MỨC & THỜI GIAN */}
                  <tr>
                    <td className="p-4 font-bold text-gray-900 bg-gray-50/70 border-r border-gray-200 align-top">
                      <div className="flex items-center gap-2 text-gray-900 text-sm font-extrabold">
                        <span className="material-symbols-outlined text-blue-700">target</span>
                        <span>3. Phân Khúc &amp; Thời Gian</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-normal mt-1 leading-relaxed">
                        Cài đặt đối tượng thụ hưởng, số lượng mã phát hành và thời hạn hiệu lực.
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Đối Tượng Thụ Hưởng
                          </label>
                          <select
                            value={voucherForm.targetAudience}
                            onChange={(e: any) =>
                              setVoucherForm({ ...voucherForm, targetAudience: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 font-bold text-xs text-blue-900 focus:border-[#00875A] focus:outline-none"
                          >
                            <option value="ALL">Toàn bộ bạn đọc (Tất cả)</option>
                            <option value="NEW_CUSTOMERS_ONLY">Chỉ độc giả mới (Đơn đầu tiên)</option>
                            <option value="FOLLOWERS_ONLY">Độc giả thân thiết / Đã theo dõi</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Tổng Lượt Phát Hành <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={voucherForm.totalUsage}
                            onChange={(e) =>
                              setVoucherForm({ ...voucherForm, totalUsage: Number(e.target.value) })
                            }
                            placeholder="VD: 1000"
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs focus:border-[#00875A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Lượt Dùng / Mỗi Bạn Đọc
                          </label>
                          <input
                            type="number"
                            value={voucherForm.maxUsagePerUser}
                            onChange={(e) =>
                              setVoucherForm({ ...voucherForm, maxUsagePerUser: Number(e.target.value) })
                            }
                            placeholder="VD: 1"
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-300 font-mono font-bold text-xs focus:border-[#00875A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1 text-xs">
                            Thời Gian Hiệu Lực
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="datetime-local"
                              value={voucherForm.startsAt}
                              onChange={(e) => setVoucherForm({ ...voucherForm, startsAt: e.target.value })}
                              className="w-full px-2 py-2 rounded-xl bg-white border border-gray-300 text-[11px] focus:border-[#00875A] focus:outline-none"
                              title="Ngày bắt đầu"
                            />
                            <input
                              type="datetime-local"
                              value={voucherForm.expiresAt}
                              onChange={(e) => setVoucherForm({ ...voucherForm, expiresAt: e.target.value })}
                              className="w-full px-2 py-2 rounded-xl bg-white border border-gray-300 text-[11px] focus:border-[#00875A] focus:outline-none"
                              title="Ngày hết hạn"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* ROW 4: MÔ PHỎNG DÒNG TIỀN TÀI CHÍNH TỨC THÌ (LIVE SIMULATION) */}
                  <tr className="bg-slate-50/80">
                    <td className="p-4 font-bold text-gray-900 bg-slate-100/80 border-r border-gray-200 align-top">
                      <div className="flex items-center gap-2 text-slate-800 text-sm font-extrabold">
                        <span className="material-symbols-outlined text-slate-700">query_stats</span>
                        <span>4. Mô Phỏng Dòng Tiền</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-normal mt-1 leading-relaxed">
                        Ví dụ giả lập một đơn hàng mẫu trị giá 200.000₫ với phí ship 30.000₫ khi áp dụng voucher này.
                      </p>
                    </td>
                    <td className="p-5">
                      {(() => {
                        const sampleSubtotal = 200000;
                        const sampleShipping = 30000;
                        let sampleDiscount = 0;
                        let sampleShippingDiscount = 0;

                        if (voucherForm.type === 'FREE_SHIPPING') {
                          sampleShippingDiscount = Math.min(sampleShipping, voucherForm.value);
                        } else if (voucherForm.type === 'PERCENTAGE') {
                          sampleDiscount = (sampleSubtotal * (voucherForm.value || 0)) / 100;
                          if (voucherForm.maxDiscountAmount && sampleDiscount > voucherForm.maxDiscountAmount) {
                            sampleDiscount = voucherForm.maxDiscountAmount;
                          }
                        } else {
                          sampleDiscount = Math.min(sampleSubtotal, voucherForm.value || 0);
                        }

                        const customerPays = sampleSubtotal - sampleDiscount + (sampleShipping - sampleShippingDiscount);
                        const platformSubsidy = sampleDiscount + sampleShippingDiscount;

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-gray-200 font-mono text-xs">
                            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-[10.5px] text-gray-500 block font-sans">Khách Hàng Trả</span>
                              <span className="font-extrabold text-gray-900 text-sm">
                                {customerPays.toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-[10px] text-gray-400 block font-sans mt-0.5">
                                (Tiền hàng + Ship thực trả)
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                              <span className="text-[10.5px] text-emerald-800 block font-sans font-bold">
                                Sàn Trợ Giá (Chi Phí)
                              </span>
                              <span className="font-extrabold text-emerald-700 text-sm">
                                {platformSubsidy.toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-[10px] text-emerald-600 block font-sans mt-0.5">
                                Hạch toán Marketing Sàn
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                              <span className="text-[10.5px] text-blue-800 block font-sans font-bold">
                                Doanh Thu Seller
                              </span>
                              <span className="font-extrabold text-blue-700 text-sm">
                                {sampleSubtotal.toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-[10px] text-blue-600 block font-sans mt-0.5">
                                (Không bị trừ tiền ship)
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                              <span className="text-[10.5px] text-amber-800 block font-sans font-bold">
                                Cước Shipper Nhận
                              </span>
                              <span className="font-extrabold text-amber-700 text-sm">
                                {sampleShipping.toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-[10px] text-amber-600 block font-sans mt-0.5">
                                (Đảm bảo đủ 100% cước)
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified_user</span>
                <span>Toàn bộ chi phí Voucher Sàn và Freeship sẽ được ghi nhận minh bạch vào sổ cái tài chính Sàn HUKI.</span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Đang phát hành...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">rocket_launch</span>
                      <span>Xác Nhận Phát Hành Voucher Sàn</span>
                    </>
                  )}
                </button>
              </div>
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
              <div className="w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-2 w-10 text-center"></th>
                      <th className="py-3 px-2 w-12 text-center">STT</th>
                      <th className="py-3 px-3.5">Mã &amp; Chiến Dịch</th>
                      <th className="py-3 px-3.5">Mức Giảm &amp; Điều Kiện</th>
                      <th className="py-3 px-3.5">Đối Tượng &amp; Hạn Dùng</th>
                      <th className="py-3 px-3.5">Tiến Độ Lượt Dùng</th>
                      <th className="py-3 px-3.5 text-right">Trạng Thái &amp; Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.items.map((v: any, idx: number) => {
                      const isPercentage = v.type === 'PERCENTAGE';
                      const isFreeship = v.type === 'FREE_SHIPPING';
                      const discountLabel = isPercentage
                        ? `Giảm ${v.value}% (tối đa ${Number(v.maxDiscountAmount || 0).toLocaleString('vi-VN')}đ)`
                        : isFreeship
                        ? `Miễn phí ship (tối đa ${Number(v.value || 0).toLocaleString('vi-VN')}đ)`
                        : `Giảm ${Number(v.value || 0).toLocaleString('vi-VN')}đ`;

                      const usagePercent = v.totalUsage > 0 ? Math.min(100, Math.round(((v.currentUsage || 0) / v.totalUsage) * 100)) : 0;

                      const targetAudienceLabel =
                        v.targetAudience === 'NEW_CUSTOMERS_ONLY'
                          ? 'Khách mới'
                          : v.targetAudience === 'FOLLOWERS_ONLY'
                          ? 'Đã theo dõi'
                          : 'Tất cả bạn đọc';

                      const isExpanded = expandedVoucherIds.has(v.id || v.code);

                      return (
                        <React.Fragment key={v.id || v.code}>
                          <tr className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}>
                            {/* Expand arrow */}
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandVoucher(v.id || v.code)}
                                className="w-7 h-7 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                              >
                                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-600 font-bold' : ''}`}>
                                  chevron_right
                                </span>
                              </button>
                            </td>

                            {/* STT */}
                            <td className="py-3 px-2 text-center font-mono text-[11px] text-gray-400">
                              {idx + 1}
                            </td>

                            {/* Mã & Chiến Dịch */}
                            <td className="py-3 px-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs w-fit">
                                  {v.code}
                                </span>
                                <span className="font-bold text-gray-900 text-xs truncate max-w-[220px]" title={v.name}>
                                  {v.name}
                                </span>
                              </div>
                            </td>

                            {/* Mức Giảm & Điều Kiện */}
                            <td className="py-3 px-3.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-gray-900 text-xs text-[#00875A]">
                                  {discountLabel}
                                </span>
                                <span className="text-[11px] text-gray-500 font-mono">
                                  {Number(v.minOrderAmount || 0) > 0 ? `Đơn từ ${Number(v.minOrderAmount).toLocaleString('vi-VN')}đ` : 'Mọi đơn hàng'}
                                </span>
                              </div>
                            </td>

                            {/* Đối Tượng & Hạn Dùng */}
                            <td className="py-3 px-3.5">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold border w-fit ${
                                  v.targetAudience === 'NEW_CUSTOMERS_ONLY'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : v.targetAudience === 'FOLLOWERS_ONLY'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                  {targetAudienceLabel}
                                </span>
                                <span className="text-gray-400 font-mono text-[10.5px]">
                                  {v.expiresAt ? `Hạn: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : 'Vô thời hạn'}
                                </span>
                              </div>
                            </td>

                            {/* Tiến Độ Lượt Dùng */}
                            <td className="py-3 px-3.5">
                              <div className="flex flex-col gap-1 max-w-[140px]">
                                <span className="text-[11px] font-bold text-gray-800 font-mono">
                                  {v.currentUsage || 0} / {v.totalUsage > 0 ? `${v.totalUsage} lượt` : '∞'}
                                </span>
                                {v.totalUsage > 0 && (
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-full rounded-full transition-all"
                                      style={{ width: `${usagePercent}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Trạng Thái & Thao Tác */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                {v.status === 'ACTIVE' ? (
                                  <AdminStatusBadge status="success" label="Đang Hoạt Động" icon="check_circle" />
                                ) : v.status === 'USED_UP' ? (
                                  <AdminStatusBadge status="neutral" label="Đã Hết Lượt" />
                                ) : (
                                  <AdminStatusBadge status="neutral" label="Tạm Dừng" />
                                )}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleToggleVoucherStatus(v)}
                                    className="px-2 py-0.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold text-[10.5px] cursor-pointer"
                                  >
                                    {v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVoucher(v)}
                                    className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Master-Detail Subcard */}
                          {isExpanded && (
                            <tr className="bg-[#F0FDF4]/30 border-b border-emerald-100">
                              <td colSpan={7} className="p-4 sm:p-5">
                                <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col gap-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    {/* Card 1: Quy chế chiết khấu */}
                                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col gap-2">
                                      <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                                        <span className="material-symbols-outlined text-[15px] text-[#00875A]">loyalty</span>
                                        <span>Chi Tiết Ưu Đãi</span>
                                      </div>
                                      <div className="space-y-1.5 text-[11.5px]">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Mã Voucher:</span>
                                          <span className="font-mono font-bold text-[#00875A]">{v.code}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Loại Giảm Giá:</span>
                                          <span className="font-semibold text-gray-900">{isPercentage ? 'Theo %' : isFreeship ? 'Miễn Phí Vận Chuyển' : 'Tiền Mặt Cố Định'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Mức Giảm:</span>
                                          <span className="font-bold text-emerald-800">{isPercentage ? `${v.value}%` : `${Number(v.value || 0).toLocaleString('vi-VN')}₫`}</span>
                                        </div>
                                        {isPercentage && v.maxDiscountAmount && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-500">Trần Giảm Tối Đa:</span>
                                            <span className="font-mono text-gray-800">{Number(v.maxDiscountAmount).toLocaleString('vi-VN')}₫</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Đơn Hàng Tối Thiểu:</span>
                                          <span className="font-mono text-gray-800">{Number(v.minOrderAmount || 0) > 0 ? `${Number(v.minOrderAmount).toLocaleString('vi-VN')}₫` : '0₫ (Không giới hạn)'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card 2: Phân khúc & Hạn mức */}
                                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col gap-2">
                                      <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                                        <span className="material-symbols-outlined text-[15px] text-blue-600">group</span>
                                        <span>Phân Khúc &amp; Giới Hạn</span>
                                      </div>
                                      <div className="space-y-1.5 text-[11.5px]">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Đối Tượng Áp Dụng:</span>
                                          <span className="font-bold text-gray-900">{targetAudienceLabel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Tổng Lượt Phát Hành:</span>
                                          <span className="font-mono font-semibold text-gray-800">{v.totalUsage > 0 ? `${v.totalUsage} lượt` : 'Vô hạn'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Đã Sử Dụng:</span>
                                          <span className="font-mono font-bold text-emerald-700">{v.currentUsage || 0} lượt ({usagePercent}%)</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Giới Hạn / Khách:</span>
                                          <span className="font-mono text-gray-800">{v.maxUsagePerUser || 1} lượt / độc giả</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card 3: Thời hạn & Hạch toán Sàn */}
                                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col gap-2">
                                      <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1.5">
                                        <span className="material-symbols-outlined text-[15px] text-purple-600">schedule</span>
                                        <span>Thời Gian &amp; Hạch Toán</span>
                                      </div>
                                      <div className="space-y-1.5 text-[11.5px]">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Bắt Đầu:</span>
                                          <span className="font-mono text-gray-800">{v.startsAt ? new Date(v.startsAt).toLocaleString('vi-VN') : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Kết Thúc:</span>
                                          <span className="font-mono text-gray-800">{v.expiresAt ? new Date(v.expiresAt).toLocaleString('vi-VN') : 'Vô thời hạn'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Nguồn Trợ Giá:</span>
                                          <span className="font-bold text-[#00875A] bg-emerald-50 px-1.5 py-0.2 rounded">100% Ngân Sách Sàn HUKI</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Phạm Vi Áp Dụng:</span>
                                          <span className="font-medium text-gray-800">Toàn bộ gian hàng sàn</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Toolbar */}
                                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                    <span className="text-[11px] text-gray-500">
                                      {v.description ? `Mô tả: "${v.description}"` : 'Mã khuyến mãi phát hành bởi ban quản trị Sàn HUKI'}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(v.code);
                                          showToast?.(`Đã sao chép mã ${v.code}!`, 'success');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                        <span>Sao chép mã</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVoucherStatus(v)}
                                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                          v.status === 'ACTIVE'
                                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">{v.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}</span>
                                        <span>{v.status === 'ACTIVE' ? 'Tạm Dừng Hoạt Động' : 'Kích Hoạt Ngay'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
