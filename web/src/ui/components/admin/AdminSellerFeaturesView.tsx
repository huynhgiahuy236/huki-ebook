"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { featureFlagsService, SellerFeature } from '@/ui/services/featureFlagsService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { useDebounce } from '@/ui/utils/useDebounce';
import CustomModal from '@/ui/components/common/CustomModal';

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  all: { label: 'Tất Cả Tính Năng', icon: 'apps', color: 'bg-slate-100 text-slate-700' },
  marketing: { label: 'Marketing & Khuyến Mãi', icon: 'campaign', color: 'bg-amber-100 text-amber-800' },
  inventory: { label: 'Kho Hàng & DRM', icon: 'auto_stories', color: 'bg-blue-100 text-blue-800' },
  finance: { label: 'Tài Chính & Escrow', icon: 'account_balance_wallet', color: 'bg-emerald-100 text-emerald-800' },
  operations: { label: 'Vận Hành & Đổi Trả', icon: 'settings_suggest', color: 'bg-purple-100 text-purple-800' },
  customer: { label: 'CSKH & Tương Tác', icon: 'chat', color: 'bg-rose-100 text-rose-800' },
  expansion: { label: 'Mở Rộng & Công Nghệ AI', icon: 'smart_toy', color: 'bg-indigo-100 text-indigo-800' },
};

