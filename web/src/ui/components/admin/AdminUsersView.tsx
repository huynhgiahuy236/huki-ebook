'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { adminApi } from '../../api/adminApi';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import AuditHistoryTimeline, { AuditLogItem } from '../common/AuditHistoryTimeline';
import { AdminStatusBadge, AdminFilterTabs } from './AdminUI';

interface DrmDevice {
  id: string;
  name: string;
  type: string;
  lastActive: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  tier: 'diamond' | 'gold' | 'silver' | 'bronze';
  tierLabel: string;
  spent: number;
  booksOwned: number;
  ebooksCount: number;
  physicalCount: number;
  devicesCount: number;
  devicesList: DrmDevice[];
  points: number;
  joinedDate: string;
  status: 'active' | 'warning' | 'locked';
  statusLabel: string;
}

export default function AdminUsersView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [inspectingUser, setInspectingUser] = useState<AdminUser | null>(null);
  const [userTab, setUserTab] = useState<'info' | 'history'>('info');
  const [userAuditLogs, setUserAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (inspectingUser?.id && userTab === 'history') {
      setLoadingAudit(true);
      adminApi.getUserAuditLogs(inspectingUser.id)
        .then((res) => {
          if (res.success && res.data?.items) {
            setUserAuditLogs(res.data.items);
          } else {
            setUserAuditLogs([]);
          }
        })
        .catch(() => setUserAuditLogs([]))
        .finally(() => setLoadingAudit(false));
    }
  }, [inspectingUser?.id, userTab]);

  const userPanelRef = useSmartFormCollapse({
    isOpen: Boolean(inspectingUser),
    onClose: () => {
      setInspectingUser(null);
      setUserTab('info');
    },
    isDirty: false,
  });

  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: 'USR-9021',
      name: 'Nguyễn Văn Hùng',
      email: 'hung.nguyen@gmail.com',
      phone: '0912.345.678',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      tier: 'diamond',
      tierLabel: 'Kim Cương',
      spent: 12450000,
      booksOwned: 84,
      ebooksCount: 52,
      physicalCount: 32,
      devicesCount: 4,
      devicesList: [
        { name: 'iPhone 15 Pro Max', type: 'iOS', lastActive: '10 phút trước', id: 'DEV-01' },
        { name: 'iPad Pro 12.9 M2', type: 'iPadOS', lastActive: 'Hôm qua', id: 'DEV-02' },
        { name: 'MacBook Air M3', type: 'macOS', lastActive: '3 ngày trước', id: 'DEV-03' },
        { name: 'Kindle Paperwhite 11th', type: 'E-Reader', lastActive: '5 ngày trước', id: 'DEV-04' }
      ],
      points: 1240,
      joinedDate: '12/01/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9022',
      name: 'Trần Thị Mai Anh',
      email: 'maianh.tran@techcorp.vn',
      phone: '0988.765.432',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      tier: 'gold',
      tierLabel: 'Vàng',
      spent: 8620000,
      booksOwned: 46,
      ebooksCount: 38,
      physicalCount: 8,
      devicesCount: 2,
      devicesList: [
        { name: 'Samsung Galaxy S24 Ultra', type: 'Android', lastActive: '2 giờ trước', id: 'DEV-05' },
        { name: 'Galaxy Tab S9', type: 'Android', lastActive: 'Hôm qua', id: 'DEV-06' }
      ],
      points: 850,
      joinedDate: '05/02/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9023',
      name: 'Lê Hoàng Long',
      email: 'long.le@fintech.co',
      phone: '0903.112.233',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      tier: 'silver',
      tierLabel: 'Bạc',
      spent: 3450000,
      booksOwned: 19,
      ebooksCount: 14,
      physicalCount: 5,
      devicesCount: 2,
      devicesList: [
        { name: 'iPhone 14', type: 'iOS', lastActive: '4 giờ trước', id: 'DEV-07' },
        { name: 'Dell XPS 15', type: 'Windows Web', lastActive: '1 tuần trước', id: 'DEV-08' }
      ],
      points: 320,
      joinedDate: '18/03/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9024',
      name: 'Phạm Quỳnh Nga',
      email: 'quynhnga.pham@outlook.com',
      phone: '0977.889.900',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      tier: 'diamond',
      tierLabel: 'Kim Cương',
      spent: 15800000,
      booksOwned: 112,
      ebooksCount: 90,
      physicalCount: 22,
      devicesCount: 5,
      devicesList: [
        { name: 'iPhone 15 Plus', type: 'iOS', lastActive: 'Vừa xong', id: 'DEV-09' },
        { name: 'Kobo Libra Colour', type: 'E-Reader', lastActive: '30 phút trước', id: 'DEV-10' },
        { name: 'iPad Mini 6', type: 'iPadOS', lastActive: '2 ngày trước', id: 'DEV-11' },
        { name: 'ThinkPad X1 Carbon', type: 'Windows Web', lastActive: '5 ngày trước', id: 'DEV-12' },
        { name: 'Boox Palma', type: 'E-Ink Android', lastActive: '1 tuần trước', id: 'DEV-13' }
      ],
      points: 1590,
      joinedDate: '20/11/2023',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9025',
      name: 'Vũ Quốc Bảo',
      email: 'bao.vu@crypto.io',
      phone: '0933.445.566',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      tier: 'bronze',
      tierLabel: 'Đồng',
      spent: 450000,
      booksOwned: 3,
      ebooksCount: 2,
      physicalCount: 1,
      devicesCount: 1,
      devicesList: [
        { name: 'Xiaomi 13 Pro', type: 'Android', lastActive: '3 ngày trước', id: 'DEV-14' }
      ],
      points: 45,
      joinedDate: '10/05/2024',
      status: 'active',
      statusLabel: 'Hoạt động tốt'
    },
    {
      id: 'USR-9026',
      name: 'Đặng Minh Triết',
      email: 'triet.dang@studio.design',
      phone: '0944.556.677',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      tier: 'gold',
      tierLabel: 'Vàng',
      spent: 7200000,
      booksOwned: 34,
      ebooksCount: 30,
      physicalCount: 4,
      devicesCount: 5,
      devicesList: [
        { name: 'MacBook Pro M2 Max', type: 'macOS', lastActive: '1 giờ trước', id: 'DEV-15' },
        { name: 'iPad Pro 11 M1', type: 'iPadOS', lastActive: 'Hôm nay', id: 'DEV-16' },
        { name: 'iPhone 13', type: 'iOS', lastActive: '2 ngày trước', id: 'DEV-17' },
        { name: 'Windows PC Studio', type: 'Windows Web', lastActive: '4 ngày trước', id: 'DEV-18' },
        { name: 'Kindle Oasis', type: 'E-Reader', lastActive: '1 tuần trước', id: 'DEV-19' }
      ],
      points: 710,
      joinedDate: '14/01/2024',
      status: 'warning',
      statusLabel: 'Đạt tối đa 5 thiết bị'
    }
  ]);

  const handleRevokeDevice = (userId: string, deviceId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextList = u.devicesList.filter(d => d.id !== deviceId);
        return {
          ...u,
          devicesList: nextList,
          devicesCount: nextList.length,
          status: nextList.length >= 5 ? 'warning' : 'active',
          statusLabel: nextList.length >= 5 ? 'Đạt tối đa 5 thiết bị' : 'Hoạt động tốt'
        };
      }
      return u;
    }));
    showToast?.('Đã thu hồi giấy phép DRM trên thiết bị thành công.', 'success');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => {
        if (!prev) return null;
        const nextList = prev.devicesList.filter(d => d.id !== deviceId);
        return {
          ...prev,
          devicesList: nextList,
          devicesCount: nextList.length,
          status: nextList.length >= 5 ? 'warning' : 'active',
          statusLabel: nextList.length >= 5 ? 'Đạt tối đa 5 thiết bị' : 'Hoạt động tốt'
        };
      });
    }
  };

  const handleToggleLock = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'locked' ? 'active' : 'locked';
        return {
          ...u,
          status: nextStatus,
          statusLabel: nextStatus === 'locked' ? 'Đã bị khóa tài khoản' : 'Hoạt động tốt'
        };
      }
      return u;
    }));
    showToast?.('Đã cập nhật trạng thái tài khoản người đọc.', 'info');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => {
        if (!prev) return null;
        const nextStatus = prev.status === 'locked' ? 'active' : 'locked';
        return {
          ...prev,
          status: nextStatus,
          statusLabel: nextStatus === 'locked' ? 'Đã bị khóa tài khoản' : 'Hoạt động tốt'
        };
      });
    }
  };

  const handleRewardPoints = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, points: u.points + 200 };
      }
      return u;
    }));
    showToast?.('Đã tặng 200 điểm thưởng HukiXu tri ân bạn đọc!', 'success');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser(prev => prev ? ({ ...prev, points: prev.points + 200 }) : null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (activeTab === 'diamond' && user.tier !== 'diamond') return false;
      if (activeTab === 'gold' && user.tier !== 'gold') return false;
      if (activeTab === 'warning' && user.status !== 'warning') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.phone.includes(q) ||
          user.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Columns for GroupedDataTable
  const columns: Column<AdminUser>[] = useMemo(
    () => [
      {
        key: 'index',
        title: 'STT',
        align: 'center',
        className: 'w-12 font-mono text-[11px] text-gray-400',
        render: (_val, _item, index) => (currentPage - 1) * pageSize + index + 1,
      },
      {
        key: 'name',
        title: 'Độc Giả',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <div className="flex items-center gap-2.5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
            />
            <span className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors">
              {user.name}
            </span>
          </div>
        ),
      },
      {
        key: 'email',
        title: 'Email',
        sortable: true,
        className: 'font-mono text-[11px] text-gray-600 whitespace-nowrap',
      },
      {
        key: 'phone',
        title: 'Số Điện Thoại & ID',
        className: 'font-mono text-[11px] text-gray-700 whitespace-nowrap',
        render: (_val, user) => (
          <span>
            {user.phone} <span className="text-gray-400">({user.id})</span>
          </span>
        ),
      },
      {
        key: 'tier',
        title: 'Hạng Hội Viên',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
              user.tier === 'diamond'
                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                : user.tier === 'gold'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : user.tier === 'silver'
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {user.tier === 'diamond' ? 'diamond' : user.tier === 'gold' ? 'workspace_premium' : 'military_tech'}
            </span>
            <span>{user.tierLabel}</span>
          </span>
        ),
      },
      {
        key: 'booksOwned',
        title: 'Tủ Sách Sở Hữu',
        sortable: true,
        className: 'text-gray-800 whitespace-nowrap',
        render: (_val, user) => (
          <span>
            <strong className="font-bold">{user.booksOwned} cuốn</strong>{' '}
            <span className="text-[10.5px] text-gray-400">({user.ebooksCount} Ebook · {user.physicalCount} Sách in)</span>
          </span>
        ),
      },
      {
        key: 'spent',
        title: 'Tổng Chi Tiêu',
        align: 'right',
        sortable: true,
        className: 'text-right whitespace-nowrap',
        render: (_val, user) => (
          <span>
            <span className="font-extrabold text-[#00875A] font-mono">{user.spent.toLocaleString()}₫</span>{' '}
            <span className="text-[10px] text-gray-400">({user.points} xu)</span>
          </span>
        ),
      },
      {
        key: 'devicesCount',
        title: 'Thiết Bị DRM',
        align: 'center',
        className: 'whitespace-nowrap',
        render: (count: number) => (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10.5px] border border-purple-200">
            {count} / 5 máy
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (status: string) => {
          if (status === 'active') return <AdminStatusBadge status="success" label="Hoạt động" icon="check_circle" />;
          if (status === 'warning') return <AdminStatusBadge status="warning" label="Cần chú ý" icon="warning" />;
          return <AdminStatusBadge status="danger" label="Đã khóa" icon="lock" />;
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        align: 'right',
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <button
            onClick={() => {
              setInspectingUser(user);
              setUserTab('info');
            }}
            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-800 font-bold text-[11px] transition-colors cursor-pointer"
          >
            Chi Tiết
          </button>
        ),
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. TOP HEADER & INTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Danh Sách Độc Giả &amp; Bản Quyền Thiết Bị
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Quản lý độc giả, hạng hội viên VIP và cấp quyền thiết bị DRM đọc sách</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => showToast?.('Đang xuất danh sách độc giả VIP sang định dạng Excel...', 'info')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Xuất Excel Bạn Đọc</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tổng Bạn Đọc Đăng Ký</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">28.560</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">trending_up</span>
            <span>+12.6% tăng trưởng</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Hội Viên Kim Cương &amp; Vàng</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">diamond</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">4.820 VIP</div>
          <div className="mt-1 text-[11px] text-amber-700 font-bold">
            <span>Chiếm 62% GMV sàn</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Thiết Bị DRM Đang Kết Nối</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">devices</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">52.140</div>
          <div className="mt-1 text-[11px] text-purple-700 font-bold">
            <span>TB 1.8 máy / bạn đọc</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cảnh Báo Giới Hạn Máy</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">security</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">3 Tài Khoản</div>
          <div className="mt-1 text-[11px] text-rose-600 font-bold">
            <span>Đạt 5/5 thiết bị DRM</span>
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <AdminFilterTabs
          tabs={[
            { key: 'all', label: 'Tất cả độc giả', count: users.length },
            { key: 'diamond', label: 'VIP Kim Cương', count: users.filter(u => u.tier === 'diamond').length },
            { key: 'gold', label: 'VIP Vàng', count: users.filter(u => u.tier === 'gold').length },
            { key: 'warning', label: 'Cần kiểm tra', count: users.filter(u => u.status === 'warning').length },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
        />

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          <input
            type="text"
            placeholder="Tìm tên, email, SĐT..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. USERS GROUPED DATA TABLE */}
      <GroupedDataTable<AdminUser>
        data={paginatedUsers}
        columns={columns}
        keyField="id"
        emptyTitle="Không Tìm Thấy Độc Giả"
        emptyMessage="Không tìm thấy bạn đọc phù hợp với bộ lọc tìm kiếm."
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredUsers.length,
          pageSize,
          onPageChange: setCurrentPage,
        }}
      />

      {/* 5. USER INSPECTOR IN-PAGE COLLAPSIBLE PANEL */}
      {inspectingUser && (
        <div ref={userPanelRef} className="mt-4 bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="pb-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={inspectingUser.avatar}
                alt={inspectingUser.name}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-500 shadow-2xs"
              />
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  {inspectingUser.name}
                </h2>
                <span className="text-xs text-gray-500 font-mono">{inspectingUser.email} · {inspectingUser.tierLabel}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setInspectingUser(null);
                setUserTab('info');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng bảng
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setUserTab('info')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                userTab === 'info'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Thông Tin Độc Giả &amp; Thiết Bị
            </button>
            <button
              type="button"
              onClick={() => setUserTab('history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                userTab === 'history'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Lịch Sử Thao Tác (Governance Audit)
            </button>
          </div>

          {/* Tab 1: Info & Devices */}
          {userTab === 'info' && (
            <div className="space-y-5 text-xs text-gray-700">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                <div className="p-1">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Tổng Chi Tiêu</span>
                  <span className="font-extrabold text-sm text-[#00875A] mt-0.5 block font-mono">{inspectingUser.spent.toLocaleString()}₫</span>
                </div>
                <div className="p-1 border-t sm:border-t-0 sm:border-x border-gray-200">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Tủ Sách</span>
                  <span className="font-extrabold text-sm text-gray-900 mt-0.5 block">{inspectingUser.booksOwned} cuốn</span>
                </div>
                <div className="p-1 border-t sm:border-t-0 border-gray-200">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Điểm HukiXu</span>
                  <span className="font-extrabold text-sm text-amber-600 mt-0.5 block">{inspectingUser.points} xu</span>
                </div>
              </div>

              {/* DRM Linked Devices List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">devices</span>
                    Thiết Bị Đọc DRM Đã Cấp Quyền ({inspectingUser.devicesList.length}/5)
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {inspectingUser.devicesList.map((device) => (
                    <div key={device.id} className="p-3 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[16px]">
                            {device.type.includes('iOS') || device.type.includes('Android') ? 'smartphone' : 'laptop'}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-xs">{device.name}</div>
                          <span className="text-[10px] text-gray-400">
                            HĐH: {device.type} · {device.lastActive}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeDevice(inspectingUser.id, device.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10.5px] transition-colors cursor-pointer border border-rose-200 shadow-2xs"
                        title="Hủy liên kết thiết bị để bạn đọc đổi máy mới"
                      >
                        Thu Hồi DRM
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="font-bold text-gray-900 text-xs">Thao Tác Quản Trị Bạn Đọc:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRewardPoints(inspectingUser.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">stars</span>
                    <span>Thưởng +200 HukiXu</span>
                  </button>
                  <button
                    onClick={() => handleToggleLock(inspectingUser.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs ${
                      inspectingUser.status === 'locked'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {inspectingUser.status === 'locked' ? 'lock_open' : 'lock'}
                    </span>
                    <span>{inspectingUser.status === 'locked' ? 'Mở Khóa Tài Khoản' : 'Khóa Tạm Thời'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Governance Audit */}
          {userTab === 'history' && (
            <div className="space-y-3">
              <AuditHistoryTimeline
                items={userAuditLogs}
                loading={loadingAudit}
                title="Lịch Sử Thao Tác Quản Trị (User Governance Audit)"
                emptyMessage="Chưa có bản ghi lịch sử quản trị nào cho tài khoản này."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

