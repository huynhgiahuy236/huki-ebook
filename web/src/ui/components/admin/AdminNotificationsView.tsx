'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  adminNotificationService,
  AdminBroadcastNotification,
  NotificationCategory,
  NotificationSeverity,
  TargetAudienceType,
  TargetSegment,
  NotificationPlacement,
  ScheduleType,
  RecurringFrequency,
} from '@/ui/services/adminNotificationService';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useToast } from '@/ui/context/ToastContext';

export default function AdminNotificationsView() {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<AdminBroadcastNotification[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Composer
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('MAINTENANCE');
  const [severity, setSeverity] = useState<NotificationSeverity>('INFO');
  const [targetType, setTargetType] = useState<TargetAudienceType>('ALL');
  const [targetSegment, setTargetSegment] = useState<TargetSegment>('ALL');
  const [targetBusinessId, setTargetBusinessId] = useState<string>('');
  const [channels, setChannels] = useState<NotificationPlacement[]>(['TOP_BAR', 'BELL']);
  const [isPinnedTop, setIsPinnedTop] = useState(true);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('INSTANT');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurringRule, setRecurringRule] = useState<RecurringFrequency>('BI_MONTHLY');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');

  // Modal State for Detail View
  const [detailNotif, setDetailNotif] = useState<AdminBroadcastNotification | null>(null);

  const loadData = async () => {
    setNotifications(adminNotificationService.getAll());
    try {
      const res = await businessApi.getAllBusinesses({ limit: 100 });
      if (res && res.success && res.data) {
        setBusinesses(Array.isArray(res.data) ? res.data : (res.data as any).data || []);
      }
    } catch (e) {
      console.warn('Failed to load businesses for notifications:', e);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      setNotifications(adminNotificationService.getAll());
    };
    window.addEventListener('huki_admin_notifications_updated', handleUpdate);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'NOTIFICATION_READ') {
        handleUpdate();
      }
    });

    return () => {
      window.removeEventListener('huki_admin_notifications_updated', handleUpdate);
      unsubscribe();
    };
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const pinned = notifications.filter((n) => n.isPinnedTop).length;
    const scheduled = notifications.filter((n) => n.scheduleType !== 'INSTANT').length;
    const totalReads = notifications.reduce((acc, curr) => acc + (curr.readByBusinessIds?.length || 0), 0);
    return { total, pinned, scheduled, totalReads };
  }, [notifications]);

  // Filtered List
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (filterAudience !== 'all' && n.targetType !== filterAudience) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notifications, filterCategory, filterAudience, searchQuery]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !content.trim()) {
      showToast('Vui lòng điền đầy đủ tiêu đề, tóm tắt và nội dung thông báo', 'error');
      return;
    }

    const selectedBiz = businesses.find((b) => b.id === targetBusinessId);

    adminNotificationService.createNotification({
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category,
      severity,
      targetType,
      targetSegment: targetType === 'SEGMENT' ? targetSegment : undefined,
      targetBusinessIds: targetType === 'DIRECT' && targetBusinessId ? [targetBusinessId] : undefined,
      targetBusinessNames: selectedBiz ? [selectedBiz.name] : undefined,
      channels,
      isPinnedTop: channels.includes('TOP_BAR'),
      isDismissible: true,
      scheduleType,
      scheduledAt: scheduleType === 'SCHEDULED' ? scheduledAt : undefined,
      recurringRule: scheduleType === 'RECURRING' ? recurringRule : undefined,
      status: 'ACTIVE',
      authorName: 'Ban Quản Trị HUKI',
      actionUrl: actionUrl.trim() || undefined,
      actionLabel: actionLabel.trim() || undefined,
    });

    showToast('Đã phát sóng thông báo thành công đến các đối tác Seller!', 'success');
    setIsComposerOpen(false);
    resetComposer();
  };

  const resetComposer = () => {
    setTitle('');
    setSummary('');
    setContent('');
    setCategory('MAINTENANCE');
    setSeverity('INFO');
    setTargetType('ALL');
    setTargetSegment('ALL');
    setTargetBusinessId('');
    setChannels(['TOP_BAR', 'BELL']);
    setIsPinnedTop(true);
    setScheduleType('INSTANT');
    setScheduledAt('');
    setRecurringRule('BI_MONTHLY');
    setActionUrl('');
    setActionLabel('');
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    adminNotificationService.togglePin(id);
    showToast('Đã cập nhật trạng thái ghim đầu trang', 'success');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn thu hồi/xóa thông báo này không?')) {
      adminNotificationService.deleteNotification(id);
      showToast('Đã thu hồi thông báo', 'info');
    }
  };

  const getCategoryMeta = (cat: NotificationCategory) => {
    switch (cat) {
      case 'MAINTENANCE':
        return { label: 'Bảo Trì', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'POLICY':
        return { label: 'Chính Sách', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'FINANCE':
        return { label: 'Tài Chính & Escrow', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'ORDER':
        return { label: 'Đơn Hàng', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'MARKETING':
        return { label: 'Marketing', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: 'Hệ Thống', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#00875A] text-xs font-bold border border-emerald-200 mb-2">
            <span className="material-symbols-outlined text-[15px]">broadcast_on_personal</span>
            <span>Hệ Thống Phát Tin &amp; Quản Lý Đối Tác Seller</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý &amp; Phát Sóng Thông Báo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gửi thông báo bảo trì, lịch đối soát tài chính định kỳ, chính sách sàn hoặc nhắc nhở riêng biệt tới từng nhà xuất bản.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          className="bg-[#00875A] hover:bg-[#00704A] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>Soạn &amp; Phát Thông Báo Mới</span>
        </button>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Tổng Thông Báo</span>
            <span className="material-symbols-outlined text-emerald-600">campaign</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <span className="text-[11px] text-slate-400">Bản tin trên toàn hệ thống</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Ghim Top Notice</span>
            <span className="material-symbols-outlined text-amber-600">push_pin</span>
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.pinned}</div>
          <span className="text-[11px] text-slate-400">Đang nổi trên đầu Dashboard Seller</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Định Kỳ &amp; Lên Lịch</span>
            <span className="material-symbols-outlined text-blue-600">schedule</span>
          </div>
          <div className="text-2xl font-black text-blue-600">{stats.scheduled}</div>
          <span className="text-[11px] text-slate-400">Tự động đối soát ngày 1 &amp; 15</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Lượt Đọc Từ Đối Tác</span>
            <span className="material-symbols-outlined text-rose-600">visibility</span>
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.totalReads}</div>
          <span className="text-[11px] text-slate-400">Lượt Seller đã xác nhận đọc</span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-[#00875A]"
          >
            <option value="all">Tất Cả Chuyên Mục</option>
            <option value="MAINTENANCE">Bảo Trì Hệ Thống</option>
            <option value="FINANCE">Tài Chính &amp; Escrow</option>
            <option value="POLICY">Chính Sách &amp; Bản Quyền</option>
            <option value="ORDER">Đơn Hàng &amp; Vận Hành</option>
            <option value="MARKETING">Marketing &amp; Flash Sale</option>
          </select>

          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-[#00875A]"
          >
            <option value="all">Tất Cả Đối Tượng</option>
            <option value="ALL">Toàn Sàn (Global)</option>
            <option value="SEGMENT">Theo Nhóm (Segment)</option>
            <option value="DIRECT">Gửi Riêng (1-1 Shop)</option>
          </select>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* 4. Notification Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-3 px-4">Bản Tin &amp; Tiêu Đề</th>
                <th className="py-3 px-4">Chuyên Mục</th>
                <th className="py-3 px-4">Đối Tượng Nhận</th>
                <th className="py-3 px-4">Kênh Hiển Thị</th>
                <th className="py-3 px-4">Lịch Trình</th>
                <th className="py-3 px-4 text-center">Lượt Đọc</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy bản tin nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((n) => {
                  const catMeta = getCategoryMeta(n.category);
                  const readCount = n.readByBusinessIds?.length || 0;

                  return (
                    <tr
                      key={n.id}
                      onClick={() => setDetailNotif(n)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {n.isPinnedTop && (
                              <span className="material-symbols-outlined text-amber-500 text-[14px]" title="Đang ghim Top">
                                push_pin
                              </span>
                            )}
                            <span className="font-bold text-slate-900 group-hover:text-[#00875A] transition-colors line-clamp-1">
                              {n.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{n.summary}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {n.targetType === 'ALL' ? (
                          <span className="font-semibold text-slate-700">Toàn bộ Người bán</span>
                        ) : n.targetType === 'SEGMENT' ? (
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {n.targetSegment === 'DIGITAL_SELLERS'
                              ? 'NXB Sách Số DRM'
                              : n.targetSegment === 'PHYSICAL_SELLERS'
                              ? 'Người bán Sách In'
                              : 'Nhóm Doanh Nghiệp'}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Riêng: {n.targetBusinessNames?.[0] || '1 Gian Hàng'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          {n.channels.includes('TOP_BAR') && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-bold">
                              Top Bar
                            </span>
                          )}
                          {n.channels.includes('BELL') && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold">
                              Chuông
                            </span>
                          )}
                          {n.channels.includes('MODAL') && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 font-bold">
                              Popup
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {n.scheduleType === 'INSTANT' ? (
                          <span className="text-slate-600">Phát ngay</span>
                        ) : n.scheduleType === 'RECURRING' ? (
                          <span className="text-blue-700 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">autorenew</span>
                            <span>Định kỳ (Ngày 1 &amp; 15)</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">{new Date(n.scheduledAt || n.createdAt).toLocaleDateString('vi-VN')}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-slate-800">
                        {readCount} shop
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(n.id, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              n.isPinnedTop
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={n.isPinnedTop ? 'Bỏ ghim đầu trang' : 'Ghim lên đầu trang'}
                          >
                            <span className="material-symbols-outlined text-[16px]">push_pin</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(n.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa / Thu hồi bản tin"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Create Notification Composer Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00875A]">add_alert</span>
                  <span>Soạn &amp; Phát Sóng Thông Báo Cho Seller</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Điều phối thông tin chuẩn xác theo từng nhóm đối tượng hoặc toàn bộ mạng lưới người bán.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Category & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chuyên Mục Thông Báo *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00875A]"
                  >
                    <option value="MAINTENANCE">Bảo Trì Hệ Thống / Tính Năng</option>
                    <option value="FINANCE">Tài Chính &amp; Quyết Toán Escrow</option>
                    <option value="POLICY">Chính Sách &amp; Bản Quyền</option>
                    <option value="ORDER">Vận Hành &amp; Đơn Hàng</option>
                    <option value="MARKETING">Marketing &amp; Flash Sale</option>
                    <option value="SECURITY">Bảo Mật &amp; Hệ Thống</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức Độ Nghiêm Trọng *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00875A]"
                  >
                    <option value="INFO">Thông Tin Bình Thường (Xanh)</option>
                    <option value="WARNING">Cảnh Báo / Cần Lưu Ý (Vàng Cam)</option>
                    <option value="CRITICAL">Khẩn Cấp / Bắt Buộc (Đỏ)</option>
                  </select>
                </div>
              </div>

              {/* Title & 1-line Summary */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu Đề Thông Báo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch bảo trì máy chủ mã hóa DRM từ 01:00 - 03:00 sáng mai"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-[#00875A]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tóm Tắt Ngắn 1 Dòng (Hiện trên Top Notice Bar &amp; Chuông) *
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Ví dụ: Hệ thống tạm ngắt tính năng xuất bản Ebook để nâng cấp hạ tầng mã hóa"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00875A]"
                  required
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội Dung Chi Tiết Bản Tin *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Điền nội dung chi tiết thông báo gửi đến người bán..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00875A] leading-relaxed"
                  required
                />
              </div>

              {/* Target Audience */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <label className="block font-black text-slate-800">1. Đối Tượng Người Bán Nhận Tin</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'ALL'}
                      onChange={() => setTargetType('ALL')}
                      className="text-[#00875A]"
                    />
                    <span>Toàn Sàn (100% Shop)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'SEGMENT'}
                      onChange={() => setTargetType('SEGMENT')}
                      className="text-[#00875A]"
                    />
                    <span>Theo Nhóm Đối Tác</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'DIRECT'}
                      onChange={() => setTargetType('DIRECT')}
                      className="text-[#00875A]"
                    />
                    <span>Gửi Riêng 1 Shop</span>
                  </label>
                </div>

                {/* Sub controls depending on target */}
                {targetType === 'SEGMENT' && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-600 mb-1">Chọn Phân Khúc Người Bán:</label>
                    <select
                      value={targetSegment}
                      onChange={(e) => setTargetSegment(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="DIGITAL_SELLERS">Nhà Xuất Bản &amp; Đối Tác Sách Số (Ebook DRM)</option>
                      <option value="PHYSICAL_SELLERS">Gian Hàng Sách In &amp; Sách Cũ</option>
                      <option value="NEW_SELLERS">Shop Mới Gia Nhập (&lt; 30 Ngày)</option>
                      <option value="AT_RISK_SELLERS">Shop Có Cảnh Báo Vi Phạm / Tỷ Lệ Hủy Cao</option>
                    </select>
                  </div>
                )}

                {targetType === 'DIRECT' && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-600 mb-1">Chọn Gian Hàng Đích Danh:</label>
                    <select
                      value={targetBusinessId}
                      onChange={(e) => setTargetBusinessId(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-semibold"
                      required
                    >
                      <option value="">-- Chọn một Gian Hàng / Doanh Nghiệp --</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.email || b.phone || 'NXB Đối Tác'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Channels & Placement */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-black text-slate-800">2. Vị Trí &amp; Kênh Hiển Thị</label>
                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes('TOP_BAR')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'TOP_BAR']);
                        else setChannels(channels.filter((c) => c !== 'TOP_BAR'));
                      }}
                      className="w-4 h-4 rounded text-[#00875A]"
                    />
                    <span>Ghim Thanh Notice Trên Cùng (WordPress Style)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes('BELL')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'BELL']);
                        else setChannels(channels.filter((c) => c !== 'BELL'));
                      }}
                      className="w-4 h-4 rounded text-[#00875A]"
                    />
                    <span>Chuông &amp; Trung Tâm Thông Báo Riêng</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes('MODAL')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'MODAL']);
                        else setChannels(channels.filter((c) => c !== 'MODAL'));
                      }}
                      className="w-4 h-4 rounded text-[#00875A]"
                    />
                    <span>Bật Modal Bắt Buộc Đọc Khi Đăng Nhập</span>
                  </label>
                </div>
              </div>

              {/* Scheduling & Recurring */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <label className="block font-black text-slate-800">3. Thời Gian &amp; Lịch Phát Sóng</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={scheduleType === 'INSTANT'}
                      onChange={() => setScheduleType('INSTANT')}
                      className="text-[#00875A]"
                    />
                    <span>Phát Sóng Ngay (Realtime)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={scheduleType === 'SCHEDULED'}
                      onChange={() => setScheduleType('SCHEDULED')}
                      className="text-[#00875A]"
                    />
                    <span>Hẹn Giờ Gửi</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={scheduleType === 'RECURRING'}
                      onChange={() => setScheduleType('RECURRING')}
                      className="text-[#00875A]"
                    />
                    <span>Định Kỳ Tự Động</span>
                  </label>
                </div>

                {scheduleType === 'RECURRING' && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-600 mb-1">Quy Tắc Lặp Lại Định Kỳ:</label>
                    <select
                      value={recurringRule}
                      onChange={(e) => setRecurringRule(e.target.value as any)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="BI_MONTHLY">Ngày 1 &amp; Ngày 15 hàng tháng (Kỳ đối soát Ví Escrow)</option>
                      <option value="WEEKLY_MONDAY">8:00 Sáng thứ Hai hàng tuần (Báo cáo kinh doanh tuần)</option>
                      <option value="MONTHLY_FIRST">Ngày 1 đầu tháng (Tổng kết doanh số &amp; chiết khấu)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Link (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đường Dẫn Hành Động (CTA Link)</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="Ví dụ: /seller/finance hoặc /seller/returns"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhãn Nút Bấm</label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="Ví dụ: Kiểm Tra Ví Escrow"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="bg-[#00875A] hover:bg-[#00704A] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">send</span>
                  <span>Phát Sóng Thông Báo Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Detail View Modal */}
      {detailNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getCategoryMeta(detailNotif.category).color}`}>
                  {getCategoryMeta(detailNotif.category).label}
                </span>
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  {detailNotif.title}
                </h2>
                <p className="text-xs text-slate-400">
                  Phát sóng lúc: {new Date(detailNotif.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailNotif(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 font-semibold text-slate-800">
                📌 {detailNotif.summary}
              </div>
              <p>{detailNotif.content}</p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-bold">Đã có {detailNotif.readByBusinessIds?.length || 0} shop</span> xác nhận đọc bản tin này.
              </div>
              {detailNotif.isPinnedTop && (
                <span className="text-[10.5px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  📌 Đang ghim Top Notice
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailNotif(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