function formatCountdown(targetIso?: string): string {
  if (!targetIso) return '';
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Đang xử lý...';
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export default function AdminSellerFeaturesView() {
  const [features, setFeatures] = useState<SellerFeature[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Live timer tick for real-time countdown display
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal States
  const [maintenanceModalFeature, setMaintenanceModalFeature] = useState<SellerFeature | null>(null);
  const [maintenanceReasonInput, setMaintenanceReasonInput] = useState('');

  // Scheduled Timer Modal
  const [timerModalFeature, setTimerModalFeature] = useState<SellerFeature | null>(null);
  const [timerMode, setTimerMode] = useState<'DISABLE' | 'ENABLE'>('DISABLE');
  const [timerPresetMinutes, setTimerPresetMinutes] = useState<number>(15);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [autoReopenMinutes, setAutoReopenMinutes] = useState<number>(0);
  const [timerReasonInput, setTimerReasonInput] = useState<string>('Bảo trì nâng cấp hệ thống định kỳ');

  const [overrideModalFeature, setOverrideModalFeature] = useState<SellerFeature | null>(null);
  const [overrideSearch, setOverrideSearch] = useState('');
  const debouncedOverrideSearch = useDebounce(overrideSearch, 200);

  // Bulk feature action modal
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [isBulkOverrideOpen, setIsBulkOverrideOpen] = useState(false);
  const [bulkSelectedBusinessIds, setBulkSelectedBusinessIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'BLOCK' | 'UNBLOCK'>('BLOCK');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Load features & businesses
  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      setFeatures(featureFlagsService.getAllFeatures());
    };
    window.addEventListener('huki_feature_flags_updated', handleUpdate);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FEATURE_FLAGS_UPDATED') {
        handleUpdate();
      }
    });

    return () => {
      window.removeEventListener('huki_feature_flags_updated', handleUpdate);
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setFeatures(featureFlagsService.getAllFeatures());
      const res = await businessApi.getAllBusinesses({ limit: 100 });
      if (res && res.success && res.data) {
        setBusinesses(Array.isArray(res.data) ? res.data : (res.data as any).data || []);
      }
    } catch (err) {
      console.error('Failed to load seller features data', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const matchCat = activeCategory === 'all' || feat.category === activeCategory;
      const matchSearch =
        !debouncedSearch.trim() ||
        feat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        feat.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        feat.id.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [features, activeCategory, debouncedSearch]);

  // Statistics
  const stats = useMemo(() => {
    const total = features.length;
    const active = features.filter((f) => f.isEnabledGlobally).length;
    const maintenance = total - active;
    const scheduled = features.filter((f) => f.scheduledDisableAt || f.scheduledEnableAt).length;
    const totalRestrictedBusinesses = new Set(features.flatMap((f) => f.disabledBusinesses || [])).size;
    return { total, active, maintenance, scheduled, totalRestrictedBusinesses };
  }, [features]);

  // Toggle Global Feature Switch
  const handleToggleGlobal = (feature: SellerFeature) => {
    if (feature.isEnabledGlobally) {
      setMaintenanceModalFeature(feature);
      setMaintenanceReasonInput(feature.maintenanceReason || 'Đang bảo trì nâng cấp hệ thống');
    } else {
      featureFlagsService.toggleGlobalFeature(feature.id, true, '');
      setFeatures(featureFlagsService.getAllFeatures());
      showToast(`Đã kích hoạt mở lại tính năng: ${feature.name}`);
    }
  };

  const handleConfirmMaintenance = () => {
    if (!maintenanceModalFeature) return;
    featureFlagsService.toggleGlobalFeature(
      maintenanceModalFeature.id,
      false,
      maintenanceReasonInput.trim() || 'Hệ thống đang bảo trì'
    );
    setFeatures(featureFlagsService.getAllFeatures());
    showToast(`Đã tắt tính năng: ${maintenanceModalFeature.name}`);
    setMaintenanceModalFeature(null);
  };

  // Open Timer Modal
  const openTimerModal = (feature: SellerFeature) => {
    setTimerModalFeature(feature);
    setTimerMode(feature.isEnabledGlobally ? 'DISABLE' : 'ENABLE');
    setTimerPresetMinutes(15);
    setCustomDateTime('');
    setAutoReopenMinutes(0);
    setTimerReasonInput(feature.maintenanceReason || 'Bảo trì nâng cấp hệ thống định kỳ');
  };

  // Confirm Timer Schedule
  const handleSaveTimerSchedule = () => {
    if (!timerModalFeature) return;

    let targetDisableAt: string | undefined = undefined;
    let targetEnableAt: string | undefined = undefined;

    const baseMs = Date.now();
    let scheduledMs: number;

    if (customDateTime) {
      scheduledMs = new Date(customDateTime).getTime();
    } else {
      scheduledMs = baseMs + timerPresetMinutes * 60 * 1000;
    }

    if (timerMode === 'DISABLE') {
      targetDisableAt = new Date(scheduledMs).toISOString();
      if (autoReopenMinutes > 0) {
        targetEnableAt = new Date(scheduledMs + autoReopenMinutes * 60 * 1000).toISOString();
      }
    } else {
      targetEnableAt = new Date(scheduledMs).toISOString();
    }

    featureFlagsService.scheduleFeature(timerModalFeature.id, {
      disableAt: targetDisableAt,
      enableAt: targetEnableAt,
      reason: timerReasonInput.trim(),
      updatedBy: 'Admin HuKi',
    });

    setFeatures(featureFlagsService.getAllFeatures());
    setTimerModalFeature(null);
    showToast(`Đã thiết lập hẹn giờ cho tính năng: ${timerModalFeature.name}`);
  };

  // Cancel Scheduled Timer
  const handleCancelSchedule = (featureId: string) => {
    featureFlagsService.cancelFeatureSchedule(featureId);
    setFeatures(featureFlagsService.getAllFeatures());
    showToast('Đã hủy lịch hẹn giờ thành công!');
  };

  // Toggle Business Tenant Override
  const handleToggleBusinessOverride = (featureId: string, businessId: string, currentBlocked: boolean) => {
    featureFlagsService.toggleBusinessForFeature(featureId, businessId, !currentBlocked);
    setFeatures(featureFlagsService.getAllFeatures());
  };

  // Bulk Toggle Features
  const handleApplyBulkTenantOverrides = () => {
    if (selectedFeatureIds.length === 0 || bulkSelectedBusinessIds.length === 0) return;
    featureFlagsService.bulkToggleBusinessFeatures(
      bulkSelectedBusinessIds,
      selectedFeatureIds,
      bulkActionType === 'BLOCK'
    );
    setFeatures(featureFlagsService.getAllFeatures());
    setIsBulkOverrideOpen(false);
    setSelectedFeatureIds([]);
    setBulkSelectedBusinessIds([]);
    showToast(`Đã áp dụng ${selectedFeatureIds.length} tính năng cho ${bulkSelectedBusinessIds.length} doanh nghiệp`);
  };

  const filteredBusinessesForOverride = useMemo(() => {
    if (!debouncedOverrideSearch.trim()) return businesses;
    return businesses.filter(
      (b) =>
        b.name?.toLowerCase().includes(debouncedOverrideSearch.toLowerCase()) ||
        b.email?.toLowerCase().includes(debouncedOverrideSearch.toLowerCase()) ||
        b.taxCode?.toLowerCase().includes(debouncedOverrideSearch.toLowerCase())
    );
  }, [businesses, debouncedOverrideSearch]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in text-xs font-bold">
          <span className="material-symbols-outlined text-emerald-400 text-base">task_alt</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003B2B] text-2xl">toggle_on</span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Tính Năng & Phân Quyền Seller</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              BẢN MỚI NHẤT 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát bật/tắt toàn sàn (Global Switch), hẹn giờ bảo trì tự động và phân quyền theo từng Doanh nghiệp (Tenant Override).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedFeatureIds.length > 0 && (
            <button
              onClick={() => setIsBulkOverrideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003B2B] text-white rounded-xl text-xs font-bold hover:bg-[#00281D] transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">domain_disabled</span>
              <span>Áp dụng {selectedFeatureIds.length} tính năng cho DN</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Grid (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <span className="material-symbols-outlined text-xl">tune</span>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-tight">{stats.total}</div>
            <div className="text-[11px] font-semibold text-slate-500">Tổng Tính Năng</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div>
            <div className="text-lg font-black text-emerald-700 leading-tight">{stats.active}</div>
            <div className="text-[11px] font-semibold text-slate-500">Đang Bật (ON)</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
            <span className="material-symbols-outlined text-xl">build_circle</span>
          </div>
          <div>
            <div className="text-lg font-black text-rose-700 leading-tight">{stats.maintenance}</div>
            <div className="text-[11px] font-semibold text-slate-500">Bảo Trì (OFF)</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <span className="material-symbols-outlined text-xl">alarm</span>
          </div>
          <div>
            <div className="text-lg font-black text-amber-700 leading-tight">{stats.scheduled}</div>
            <div className="text-[11px] font-semibold text-slate-500">Đang Hẹn Giờ</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 shrink-0">
            <span className="material-symbols-outlined text-xl">shield_person</span>
          </div>
          <div>
            <div className="text-lg font-black text-purple-700 leading-tight">{stats.totalRestrictedBusinesses}</div>
            <div className="text-[11px] font-semibold text-slate-500">DN Bị Giới Hạn</div>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {Object.entries(CATEGORY_MAP).map(([key, info]) => {
            const isActive = activeCategory === key;
            const count = key === 'all' ? features.length : features.filter((f) => f.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#003B2B] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{info.icon}</span>
                <span>{info.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã tính năng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. Features Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
          <p className="text-sm font-bold text-slate-700 mt-2">Không tìm thấy tính năng phù hợp</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng thử lại với từ khóa hoặc danh mục khác</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFeatures.map((feature) => {
            const isSelected = selectedFeatureIds.includes(feature.id);
            const catInfo = CATEGORY_MAP[feature.category] || CATEGORY_MAP.all;
            const disabledCount = (feature.disabledBusinesses || []).length;
            const hasScheduledDisable = Boolean(feature.scheduledDisableAt);
            const hasScheduledEnable = Boolean(feature.scheduledEnableAt);

            return (
              <div
                key={feature.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  !feature.isEnabledGlobally
                    ? 'border-rose-300 bg-rose-50/20'
                    : isSelected
                    ? 'border-[#003B2B] ring-1 ring-[#003B2B]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeatureIds([...selectedFeatureIds, feature.id]);
                          } else {
                            setSelectedFeatureIds(selectedFeatureIds.filter((id) => id !== feature.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#003B2B] focus:ring-[#003B2B] cursor-pointer"
                      />
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${catInfo.color} flex items-center gap-1`}>
                        <span className="material-symbols-outlined text-[13px]">{catInfo.icon}</span>
                        {catInfo.label}
                      </span>
                    </div>

                    {/* Global On/Off Switch Button */}
                    <button
                      onClick={() => handleToggleGlobal(feature)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        feature.isEnabledGlobally ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                      title={feature.isEnabledGlobally ? 'Đang BẬT toàn sàn (Bấm để ngắt)' : 'Đang TẮT bảo trì (Bấm để mở)'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          feature.isEnabledGlobally ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Feature Title & Code */}
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{feature.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                        {feature.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Scheduled Timer Badge: Auto Disable */}
                  {hasScheduledDisable && (
                    <div className="mb-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-[16px] text-amber-600 animate-spin">alarm</span>
                        <span>Sẽ tắt sau: {formatCountdown(feature.scheduledDisableAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelSchedule(feature.id)}
                        className="text-[10px] font-bold text-rose-700 hover:text-rose-900 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 cursor-pointer"
                        title="Hủy lịch hẹn giờ này"
                      >
                        Hủy hẹn
                      </button>
                    </div>
                  )}

                  {/* Scheduled Timer Badge: Auto Enable */}
                  {hasScheduledEnable && !feature.isEnabledGlobally && (
                    <div className="mb-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600 animate-pulse">schedule</span>
                        <span>Tự mở sau: {formatCountdown(feature.scheduledEnableAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelSchedule(feature.id)}
                        className="text-[10px] font-bold text-rose-700 hover:text-rose-900 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 cursor-pointer"
                        title="Hủy lịch hẹn mở lại"
                      >
                        Hủy hẹn
                      </button>
                    </div>
                  )}

                  {/* Maintenance Alert if Disabled */}
                  {!feature.isEnabledGlobally && (
                    <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0 mt-0.5">
                        warning
                      </span>
                      <div>
                        <div className="font-bold text-[11px]">Đang Tạm Khóa Toàn Sàn</div>
                        <div className="text-[11px] text-rose-700 mt-0.5">
                          {feature.maintenanceReason || 'Đang bảo trì tính năng'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls: Phân quyền DN + Hẹn Giờ Tự Động */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px]">Chặn riêng:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        disabledCount > 0
                          ? 'bg-amber-100 text-amber-800 font-extrabold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {disabledCount} DN
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Nút Hẹn Giờ */}
                    <button
                      type="button"
                      onClick={() => openTimerModal(feature)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer"
                      title="Thiết lập hẹn giờ tự động tắt hoặc mở lại"
                    >
                      <span className="material-symbols-outlined text-[14px]">alarm</span>
                      <span>Hẹn Giờ</span>
                    </button>

                    {/* Nút Phân quyền */}
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideModalFeature(feature);
                        setOverrideSearch('');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#003B2B] bg-[#003B2B]/5 hover:bg-[#003B2B]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">tune</span>
                      <span>Phân quyền DN</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Nhập lý do bảo trì khi TẮT tính năng ngay lập tức */}
      {maintenanceModalFeature && (
        <CustomModal
          isOpen={true}
          onClose={() => setMaintenanceModalFeature(null)}
          title={`Tạm Tắt Tính Năng: ${maintenanceModalFeature.name}`}
          size="md"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">info</span>
              <div>
                <p className="font-bold">Lưu ý khi ngắt tính năng (Global Switch):</p>
                <p className="mt-0.5">
                  Tất cả Người bán (Seller) trên toàn sàn sẽ không thể truy cập hoặc thực hiện thao tác đối với tính năng này cho đến khi bạn bật lại.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do bảo trì / Thông báo hiển thị cho Seller:
              </label>
              <textarea
                rows={3}
                value={maintenanceReasonInput}
                onChange={(e) => setMaintenanceReasonInput(e.target.value)}
                placeholder="VD: Tính năng đang được nâng cấp định kỳ, dự kiến mở lại lúc 14:00..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setMaintenanceModalFeature(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmMaintenance}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Xác Nhận Ngắt Tính Năng
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 6. Modal: Hẹn Giờ Tự Động Tắt / Mở Tính Năng (Scheduler Timer) */}
      {timerModalFeature && (
        <CustomModal
          isOpen={true}
          onClose={() => setTimerModalFeature(null)}
          title={`Hẹn Giờ Tự Động: ${timerModalFeature.name}`}
          size="md"
        >
          <div className="p-4 flex flex-col gap-4 font-sans text-xs">
            {/* Mode Selector */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTimerMode('DISABLE')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  timerMode === 'DISABLE'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                <span>Hẹn Giờ Tạm Tắt</span>
              </button>

              <button
                type="button"
                onClick={() => setTimerMode('ENABLE')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  timerMode === 'ENABLE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Hẹn Giờ Mở Lại</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn Thời Gian Hẹn Giờ Nhanh:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setTimerPresetMinutes(mins);
                      setCustomDateTime('');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !customDateTime && timerPresetMinutes === mins
                        ? 'bg-[#003B2B] text-white border-[#003B2B] shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mins < 60 ? `+${mins} Phút` : `+${mins / 60} Giờ`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Datetime */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hoặc Chọn Ngày & Giờ Cụ Thể:
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#003B2B] focus:bg-white"
              />
            </div>

            {/* Optional Auto Re-open if Disabling */}
            {timerMode === 'DISABLE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tự Động Mở Lại Sau Khi Tắt (Tùy chọn):
                </label>
                <select
                  value={autoReopenMinutes}
                  onChange={(e) => setAutoReopenMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#003B2B] focus:bg-white"
                >
                  <option value={0}>Không tự mở lại (Admin tự mở thủ công)</option>
                  <option value={30}>Tự mở lại sau 30 phút</option>
                  <option value={60}>Tự mở lại sau 1 giờ</option>
                  <option value={120}>Tự mở lại sau 2 giờ</option>
                  <option value={240}>Tự mở lại sau 4 giờ</option>
                  <option value={480}>Tự mở lại sau 8 giờ</option>
                </select>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý Do / Thông Báo Lên Lịch Gửi Cho Seller:
              </label>
              <textarea
                rows={2}
                value={timerReasonInput}
                onChange={(e) => setTimerReasonInput(e.target.value)}
                placeholder="VD: Bảo trì hạ tầng máy chủ định kỳ..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#003B2B]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {timerModalFeature.scheduledDisableAt || timerModalFeature.scheduledEnableAt ? (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelSchedule(timerModalFeature.id);
                    setTimerModalFeature(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                >
                  Hủy Lịch Đang Hẹn
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerModalFeature(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimerSchedule}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#003B2B] hover:bg-[#00281D] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Lưu Lịch Hẹn Giờ
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 7. Modal: Phân Quyền Riêng Doanh Nghiệp (Tenant Override) */}
      {overrideModalFeature && (
        <CustomModal
          isOpen={true}
          onClose={() => setOverrideModalFeature(null)}
          title={`Phân Quyền Doanh Nghiệp: ${overrideModalFeature.name}`}
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3 font-sans">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Bạn có thể khóa riêng tính năng này đối với một số Doanh nghiệp cụ thể khi phát sinh vi phạm quy chế hoặc gian lận mà không ảnh hưởng đến toàn sàn.
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm Doanh nghiệp theo tên, email, MST..."
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#003B2B] focus:bg-white"
              />
            </div>

            {/* Business List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredBusinessesForOverride.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Không tìm thấy doanh nghiệp nào</div>
              ) : (
                filteredBusinessesForOverride.map((biz) => {
                  const isBlocked = (overrideModalFeature.disabledBusinesses || []).includes(biz.id);
                  return (
                    <div
                      key={biz.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">{biz.name}</span>
                          {biz.taxCode && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                              MST: {biz.taxCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{biz.email}</p>
                      </div>

                      <button
                        onClick={() => handleToggleBusinessOverride(overrideModalFeature.id, biz.id, isBlocked)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          isBlocked
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {isBlocked ? 'Đang Chặn' : 'Được Phép'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setOverrideModalFeature(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#003B2B] hover:bg-[#00281D] rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 8. Modal: Áp dụng Hàng Loạt (Bulk Override) */}
      {isBulkOverrideOpen && (
        <CustomModal
          isOpen={true}
          onClose={() => setIsBulkOverrideOpen(false)}
          title="Áp Dụng Phân Quyền Hàng Loạt Cho Doanh Nghiệp"
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3 font-sans text-xs">
            <p className="text-slate-600">
              Đang chọn <strong className="text-slate-900">{selectedFeatureIds.length}</strong> tính năng. Chọn hành động và danh sách Doanh nghiệp muốn áp dụng:
            </p>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="bulkAction"
                  checked={bulkActionType === 'BLOCK'}
                  onChange={() => setBulkActionType('BLOCK')}
                  className="text-rose-600"
                />
                <span className="text-rose-700">Khóa tính năng (Block)</span>
              </label>

              <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="bulkAction"
                  checked={bulkActionType === 'UNBLOCK'}
                  onChange={() => setBulkActionType('UNBLOCK')}
                  className="text-emerald-600"
                />
                <span className="text-emerald-700">Mở lại tính năng (Unblock)</span>
              </label>
            </div>

            {/* Select Businesses */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 p-2.5 rounded-xl bg-slate-50">
              {businesses.map((biz) => {
                const isChecked = bulkSelectedBusinessIds.includes(biz.id);
                return (
                  <label
                    key={biz.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/60 hover:bg-slate-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelectedBusinessIds([...bulkSelectedBusinessIds, biz.id]);
                        } else {
                          setBulkSelectedBusinessIds(bulkSelectedBusinessIds.filter((id) => id !== biz.id));
                        }
                      }}
                      className="rounded text-[#003B2B]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800">{biz.name}</span>
                      <span className="text-slate-400 text-[11px] ml-2">({biz.email})</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">Đã chọn {bulkSelectedBusinessIds.length} Doanh nghiệp</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkOverrideOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplyBulkTenantOverrides}
                  disabled={bulkSelectedBusinessIds.length === 0}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#003B2B] hover:bg-[#00281D] disabled:opacity-50 rounded-xl shadow-2xs cursor-pointer"
                >
                  Xác Nhận Áp Dụng
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
