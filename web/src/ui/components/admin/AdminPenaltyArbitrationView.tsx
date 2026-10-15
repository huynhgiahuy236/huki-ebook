"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  sellerPenaltyService,
  type StorePenaltyProfile,
  type PenaltyRecord,
  type ViolationType,
  PENALTY_TIER_CONFIG,
} from '../../services/sellerPenaltyService';
import { realtimeSyncBus } from '../../services/realtimeSyncBus';
import { useToast } from '../../context/ToastContext';

export function AdminPenaltyArbitrationView() {
  const { showToast } = useToast();

  const [profiles, setProfiles] = useState<StorePenaltyProfile[]>([]);
  const [appeals, setAppeals] = useState<{ storeId: string; storeName: string; record: PenaltyRecord }[]>([]);
  const [activeTab, setActiveTab] = useState<'PROFILES' | 'APPEALS' | 'ISSUE_PENALTY'>('PROFILES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileForHistory, setSelectedProfileForHistory] = useState<StorePenaltyProfile | null>(null);

  // Issue Penalty Form State
  const [targetStoreId, setTargetStoreId] = useState('default-store');
  const [violationType, setViolationType] = useState<ViolationType>('COPYRIGHT_VIOLATION');
  const [pointsToApply, setPointsToApply] = useState(3);
  const [violationReason, setViolationReason] = useState('');
  const [relatedEvidence, setRelatedEvidence] = useState('');
  const [submittingPenalty, setSubmittingPenalty] = useState(false);

  // Arbitrate Appeal Note State
  const [arbitrationNotes, setArbitrationNotes] = useState<Record<string, string>>({});
  const [processingAppealId, setProcessingAppealId] = useState<string | null>(null);

  const loadData = () => {
    setProfiles(sellerPenaltyService.getAllProfiles());
    setAppeals(sellerPenaltyService.getAllAppeals());
  };

  useEffect(() => {
    loadData();

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'SELLER_PENALTY_UPDATED') {
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Top KPI Stats
  const stats = useMemo(() => {
    const totalStores = profiles.length;
    const eligibleStores = profiles.filter((p) => p.canJoinPlatformFlashSale).length;
    const barredStores = profiles.filter((p) => !p.canJoinPlatformFlashSale).length;
    const pendingAppeals = appeals.filter((a) => a.record.appealStatus === 'PENDING').length;

    return {
      totalStores,
      eligibleStores,
      barredStores,
      pendingAppeals,
    };
  }, [profiles, appeals]);

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.storeName?.toLowerCase().includes(q) ||
        p.storeId.toLowerCase().includes(q) ||
        p.tierLabel.toLowerCase().includes(q)
      );
    });
  }, [profiles, searchQuery]);

  // Filtered Appeals
  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        a.storeName.toLowerCase().includes(q) ||
        a.storeId.toLowerCase().includes(q) ||
        a.record.violationName.toLowerCase().includes(q) ||
        a.record.appealReason?.toLowerCase().includes(q)
      );
    });
  }, [appeals, searchQuery]);

  // Handlers
  const handleResetStoreQuarter = (storeId: string, storeName: string) => {
    if (!window.confirm(`Bạn có chắc muốn đặt lại điểm Sao Quả Tạ về 0 cho gian hàng "${storeName}" theo chu kỳ Quý?`)) return;
    const updated = sellerPenaltyService.resetQuarterly(storeId);
    showToast(`Đã reset điểm Sao Quả Tạ về 0 cho "${storeName}". Quyền lợi tham gia Sàn đã được khôi phục!`, 'success');
    loadData();
  };

  const handleIssuePenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationReason.trim()) {
      showToast('Vui lòng nhập lý do xử phạt vi phạm cụ thể.', 'warning');
      return;
    }

    setSubmittingPenalty(true);
    try {
      sellerPenaltyService.recordViolation(
        targetStoreId,
        violationType,
        pointsToApply,
        violationReason.trim(),
        { bookTitle: relatedEvidence.trim() || undefined }
      );

      const targetStore = profiles.find((p) => p.storeId === targetStoreId);
      showToast(`Đã ban hành quyết định phạt +${pointsToApply} điểm cho "${targetStore?.storeName || targetStoreId}"!`, 'warning');
      setViolationReason('');
      setRelatedEvidence('');
      setActiveTab('PROFILES');
      loadData();
    } catch {
      showToast('Không thể ban hành quyết định phạt.', 'error');
    } finally {
      setSubmittingPenalty(false);
    }
  };

  const handleArbitrate = (
    storeId: string,
    recordId: string,
    isApproved: boolean,
    storeName: string
  ) => {
    const adminNote = arbitrationNotes[recordId]?.trim() || (
      isApproved
        ? 'Hội đồng Sàn HuKi chấp thuận bằng chứng hợp lệ. Điểm phạt đã được thu hồi và khôi phục quyền lợi.'
        : 'Hội đồng Sàn HuKi từ chối: Bằng chứng chưa đủ căn cứ chứng minh lý do bất khả kháng.'
    );

    setProcessingAppealId(recordId);
    try {
      const res = sellerPenaltyService.arbitrateAppeal(storeId, recordId, isApproved, adminNote);
      if (res.success) {
        showToast(
          isApproved
            ? `ĐÃ CHẤP THUẬN KHIẾU NẠI CHO "${storeName}". Thu hồi điểm phạt thành công!`
            : `Đã bác bỏ khiếu nại của "${storeName}". Giữ nguyên điểm phạt.`,
          isApproved ? 'success' : 'info'
        );
        loadData();
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('Không thể xử lý kháng nghị.', 'error');
    } finally {
      setProcessingAppealId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP 4 METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Tổng Gian Hàng Giám Sát</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-0.5">{stats.totalStores}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Đủ Chuẩn Flash Sale Sàn</span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{stats.eligibleStores}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
            <span className="material-symbols-outlined text-2xl">block</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Bị Khóa Flash Sale Sàn</span>
            <div className="text-xl font-black text-rose-700 font-mono mt-0.5">{stats.barredStores}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            stats.pendingAppeals > 0 ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>
            <span className="material-symbols-outlined text-2xl">gavel</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Kháng Nghị Chờ Thẩm Định</span>
            <div className={`text-xl font-black font-mono mt-0.5 ${stats.pendingAppeals > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {stats.pendingAppeals}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('PROFILES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PROFILES'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
            <span>Sức Khỏe & Ma Trận Gian Hàng ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('APPEALS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'APPEALS'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Hàng Đợi Kháng Nghị & Trọng Tài ({appeals.length})</span>
            {stats.pendingAppeals > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-gray-900 animate-pulse">
                {stats.pendingAppeals} chờ duyệt
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ISSUE_PENALTY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ISSUE_PENALTY'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_alert</span>
            <span>+ Ban Hành Quyết Định Phạt</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <span className="material-symbols-outlined text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên shop, ID, vi phạm..."
            className="w-full text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-3 py-1.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-600 transition-all"
          />
        </div>
      </div>

      {/* 3. TAB 1: PROFILES HEALTH MONITOR */}
      {activeTab === 'PROFILES' && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700 text-lg">stars</span>
                <span>Bảng Giám Sát Sức Khỏe Gian Hàng & Điểm Sao Quả Tạ</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Chuẩn Shopee: Shop đạt từ 3 điểm Sao Quả Tạ trở lên sẽ tự động bị tước quyền đăng ký Flash Sale của Sàn trong 28 ngày.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Gian Hàng</th>
                  <th className="py-3 px-4 text-center">Điểm Sao Quả Tạ</th>
                  <th className="py-3 px-4 text-center">Hạng Chế Tài</th>
                  <th className="py-3 px-4 text-center">Tỷ Lệ Hủy (NFR)</th>
                  <th className="py-3 px-4 text-center">Tỷ Lệ Trễ (LSR)</th>
                  <th className="py-3 px-4 text-center">Đánh Giá ⭐</th>
                  <th className="py-3 px-4 text-center">Quyền Flash Sale Sàn</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {filteredProfiles.map((p) => {
                  const isGood = p.totalPoints <= 1;
                  const isWarning = p.totalPoints === 2;
                  const isBlocked = p.totalPoints >= 3;

                  return (
                    <tr key={p.storeId} className="hover:bg-purple-50/30 transition-colors">
                      {/* Gian hàng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-xs">{p.storeName || 'Chưa đặt tên'}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{p.storeId}</div>
                      </td>

                      {/* Điểm */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-black text-sm px-2.5 py-1 rounded-xl border ${
                          isGood
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isWarning
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className="material-symbols-outlined text-[15px]">stars</span>
                          <span>{p.totalPoints}</span>
                        </span>
                      </td>

                      {/* Hạng chế tài */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {p.tierLabel}
                        </span>
                      </td>

                      {/* NFR */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${p.metrics.nonFulfillmentRate >= 5 ? 'text-rose-600' : 'text-gray-700'}`}>
                          {p.metrics.nonFulfillmentRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-gray-400 block">&lt;5.0%</span>
                      </td>

                      {/* LSR */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${p.metrics.lateShipmentRate >= 10 ? 'text-rose-600' : 'text-gray-700'}`}>
                          {p.metrics.lateShipmentRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-gray-400 block">&lt;10.0%</span>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
                        ⭐ {p.metrics.rating.toFixed(1)}
                      </td>

                      {/* Quyền Flash Sale Sàn */}
                      <td className="py-3.5 px-4 text-center">
                        {p.canJoinPlatformFlashSale ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            <span>Đủ điều kiện (Tối đa {p.maxBooksPerPlatformSlot} sách)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                            <span className="material-symbols-outlined text-[14px]">block</span>
                            <span>BỊ KHÓA 28 NGÀY</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setTargetStoreId(p.storeId);
                              setActiveTab('ISSUE_PENALTY');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          >
                            + Phạt
                          </button>

                          <button
                            onClick={() => handleResetStoreQuarter(p.storeId, p.storeName || p.storeId)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            title="Làm mới điểm phạt về 0 theo chu kỳ quý"
                          >
                            Reset 0
                          </button>

                          <button
                            onClick={() => setSelectedProfileForHistory(p)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                          >
                            Lịch Sử ({p.history.length})
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
      )}

      {/* 4. TAB 2: APPEALS ARBITRATION QUEUE */}
      {activeTab === 'APPEALS' && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700 text-lg">gavel</span>
                <span>Hàng Đợi Thẩm Định Kháng Nghị Xử Phạt (Appeals Queue)</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Hội đồng Sàn HuKi thẩm định giải trình của Người Bán. Khi chấp thuận, điểm phạt sẽ được thu hồi tức thì và khôi phục quyền Flash Sale Sàn.
              </p>
            </div>
          </div>

          {filteredAppeals.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
              <p className="font-bold text-gray-600 mt-2">Hiện tại không có hồ sơ kháng nghị nào cần xử lý.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAppeals.map(({ storeId, storeName, record }) => {
                const isPending = record.appealStatus === 'PENDING';
                const isApproved = record.appealStatus === 'APPROVED';
                const isRejected = record.appealStatus === 'REJECTED';

                return (
                  <div key={record.id} className="p-5 hover:bg-gray-50/60 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-xs">{storeName}</span>
                          <span className="text-[11px] text-gray-400 font-mono">({storeId})</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {record.violationName} (+{record.points} điểm)
                          </span>
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              <span>Chờ Hội Đồng Sàn Thẩm Định</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              <span>Đã Chấp Thuận - Đã Xóa Điểm</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">cancel</span>
                              <span>Đã Bác Bỏ - Giữ Nguyên Điểm</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Lý do phạt ban đầu: <em>"{record.reason}"</em>
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-gray-400 font-mono shrink-0">
                        Ngày tạo: {new Date(record.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {/* Kháng nghị của Shop */}
                    <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/60 space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                        <span>Lời Giải Trình Của Gian Hàng:</span>
                      </div>
                      <p className="text-xs text-gray-800 italic">
                        "{record.appealReason || 'Chưa cung cấp giải trình chi tiết.'}"
                      </p>
                      {record.appealProof && (
                        <div className="text-[11px] text-gray-600 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[13px] text-blue-600">attach_file</span>
                          <span>Bằng chứng đính kèm:</span>
                          <span className="font-mono text-blue-600 underline truncate max-w-md">{record.appealProof}</span>
                        </div>
                      )}
                    </div>

                    {/* Ý kiến Admin nếu đã xử lý */}
                    {record.appealAdminNote && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700">
                        <strong>Quyết định của Sàn:</strong> {record.appealAdminNote}
                      </div>
                    )}

                    {/* Thao tác Trọng tài nếu đang Chờ duyệt */}
                    {isPending && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <input
                          type="text"
                          placeholder="Ghi chú thẩm định của Hội đồng Sàn (tùy chọn)..."
                          value={arbitrationNotes[record.id] || ''}
                          onChange={(e) => setArbitrationNotes({ ...arbitrationNotes, [record.id]: e.target.value })}
                          className="w-full text-xs rounded-xl border border-gray-300 px-3 py-1.5 focus:outline-none focus:border-purple-600"
                        />

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            disabled={processingAppealId === record.id}
                            onClick={() => handleArbitrate(storeId, record.id, true, storeName)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            <span>Chấp Thuận & Gỡ Điểm</span>
                          </button>

                          <button
                            disabled={processingAppealId === record.id}
                            onClick={() => handleArbitrate(storeId, record.id, false, storeName)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">cancel</span>
                            <span>Bác Bỏ</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: ISSUE PENALTY FORM */}
      {activeTab === 'ISSUE_PENALTY' && (
        <div className="bg-white rounded-3xl p-6 border-2 border-rose-500/30 shadow-xl max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
              <span className="material-symbols-outlined text-xl">add_alert</span>
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">
                Ban Hành Quyết Định Phạt Sao Quả Tạ
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cộng điểm phạt chính thức cho gian hàng vi phạm quy chuẩn chất lượng của sàn HuKi
              </p>
            </div>
          </div>

          <form onSubmit={handleIssuePenalty} className="space-y-4">
            {/* Chọn Shop */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Chọn Gian Hàng Vi Phạm <span className="text-red-500">*</span>
              </label>
              <select
                value={targetStoreId}
                onChange={(e) => setTargetStoreId(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white font-bold text-gray-800 focus:outline-none focus:border-rose-600"
              >
                {profiles.map((p) => (
                  <option key={p.storeId} value={p.storeId}>
                    {p.storeName} ({p.storeId}) - Đang có: {p.totalPoints} điểm
                  </option>
                ))}
              </select>
            </div>

            {/* Loại vi phạm & Điểm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Loại Vi Phạm <span className="text-red-500">*</span>
                </label>
                <select
                  value={violationType}
                  onChange={(e) => {
                    const val = e.target.value as ViolationType;
                    setViolationType(val);
                    if (val === 'COPYRIGHT_VIOLATION') setPointsToApply(3);
                    else if (val === 'PROMOTION_FRAUD') setPointsToApply(4);
                    else if (val === 'COMMUNICATION_ABUSE') setPointsToApply(2);
                    else if (val === 'NON_FULFILLMENT') setPointsToApply(2);
                    else setPointsToApply(1);
                  }}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white font-medium text-gray-800 focus:outline-none focus:border-rose-600"
                >
                  <option value="COPYRIGHT_VIOLATION">Bản quyền / Sách scan lậu (+3 điểm)</option>
                  <option value="PROMOTION_FRAUD">Gian lận giá ảo / Đơn ảo Flash Sale (+4 điểm)</option>
                  <option value="NON_FULFILLMENT">Tỷ lệ hủy đơn hàng cao NFR (+2 điểm)</option>
                  <option value="LATE_SHIPMENT">Giao hàng trễ hạn bưu tá LSR (+1 điểm)</option>
                  <option value="COMMUNICATION_ABUSE">Ngôn từ khiếm nhã khách hàng (+2 điểm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số Điểm Sao Quả Tạ Phạt <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={pointsToApply}
                  onChange={(e) => setPointsToApply(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white font-mono font-bold text-gray-800 focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            {/* Lý do xử phạt */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lý Do Phạt Vi Phạm Cụ Thể <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={violationReason}
                onChange={(e) => setViolationReason(e.target.value)}
                placeholder="Nhập chi tiết hành vi vi phạm để người bán có thể đối chiếu..."
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white focus:outline-none focus:border-rose-600"
              />
            </div>

            {/* Tên sách hoặc mã đơn */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tên Sách / Mã Đơn Hàng / Bằng Chứng (Tùy chọn)
              </label>
              <input
                type="text"
                value={relatedEvidence}
                onChange={(e) => setRelatedEvidence(e.target.value)}
                placeholder="Ví dụ: Đơn ORD-81273 hoặc Bộ sách Tâm Lý Học Ứng Dụng..."
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white focus:outline-none focus:border-rose-600"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('PROFILES')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                disabled={submittingPenalty}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                <span>{submittingPenalty ? 'Đang Ban Hành...' : 'Ban Hành Quyết Định Phạt Ngay'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. MODAL LỊCH SỬ VI PHẠM CỦA MỘT SHOP */}
      {selectedProfileForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm">
                  Lịch Sử Vi Phạm: {selectedProfileForHistory.storeName}
                </h3>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  ID: {selectedProfileForHistory.storeId} | Hiện có: {selectedProfileForHistory.totalPoints} điểm Sao Quả Tạ
                </p>
              </div>
              <button
                onClick={() => setSelectedProfileForHistory(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {selectedProfileForHistory.history.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Gian hàng này chưa ghi nhận vi phạm nào.
                </div>
              ) : (
                selectedProfileForHistory.history.map((rec) => (
                  <div key={rec.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                      <span>{rec.violationName} (+{rec.points} điểm)</span>
                      <span className="text-[10px] text-gray-400 font-mono font-normal">
                        {new Date(rec.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">{rec.reason}</p>
                    {rec.appealStatus && rec.appealStatus !== 'NONE' && (
                      <div className="text-[10px] text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-200 mt-1">
                        <strong>Trạng thái khiếu nại:</strong> {rec.appealStatus}
                        {rec.appealReason && <div>- Giải trình: "{rec.appealReason}"</div>}
                        {rec.appealAdminNote && <div>- Phản hồi Sàn: "{rec.appealAdminNote}"</div>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 text-right shrink-0">
              <button
                onClick={() => setSelectedProfileForHistory(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 text-white hover:bg-gray-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
