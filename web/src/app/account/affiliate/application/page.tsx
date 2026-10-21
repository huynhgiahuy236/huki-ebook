'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi, type MyProfileResponse } from '@/lib/affiliate/affiliateApi';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import AffiliateKycModal from '@/ui/components/affiliate/AffiliateKycModal';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import type { PartnerStatus } from '@/types/affiliate';

export default function AffiliateApplicationStatusPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Previous status ref to detect instant transition from PENDING_REVIEW -> ACTIVE
  const prevStatusRef = useRef<PartnerStatus | null>(null);

  // Resubmit modal state for REQUEST_CHANGES
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitBio, setResubmitBio] = useState('');
  const [resubmitDesc, setResubmitDesc] = useState('');
  const [resubmitChannels, setResubmitChannels] = useState<any[]>([]);
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Active Partner Data State
  const [kycData, setKycData] = useState<any>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<BookData[]>([]);
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [customTargetUrl, setCustomTargetUrl] = useState('');
  const [customCampaign, setCustomCampaign] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [createdLinkResult, setCreatedLinkResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{
    url: string;
    shortCode: string;
    originalUrl?: string;
  } | null>(null);

  // Fetch KYC and Partner Tools Data
  const loadActivePartnerData = useCallback(async () => {
    try {
      const [kycRes, booksRes, linksRes] = await Promise.allSettled([
        affiliateApi.getMyKycStatus(),
        affiliateApi.getAffiliateCatalog({ limit: 6 }),
        affiliateApi.listMyAffiliateLinks({ limit: 6 }),
      ]);

      if (kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data) {
        setKycData(kycRes.value.data);
      }

      if (booksRes.status === 'fulfilled' && booksRes.value.success && booksRes.value.data) {
        setFeaturedBooks((booksRes.value.data.items as any[]) || []);
      }

      if (linksRes.status === 'fulfilled' && linksRes.value.success && linksRes.value.data) {
        setMyLinks(linksRes.value.data.items || []);
      }
    } catch {
      // Ignore background load errors
    }
  }, []);

  const fetchProfile = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    setErrorMsg(null);
    setIsUnauthorized(false);
    try {
      const res = await affiliateApi.getMyProfile();
      if (res.success && res.data) {
        const newStatus = res.data.profile?.status || null;

        // Detect real-time approval
        if (
          prevStatusRef.current === 'PENDING_REVIEW' &&
          newStatus === 'ACTIVE'
        ) {
          showToast('Chúc mừng! Hồ sơ Đối tác Tiếp thị của bạn đã được Ban Quản Trị phê duyệt!', 'success');
        }
        prevStatusRef.current = newStatus;

        setProfileData(res.data);
        if (res.data.profile) {
          setResubmitBio(res.data.profile.bio || '');
          setResubmitDesc(res.data.profile.promotionDescription || '');
          setResubmitChannels(res.data.profile.channels || []);

          if (res.data.profile.status === 'ACTIVE') {
            loadActivePartnerData();
          }
        }
      } else {
        const isAuthError =
          res.error?.code === 'UNAUTHORIZED' ||
          res.error?.statusCode === 401 ||
          res.error?.message?.toLowerCase().includes('unauthorized') ||
          res.error?.message?.includes('401');

        if (isAuthError) {
          setIsUnauthorized(true);
        } else {
          setErrorMsg(res.error?.message || 'Không thể tải thông tin hồ sơ.');
        }
      }
    } catch {
      if (!isPolling) setErrorMsg('Lỗi kết nối máy chủ khi tra cứu hồ sơ.');
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [loadActivePartnerData, showToast]);

  useEffect(() => {
    fetchProfile();

    // Event-driven real-time sync across tabs/windows (zero jitter, no polling)
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'AFFILIATE_STATUS_CHANGED' ||
        msg.type === 'AFFILIATE_APPLICATION_UPDATED'
      ) {
        fetchProfile(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchProfile]);

  // Copy helper
  const handleCopy = (text: string, key: string, label: string = 'đường dẫn') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`, 'success');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Quick link creation from URL
  const handleCreateCustomLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTargetUrl.trim()) {
      showToast('Vui lòng nhập đường dẫn trang sách cần tiếp thị.', 'warning');
      return;
    }

    setIsCreatingLink(true);
    try {
      const res = await affiliateApi.createAffiliateLink({
        targetUrl: customTargetUrl.trim(),
        campaignName: customCampaign.trim() || 'CustomShare',
      });

      if (res.success && res.data) {
        setCreatedLinkResult(res.data);
        showToast('Tạo liên kết tiếp thị thành công!', 'success');
        setCustomTargetUrl('');
        setCustomCampaign('');
        loadActivePartnerData();
      } else {
        showToast(res.error?.message || 'Không thể tạo liên kết tiếp thị.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tạo liên kết tiếp thị.', 'error');
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Quick link creation directly from a Book card
  const handleCreateBookLink = async (book: any) => {
    const targetUrl = `/book/${book.slug || book.id || book.bookId}`;
    try {
      const res = await affiliateApi.createAffiliateLink({
        targetUrl,
        targetBookId: book.id || book.bookId,
        campaignName: `Book_${(book.title || 'aff').slice(0, 15)}`,
      });

      if (res.success && res.data) {
        setCreatedLinkResult(res.data);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
        const fullShortUrl = `${origin}${res.data.shortUrl}`;
        handleCopy(fullShortUrl, `book_${book.id || book.bookId}`, `link tiếp thị cho sách "${book.title}"`);
        setQrModalData({
          url: fullShortUrl,
          shortCode: res.data.shortCode,
          originalUrl: targetUrl,
        });
        loadActivePartnerData();
      } else {
        showToast(res.error?.message || 'Không thể tạo liên kết cho cuốn sách này.', 'error');
      }
    } catch {
      showToast('Lỗi khi tạo liên kết cho sách.', 'error');
    }
  };

  const handleResubmit = async () => {
    if (!profileData?.profile) return;
    if (resubmitBio.trim().length < 30) {
      showToast('Kinh nghiệm tiếp thị phải từ 30 ký tự trở lên.', 'warning');
      return;
    }

    setIsResubmitting(true);
    try {
      const res = await affiliateApi.resubmitApplication({
        bio: resubmitBio.trim(),
        promotionDescription: resubmitDesc.trim(),
        channels: resubmitChannels,
      });

      if (res.success) {
        showToast('Nộp lại hồ sơ thành công! Ban quản trị sẽ rà soát lại.', 'success');
        realtimeSyncBus.publish('AFFILIATE_APPLICATION_UPDATED', {
          profileId: profileData.profile.id,
        });
        setIsResubmitOpen(false);
        fetchProfile();
      } else {
        showToast(res.error?.message || 'Không thể nộp lại hồ sơ', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi nộp lại hồ sơ.', 'error');
    } finally {
      setIsResubmitting(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';

  return (
    <AccountLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href="/affiliate" className="hover:text-emerald-700">
                Tiếp Thị Liên Kết
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-semibold">Trạng Thái Hồ Sơ &amp; Quản Lý CTV</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[26px]">
                verified_user
              </span>
              <span>Cổng Thông Tin Đối Tác Tiếp Thị HuKi</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchProfile()}
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Đồng bộ</span>
            </button>
            <Link
              href="/affiliate"
              className="text-xs text-gray-500 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Quy chế</span>
            </Link>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <span className="material-symbols-outlined text-[36px] text-emerald-700 animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-gray-500">Đang tra cứu dữ liệu hồ sơ đối tác từ máy chủ...</p>
          </div>
        )}

        {/* Unauthorized State */}
        {!loading && isUnauthorized && (
          <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-gray-900">Yêu Cầu Đăng Nhập</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Vui lòng đăng nhập vào tài khoản HuKi của bạn để tra cứu tiến độ xét duyệt hoặc quản lý link tiếp thị.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Đăng Nhập Ngay</span>
              </Link>
              <Link
                href="/affiliate"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
              >
                Tìm Hiểu Chương Trình
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isUnauthorized && errorMsg && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center max-w-xl mx-auto space-y-3">
            <span className="material-symbols-outlined text-[36px] text-red-600">error</span>
            <h2 className="text-sm font-bold text-red-900">{errorMsg}</h2>
            <button
              type="button"
              onClick={() => fetchProfile()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Case 1: No Profile Registered */}
        {!loading && !isUnauthorized && !errorMsg && (!profileData?.hasProfile || !profileData.profile) && (
          <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <span className="material-symbols-outlined text-[32px]">assignment_ind</span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-gray-900">
                Bạn Chưa Đăng Ký Đối Tác Tiếp Thị
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
                Hãy tham gia mạng lưới tiếp thị sách bản quyền cùng HuKi để nhận hoa hồng hấp dẫn lên đến 15% trên mỗi đơn hàng thành công.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                href="/account/affiliate/register"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                <span>Đăng Ký Đối Tác Ngay</span>
              </Link>
              <Link
                href="/affiliate"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
              >
                Tìm Hiểu Chương Trình
              </Link>
            </div>
          </div>
        )}

        {/* Case 2: PENDING_REVIEW (Real-time sync banner) */}
        {!loading && !errorMsg && profileData?.profile?.status === 'PENDING_REVIEW' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px] animate-spin">
                      progress_activity
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Hồ Sơ Đang Trong Hàng Đợi Xét Duyệt
                    </h2>
                    <p className="text-xs text-gray-500">
                      Mã đối tác dự kiến:{' '}
                      <strong className="font-mono text-emerald-700 font-bold">
                        {profileData.profile.affiliateCode}
                      </strong>{' '}
                      • Nộp lúc: {new Date(profileData.profile.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Đang kết nối Realtime</span>
                  </span>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    SLA: 24h - 48h
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span>1. Đã Tiếp Nhận Hồ Sơ</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Hệ thống đã ghi nhận thông tin định danh và xếp hồ sơ vào hàng đợi.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 animate-spin">
                      hourglass_top
                    </span>
                    <span>2. Đang Thẩm Định Kênh</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Ban Quản Trị đang duyệt kênh truyền thông ({profileData.profile.channels?.length || 1} kênh).
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-gray-400">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px]">radio_button_unchecked</span>
                    <span>3. Kích Hoạt &amp; Tạo Link</span>
                  </div>
                  <p className="text-[11px]">
                    Sau khi duyệt, mã CTV và công cụ tạo link tiếp thị sẽ tự động mở ngay trên màn hình này.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0">
                  sensors
                </span>
                <span>
                  Trang này được trang bị cơ chế tự động đồng bộ thời gian thực. Ngay khi Ban Quản Trị duyệt hồ sơ trên hệ thống, màn hình của bạn sẽ tự động chuyển sang trạng thái <strong>Đã Kích Hoạt</strong> mà không cần tải lại trang.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Case 3: REQUEST_CHANGES */}
        {!loading && !errorMsg && profileData?.profile?.status === 'REQUEST_CHANGES' && (
          <div className="p-6 rounded-2xl bg-white border border-purple-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[26px]">edit_note</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Yêu Cầu Bổ Sung / Chỉnh Sửa Hồ Sơ
                  </h2>
                  <p className="text-xs text-gray-500">
                    Mã hồ sơ: <span className="font-mono">{profileData.profile.affiliateCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResubmitOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Chỉnh Sửa &amp; Nộp Lại
              </button>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>Nội dung yêu cầu chỉnh sửa từ Ban Quản Trị:</span>
              </div>
              <p className="text-xs text-purple-950 font-medium leading-relaxed">
                {profileData.profile.rejectionReason || 'Vui lòng kiểm tra lại liên kết kênh truyền thông hoặc cập nhật thêm kinh nghiệm tiếp thị.'}
              </p>
            </div>
          </div>
        )}

        {/* Case 4: REJECTED */}
        {!loading && !errorMsg && profileData?.profile?.status === 'REJECTED' && (
          <div className="p-6 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">cancel</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Hồ Sơ Đăng Ký Chưa Được Phê Duyệt
                </h2>
                <p className="text-xs text-gray-500">
                  Mã hồ sơ: <span className="font-mono">{profileData.profile.affiliateCode}</span>
                </p>
              </div>
            </div>

            {profileData.profile.rejectionReason && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-xs font-bold text-rose-900 block">Lý do từ Ban Quản Trị:</span>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {profileData.profile.rejectionReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Case 5: ACTIVE PARTNER - COMPLETE & INTUITIVE WORKSPACE */}
        {/* ======================================================== */}
        {!loading && !errorMsg && profileData?.profile?.status === 'ACTIVE' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Header Banner & Actions */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md relative overflow-hidden space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px] text-emerald-200">
                      verified
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">Đối Tác Tiếp Thị Chính Thức</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-extrabold uppercase tracking-wider">
                        Đang Hoạt Động
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-emerald-100">Mã CTV của bạn:</span>
                      <strong className="font-mono bg-white/15 px-2 py-0.5 rounded-md text-emerald-100 text-xs font-bold tracking-wider">
                        {profileData?.profile?.affiliateCode}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleCopy(profileData?.profile?.affiliateCode || '', 'ctv_code', 'Mã CTV')}
                        className="text-xs text-emerald-200 hover:text-white underline cursor-pointer flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        <span>{copiedKey === 'ctv_code' ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/account/affiliate/dashboard"
                    className="px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">monitoring</span>
                    <span>Xem Báo Cáo Hoa Hồng</span>
                  </Link>
                  <Link
                    href="/account/affiliate/links"
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">link</span>
                    <span>Tất cả link ({myLinks.length})</span>
                  </Link>
                </div>
              </div>

              {/* Commission Snapshot */}
              <div className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                  <span className="text-emerald-200 text-[11px] block">Sách In Giấy (Physical)</span>
                  <strong className="text-base text-white font-bold">Hoa hồng 5% – 12%</strong>
                  <span className="text-emerald-300/80 text-[10px] block mt-0.5">Holding 7 ngày sau giao</span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                  <span className="text-emerald-200 text-[11px] block">Sách Số Điện Tử (Ebook)</span>
                  <strong className="text-base text-white font-bold">Hoa hồng 15% – 20%</strong>
                  <span className="text-emerald-300/80 text-[10px] block mt-0.5">Holding 24h sau thanh toán</span>
                </div>
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                  <span className="text-emerald-200 text-[11px] block">Sách Nói AI (Audiobook)</span>
                  <strong className="text-base text-white font-bold">Hoa hồng 10% – 15%</strong>
                  <span className="text-emerald-300/80 text-[10px] block mt-0.5">Holding 24h sau thanh toán</span>
                </div>
              </div>
            </div>

            {/* 2. KYC & Bank Account Section */}
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      kycData?.isVerified || kycData?.bankSnapshot
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      account_balance_wallet
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>Tài Khoản Ngân Hàng Nhận Hoa Hồng (KYC)</span>
                      {kycData?.isVerified || kycData?.bankSnapshot ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Đã Liên Kết
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Chưa Thiết Lập
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      HuKi chi trả hoa hồng trực tiếp qua chuyển khoản ngân hàng Việt Nam (hạn mức từ 100.000đ).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsKycModalOpen(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                    kycData?.isVerified || kycData?.bankSnapshot
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {kycData?.isVerified || kycData?.bankSnapshot ? 'edit' : 'add'}
                  </span>
                  <span>
                    {kycData?.isVerified || kycData?.bankSnapshot
                      ? 'Thay Đổi Tài Khoản'
                      : 'Thiết Lập Tài Khoản Ngay'}
                  </span>
                </button>
              </div>

              {/* Bank Details Display */}
              {kycData?.bankSnapshot ? (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Ngân hàng:</span>
                    <strong className="text-gray-900 font-bold">{kycData.bankSnapshot.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Số tài khoản:</span>
                    <strong className="text-emerald-700 font-mono text-sm font-bold">
                      •••• •••• {kycData.bankSnapshot.accountNumber.slice(-4)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Chủ tài khoản:</span>
                    <strong className="text-gray-900 font-bold">{kycData.bankSnapshot.accountHolderName}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700 text-[18px]">info</span>
                  <span>
                    Bạn chưa lưu tài khoản ngân hàng thụ hưởng. Hãy bổ sung để sẵn sàng nhận lệnh rút tiền khi có hoa hồng khả dụng.
                  </span>
                </div>
              )}
            </div>

            {/* 3. Link Generator & Fast Custom Link Creator */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">add_link</span>
                  <span>Tạo Link Tiếp Thị Rút Gọn Nhanh</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dán đường dẫn sách hoặc trang cửa hàng trên HuKi để tạo link tiếp thị gắn cookie 30 ngày.
                </p>
              </div>

              <form onSubmit={handleCreateCustomLink} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Đường dẫn trang sách hoặc danh mục trên HuKi <span className="text-red-500">*</span>:
                    </label>
                    <input
                      type="text"
                      value={customTargetUrl}
                      onChange={(e) => setCustomTargetUrl(e.target.value)}
                      placeholder="VD: /books/dac-nhan-tam hoặc https://huki.vn/books/..."
                      className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tên chiến dịch (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={customCampaign}
                      onChange={(e) => setCustomCampaign(e.target.value)}
                      placeholder="VD: TikTokBio, FB_Group"
                      className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400">
                    Cấu hình hoa hồng tự động áp dụng theo chính sách của từng sách/cửa hàng.
                  </span>
                  <button
                    type="submit"
                    disabled={isCreatingLink || !customTargetUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingLink ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          progress_activity
                        </span>
                        <span>Đang tạo link...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">magic_button</span>
                        <span>Tạo Link Tiếp Thị</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Just Created Link Card */}
              {createdLinkResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-emerald-700">check_circle</span>
                      <span>Link Tiếp Thị Của Bạn Đã Sẵn Sàng!</span>
                    </span>
                    <span className="text-[11px] font-normal text-emerald-700 font-mono">
                      Mã rút gọn: {createdLinkResult.shortCode}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${originUrl}${createdLinkResult.shortUrl}`}
                      className="w-full h-9 px-3 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-950 font-mono font-semibold"
                    />
                    <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${originUrl}${createdLinkResult.shortUrl}`,
                            'created_link',
                            'link tiếp thị'
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedKey === 'created_link' ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedKey === 'created_link' ? 'Đã Chép!' : 'Sao Chép Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setQrModalData({
                            url: `${originUrl}${createdLinkResult.shortUrl}`,
                            shortCode: createdLinkResult.shortCode,
                            originalUrl: createdLinkResult.originalUrl,
                          })
                        }
                        className="px-3 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                        <span>Mã QR</span>
                      </button>
                      <a
                        href={createdLinkResult.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center justify-center"
                        title="Mở link thử nghiệm"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Book Commission Showcase ("Cấu hình hoa hồng lấy đâu ra? Dựa vào sách và cửa hàng") */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[20px]">menu_book</span>
                    <span>Kho Sách Tiếp Thị &amp; Mức Hoa Hồng Thực Tế</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Bấm <strong>&quot;Lấy Link Ngay&quot;</strong> để hệ thống tự động sinh link tiếp thị và copy vào bộ nhớ tạm.
                  </p>
                </div>
                <Link
                  href="/account/affiliate/marketplace"
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Xem toàn bộ kho sách tiếp thị</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              {/* Book Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {featuredBooks.map((book: any) => {
                  const estRate = book.effectiveRate ?? (book.format === 'DIGITAL' ? 15 : 10);
                  const estAmount = book.estimatedCommissionAmount ?? Math.round(((book.price || 100000) * estRate) / 100);

                  return (
                    <div
                      key={book.id}
                      className="p-3.5 rounded-xl border border-gray-200 hover:border-emerald-400 bg-gray-50/60 hover:bg-emerald-50/20 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-20 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-200">
                          {book.coverUrl || book.coverImage ? (
                            <img
                              src={book.coverUrl || book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-[20px]">book</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            {book.format === 'DIGITAL' ? 'Sách Số (Ebook)' : 'Sách In Giấy'}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {book.title}
                          </h4>
                          <span className="text-xs font-bold text-gray-900 block">
                            {(book.price || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {/* Commission Highlight */}
                      <div className="p-2 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs">
                        <span className="text-gray-500 text-[11px]">Hoa hồng:</span>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-700">{estRate}%</span>
                          <span className="text-[10.5px] text-gray-500 ml-1">
                            (~{estAmount.toLocaleString('vi-VN')} đ)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCreateBookLink(book)}
                        className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">share</span>
                        <span>Lấy Link Tiếp Thị</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. My Active Links Table */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[20px]">list_alt</span>
                    <span>Danh Sách Link Đã Tạo ({myLinks.length})</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Theo dõi số lượt click và chuyển đổi đơn hàng của từng link rút gọn.
                  </p>
                </div>
                <Link
                  href="/account/affiliate/links"
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              {myLinks.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-1">
                  <span className="material-symbols-outlined text-[28px] text-gray-300">link_off</span>
                  <p>Bạn chưa tạo liên kết tiếp thị nào. Hãy chọn sách ở trên để bắt đầu!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-[11px] bg-gray-50/70">
                        <th className="py-2.5 px-3 font-semibold">Mã Link</th>
                        <th className="py-2.5 px-3 font-semibold">Đường Dẫn Rút Gọn</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Lượt Click</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Đơn Hàng</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myLinks.map((item) => {
                        const fullUrl = `${originUrl}${item.shortUrl}`;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                              {item.shortCode}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-gray-700 text-[11px] block truncate max-w-xs">
                                {fullUrl}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate block max-w-xs">
                                Đến: {item.originalUrl}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-gray-900">
                              {item.clickCount}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-700">
                              {item.conversionCount}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(fullUrl, item.id, 'link tiếp thị')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {copiedKey === item.id ? 'check' : 'content_copy'}
                                  </span>
                                  <span>{copiedKey === item.id ? 'Đã Chép' : 'Sao Chép'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQrModalData({
                                      url: fullUrl,
                                      shortCode: item.shortCode,
                                      originalUrl: item.originalUrl,
                                    })
                                  }
                                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 cursor-pointer"
                                  title="Xem mã QR"
                                >
                                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                                </button>
                                <a
                                  href={item.shortUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                                  title="Mở link thử nghiệm"
                                >
                                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 6. Guide: How to Share and Earn */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border border-emerald-200 text-xs space-y-3">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-700 text-[18px]">lightbulb</span>
                <span>Hướng Dẫn 3 Bước Bắt Đầu Tiếp Thị &amp; Nhận Hoa Hồng</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-700">
                <div className="space-y-0.5">
                  <strong className="text-emerald-900 block">Bước 1: Chọn sách hoặc dán link</strong>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Chọn các tựa sách hay ở kho sách bên trên hoặc dán link cuốn sách bạn muốn giới thiệu.
                  </p>
                </div>
                <div className="space-y-0.5">
                  <strong className="text-emerald-900 block">Bước 2: Sao chép link &amp; Chia sẻ</strong>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Dán link rút gọn vào phần bio TikTok, mô tả video YouTube, bài review Facebook hoặc gửi cho bạn bè.
                  </p>
                </div>
                <div className="space-y-0.5">
                  <strong className="text-emerald-900 block">Bước 3: Nhận hoa hồng tự động</strong>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Độc giả bấm vào link và mua sách trong 30 ngày ➔ Tiền hoa hồng chuyển vào ví và rút về STK ngân hàng!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resubmit Modal for REQUEST_CHANGES */}
        {isResubmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-gray-900">Chỉnh Sửa Hồ Sơ Xét Duyệt</h3>
                <button
                  type="button"
                  onClick={() => setIsResubmitOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Kinh nghiệm tiếp thị sách (Tối thiểu 30 ký tự):
                  </label>
                  <textarea
                    rows={3}
                    value={resubmitBio}
                    onChange={(e) => setResubmitBio(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Kế hoạch phân phối (Tối thiểu 50 ký tự):
                  </label>
                  <textarea
                    rows={3}
                    value={resubmitDesc}
                    onChange={(e) => setResubmitDesc(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResubmitOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isResubmitting}
                  onClick={handleResubmit}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResubmitting ? 'Đang gửi...' : 'Nộp Lại Hồ Sơ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KYC & Bank Account Modal */}
        <AffiliateKycModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          defaultHolderName={profileData?.profile?.displayName || ''}
          currentBankSnapshot={kycData?.bankSnapshot || null}
          onSuccess={() => {
            loadActivePartnerData();
            realtimeSyncBus.publish('AFFILIATE_APPLICATION_UPDATED', {});
          }}
        />

        {/* QR Code Preview & Link Details Modal */}
        {qrModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">qr_code_2</span>
                  <span>Mã QR & Chi Tiết Liên Kết Tiếp Thị</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    qrModalData.url
                  )}`}
                  alt="QR Code"
                  className="w-44 h-44 rounded-lg bg-white p-2 border border-gray-200 shadow-2xs"
                />
                <span className="font-mono text-[11px] text-gray-700 font-semibold break-all max-w-sm px-2">
                  {qrModalData.url}
                </span>
              </div>

              {/* URL Breakdown & Destination Explanation */}
              <div className="text-left bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Mã liên kết:</span>
                  <span className="font-mono font-bold text-emerald-900 break-all text-right">
                    {qrModalData.shortCode}
                  </span>
                </div>
                {qrModalData.originalUrl && (
                  <div className="flex items-start justify-between gap-2 border-t border-emerald-100 pt-1.5">
                    <span className="text-gray-500 shrink-0">Trang đích thực tế:</span>
                    <span className="font-mono text-gray-800 text-[11px] break-all text-right font-medium">
                      {qrModalData.originalUrl}
                    </span>
                  </div>
                )}
                <div className="border-t border-emerald-100 pt-1.5 text-[11px] text-emerald-800 leading-relaxed">
                  💡 <strong>Tại sao link có dạng này?</strong> Tiền tố <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-950">{profileData?.profile?.affiliateCode?.toLowerCase()}</code> chính là <strong>Mã CTV chính thức</strong> của bạn, kèm đuôi 6 ký tự ngẫu nhiên để phân biệt từng link sách. Khi độc giả click hoặc quét mã QR này, hệ thống sẽ tự động chuyển hướng độc giả sang trang sách gốc và ghi nhận hoa hồng cho bạn trong 30 ngày!
                </div>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(qrModalData.url, 'qr_url', 'link mã QR')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>{copiedKey === 'qr_url' ? 'Đã Chép!' : 'Sao Chép Link'}</span>
                </button>
                <a
                  href={qrModalData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  <span>Mở Thử Nghiệm</span>
                </a>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
