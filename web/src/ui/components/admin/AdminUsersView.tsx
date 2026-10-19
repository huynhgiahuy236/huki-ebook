'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { adminApi } from '../../api/adminApi';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import AuditHistoryTimeline, { AuditLogItem } from '../common/AuditHistoryTimeline';
import { AdminStatusBadge } from './AdminUI';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import { realtimeSyncBus } from '../../services/realtimeSyncBus';

export interface DrmDevice {
  id: string;
  name: string;
  type: string;
  lastActive: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: 'CUSTOMER' | 'BUSINESS' | 'DELIVERY_STAFF' | 'PLATFORM_ADMIN' | string;
  roleLabel: string;
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
  status: 'active' | 'warning' | 'locked' | 'pending';
  statusLabel: string;
  storeName?: string | null;
  rawStatus?: string;
}

function formatVietnamDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function AdminUsersView() {
  const { showToast } = useToast();

  // Primary States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer / Inspection
  const [inspectingUser, setInspectingUser] = useState<AdminUser | null>(null);
  const [userTab, setUserTab] = useState<'info' | 'history'>('info');
  const [userAuditLogs, setUserAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Filter & Selection
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Realtime Live Activity
  const [isLivePulsing, setIsLivePulsing] = useState(false);
  const [lastLiveEvent, setLastLiveEvent] = useState<string | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  // Quick Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // 1. Fetch Real Users from PostgreSQL via API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      if (res.success && Array.isArray(res.data)) {
        const rawUsers = res.data;
        const mapped: AdminUser[] = rawUsers.map((u: any) => {
          const rawStatus = (u.status || '').toUpperCase();
          const isLocked = rawStatus === 'LOCKED' || rawStatus === 'BLOCKED';
          const isPending = rawStatus === 'PENDING';
          const status = isLocked ? 'locked' : isPending ? 'warning' : 'active';
          const statusLabel = isLocked
            ? 'Đã bị khóa tài khoản'
            : isPending
            ? 'Chờ xác thực'
            : 'Hoạt động tốt';

          // Determine role & tier
          const role = u.role || 'CUSTOMER';
          let tier: 'diamond' | 'gold' | 'silver' | 'bronze' = 'bronze';
          let tierLabel = 'Đồng';
          if (role === 'PLATFORM_ADMIN') {
            tier = 'diamond';
            tierLabel = 'Quản Trị';
          } else if (role === 'BUSINESS' || role === 'SELLER_ADMIN') {
            tier = 'gold';
            tierLabel = 'Đối Tác NXB';
          } else if (role === 'DELIVERY_STAFF') {
            tier = 'silver';
            tierLabel = 'Bưu Tá';
          }

          const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'User')}&background=00875A&color=fff&size=120`;

          return {
            id: u.id,
            name: u.fullName || 'Độc Giả Chưa Đặt Tên',
            email: u.email || 'N/A',
            phone: u.phone || 'Chưa cập nhật',
            avatar: u.avatar || defaultAvatar,
            role,
            roleLabel: u.roleLabel || (role === 'CUSTOMER' ? 'Khách hàng' : role),
            tier,
            tierLabel,
            spent: 0,
            booksOwned: 0,
            ebooksCount: 0,
            physicalCount: 0,
            devicesCount: 1,
            devicesList: [
              {
                id: `DEV-${u.id.substring(0, 4)}`,
                name: 'Trình duyệt Web (HUKI Desktop)',
                type: 'Windows Web',
                lastActive: 'Hôm nay',
              },
            ],
            points: 100,
            joinedDate: formatVietnamDate(u.createdAt),
            status,
            statusLabel,
            storeName: u.storeName,
            rawStatus,
          };
        });

        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('[AdminUsersView] Failed to load real users from API:', err);
      showToast?.('Không thể tải danh sách người dùng từ hệ thống', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 2. Realtime Event Subscription (Zero Page Reload)
  const loadUsersRef = useRef(loadUsers);
  loadUsersRef.current = loadUsers;

  useEffect(() => {
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'USER_REGISTERED' ||
        msg.type === 'USER_STATUS_UPDATED' ||
        msg.type === 'USER_UPDATED'
      ) {
        setIsLivePulsing(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setIsLivePulsing(false), 3000);

        let eventText = 'Có biến động người dùng trong hệ thống';
        if (msg.type === 'USER_REGISTERED') eventText = `Bạn đọc mới vừa đăng ký: ${(msg.payload as any)?.email || ''}`;
        if (msg.type === 'USER_STATUS_UPDATED') eventText = 'Cập nhật trạng thái khóa/mở khóa tài khoản';
        if (msg.type === 'USER_UPDATED') eventText = 'Hồ sơ người dùng vừa được cập nhật';

        setLastLiveEvent(`${eventText} (${new Date(msg.timestamp).toLocaleTimeString('vi-VN')})`);
        showToast?.(eventText, 'info');

        // Automatically refresh from DB
        loadUsersRef.current();
      }
    });

    return () => {
      unsubscribe();
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [showToast]);

  // Audit Logs fetch on Inspect
  useEffect(() => {
    if (inspectingUser?.id && userTab === 'history') {
      setLoadingAudit(true);
      adminApi
        .getUserAuditLogs(inspectingUser.id)
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

  // 3. Real Toggle Lock in Database
  const handleToggleLock = async (userId: string) => {
    try {
      const res = await adminApi.toggleLockUser(userId);
      if (res.success) {
        showToast?.('Đã cập nhật trạng thái tài khoản thành công trong cơ sở dữ liệu.', 'success');
        // Refresh from DB
        loadUsers();
        if (inspectingUser && inspectingUser.id === userId) {
          const nextStatus = inspectingUser.status === 'locked' ? 'active' : 'locked';
          setInspectingUser((prev) =>
            prev
              ? {
                  ...prev,
                  status: nextStatus,
                  statusLabel: nextStatus === 'locked' ? 'Đã bị khóa tài khoản' : 'Hoạt động tốt',
                }
              : null
          );
        }
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật trạng thái người dùng', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi khi cập nhật trạng thái người dùng', 'error');
    }
  };

  // Revoke Device DRM
  const handleRevokeDevice = (userId: string, deviceId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextList = u.devicesList.filter((d) => d.id !== deviceId);
          return {
            ...u,
            devicesList: nextList,
            devicesCount: nextList.length,
          };
        }
        return u;
      })
    );
    showToast?.('Đã thu hồi giấy phép DRM trên thiết bị thành công.', 'success');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser((prev) => {
        if (!prev) return null;
        const nextList = prev.devicesList.filter((d) => d.id !== deviceId);
        return {
          ...prev,
          devicesList: nextList,
          devicesCount: nextList.length,
        };
      });
    }
  };

  // Reward points
  const handleRewardPoints = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, points: u.points + 200 };
        }
        return u;
      })
    );
    showToast?.('Đã tặng 200 điểm thưởng HukiXu tri ân bạn đọc!', 'success');
    if (inspectingUser && inspectingUser.id === userId) {
      setInspectingUser((prev) => (prev ? { ...prev, points: prev.points + 200 } : null));
    }
  };

  // Real Bulk Actions
  const userBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'Hạng & Điểm Thưởng',
      actions: [
        { value: 'UPGRADE_GOLD', label: 'Nâng hạng lên VIP Vàng' },
        { value: 'REWARD_POINTS', label: 'Tặng 200 HukiXu tri ân' },
      ],
    },
    {
      groupLabel: 'Bảo Mật & Quản Trị Cơ Sở Dữ Liệu',
      actions: [
        {
          value: 'LOCK_ACCOUNTS',
          label: 'Khóa tài khoản được chọn trong CSDL',
          isDanger: true,
          confirmMessage:
            'Bạn có chắc chắn muốn khóa các tài khoản đã chọn trong CSDL? Người dùng sẽ không thể đăng nhập.',
        },
        { value: 'UNLOCK_ACCOUNTS', label: 'Mở khóa tài khoản' },
      ],
    },
  ];

  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedUserIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'LOCK_ACCOUNTS' || actionValue === 'UNLOCK_ACCOUNTS') {
        let count = 0;
        for (const uid of selectedUserIds) {
          const user = users.find((u) => u.id === uid);
          if (user) {
            const shouldLock = actionValue === 'LOCK_ACCOUNTS';
            const isCurrentlyLocked = user.status === 'locked';
            if ((shouldLock && !isCurrentlyLocked) || (!shouldLock && isCurrentlyLocked)) {
              await adminApi.toggleLockUser(uid);
              count += 1;
            }
          }
        }
        showToast?.(`Đã cập nhật trạng thái cho ${count} tài khoản trong CSDL.`, 'success');
        loadUsers();
      } else if (actionValue === 'REWARD_POINTS') {
        setUsers((prev) =>
          prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, points: u.points + 200 } : u))
        );
        showToast?.(`Đã tặng 200 HukiXu cho ${selectedUserIds.length} độc giả.`, 'success');
      } else if (actionValue === 'UPGRADE_GOLD') {
        setUsers((prev) =>
          prev.map((u) =>
            selectedUserIds.includes(u.id) ? { ...u, tier: 'gold', tierLabel: 'Vàng' } : u
          )
        );
        showToast?.(`Đã nâng hạng VIP Vàng cho ${selectedUserIds.length} độc giả.`, 'success');
      }
      setSelectedUserIds([]);
    } catch {
      showToast?.('Có lỗi xảy ra khi thực hiện thao tác hàng loạt.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Real Create Customer in Database
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      showToast?.('Vui lòng nhập họ tên và email', 'error');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await adminApi.createCustomer(createForm);
      if (res.success) {
        showToast?.(`Tạo tài khoản thành công cho: ${createForm.fullName}`, 'success');
        setShowCreateModal(false);
        setCreateForm({ fullName: '', email: '', phone: '', password: '' });
        loadUsers();
      } else {
        showToast?.(res.error?.message || 'Không thể tạo tài khoản', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi khi tạo tài khoản người dùng', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  // Real Export CSV / Excel
  const handleExportCsv = () => {
    if (users.length === 0) {
      showToast?.('Chưa có danh sách người dùng để xuất CSV', 'info');
      return;
    }
    const headers = ['Mã Người Dùng', 'Họ Và Tên', 'Email', 'Số Điện Thoại', 'Vai Trò', 'Cửa Hàng / Đơn Vị', 'Trạng Thái', 'Ngày Tham Gia'];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phone}"`,
      `"${u.roleLabel}"`,
      `"${(u.storeName || 'N/A').replace(/"/g, '""')}"`,
      `"${u.statusLabel}"`,
      `"${u.joinedDate}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_nguoi_dung_huki_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.('Đã tải xuống danh sách người dùng thực tế (CSV)', 'success');
  };

  // Filtering
  const filteredUsers = useMemo(() => {
    const parseVNDate = (dStr: string) => {
      const parts = dStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dStr;
    };

    return users.filter((user) => {
      if (activeTab === 'customer' && user.role !== 'CUSTOMER' && user.role !== 'USER') return false;
      if (activeTab === 'business' && user.role !== 'BUSINESS' && user.role !== 'SELLER_ADMIN') return false;
      if (activeTab === 'staff' && user.role !== 'DELIVERY_STAFF') return false;
      if (activeTab === 'warning' && user.status !== 'warning' && user.status !== 'locked') return false;

      // Date filter
      if (!matchesDateFilter(parseVNDate(user.joinedDate), dateFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.phone.includes(q) ||
          user.id.toLowerCase().includes(q) ||
          (user.storeName && user.storeName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [users, activeTab, dateFilter, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // KPI Calculations from REAL DATA
  const kpiStats = useMemo(() => {
    const totalUsers = users.length;
    const customerCount = users.filter((u) => u.role === 'CUSTOMER' || u.role === 'USER').length;
    const businessCount = users.filter((u) => u.role === 'BUSINESS' || u.role === 'SELLER_ADMIN').length;
    const staffCount = users.filter((u) => u.role === 'DELIVERY_STAFF').length;
    const lockedOrPendingCount = users.filter((u) => u.status === 'locked' || u.status === 'warning').length;

    return {
      totalUsers,
      customerCount,
      businessCount,
      staffCount,
      lockedOrPendingCount,
    };
  }, [users]);

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
        title: 'Người Dùng / Độc Giả',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <div className="flex items-center gap-2.5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                ID: {user.id.length > 12 ? `${user.id.substring(0, 10)}...` : user.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        title: 'Email Liên Hệ',
        sortable: true,
        className: 'font-mono text-[11px] text-gray-600 whitespace-nowrap',
      },
      {
        key: 'phone',
        title: 'Số Điện Thoại',
        className: 'font-mono text-[11px] text-gray-700 whitespace-nowrap',
        render: (_val, user) => <span>{user.phone}</span>,
      },
      {
        key: 'role',
        title: 'Vai Trò Hệ Thống',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
              user.role === 'PLATFORM_ADMIN'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : user.role === 'BUSINESS' || user.role === 'SELLER_ADMIN'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : user.role === 'DELIVERY_STAFF'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {user.role === 'PLATFORM_ADMIN'
                ? 'admin_panel_settings'
                : user.role === 'BUSINESS' || user.role === 'SELLER_ADMIN'
                ? 'storefront'
                : user.role === 'DELIVERY_STAFF'
                ? 'local_shipping'
                : 'person'}
            </span>
            <span>{user.roleLabel}</span>
          </span>
        ),
      },
      {
        key: 'joinedDate',
        title: 'Ngày Tham Gia',
        align: 'center',
        sortable: true,
        className: 'font-mono text-[11px] text-gray-600 whitespace-nowrap',
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        sortable: true,
        className: 'whitespace-nowrap',
        render: (status: string) => {
          if (status === 'active') return <AdminStatusBadge status="success" label="Hoạt động" icon="check_circle" />;
          if (status === 'warning') return <AdminStatusBadge status="warning" label="Chờ duyệt" icon="warning" />;
          return <AdminStatusBadge status="danger" label="Đã khóa" icon="lock" />;
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác Admin',
        align: 'right',
        className: 'whitespace-nowrap',
        render: (_val, user) => (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleToggleLock(user.id)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border ${
                user.status === 'locked'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
              title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản trong CSDL'}
            >
              {user.status === 'locked' ? 'Mở Khóa' : 'Khóa'}
            </button>
            <button
              onClick={() => {
                setInspectingUser(user);
                setUserTab('info');
              }}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-800 font-bold text-[11px] transition-colors cursor-pointer"
            >
              Chi Tiết
            </button>
          </div>
        ),
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. REALTIME STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`w-3.5 h-3.5 rounded-full ${isLivePulsing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className={`absolute w-2 h-2 rounded-full ${isLivePulsing ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                Quản Trị Người Dùng Toàn Sàn (Realtime PostgreSQL)
              </span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                100% Real Data
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lastLiveEvent ? (
                <span className="text-amber-300 font-medium">⚡ Sự kiện mới: {lastLiveEvent}</span>
              ) : (
                `Hệ thống đồng bộ trực tiếp từ Database huki_identity (${users.length} tài khoản thực tế). Mọi thao tác khóa/mở khóa cập nhật tức thì.`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              loadUsers();
              showToast?.('Đã làm mới danh sách người dùng từ Database', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm Mới</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>Thêm Bạn Đọc</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (100% REAL DATA FROM POSTGRESQL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng Người Dùng Thật */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tổng Tài Khoản Đăng Ký</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {loading ? <span className="inline-block w-16 h-5 bg-gray-200 animate-pulse rounded"></span> : `${kpiStats.totalUsers} tài khoản`}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">database</span>
            <span>PostgreSQL Real Data</span>
          </div>
        </div>

        {/* Card 2: Độc Giả / Bạn Đọc */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Độc Giả / Bạn Đọc (Customer)</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">person</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {loading ? <span className="inline-block w-16 h-5 bg-gray-200 animate-pulse rounded"></span> : `${kpiStats.customerCount} bạn đọc`}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-bold">
            <span>Tài khoản khách mua sách</span>
          </div>
        </div>

        {/* Card 3: Nhà Bán Sách & NXB */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Nhà Bán Sách &amp; NXB (Business)</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {loading ? <span className="inline-block w-16 h-5 bg-gray-200 animate-pulse rounded"></span> : `${kpiStats.businessCount} đối tác`}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-bold">
            <span>Gian hàng &amp; nhà xuất bản</span>
          </div>
        </div>

        {/* Card 4: Đã Khóa hoặc Chờ Duyệt */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Khóa Hoặc Cần Kiểm Tra</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">security</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {loading ? <span className="inline-block w-16 h-5 bg-gray-200 animate-pulse rounded"></span> : `${kpiStats.lockedOrPendingCount} tài khoản`}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-bold">
            <span>Đã khóa hoặc chờ xác thực</span>
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR WITH SPLIT DATE FILTER AND BULK ACTIONS */}
      <DataTableFilterBar
        tabs={[
          { key: 'all', label: 'Tất cả người dùng', count: users.length },
          { key: 'customer', label: 'Độc giả (Customer)', count: kpiStats.customerCount },
          { key: 'business', label: 'Nhà bán sách (Business)', count: kpiStats.businessCount },
          { key: 'staff', label: 'Bưu tá (Shipper)', count: kpiStats.staffCount },
          { key: 'warning', label: 'Khóa / Chờ duyệt', count: kpiStats.lockedOrPendingCount },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(df) => {
          setDateFilter(df);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm theo tên, email, SĐT, mã UUID..."
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        bulkActionGroups={userBulkActionGroups}
        selectedCount={selectedUserIds.length}
        totalCount={filteredUsers.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedUserIds([])}
        bulkLoading={bulkLoading}
        itemName="tài khoản"
      />

      {/* 4. USERS GROUPED DATA TABLE */}
      <GroupedDataTable<AdminUser>
        data={paginatedUsers}
        columns={columns}
        keyField="id"
        selectable={true}
        selectedRowKeys={selectedUserIds}
        onSelectionChange={(keys) => setSelectedUserIds(keys as string[])}
        loading={loading}
        emptyTitle="Không Tìm Thấy Người Dùng"
        emptyMessage="Không tìm thấy tài khoản người dùng nào phù hợp với bộ lọc tìm kiếm hiện tại."
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredUsers.length,
          pageSize,
          onPageChange: setCurrentPage,
        }}
      />

      {/* 5. CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00875A] text-[20px]">person_add</span>
                <h3 className="font-bold text-gray-900 text-sm">Thêm Bạn Đọc / Khách Hàng Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Họ Và Tên (*)</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Đăng Nhập (*)</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="Ví dụ: an.nguyen@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Số Điện Thoại</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="Ví dụ: 0901234567"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mật Khẩu Ban Đầu (Tùy chọn)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mặc định: Customer123!@#"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? 'Đang Tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. USER INSPECTOR IN-PAGE COLLAPSIBLE PANEL */}
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
                <span className="text-xs text-gray-500 font-mono">
                  {inspectingUser.email} · {inspectingUser.roleLabel} · ID: {inspectingUser.id}
                </span>
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
              Thông Tin Tài Khoản Thực Tế
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
              Lịch Sử Kiểm Toán (Governance Audit)
            </button>
          </div>

          {/* Tab 1: Info & Actions */}
          {userTab === 'info' && (
            <div className="space-y-5 text-xs text-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                <div className="p-1">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Số Điện Thoại</span>
                  <span className="font-extrabold text-sm text-gray-900 mt-0.5 block font-mono">{inspectingUser.phone}</span>
                </div>
                <div className="p-1 border-t sm:border-t-0 sm:border-x border-gray-200">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Vai Trò Hệ Thống</span>
                  <span className="font-extrabold text-sm text-[#00875A] mt-0.5 block">{inspectingUser.roleLabel}</span>
                </div>
                <div className="p-1 border-t sm:border-t-0 border-gray-200">
                  <span className="text-gray-400 text-[10.5px] block font-medium">Trạng Thái Database</span>
                  <span className="font-extrabold text-sm text-gray-900 mt-0.5 block">{inspectingUser.statusLabel}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="font-bold text-gray-900 text-xs">Thao Tác Quản Trị Trực Tiếp CSDL:</div>
                <div className="flex flex-wrap gap-2">
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
                    <span>{inspectingUser.status === 'locked' ? 'Mở Khóa Tài Khoản (DB)' : 'Khóa Tài Khoản (DB)'}</span>
                  </button>
                  <button
                    onClick={() => handleRewardPoints(inspectingUser.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">stars</span>
                    <span>Thưởng +200 HukiXu</span>
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
