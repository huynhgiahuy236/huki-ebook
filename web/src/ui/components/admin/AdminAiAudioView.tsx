"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  aiAudioService,
  AiAudioPlan,
  BookAiSubscription,
  AiRevenueTransaction,
} from '../../services/aiAudioService';
import {
  AdminStatusBadge,
  AdminFilterTabs,
  AdminPagination,
  AdminTableContainer,
} from './AdminUI';

export function AdminAiAudioView() {
  const { showToast } = useToast();

  // Tab chính: 'plans' (Gói cước) | 'subscriptions' (Quản lý sách) | 'revenue' (Dòng tiền thu về)
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions' | 'revenue'>('plans');

  // Dữ liệu từ service
  const [plans, setPlans] = useState<AiAudioPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<BookAiSubscription[]>([]);
  const [transactions, setTransactions] = useState<AiRevenueTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    transactionCount: 0,
    activeSubscriptionsCount: 0,
    activePlansCount: 0,
  });

  // State tìm kiếm & lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // State FORM INLINE QUẢN LÝ GÓI CƯỚC (QUY TẮC: TUYỆT ĐỐI KHÔNG DÙNG POPUP)
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planFormData, setPlanFormData] = useState({
    code: '',
    name: '',
    price: 100000,
    durationDays: 30,
    description: '',
    voiceType: 'Studio AI Tự Nhiên (Nam / Bắc)',
    isPopular: false,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [planFormErrors, setPlanFormErrors] = useState<Record<string, string>>({});

  // Inline Delete Confirmation (Không dùng popup)
  const [planToDelete, setPlanToDelete] = useState<AiAudioPlan | null>(null);

  // Đồng bộ dữ liệu thật từ PostgreSQL
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [plansData, subsData, txnsData, summaryData] = await Promise.all([
        aiAudioService.getPlans(),
        aiAudioService.getSubscriptions(),
        aiAudioService.getTransactions(),
        aiAudioService.getFinancialSummary(),
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
      setTransactions(txnsData);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Lỗi đồng bộ dữ liệu AI Audio:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('huki_ai_audio_updated', handleSync);
    return () => window.removeEventListener('huki_ai_audio_updated', handleSync);
  }, [loadData]);

  // Reset trang khi đổi tab hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter]);

  // Format tiền tệ VNĐ
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // ==========================================================
  // XỬ LÝ FORM GÓI CƯỚC (INLINE PANEL)
  // ==========================================================
  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanFormData({
      code: `AI_VOICE_${Date.now().toString().slice(-4)}`,
      name: '',
      price: 100000,
      durationDays: 30,
      description: '',
      voiceType: 'Studio AI Tự Nhiên (Nam / Bắc)',
      isPopular: false,
      status: 'ACTIVE',
    });
    setPlanFormErrors({});
    setIsPlanFormOpen(true);
    setPlanToDelete(null);
  };

  const handleOpenEditPlan = (plan: AiAudioPlan) => {
    setEditingPlanId(plan.id);
    setPlanFormData({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      description: plan.description,
      voiceType: plan.voiceType,
      isPopular: Boolean(plan.isPopular),
      status: plan.status,
    });
    setPlanFormErrors({});
    setIsPlanFormOpen(true);
    setPlanToDelete(null);
  };

  const handleClosePlanForm = () => {
    setIsPlanFormOpen(false);
    setEditingPlanId(null);
    setPlanFormErrors({});
  };

  const validatePlanForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!planFormData.name.trim()) {
      errors.name = 'Vui lòng nhập tên gói cước';
    } else if (planFormData.name.trim().length < 5) {
      errors.name = 'Tên gói cước phải có tối thiểu 5 ký tự';
    }

    const codeClean = planFormData.code.trim().toUpperCase();
    if (!codeClean) {
      errors.code = 'Vui lòng nhập mã gói cước';
    } else if (!/^[A-Z0-9_]{3,30}$/.test(codeClean)) {
      errors.code = 'Mã gói chỉ gồm chữ IN HOA, số và dấu gạch dưới (VD: AI_VOICE_100K)';
    }

    if (isNaN(planFormData.price) || planFormData.price < 10000) {
      errors.price = 'Giá cước tối thiểu từ 10.000 đ';
    }

    if (isNaN(planFormData.durationDays) || planFormData.durationDays <= 0) {
      errors.durationDays = 'Thời hạn sử dụng phải lớn hơn 0 ngày';
    }

    if (!planFormData.description.trim()) {
      errors.description = 'Vui lòng nhập mô tả tính năng gói';
    }

    setPlanFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlanForm()) {
      showToast('Vui lòng kiểm tra lại thông tin gói cước', 'error');
      return;
    }

    try {
      const saved = await aiAudioService.savePlan({
        id: editingPlanId || undefined,
        code: planFormData.code,
        name: planFormData.name,
        price: planFormData.price,
        durationDays: planFormData.durationDays,
        description: planFormData.description,
        voiceType: planFormData.voiceType,
        isPopular: planFormData.isPopular,
        status: planFormData.status,
      });

      showToast(
        editingPlanId ? `Đã cập nhật gói: ${saved.name}` : `Đã tạo gói mới: ${saved.name}`,
        'success'
      );
      handleClosePlanForm();
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi lưu gói cước', 'error');
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await aiAudioService.deletePlan(planToDelete.id);
      showToast(`Đã xóa gói cước: ${planToDelete.name}`, 'info');
      setPlanToDelete(null);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Không thể xóa gói cước', 'error');
    }
  };

  const handleTogglePlanStatus = async (planId: string) => {
    try {
      const updated = await aiAudioService.togglePlanStatus(planId);
      if (updated) {
        showToast(`Gói ${updated.code} đã chuyển sang: ${updated.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}`, 'info');
        loadData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Không thể thay đổi trạng thái', 'error');
    }
  };

  // ==========================================================
  // LỌC & PHÂN TRANG DỮ LIỆU
  // ==========================================================
  // 1. Tab Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [plans, searchQuery, statusFilter]);

  // 2. Tab Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchSearch =
        s.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.planName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  // 3. Tab Revenue
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.txnCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.storeName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [transactions, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. TOP HEADER & METRIC CARDS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#006953] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Quản Trị Sách Nói AI & Gói Cước
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý các gói giọng đọc AI, danh sách sách được kích hoạt quyền đọc số và lịch sử dòng tiền về sàn HUKI.
              </p>
            </div>
          </div>
        </div>

        {activeTab === 'plans' && !isPlanFormOpen && (
          <button
            type="button"
            onClick={handleOpenCreatePlan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00271d] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Tạo Gói Cước Mới</span>
          </button>
        )}
      </div>

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Dòng Tiền Thu Về</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-emerald-700 tracking-tight">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Từ {summary.transactionCount} lượt đăng ký của Seller</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Sách Đang Kích Hoạt</span>
            <span className="material-symbols-outlined text-sky-600 text-[18px]">auto_stories</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-sky-700 tracking-tight">
            {summary.activeSubscriptionsCount} <span className="text-xs font-normal text-slate-400">cuốn</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Đã mở quyền AI đọc Web Reader</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Gói Cước Đang Mở</span>
            <span className="material-symbols-outlined text-purple-600 text-[18px]">sell</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-purple-700 tracking-tight">
            {summary.activePlansCount} <span className="text-xs font-normal text-slate-400">/ {plans.length} gói</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Sẵn sàng để Seller đăng ký</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cơ Chế Quyết Toán</span>
            <span className="material-symbols-outlined text-amber-600 text-[18px]">verified_user</span>
          </div>
          <div className="mt-2 text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            100% Về Admin
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Tiền về tài khoản sàn HUKI</p>
        </div>
      </div>

      {/* 3. TÁCH BẠCH 3 TÁC VỤ BẰNG NAVIGATION TABS (Quy tắc Grouped Data Table) */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('plans');
            setStatusFilter('all');
            setSearchQuery('');
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'border-[#003B2B] text-[#003B2B]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">sell</span>
          <span>1. Cấu Hình Gói Cước AI</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {plans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('subscriptions');
            setStatusFilter('all');
            setSearchQuery('');
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'border-[#003B2B] text-[#003B2B]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">auto_stories</span>
          <span>2. Quản Lý Sách Đăng Ký</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {subscriptions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('revenue');
            setStatusFilter('all');
            setSearchQuery('');
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'revenue'
              ? 'border-[#003B2B] text-[#003B2B]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          <span>3. Lịch Sử Dòng Tiền Về Admin</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
            {transactions.length}
          </span>
        </button>
      </div>

      {/* ==========================================================
          TAB 1: CẤU HÌNH GÓI CƯỚC AI (PLANS MANAGEMENT)
          QUY TẮC: TUYỆT ĐỐI KHÔNG DÙNG POPUP -> DÙNG INLINE PANEL
      ========================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* INLINE BANNER XÁC NHẬN XÓA (Thay thế Popup Alert) */}
          {planToDelete && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    Xác nhận xóa gói cước: <span className="underline">{planToDelete.name}</span> ({planToDelete.code})?
                  </h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Hành động này sẽ xóa gói khỏi danh mục cho phép Seller đăng ký. Các cuốn sách đang còn hạn vẫn giữ nguyên quyền lợi.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePlan}
                  className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          )}

          {/* INLINE SLIDING FORM PANEL (THÊM / SỬA GÓI CƯỚC - KHÔNG DÙNG POPUP) */}
          {isPlanFormOpen && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#003B2B]/30 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#003B2B]/10 text-[#003B2B] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">
                      {editingPlanId ? 'edit_note' : 'add_box'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingPlanId ? `Chỉnh Sửa Gói Cước: ${planFormData.code}` : 'Tạo Gói Cước Sách Nói AI Mới'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cấu hình bảng giá và quyền lợi để Seller đăng ký tích hợp giọng đọc cho Ebook.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClosePlanForm}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Đóng form"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Tên Gói */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Gói Cước <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                      placeholder="VD: Gói AI Voice Tiết Kiệm (1 Tháng)"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border ${
                        planFormErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      } focus:bg-white focus:border-[#003B2B] focus:outline-hidden transition-all`}
                    />
                    {planFormErrors.name && (
                      <p className="text-[10.5px] text-rose-600 font-medium mt-1">{planFormErrors.name}</p>
                    )}
                  </div>

                  {/* Mã Gói Cước */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mã Gói (In Hoa) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={planFormData.code}
                      onChange={(e) =>
                        setPlanFormData({ ...planFormData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                      }
                      placeholder="VD: AI_VOICE_BASIC_100K"
                      className={`w-full px-3 py-2 text-xs rounded-xl font-mono bg-slate-50 border ${
                        planFormErrors.code ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      } focus:bg-white focus:border-[#003B2B] focus:outline-hidden transition-all`}
                    />
                    {planFormErrors.code && (
                      <p className="text-[10.5px] text-rose-600 font-medium mt-1">{planFormErrors.code}</p>
                    )}
                  </div>

                  {/* Giá Cước */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giá Cước (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={10000}
                        min={10000}
                        value={planFormData.price}
                        onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                        placeholder="100000"
                        className={`w-full pl-3 pr-12 py-2 text-xs rounded-xl bg-slate-50 border ${
                          planFormErrors.price ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        } focus:bg-white focus:border-[#003B2B] focus:outline-hidden transition-all`}
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">VNĐ</span>
                    </div>
                    {planFormErrors.price ? (
                      <p className="text-[10.5px] text-rose-600 font-medium mt-1">{planFormErrors.price}</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">Bằng chữ: {formatCurrency(planFormData.price)}</p>
                    )}
                  </div>

                  {/* Thời Hạn */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thời Hạn Sử Dụng <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={730}
                        value={planFormData.durationDays}
                        onChange={(e) => setPlanFormData({ ...planFormData, durationDays: Number(e.target.value) })}
                        placeholder="30"
                        className={`w-full pl-3 pr-14 py-2 text-xs rounded-xl bg-slate-50 border ${
                          planFormErrors.durationDays ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                        } focus:bg-white focus:border-[#003B2B] focus:outline-hidden transition-all`}
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">Ngày</span>
                    </div>
                    {planFormErrors.durationDays && (
                      <p className="text-[10.5px] text-rose-600 font-medium mt-1">{planFormErrors.durationDays}</p>
                    )}
                  </div>

                  {/* Chuẩn Giọng Đọc */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chuẩn Giọng Đọc AI</label>
                    <select
                      value={planFormData.voiceType}
                      onChange={(e) => setPlanFormData({ ...planFormData, voiceType: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#003B2B] focus:outline-hidden"
                    >
                      <option value="Studio AI Tự Nhiên (Nam / Bắc)">Studio AI Tự Nhiên (Nam / Bắc)</option>
                      <option value="Studio AI Cảm Xúc Cao Cấp">Studio AI Cảm Xúc Cao Cấp</option>
                      <option value="Master Studio 320k Đa Giọng Đọc">Master Studio 320k Đa Giọng Đọc</option>
                    </select>
                  </div>

                  {/* Trạng Thái & Nổi Bật */}
                  <div className="flex items-center gap-4 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={planFormData.isPopular}
                        onChange={(e) => setPlanFormData({ ...planFormData, isPopular: e.target.checked })}
                        className="w-4 h-4 rounded text-[#003B2B] focus:ring-emerald-500"
                      />
                      <span>Gói Nổi Bật (Popular)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={planFormData.status === 'ACTIVE'}
                        onChange={(e) =>
                          setPlanFormData({ ...planFormData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })
                        }
                        className="w-4 h-4 rounded text-[#003B2B] focus:ring-emerald-500"
                      />
                      <span>Cho Phép Đăng Ký</span>
                    </label>
                  </div>
                </div>

                {/* Mô Tả Tính Năng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô Tả Chi Tiết & Quyền Lợi Gói <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    placeholder="VD: Kích hoạt giọng đọc AI tự nhiên cho 01 Ebook DRM trong vòng 30 ngày. Độc giả nghe không giới hạn..."
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border ${
                      planFormErrors.description ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    } focus:bg-white focus:border-[#003B2B] focus:outline-hidden transition-all`}
                  />
                  {planFormErrors.description && (
                    <p className="text-[10.5px] text-rose-600 font-medium mt-1">{planFormErrors.description}</p>
                  )}
                </div>

                {/* Nút Thao Tác Form Inline */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClosePlanForm}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy / Đóng
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#003B2B] hover:bg-[#00271d] text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>{editingPlanId ? 'Lưu Thay Đổi' : 'Tạo Gói Cước'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BẢNG GROUPED DATA TABLE DANH SÁCH GÓI CƯỚC */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Bảng Cấu Hình Các Gói Cước AI</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {filteredPlans.length}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, mã gói..."
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#003B2B] focus:outline-hidden w-48 sm:w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngừng</option>
              </select>
            </div>
          </div>

          <AdminTableContainer>
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Tên & Mã Gói</th>
                    <th className="py-3 px-4">Giá Cước</th>
                    <th className="py-3 px-4">Thời Hạn</th>
                    <th className="py-3 px-4">Chuẩn Giọng Đọc</th>
                    <th className="py-3 px-4">Sách Đang Dùng</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có gói cước nào phù hợp. Bấm "+ Tạo Gói Cước Mới" để bắt đầu!
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{plan.name}</span>
                            {plan.isPopular && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                HOT
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">{plan.code}</div>
                        </td>

                        <td className="py-3 px-4 font-bold text-emerald-700 text-xs">
                          {formatCurrency(plan.price)}
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold">{plan.durationDays}</span> ngày
                          <span className="text-[10px] text-slate-400 block">
                            (~{Math.round(plan.durationDays / 30)} tháng)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[10.5px]">
                            <span className="material-symbols-outlined text-[12px] text-slate-500">mic</span>
                            {plan.voiceType}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{plan.subscriberCount || 0}</span>
                          <span className="text-[10px] text-slate-400 ml-1">Ebook</span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleTogglePlanStatus(plan.id)}
                            className="cursor-pointer"
                            title="Bấm để đổi trạng thái"
                          >
                            <AdminStatusBadge
                              variant={plan.status === 'ACTIVE' ? 'success' : 'neutral'}
                              label={plan.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}
                            />
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPlan(plan)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#003B2B] transition-colors cursor-pointer"
                              title="Chỉnh sửa gói cước"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPlanToDelete(plan)}
                              className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa gói cước"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </AdminTableContainer>
        </div>
      )}

      {/* ==========================================================
          TAB 2: QUẢN LÝ SÁCH KÍCH HOẠT (SUBSCRIBED EBOOKS)
      ========================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Danh Sách Ebook Đã Kích Hoạt Giọng Đọc AI</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {filteredSubscriptions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sách, shop..."
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#003B2B] focus:outline-hidden w-48 sm:w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVE">Còn hạn sử dụng</option>
                <option value="EXPIRED">Đã hết hạn</option>
              </select>
            </div>
          </div>

          <AdminTableContainer>
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Tác Phẩm Ebook</th>
                    <th className="py-3 px-4">Gian Hàng Sở Hữu</th>
                    <th className="py-3 px-4">Gói Cước Đăng Ký</th>
                    <th className="py-3 px-4">Thời Hạn & Hạn Dùng</th>
                    <th className="py-3 px-4">Lượt Nghe</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chưa có cuốn sách nào đăng ký gói giọng đọc AI.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const isExpired = new Date(sub.expiresAt).getTime() <= Date.now();
                      const daysLeft = Math.max(
                        0,
                        Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      );

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {sub.coverUrl ? (
                                <img
                                  src={sub.coverUrl}
                                  alt={sub.bookTitle}
                                  className="w-8 h-11 object-cover rounded-md shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-11 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 shrink-0">
                                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 line-clamp-1">{sub.bookTitle}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {sub.bookId}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 line-clamp-1">{sub.storeName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">Store ID: {sub.storeId}</span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{sub.planName}</div>
                            <div className="font-bold text-emerald-700 text-[11px] mt-0.5">
                              {formatCurrency(sub.planPrice)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-700">
                              Từ: {new Date(sub.activatedAt).toLocaleDateString('vi-VN')}
                            </div>
                            <div className="font-semibold text-slate-900">
                              Đến: {new Date(sub.expiresAt).toLocaleDateString('vi-VN')}
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                isExpired ? 'text-rose-600' : daysLeft < 5 ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              {isExpired ? 'Đã hết hạn' : `Còn lại: ${daysLeft} ngày`}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{sub.totalListens || 0}</span>
                            <span className="text-[10px] text-slate-400 ml-1">lượt</span>
                          </td>

                          <td className="py-3 px-4">
                            <AdminStatusBadge
                              variant={!isExpired ? 'success' : 'danger'}
                              label={!isExpired ? 'Đang hoạt động' : 'Hết hạn'}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
          </AdminTableContainer>
        </div>
      )}

      {/* ==========================================================
          TAB 3: LỊCH SỬ DÒNG TIỀN VỀ ADMIN (REVENUE & TRANSACTIONS)
      ========================================================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Lịch Sử Dòng Tiền Đăng Ký Gói AI Chảy Về Admin Sàn HUKI</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {filteredTransactions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã giao dịch, shop, sách..."
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#003B2B] focus:outline-hidden w-64"
              />
            </div>
          </div>

          <AdminTableContainer>
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Mã Giao Dịch</th>
                    <th className="py-3 px-4">Gian Hàng Thanh Toán</th>
                    <th className="py-3 px-4">Cuốn Sách & Gói</th>
                    <th className="py-3 px-4">Số Tiền Về Admin</th>
                    <th className="py-3 px-4">Phương Thức</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có giao dịch thu phí nào.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {txn.txnCode}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{txn.storeName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {txn.storeId}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1">{txn.bookTitle}</div>
                          <span className="text-[10.5px] text-[#003B2B] font-medium">{txn.planName}</span>
                        </td>

                        <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                          +{formatCurrency(txn.amount)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-semibold">
                            <span className="material-symbols-outlined text-[13px]">
                              {txn.paymentMethod === 'WALLET' ? 'account_balance_wallet' : 'credit_card'}
                            </span>
                            {txn.paymentMethod === 'WALLET' ? 'Ví Số Dư Shop' : txn.paymentMethod}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(txn.createdAt).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3 px-4">
                          <AdminStatusBadge
                            variant={txn.status === 'SUCCESS' ? 'success' : 'danger'}
                            label={txn.status === 'SUCCESS' ? 'Đã Quyết Toán' : 'Hoàn Tiền'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </AdminTableContainer>
        </div>
      )}
    </div>
  );
}
