'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi, type MyProfileResponse } from '@/lib/affiliate/affiliateApi';
import type { PartnerStatus } from '@/types/affiliate';

export default function AffiliateApplicationStatusPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Resubmit modal state for REQUEST_CHANGES
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);
  const [resubmitBio, setResubmitBio] = useState('');
  const [resubmitDesc, setResubmitDesc] = useState('');
  const [resubmitChannels, setResubmitChannels] = useState<any[]>([]);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsUnauthorized(false);
    try {
      const res = await affiliateApi.getMyProfile();
      if (res.success && res.data) {
        setProfileData(res.data);
        if (res.data.profile) {
          setResubmitBio(res.data.profile.bio || '');
          setResubmitDesc(res.data.profile.promotionDescription || '');
          setResubmitChannels(res.data.profile.channels || []);
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
      setErrorMsg('Lỗi kết nối máy chủ khi tra cứu hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  const getStatusBadge = (status: PartnerStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>Chờ xét duyệt</span>
          </span>
        );
      case 'REQUEST_CHANGES':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            <span>Yêu cầu bổ sung thông tin</span>
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Đã kích hoạt</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            <span>Từ chối</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="material-symbols-outlined text-[14px]">block</span>
            <span>Tạm ngưng</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Tiến Độ Hồ Sơ Tiếp Thị Liên Kết
              </h1>
              {profileData?.profile && getStatusBadge(profileData.profile.status)}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Theo dõi tình trạng phê duyệt và phản hồi từ ban quản trị nền tảng HuKi.
            </p>
          </div>

          <Link
            href="/affiliate"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>Chính sách chương trình</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center max-w-xl mx-auto space-y-3">
            <span className="material-symbols-outlined animate-spin text-[36px] text-emerald-600">
              progress_activity
            </span>
            <p className="text-xs font-semibold text-gray-600">Đang tra cứu tình trạng hồ sơ...</p>
          </div>
        )}

        {/* Unauthorized / Login Required State */}
        {!loading && isUnauthorized && (
          <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-2xs text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto border border-sky-200">
              <span className="material-symbols-outlined text-[32px]">lock</span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-gray-900">
                Yêu Cầu Đăng Nhập Tài Khoản
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
                Vui lòng đăng nhập tài khoản HuKi để tra cứu tiến độ xét duyệt hồ sơ hoặc nộp hồ sơ đối tác tiếp thị liên kết của bạn.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                href="/auth/login?redirect=/account/affiliate/application"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
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
              onClick={fetchProfile}
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

        {/* Case 2: PENDING_REVIEW */}
        {!loading && !errorMsg && profileData?.profile?.status === 'PENDING_REVIEW' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px]">hourglass_top</span>
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
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold self-start sm:self-auto">
                  SLA: 24h - 48h làm việc
                </div>
              </div>

              {/* Review Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tiến Trình Xử Lý Hồ Sơ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>1. Đã Tiếp Nhận Hồ Sơ</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Hệ thống đã ghi nhận thông tin định danh và lưu hồ sơ vào hàng đợi xét duyệt.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-amber-600 animate-spin">progress_activity</span>
                      <span>2. Đang Thẩm Định Kênh</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Ban Quản Trị đang rà soát các kênh truyền thông ({profileData.profile.channels?.length || 0} kênh) và nguồn lưu lượng.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 opacity-70">
                    <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
                      <span>3. Kích Hoạt Quyền Lợi</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Mở quyền tạo link tiếp thị và truy cập Bảng điều khiển hiệu suất khi phê duyệt.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary of submitted info */}
              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 space-y-2 text-xs">
                <span className="font-bold text-gray-800 block">Thông Tin Đã Khai Báo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div>Tên đối tác: <strong className="text-gray-800">{profileData.profile.displayName}</strong></div>
                  <div>Email liên hệ: <strong className="text-gray-800">{profileData.profile.contactEmail}</strong></div>
                  <div>Số điện thoại: <strong className="text-gray-800">{profileData.profile.contactPhone}</strong></div>
                  <div>Chủ đề nội dung: <strong className="text-gray-800">{profileData.profile.contentCategories?.join(', ')}</strong></div>
                </div>
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
                    Ban Quản Trị Yêu Cầu Bổ Sung Thông Tin
                  </h2>
                  <p className="text-xs text-gray-500">
                    Số lần đã nộp lại: <strong>{profileData.profile.resubmitCount || 0} / 3 lần tối đa</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResubmitOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
              >
                Chỉnh Sửa &amp; Nộp Lại
              </button>
            </div>

            {/* Admin Reason Box */}
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>Nội dung yêu cầu chỉnh sửa từ Ban Quản Trị:</span>
              </div>
              <p className="text-xs text-purple-950 font-medium leading-relaxed">
                {profileData.profile.rejectionReason || 'Vui lòng kiểm tra lại liên kết kênh truyền thông hoặc cập nhật thêm kinh nghiệm tiếp thị.'}
              </p>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              * Lưu ý: Bạn có tối đa 3 lần nộp lại hồ sơ. Nếu vượt quá số lần này, hồ sơ sẽ tự động chuyển sang trạng thái Từ Chối với thời gian chờ 14 ngày.
            </p>
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

            {/* Cooldown Timer Notice */}
            {profileData.profile.isCoolingDown ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">timer</span>
                <div>
                  <strong className="block text-amber-900">Thời gian làm mát chống spam (14 ngày):</strong>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    Bạn có thể nộp lại hồ sơ sau ngày:{' '}
                    <strong>
                      {profileData.profile.cooldownUntil
                        ? new Date(profileData.profile.cooldownUntil).toLocaleDateString('vi-VN')
                        : '14 ngày'}
                    </strong>. Trong thời gian này, bạn vui lòng chuẩn bị lại kênh phân phối phù hợp.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Link
                  href="/account/affiliate/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Nộp Lại Hồ Sơ Mới</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Case 5: ACTIVE */}
        {!loading && !errorMsg && profileData?.profile?.status === 'ACTIVE' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px]">verified</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Tài Khoản Đối Tác Tiếp Thị Đang Hoạt Động
                    </h2>
                    <p className="text-xs text-gray-500">
                      Mã CTV chính thức:{' '}
                      <strong className="font-mono text-emerald-700 text-sm font-bold">
                        {profileData.profile.affiliateCode}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/account/affiliate/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">dashboard</span>
                    <span>Bảng Điều Khiển</span>
                  </Link>
                </div>
              </div>

              {/* Commission Rates Snapshot */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Mức Hoa Hồng Áp Dụng
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-1">
                    <span className="text-gray-500 text-[11px] block">Sách Giấy (Physical)</span>
                    <span className="text-lg font-bold text-emerald-700">5%</span>
                    <span className="text-[10.5px] text-gray-400 block">Holding: 7 ngày sau giao</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-1">
                    <span className="text-gray-500 text-[11px] block">Sách Điện Tử (Ebook)</span>
                    <span className="text-lg font-bold text-emerald-700">15%</span>
                    <span className="text-[10.5px] text-gray-400 block">Holding: 24h sau thanh toán</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-1">
                    <span className="text-gray-500 text-[11px] block">Sách Nói (Audiobook)</span>
                    <span className="text-lg font-bold text-emerald-700">10%</span>
                    <span className="text-[10.5px] text-gray-400 block">Holding: 24h sau thanh toán</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case 6: SUSPENDED */}
        {!loading && !errorMsg && profileData?.profile?.status === 'SUSPENDED' && (
          <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 border-b border-red-100 pb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">block</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Tài Khoản Đối Tác Tạm Ngưng Hoạt Động
                </h2>
                <p className="text-xs text-gray-500">
                  Mã đối tác: <strong className="font-mono">{profileData.profile.affiliateCode}</strong>
                </p>
              </div>
            </div>

            {profileData.profile.rejectionReason && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                <span className="font-bold block">Lý do từ Ban Quản Trị:</span>
                <p className="leading-relaxed">{profileData.profile.rejectionReason}</p>
              </div>
            )}

            <p className="text-xs text-gray-600">
              Mọi liên kết chia sẻ tạm thời bị vô hiệu hóa. Nếu cần giải đáp hoặc hỗ trợ mở lại tài khoản, vui lòng liên hệ Ban Quản Trị qua email <strong>affiliate@huki.vn</strong>.
            </p>
          </div>
        )}

        {/* Resubmit Modal for REQUEST_CHANGES */}
        {isResubmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Bổ Sung Hồ Sơ Đối Tác</h3>
                <button
                  type="button"
                  onClick={() => setIsResubmitOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Cập nhật kinh nghiệm tiếp thị (Tối thiểu 30 ký tự) <span className="text-red-500">*</span>:
                  </label>
                  <textarea
                    rows={4}
                    value={resubmitBio}
                    onChange={(e) => setResubmitBio(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="Mô tả kinh nghiệm, kênh chính hoặc tệp độc giả..."
                  />
                  <div className="text-[10.5px] text-gray-400 text-right mt-0.5">
                    {resubmitBio.length}/500
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Kế hoạch phân phối bổ sung (Tùy chọn):
                  </label>
                  <textarea
                    rows={3}
                    value={resubmitDesc}
                    onChange={(e) => setResubmitDesc(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="Kế hoạch xuất bản bài viết, video đánh giá..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsResubmitOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isResubmitting}
                  onClick={handleResubmit}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isResubmitting ? 'Đang nộp...' : 'Nộp Lại Hồ Sơ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
