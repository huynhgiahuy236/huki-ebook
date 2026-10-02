"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { featureFlagsService, SellerFeature } from '@/ui/services/featureFlagsService';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { useDebounce } from '@/ui/utils/useDebounce';
import CustomModal from '@/ui/components/common/CustomModal';

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  all: { label: 'Tất Cả Tính Năng', icon: 'apps', color: 'bg-slate-100 text-slate-700' },
  marketing: { label: 'Marketing & Khuyến Mãi', icon: 'campaign', color: 'bg-amber-100 text-amber-800' },
  finance: { label: 'Tài Chính & Escrow', icon: 'account_balance_wallet', color: 'bg-emerald-100 text-emerald-800' },
  inventory: { label: 'Kho Hàng & DRM', icon: 'auto_stories', color: 'bg-blue-100 text-blue-800' },
  operations: { label: 'Vận Hành & Đổi Trả', icon: 'settings_suggest', color: 'bg-purple-100 text-purple-800' },
  customer: { label: 'CSKH & Tương Tác', icon: 'chat', color: 'bg-rose-100 text-rose-800' },
};

export default function AdminSellerFeaturesView() {
  const [features, setFeatures] = useState<SellerFeature[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Modal States
  const [maintenanceModalFeature, setMaintenanceModalFeature] = useState<SellerFeature | null>(null);
  const [maintenanceReasonInput, setMaintenanceReasonInput] = useState('');

  const [overrideModalFeature, setOverrideModalFeature] = useState<SellerFeature | null>(null);
  const [overrideSearch, setOverrideSearch] = useState('');
  const debouncedOverrideSearch = useDebounce(overrideSearch, 200);

  // Bulk feature action modal
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [isBulkOverrideOpen, setIsBulkOverrideOpen] = useState(false);
  const [bulkSelectedBusinessIds, setBulkSelectedBusinessIds] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'BLOCK' | 'UNBLOCK'>('BLOCK');

  // Load features & businesses
  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      setFeatures(featureFlagsService.getAllFeatures());
    };
    window.addEventListener('huki_feature_flags_updated', handleUpdate);
    return () => window.removeEventListener('huki_feature_flags_updated', handleUpdate);
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
    const totalRestrictedBusinesses = new Set(features.flatMap((f) => f.disabledBusinesses || [])).size;
    return { total, active, maintenance, totalRestrictedBusinesses };
  }, [features]);

  // Toggle Global Feature Switch
  const handleToggleGlobal = (feature: SellerFeature) => {
    if (feature.isEnabledGlobally) {
      // Prompt for maintenance reason
      setMaintenanceModalFeature(feature);
      setMaintenanceReasonInput(feature.maintenanceReason || 'Đang bảo trì nâng cấp hệ thống');
    } else {
      // Turn back ON
      featureFlagsService.toggleGlobalFeature(feature.id, true, '');
      setFeatures(featureFlagsService.getAllFeatures());
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
    setMaintenanceModalFeature(null);
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
    <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-5 lg:px-6 py-4 flex flex-col gap-4">
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003B2B] text-2xl">toggle_on</span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Tính Năng & Phân Quyền Seller</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát bật/tắt tính năng toàn hệ thống (Global Kill Switch) hoặc khóa chủ đích theo từng Doanh nghiệp (Tenant Override) khi phát sinh sự cố.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedFeatureIds.length > 0 && (
            <button
              onClick={() => setIsBulkOverrideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003B2B] text-white rounded-xl text-xs font-bold hover:bg-[#00281D] transition-colors shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">domain_disabled</span>
              <span>Áp dụng {selectedFeatureIds.length} tính năng cho Doanh Nghiệp</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Tải lại dữ liệu"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="text-[11px] font-semibold text-slate-500">Đang Hoạt Động (ON)</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
            <span className="material-symbols-outlined text-xl">build_circle</span>
          </div>
          <div>
            <div className="text-lg font-black text-rose-700 leading-tight">{stats.maintenance}</div>
            <div className="text-[11px] font-semibold text-slate-500">Bảo Trì Hệ Thống (OFF)</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <span className="material-symbols-outlined text-xl">shield_person</span>
          </div>
          <div>
            <div className="text-lg font-black text-amber-700 leading-tight">{stats.totalRestrictedBusinesses}</div>
            <div className="text-[11px] font-semibold text-slate-500">DN Bị Giới Hạn Riêng</div>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {Object.entries(CATEGORY_MAP).map(([key, info]) => {
            const isActive = activeCategory === key;
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
              </button>
            );
          })}
        </div>

        {/* Debounced Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm tên tính năng, mã, mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Features Grid / List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl text-[#003B2B]">progress_activity</span>
          <p className="text-xs font-semibold mt-2">Đang tải cấu hình tính năng...</p>
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

            return (
              <div
                key={feature.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between shadow-2xs ${
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

                {/* Footer Controls */}
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
                      {disabledCount} Doanh nghiệp
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setOverrideModalFeature(feature);
                      setOverrideSearch('');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#003B2B] bg-[#003B2B]/5 hover:bg-[#003B2B]/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">tune</span>
                    <span>Phân quyền DN</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Nhập lý do bảo trì khi TẮT tính năng */}
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
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmMaintenance}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs"
              >
                Xác Nhận Ngắt Tính Năng
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 6. Modal: Cấu hình Khóa / Mở riêng cho từng Doanh nghiệp (Tenant Override) */}
      {overrideModalFeature && (
        <CustomModal
          isOpen={true}
          onClose={() => setOverrideModalFeature(null)}
          title={`Phân Quyền Tính Năng: ${overrideModalFeature.name}`}
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3.5 max-h-[75vh] overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Chặn hoặc cấp quyền sử dụng tính năng <strong>{overrideModalFeature.name}</strong> cho từng doanh nghiệp cụ thể.
              </p>
              <span className="text-xs font-bold text-slate-700">
                {(overrideModalFeature.disabledBusinesses || []).length} / {businesses.length} DN bị chặn
              </span>
            </div>

            {/* Search Business in Modal */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm doanh nghiệp theo tên, MST, email..."
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all"
              />
            </div>

            {/* Businesses List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredBusinessesForOverride.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Không tìm thấy doanh nghiệp nào</div>
              ) : (
                filteredBusinessesForOverride.map((biz) => {
                  const isBlocked = (overrideModalFeature.disabledBusinesses || []).includes(biz.id);
                  return (
                    <div
                      key={biz.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isBlocked ? 'bg-rose-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isBlocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {biz.name ? biz.name.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{biz.name}</span>
                            {biz.status === 'SUSPENDED' && (
                              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                                Bị Khóa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>MST: {biz.taxCode || 'Chưa cập nhật'}</span>
                            <span>•</span>
                            <span>{biz.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleToggleBusinessOverride(overrideModalFeature.id, biz.id, isBlocked)
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isBlocked
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isBlocked ? 'Đang Chặn (Mở lại)' : 'Cho Phép (Chặn)'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setOverrideModalFeature(null)}
                className="px-4 py-1.5 text-xs font-bold bg-[#003B2B] text-white rounded-xl hover:bg-[#00281D]"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* 7. Modal: Bulk Apply Tenant Overrides across Multiple Features */}
      {isBulkOverrideOpen && (
        <CustomModal
          isOpen={true}
          onClose={() => setIsBulkOverrideOpen(false)}
          title="Thiết Lập Khóa / Mở Đồng Loạt Cho Nhiều Doanh Nghiệp"
          size="lg"
        >
          <div className="p-4 flex flex-col gap-3.5 max-h-[75vh] overflow-hidden">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800">
                Đang chọn {selectedFeatureIds.length} tính năng:
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedFeatureIds.map((id) => (
                  <span key={id} className="px-2 py-0.5 bg-[#003B2B] text-white rounded text-[10px] font-bold font-mono">
                    {id}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Tác vụ đồng loạt:</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkActionType('BLOCK')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    bulkActionType === 'BLOCK'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Khóa / Chặn tính năng
                </button>
                <button
                  type="button"
                  onClick={() => setBulkActionType('UNBLOCK')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    bulkActionType === 'UNBLOCK'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Mở khóa / Cho phép
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Chọn các Doanh Nghiệp áp dụng ({bulkSelectedBusinessIds.length} đã chọn):</span>
              <button
                type="button"
                onClick={() => {
                  if (bulkSelectedBusinessIds.length === businesses.length) {
                    setBulkSelectedBusinessIds([]);
                  } else {
                    setBulkSelectedBusinessIds(businesses.map((b) => b.id));
                  }
                }}
                className="text-[#003B2B] hover:underline"
              >
                {bulkSelectedBusinessIds.length === businesses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-200 rounded-xl divide-y divide-slate-100">
              {businesses.map((biz) => {
                const checked = bulkSelectedBusinessIds.includes(biz.id);
                return (
                  <label
                    key={biz.id}
                    className="p-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelectedBusinessIds([...bulkSelectedBusinessIds, biz.id]);
                        } else {
                          setBulkSelectedBusinessIds(bulkSelectedBusinessIds.filter((id) => id !== biz.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#003B2B] focus:ring-[#003B2B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{biz.name}</div>
                      <div className="text-[10px] text-slate-400">MST: {biz.taxCode || 'N/A'} • {biz.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsBulkOverrideOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyBulkTenantOverrides}
                disabled={bulkSelectedBusinessIds.length === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#003B2B] hover:bg-[#00281D] disabled:opacity-50 rounded-xl transition-colors shadow-2xs"
              >
                Áp Dụng Cho {bulkSelectedBusinessIds.length} Doanh Nghiệp
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
