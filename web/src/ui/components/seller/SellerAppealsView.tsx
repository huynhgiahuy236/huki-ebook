"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { businessApi, StoreData } from '@/ui/api/businessApi';
import {
  AppealEvidenceMetadata,
  Sanction,
  SanctionLevel,
  SanctionStatus,
  sanctionsApi,
} from '@/ui/api/sanctionsApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

export function SellerAppealsView() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSanctions, setLoadingSanctions] = useState(false);

  // Appeal Modal State
  const [activeSanctionForAppeal, setActiveSanctionForAppeal] = useState<Sanction | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<AppealEvidenceMetadata[]>([]);
  const [externalUrls, setExternalUrls] = useState<string[]>([]);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  // Load stores for current business
  const loadStores = useCallback(async () => {
    setLoading(true);
    let currentBizId = user?.business?.id || activeBusinessId;
    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId?.(currentBizId);
        }
      } catch (err) {
        console.warn('Could not auto-fetch businessId', err);
      }
    }

    if (currentBizId) {
      const res = await businessApi.getMyStores(currentBizId);
      if (res.success && res.data) {
        const storeList = res.data as StoreData[];
        setStores(storeList);
        if (storeList.length > 0 && !selectedStoreId) {
          setSelectedStoreId(storeList[0].id);
        }
      }
    }
    setLoading(false);
  }, [user, activeBusinessId, setActiveBusinessId, selectedStoreId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Load sanctions when selected store changes
  const loadSanctions = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoadingSanctions(true);
    const res = await sanctionsApi.getSanctionsByStore(storeId);
    if (res.success && res.data) {
      setSanctions(res.data);
    } else {
      showToast?.(res.error?.message || 'Không thể tải danh sách quyết định xử phạt', 'error');
    }
    setLoadingSanctions(false);
  }, [showToast]);

  useEffect(() => {
    if (selectedStoreId) {
      loadSanctions(selectedStoreId);
    }
  }, [selectedStoreId, loadSanctions]);

  // Derive effectively active sanction
  const activeSanction = useMemo(() => {
    const now = new Date();
    return sanctions.find((s) => {
      const isStatusActive = s.status === 'ACTIVE' || s.status === 'APPEALED';
      const isNotExpired = !s.expiresAt || new Date(s.expiresAt) > now;
      return isStatusActive && isNotExpired;
    });
  }, [sanctions]);

  // Check 7-day appeal eligibility
  const checkAppealEligibility = (sanction: Sanction) => {
    if (sanction.status === 'LIFTED') {
      return { eligible: false, reason: 'Quyết định xử phạt đã được gỡ bỏ' };
    }
    if (sanction.appeal) {
      return { eligible: false, reason: 'Kháng nghị đã được nộp' };
    }
    const issuedTime = new Date(sanction.issuedAt).getTime();
    const nowTime = Date.now();
    const windowDeadline = issuedTime + 7 * 24 * 60 * 60 * 1000; // 168 hours
    const remainingMs = windowDeadline - nowTime;

    if (remainingMs <= 0) {
      return { eligible: false, reason: 'Hết hạn nộp kháng nghị (quá 7 ngày)' };
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    return { eligible: true, remainingHours };
  };

  // Upload Evidence File handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSanctionForAppeal) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Dung lượng tệp vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      const res = await sanctionsApi.uploadEvidence(activeSanctionForAppeal.id, file);
      if (res.success && res.data) {
        setUploadedFiles((prev) => [...prev, res.data!]);
        showToast?.('Tải lên tệp bằng chứng thành công', 'success');
      } else {
        showToast?.(res.error?.message || 'Tải lên bằng chứng thất bại', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi khi tải tệp lên hệ thống', 'error');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeUploadedFile = (key: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.key !== key));
  };

  const addExternalUrl = () => {
    if (!newUrlInput.trim()) return;
    try {
      new URL(newUrlInput.trim());
      setExternalUrls((prev) => [...prev, newUrlInput.trim()]);
      setNewUrlInput('');
    } catch {
      showToast?.('Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng http/https)', 'error');
    }
  };

  const removeExternalUrl = (index: number) => {
    setExternalUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenAppealModal = (sanction: Sanction) => {
    setActiveSanctionForAppeal(sanction);
    setAppealReason('');
    setUploadedFiles([]);
    setExternalUrls([]);
    setNewUrlInput('');
  };

  const handleCloseAppealModal = () => {
    setActiveSanctionForAppeal(null);
    setAppealReason('');
    setUploadedFiles([]);
    setExternalUrls([]);
    setNewUrlInput('');
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSanctionForAppeal) return;

    if (!appealReason.trim()) {
      showToast?.('Vui lòng nhập nội dung giải trình lý do kháng nghị', 'error');
      return;
    }

    setIsSubmittingAppeal(true);
    try {
      const evidencePayload = {
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        urls: externalUrls.length > 0 ? externalUrls : undefined,
      };

      const res = await sanctionsApi.submitAppeal(activeSanctionForAppeal.id, {
        reason: appealReason.trim(),
        evidence: evidencePayload,
      });

      if (res.success) {
        showToast?.('Hồ sơ kháng nghị đã được gửi thành công. Vui lòng chờ xem xét trong 48 giờ.', 'success');
        handleCloseAppealModal();
        if (selectedStoreId) {
          loadSanctions(selectedStoreId);
        }
      } else {
        showToast?.(res.error?.message || 'Không thể gửi hồ sơ kháng nghị', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi gửi hồ sơ kháng nghị', 'error');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  // Helper formatting badges
  const renderStatusBadge = (sanction: Sanction) => {
    const isExpired = sanction.expiresAt && new Date(sanction.expiresAt) <= new Date();

    if (sanction.status === 'LIFTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Đã gỡ bỏ
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5"></span>
          Hết hiệu lực
        </span>
      );
    }

    if (sanction.status === 'APPEALED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
          Đang khiếu nại
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
        Đang áp dụng
      </span>
    );
  };

  const renderLevelBadge = (level: SanctionLevel) => {
    switch (level) {
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
            CẢNH BÁO
          </span>
        );
      case 'PROBATION':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
            QUẢN CHẾ (1 THÁNG)
          </span>
        );
      case 'SUSPENSION':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">
            TẠM ĐÌNH CHỈ
          </span>
        );
      case 'BAN':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900">
            CẤM VĨNH VIỄN
          </span>
        );
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-zinc-100">{level}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header & Store Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Trung Tâm Xử Lý Vi Phạm & Kháng Nghị
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Theo dõi tình trạng tuân thủ, quyết định xử phạt và thực hiện quyền khiếu nại chính thức của cửa hàng.
          </p>
        </div>

        {stores.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 whitespace-nowrap">Chọn cửa hàng:</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Sanction Alert Banner */}
      {activeSanction && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-rose-900 dark:text-rose-200 text-base">
                    Cửa hàng đang chịu quyết định xử phạt
                  </span>
                  {renderLevelBadge(activeSanction.level)}
                  {renderStatusBadge(activeSanction)}
                </div>
                <p className="text-sm text-rose-800 dark:text-rose-300">
                  <span className="font-semibold">Lý do:</span> {activeSanction.reason}
                </p>
                <div className="text-xs text-rose-700 dark:text-rose-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>Ban hành: {new Date(activeSanction.issuedAt).toLocaleDateString('vi-VN')}</span>
                  {activeSanction.expiresAt && (
                    <span>Hết hạn: {new Date(activeSanction.expiresAt).toLocaleDateString('vi-VN')}</span>
                  )}
                  {activeSanction.violationCode && <span>Mã vi phạm: {activeSanction.violationCode}</span>}
                </div>

                {/* Scope of restrictions based on matrix */}
                <div className="mt-2.5 p-2.5 bg-white/70 dark:bg-zinc-900/50 rounded-md border border-rose-200/60 dark:border-rose-900/30 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">Phạm vi hạn chế áp dụng:</div>
                  {activeSanction.level === 'WARNING' && <div>• Cảnh báo tuân thủ (Không hạn chế tính năng kinh doanh).</div>}
                  {activeSanction.level === 'PROBATION' && <div>• Tạm khóa tiếp nhận đơn hàng mới (Vẫn cho phép chỉnh sửa danh mục và rút tiền hợp lệ).</div>}
                  {activeSanction.level === 'SUSPENSION' && <div>• Khóa toàn bộ: Tạo/chỉnh sửa sách, nhận đơn hàng mới và yêu cầu rút tiền.</div>}
                  {activeSanction.level === 'BAN' && <div>• Khóa vĩnh viễn toàn bộ tính năng bán hàng và thanh toán.</div>}
                </div>
              </div>
            </div>

            {/* Appeal CTA */}
            <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2 shrink-0">
              {(() => {
                const eligibility = checkAppealEligibility(activeSanction);
                if (activeSanction.status === 'APPEALED') {
                  return (
                    <div className="px-3 py-2 bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs rounded-lg text-center font-medium">
                      Hồ sơ kháng nghị đang được xử lý (SLA 48h)
                    </div>
                  );
                }
                if (eligibility.eligible) {
                  return (
                    <button
                      onClick={() => handleOpenAppealModal(activeSanction)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Gửi kháng nghị ({eligibility.remainingHours}h còn lại)
                    </button>
                  );
                }
                return (
                  <span className="text-xs text-zinc-500 italic">
                    {eligibility.reason}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sanctions History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
            Lịch Sử Xử Phạt Của Cửa Hàng
          </h2>
          <span className="text-xs text-zinc-500">
            Tổng cộng: {sanctions.length} quyết định
          </span>
        </div>

        {loadingSanctions ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Đang tải lịch sử xử phạt...</div>
        ) : sanctions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Cửa hàng hoàn toàn tuân thủ</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Không có quyết định xử phạt hay vi phạm nào được ghi nhận cho cửa hàng này.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3">Mức độ</th>
                  <th className="px-5 py-3">Lý do & Mã vi phạm</th>
                  <th className="px-5 py-3">Thời gian ban hành</th>
                  <th className="px-5 py-3">Thời hạn</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Kháng nghị</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {sanctions.map((s) => {
                  const eligibility = checkAppealEligibility(s);
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">{renderLevelBadge(s.level)}</td>
                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.reason}</div>
                        {s.violationCode && (
                          <div className="text-xs text-zinc-500 mt-0.5">Mã: {s.violationCode}</div>
                        )}
                        {s.liftReason && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Lý do gỡ: {s.liftReason}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">
                        {new Date(s.issuedAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">
                        {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">{renderStatusBadge(s)}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {s.appeal ? (
                          <div>
                            <span className={`font-semibold ${
                              s.appeal.decision === 'APPROVED' ? 'text-emerald-600' :
                              s.appeal.decision === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                            }`}>
                              {s.appeal.decision === 'APPROVED' ? 'Đã chấp thuận' :
                               s.appeal.decision === 'REJECTED' ? 'Bác bỏ' : 'Chờ duyệt'}
                            </span>
                            <div className="text-[11px] text-zinc-400">
                              {new Date(s.appeal.submittedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Chưa kháng nghị</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        {eligibility.eligible ? (
                          <button
                            onClick={() => handleOpenAppealModal(s)}
                            className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                          >
                            Kháng nghị
                          </button>
                        ) : s.appeal ? (
                          <span className="text-zinc-400">Đã nộp</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appeal Submission Modal */}
      {activeSanctionForAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Nộp Hồ Sơ Kháng Nghị Xử Phạt
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Quyết định: {renderLevelBadge(activeSanctionForAppeal.level)} · Ban hành {new Date(activeSanctionForAppeal.issuedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <button
                onClick={handleCloseAppealModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              {/* Context Summary */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                <div><span className="font-semibold text-zinc-900 dark:text-zinc-100">Lý do xử phạt:</span> {activeSanctionForAppeal.reason}</div>
                {activeSanctionForAppeal.violationCode && (
                  <div><span className="font-semibold text-zinc-900 dark:text-zinc-100">Mã vi phạm:</span> {activeSanctionForAppeal.violationCode}</div>
                )}
                <div className="text-amber-600 dark:text-amber-400 pt-1 font-medium">
                  Lưu ý: Mỗi quyết định xử phạt chỉ được gửi kháng nghị 01 lần duy nhất trong vòng 7 ngày (168 giờ).
                </div>
              </div>

              {/* Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Nội dung giải trình & Căn cứ kháng nghị <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Trình bày chi tiết lý do bạn cho rằng quyết định xử phạt chưa chính xác, kèm các chứng từ chứng minh quyền phân phối / tuân thủ chính sách..."
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400"
                />
              </div>

              {/* Persistent Evidence File Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Tải lên tệp bằng chứng (Ảnh/PDF, tối đa 5MB)</span>
                  <span className="text-[11px] text-zinc-400 font-normal">Hỗ trợ JPG, PNG, WEBP, PDF</span>
                </label>
                
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {isUploadingFile ? 'Đang tải lên...' : 'Chọn tệp đính kèm'}
                    <input
                      type="file"
                      disabled={isUploadingFile}
                      onChange={handleFileUpload}
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden"
                    />
                  </label>
                  {isUploadingFile && <span className="text-xs text-indigo-600 animate-pulse">Đang xử lý lưu trữ R2...</span>}
                </div>

                {/* Uploaded File Chips */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-700 dark:text-indigo-300"
                      >
                        <span className="truncate max-w-[180px]">{file.filename}</span>
                        <span className="text-[10px] text-zinc-400">({Math.round(file.size / 1024)}KB)</span>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(file.key)}
                          className="text-indigo-400 hover:text-indigo-600 font-bold ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supplementary External Links */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Đường dẫn liên kết bổ sung (tùy chọn)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addExternalUrl}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-medium rounded-lg"
                  >
                    Thêm link
                  </button>
                </div>
                {externalUrls.length > 0 && (
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                    {externalUrls.map((url, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 px-2 py-1 rounded">
                        <span className="truncate max-w-[340px] font-mono text-[11px]">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeExternalUrl(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold"
                        >
                          Xóa
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseAppealModal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 rounded-lg"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppeal || isUploadingFile || !appealReason.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSubmittingAppeal ? 'Đang gửi...' : 'Nộp hồ sơ kháng nghị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
