import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

// Seed initial users for realistic display & management
const INITIAL_USERS = [
  {
    id: 'USR-1001',
    fullName: 'Nguyễn Văn Quản Trị',
    email: 'admin@huki.vn',
    phone: '0901 888 999',
    password: 'AdminMaster2026!#',
    role: 'PLATFORM_ADMIN',
    roleLabel: 'Admin Sàn',
    storeName: null,
    status: 'ACTIVE',
    createdAt: '2025-11-10T08:00:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1002',
    fullName: 'Trần Thị Mai Anh',
    email: 'maianh.tran@gmail.com',
    phone: '0988 123 456',
    password: 'CustomerPass@123',
    role: 'CUSTOMER',
    roleLabel: 'Khách hàng',
    storeName: null,
    status: 'ACTIVE',
    createdAt: '2026-01-15T09:30:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1003',
    fullName: 'Lê Hoàng Long',
    email: 'long.le@nhanam.vn',
    phone: '0912 345 678',
    password: 'SellerSecret#99',
    role: 'SELLER_ADMIN',
    roleLabel: 'Admin Seller',
    storeName: 'Nhà Sách Nhã Nam Hà Nội',
    status: 'ACTIVE',
    createdAt: '2026-02-01T14:20:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1004',
    fullName: 'Phạm Quỳnh Nga',
    email: 'nga.pham@nhanam.vn',
    phone: '0977 456 789',
    password: 'StaffNhaNam2026',
    role: 'SELLER_STAFF',
    roleLabel: 'Nhân viên',
    storeName: 'Nhà Sách Nhã Nam Hà Nội',
    status: 'ACTIVE',
    createdAt: '2026-02-10T11:00:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1005',
    fullName: 'Vũ Quốc Bảo',
    email: 'quocbao.vu@fahasa.com',
    phone: '0933 678 901',
    password: 'FahasaOwnerPass!',
    role: 'SELLER_ADMIN',
    roleLabel: 'Admin Seller',
    storeName: 'Fahasa Nguyễn Huệ',
    status: 'ACTIVE',
    createdAt: '2026-02-20T16:45:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1006',
    fullName: 'Đặng Minh Triết',
    email: 'triet.dang@fahasa.com',
    phone: '0944 890 123',
    password: 'StaffTriet@123',
    role: 'SELLER_STAFF',
    roleLabel: 'Nhân viên',
    storeName: 'Fahasa Nguyễn Huệ',
    status: 'LOCKED',
    createdAt: '2026-03-01T10:15:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1007',
    fullName: 'Hoàng Kim Ngân',
    email: 'ngan.hoang@tienphong.vn',
    phone: '0966 234 567',
    password: 'TienPhongBoss2026',
    role: 'SELLER_ADMIN',
    roleLabel: 'Admin Seller',
    storeName: 'Nhà Sách Tiền Phong Tràng Tiền',
    status: 'ACTIVE',
    createdAt: '2026-03-05T08:30:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1008',
    fullName: 'Đỗ Thảo Vy',
    email: 'vy.dothao@gmail.com',
    phone: '0918 901 234',
    password: 'CustomerVyVy99',
    role: 'CUSTOMER',
    roleLabel: 'Khách hàng',
    storeName: null,
    status: 'ACTIVE',
    createdAt: '2026-03-12T13:10:00.000Z',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'USR-1009',
    fullName: 'Bùi Đức Trọng',
    email: 'trong.bui@gmail.com',
    phone: '0922 345 678',
    password: 'PassSpamBiKhoa12',
    role: 'CUSTOMER',
    roleLabel: 'Khách hàng',
    storeName: null,
    status: 'LOCKED',
    createdAt: '2026-03-14T15:20:00.000Z',
    avatar: null,
  }
];

const LOCAL_STORAGE_KEY = 'huki_admin_users_list_v1';

export default function AdminAccountsPage() {
  const { showToast } = useToast();

  // Load from localStorage or seed
  const [users, setUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load users from localStorage', e);
      }
    }
    return INITIAL_USERS;
  });

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
      } catch (e) {
        console.error('Failed to save users to localStorage', e);
      }
    }
  }, [users]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [visiblePasswords, setVisiblePasswords] = useState({}); // { [userId]: boolean }

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [lockingUser, setLockingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Form state for Add Customer
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: 'Customer123!@#',
    address: '',
    notes: '',
  });
  const [showNewCustPassword, setShowNewCustPassword] = useState(false);

  // Form state for Edit User
  const [editForm, setEditForm] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
    storeName: '',
    status: 'ACTIVE',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Toggle Password visibility for a specific row
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Copy password to clipboard
  const handleCopyPassword = (password, name) => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    showToast({
      title: 'Đã sao chép mật khẩu',
      message: `Mật khẩu của "${name}" đã được lưu vào bộ nhớ tạm.`,
      type: 'success',
    });
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole !== 'ALL' && u.role !== selectedRole) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && u.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = u.fullName?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        const phoneMatch = u.phone?.toLowerCase().includes(q);
        const storeMatch = u.storeName?.toLowerCase().includes(q);
        const roleMatch = u.roleLabel?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !storeMatch && !roleMatch) {
          return false;
        }
      }
      return true;
    });
  }, [users, selectedRole, selectedStatus, searchQuery]);

  // Statistics KPI calculation
  const stats = useMemo(() => {
    const total = users.length;
    const customers = users.filter((u) => u.role === 'CUSTOMER').length;
    const sellers = users.filter((u) => u.role === 'SELLER_ADMIN').length;
    const staff = users.filter((u) => u.role === 'SELLER_STAFF').length;
    const locked = users.filter((u) => u.status === 'LOCKED').length;
    return { total, customers, sellers, staff, locked };
  }, [users]);

  // Add Customer Submit Handler
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (!newCustomerForm.fullName.trim() || !newCustomerForm.email.trim() || !newCustomerForm.phone.trim()) {
      showToast({
        title: 'Thiếu thông tin',
        message: 'Vui lòng điền đầy đủ Họ tên, Email và Số điện thoại.',
        type: 'warning',
      });
      return;
    }

    // Check email uniqueness
    const exists = users.some((u) => u.email.toLowerCase() === newCustomerForm.email.trim().toLowerCase());
    if (exists) {
      showToast({
        title: 'Email đã tồn tại',
        message: 'Địa chỉ email này đã được sử dụng bởi một tài khoản khác.',
        type: 'error',
      });
      return;
    }

    const newUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      fullName: newCustomerForm.fullName.trim(),
      email: newCustomerForm.email.trim().toLowerCase(),
      phone: newCustomerForm.phone.trim(),
      password: newCustomerForm.password.trim() || 'Customer123!@#',
      role: 'CUSTOMER',
      roleLabel: 'Khách hàng',
      storeName: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      avatar: null,
    };

    setUsers((prev) => [newUser, ...prev]);
    setShowAddCustomerModal(false);
    setNewCustomerForm({
      fullName: '',
      email: '',
      phone: '',
      password: 'Customer123!@#',
      address: '',
      notes: '',
    });

    showToast({
      title: 'Thêm khách hàng thành công',
      message: `Tài khoản khách hàng "${newUser.fullName}" đã được tạo thành công.`,
      type: 'success',
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      id: user.id,
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: user.password || '',
      role: user.role,
      storeName: user.storeName || '',
      status: user.status,
    });
  };

  // Save Edit User
  const handleSaveEditSubmit = (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      showToast({
        title: 'Lỗi nhập liệu',
        message: 'Họ tên và Email không được để trống.',
        type: 'warning',
      });
      return;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === editForm.id) {
          let updatedRoleLabel = 'Khách hàng';
          if (editForm.role === 'PLATFORM_ADMIN') updatedRoleLabel = 'Admin Sàn';
          else if (editForm.role === 'SELLER_ADMIN') updatedRoleLabel = 'Admin Seller';
          else if (editForm.role === 'SELLER_STAFF') updatedRoleLabel = 'Nhân viên';

          return {
            ...u,
            fullName: editForm.fullName.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
            password: editForm.password.trim() || u.password,
            role: editForm.role,
            roleLabel: updatedRoleLabel,
            storeName: (editForm.role === 'SELLER_ADMIN' || editForm.role === 'SELLER_STAFF') ? editForm.storeName.trim() : null,
            status: editForm.status,
          };
        }
        return u;
      })
    );

    setEditingUser(null);
    showToast({
      title: 'Cập nhật thành công',
      message: `Thông tin tài khoản "${editForm.fullName}" đã được lưu.`,
      type: 'success',
    });
  };

  // Toggle Lock Confirm
  const handleConfirmLock = () => {
    if (!lockingUser) return;
    if (lockingUser.role === 'PLATFORM_ADMIN') {
      showToast({
        title: 'Thao tác bị chặn',
        message: 'Không thể khóa tài khoản Quản trị viên sàn!',
        type: 'error',
      });
      setLockingUser(null);
      return;
    }

    const nextStatus = lockingUser.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setUsers((prev) =>
      prev.map((u) => (u.id === lockingUser.id ? { ...u, status: nextStatus } : u))
    );

    const actionText = nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';
    showToast({
      title: actionText,
      message: `${actionText} "${lockingUser.fullName}" thành công.`,
      type: nextStatus === 'LOCKED' ? 'warning' : 'success',
    });
    setLockingUser(null);
  };

  // Delete User Confirm
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    if (deletingUser.role === 'PLATFORM_ADMIN') {
      showToast({
        title: 'Thao tác bị chặn',
        message: 'Không thể xóa tài khoản Quản trị viên sàn!',
        type: 'error',
      });
      setDeletingUser(null);
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
    showToast({
      title: 'Đã xóa tài khoản',
      message: `Đã xóa tài khoản "${deletingUser.fullName}" khỏi hệ thống.`,
      type: 'success',
    });
    setDeletingUser(null);
  };

  // Helper format store name with tooltip truncation
  const renderRoleBadge = (user) => {
    const role = user.role;
    const store = user.storeName;

    if (role === 'PLATFORM_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
          <span className="material-symbols-outlined text-[15px] text-purple-600">shield_person</span>
          <span>Admin Sàn</span>
        </span>
      );
    }

    if (role === 'SELLER_ADMIN') {
      const isLong = store && store.length > 10;
      const displayStore = isLong ? `${store.slice(0, 10)}...` : store;
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 group relative cursor-help transition-all hover:bg-emerald-100"
          title={store ? `Cửa hàng: ${store}` : 'Admin Seller'}
        >
          <span className="material-symbols-outlined text-[14px] text-emerald-600">store</span>
          <span>Admin Seller</span>
          {store && (
            <>
              <span className="text-emerald-500 font-normal">-</span>
              <span className="font-bold underline decoration-dotted decoration-emerald-500">
                {displayStore}
              </span>
              {isLong && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block z-30 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                  {store}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
                </div>
              )}
            </>
          )}
        </span>
      );
    }

    if (role === 'SELLER_STAFF') {
      const isLong = store && store.length > 10;
      const displayStore = isLong ? `${store.slice(0, 10)}...` : store;
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 group relative cursor-help transition-all hover:bg-blue-100"
          title={store ? `Nhân viên tại: ${store}` : 'Nhân viên'}
        >
          <span className="material-symbols-outlined text-[14px] text-blue-600">badge</span>
          <span>Nhân viên</span>
          {store && (
            <>
              <span className="text-blue-400 font-normal">-</span>
              <span className="font-bold underline decoration-dotted decoration-blue-400">
                {displayStore}
              </span>
              {isLong && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block z-30 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                  {store}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
                </div>
              )}
            </>
          )}
        </span>
      );
    }

    // Default: CUSTOMER
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="material-symbols-outlined text-[14px] text-slate-500">person</span>
        <span>Khách hàng</span>
      </span>
    );
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 min-h-screen py-6 sm:py-8 font-sans antialiased">
      <main className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 1. Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#003b2b]/10 text-[#003b2b] uppercase tracking-wider">
                Quản Trị Toàn Sàn
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 mt-1 tracking-tight">
              Quản Lý Người Dùng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tra cứu, quản trị tài khoản, phân quyền vai trò và quản lý bảo mật mật khẩu toàn hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#003b2b] hover:bg-[#002b1f] text-white font-semibold text-sm transition-all duration-200 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>Thêm Khách Hàng</span>
            </button>
          </div>
        </div>

        {/* 2. KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng Người Dùng */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Người Dùng</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{stats.total}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Toàn bộ tài khoản trên sàn</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">groups</span>
            </div>
          </div>

          {/* Card 2: Khách Hàng */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách Hàng</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">{stats.customers}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Độc giả mua sách</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            </div>
          </div>

          {/* Card 3: Sellers & Staff */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gian Hàng &amp; Nhân Sự</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-indigo-700 mt-1">{stats.sellers + stats.staff}</h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{stats.sellers} chủ shop · {stats.staff} nhân viên</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">storefront</span>
            </div>
          </div>

          {/* Card 4: Bị Khóa */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang Bị Khóa</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-red-600 mt-1">{stats.locked}</h3>
              <p className="text-[11px] text-red-500 font-medium mt-0.5">{stats.locked > 0 ? 'Cần kiểm tra vi phạm' : 'Hệ thống an toàn'}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">lock_person</span>
            </div>
          </div>
        </div>

        {/* 3. Main Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Navigation Role Filter Tabs */}
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50/50">
            {[
              { key: 'ALL', label: 'Tất Cả Người Dùng', count: stats.total },
              { key: 'CUSTOMER', label: 'Khách Hàng', count: stats.customers },
              { key: 'SELLER_ADMIN', label: 'Admin Seller', count: stats.sellers },
              { key: 'SELLER_STAFF', label: 'Nhân Viên Gian Hàng', count: stats.staff },
              { key: 'PLATFORM_ADMIN', label: 'Admin Sàn', count: users.filter(u => u.role === 'PLATFORM_ADMIN').length },
            ].map((tab) => {
              const isActive = selectedRole === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedRole(tab.key)}
                  className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#003b2b] text-[#003b2b] bg-white rounded-t-xl'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-[#003b2b]/10 text-[#003b2b]' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/30 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative min-w-[280px] sm:min-w-[340px] flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, SĐT, tên cửa hàng..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/10 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 rounded-xl pl-3.5 pr-9 py-2.5 text-xs sm:text-sm cursor-pointer hover:border-slate-300 focus:outline-none focus:border-[#003b2b]"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="LOCKED">Đã bị khóa</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  expand_more
                </span>
              </div>
            </div>

            {(searchQuery || selectedRole !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedStatus('ALL');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-4 min-w-[240px]">Người Dùng</th>
                  <th className="py-4 px-4 min-w-[140px]">Số Điện Thoại</th>
                  <th className="py-4 px-4 min-w-[180px]">Mật Khẩu</th>
                  <th className="py-4 px-4 min-w-[200px]">Vai Trò</th>
                  <th className="py-4 px-4 min-w-[130px]">Trạng Thái</th>
                  <th className="py-4 px-4 min-w-[130px]">Ngày Tham Gia</th>
                  <th className="py-4 pr-6 pl-4 text-right min-w-[150px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <span className="material-symbols-outlined text-3xl">person_search</span>
                      </div>
                      <p className="font-semibold text-base text-slate-800">Không tìm thấy người dùng nào</p>
                      <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPasswordVisible = visiblePasswords[u.id] || false;
                    const isPlatformAdmin = u.role === 'PLATFORM_ADMIN';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Người dùng: Avatar + Name + Email */}
                        <td className="py-4 pl-6 pr-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 shrink-0 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-sm">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.fullName} className="w-full h-full object-cover" />
                              ) : (
                                u.fullName?.charAt(0)?.toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate hover:text-[#003b2b]">
                                {u.fullName}
                              </span>
                              <span className="text-xs text-slate-500 block truncate">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Số điện thoại */}
                        <td className="py-4 px-4 align-middle font-mono text-xs sm:text-sm text-slate-800 whitespace-nowrap">
                          {u.phone ? (
                            <span>{u.phone}</span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa cập nhật</span>
                          )}
                        </td>

                        {/* 3. Mật khẩu (Cột ẩn/hiện mật khẩu) */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
                            <span className="font-medium text-slate-800 select-all min-w-[75px]">
                              {isPasswordVisible ? u.password || '••••••••' : '••••••••'}
                            </span>
                            
                            {/* Toggle Eye Button */}
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                              title={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                              aria-label="Ẩn hiện mật khẩu"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isPasswordVisible ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(u.password, u.fullName)}
                              className="p-1 rounded-lg text-slate-500 hover:text-[#003b2b] hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Sao chép mật khẩu"
                              aria-label="Sao chép mật khẩu"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                          </div>
                        </td>

                        {/* 4. Vai trò (Role + Store Tooltip) */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {renderRoleBadge(u)}
                        </td>

                        {/* 5. Trạng thái */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {u.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Hoạt động</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>Đã khóa</span>
                            </span>
                          )}
                        </td>

                        {/* 6. Ngày tham gia */}
                        <td className="py-4 px-4 align-middle text-slate-500 whitespace-nowrap text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                        </td>

                        {/* 7. Thao tác (Sửa, Khóa, Xóa) */}
                        <td className="py-4 pr-6 pl-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Nút Sửa */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                              title="Chỉnh sửa thông tin"
                            >
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </button>

                            {/* Nút Khóa / Mở khóa (Admin Sàn bị vô hiệu hóa) */}
                            {isPlatformAdmin ? (
                              <button
                                disabled
                                className="p-1.5 rounded-lg border border-slate-100 text-slate-300 opacity-40 cursor-not-allowed"
                                title="Tài khoản Admin Sàn không thể bị khóa"
                              >
                                <span className="material-symbols-outlined text-[17px]">lock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setLockingUser(u)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                                  u.status === 'LOCKED'
                                    ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                    : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                }`}
                                title={u.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {u.status === 'LOCKED' ? 'lock_open' : 'lock'}
                                </span>
                              </button>
                            )}

                            {/* Nút Xóa (Admin Sàn bị vô hiệu hóa) */}
                            {isPlatformAdmin ? (
                              <button
                                disabled
                                className="p-1.5 rounded-lg border border-slate-100 text-slate-300 opacity-40 cursor-not-allowed"
                                title="Tài khoản Admin Sàn không thể bị xóa"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer shadow-2xs"
                                title="Xóa tài khoản"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Info bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị <strong className="text-slate-800">{filteredUsers.length}</strong> trên tổng số <strong className="text-slate-800">{users.length}</strong> người dùng
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Hệ thống cơ sở dữ liệu đồng bộ an toàn</span>
            </div>
          </div>
        </div>
      </main>

      {/* ===================== MODAL 1: THÊM KHÁCH HÀNG (CHỈ DÀNH CHO CUSTOMER) ===================== */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-[#003b2b]">
                <div className="w-10 h-10 rounded-xl bg-[#003b2b]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-[#003b2b]">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Thêm Khách Hàng Mới</h3>
                  <p className="text-xs text-slate-500">Tạo tài khoản người mua sách mới trên hệ thống sàn HUKI</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              {/* Họ tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.fullName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Thị Lan Anh..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
              </div>

              {/* Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    placeholder="VD: lananh@gmail.com..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="VD: 0988 123 456..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                </div>
              </div>

              {/* Mật khẩu khởi tạo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu ban đầu <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewCustPassword ? 'text' : 'password'}
                    required
                    value={newCustomerForm.password}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                    placeholder="Nhập mật khẩu..."
                    className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewCustPassword(!showNewCustPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    title={showNewCustPassword ? 'Ẩn' : 'Hiện'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showNewCustPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Khách hàng có thể đổi mật khẩu sau khi đăng nhập.</p>
              </div>

              {/* Địa chỉ giao hàng mặc định */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ giao hàng mặc định (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  placeholder="VD: Số 12 Nguyễn Văn Bảo, Phường 5, Gò Vấp, TP.HCM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
              </div>

              {/* Notice note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
                <span className="material-symbols-outlined text-base text-blue-600 shrink-0 mt-0.5">info</span>
                <span>Form này được thiết kế riêng để thêm người dùng với vai trò <strong>Khách hàng</strong>. Tài khoản Admin Seller và Nhân viên được đăng ký và phân quyền qua quy trình duyệt hồ sơ doanh nghiệp.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold bg-[#003b2b] hover:bg-[#002b1f] text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                  <span>Tạo Khách Hàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: CHỈNH SỬA THÔNG TIN NGƯỜI DÙNG ===================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <span className="material-symbols-outlined text-2xl">edit_note</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Chỉnh Sửa Người Dùng</h3>
                  <p className="text-xs text-slate-500">Cập nhật hồ sơ và vai trò của tài khoản</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              {/* Họ tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
              </div>

              {/* Email & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Để trống nếu không đổi mật khẩu..."
                    className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showEditPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Vai trò & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò</label>
                  <select
                    disabled={editingUser.role === 'PLATFORM_ADMIN'}
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="CUSTOMER">Khách hàng</option>
                    <option value="SELLER_ADMIN">Admin Seller (Chủ shop)</option>
                    <option value="SELLER_STAFF">Nhân viên gian hàng</option>
                    {editingUser.role === 'PLATFORM_ADMIN' && <option value="PLATFORM_ADMIN">Admin Sàn</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    disabled={editingUser.role === 'PLATFORM_ADMIN'}
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="LOCKED">Đã khóa (Locked)</option>
                  </select>
                </div>
              </div>

              {/* Tên cửa hàng nếu là SELLER */}
              {(editForm.role === 'SELLER_ADMIN' || editForm.role === 'SELLER_STAFF') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Cửa Hàng / Doanh Nghiệp
                  </label>
                  <input
                    type="text"
                    value={editForm.storeName}
                    onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                    placeholder="VD: Nhà Sách Nhã Nam Hà Nội..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nếu tên dài hơn 10 ký tự, hệ thống sẽ tự động hiển thị rút gọn kèm tooltip khi rê chuột.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold bg-[#003b2b] hover:bg-[#002b1f] text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: XÁC NHẬN KHÓA / MỞ KHÓA ===================== */}
      {lockingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                lockingUser.status === 'LOCKED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {lockingUser.status === 'LOCKED' ? 'lock_open' : 'lock'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {lockingUser.status === 'LOCKED' ? 'Mở Khóa Tài Khoản?' : 'Khóa Tài Khoản Người Dùng?'}
                </h3>
                <p className="text-xs text-slate-500">{lockingUser.fullName} ({lockingUser.email})</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              {lockingUser.status === 'LOCKED'
                ? 'Sau khi mở khóa, người dùng này có thể đăng nhập và tiếp tục sử dụng tất cả dịch vụ trên sàn HUKI.'
                : 'Khi bị khóa, tài khoản này sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể thực hiện các giao dịch trên sàn.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLockingUser(null)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmLock}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer shadow-sm ${
                  lockingUser.status === 'LOCKED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {lockingUser.status === 'LOCKED' ? 'Xác nhận Mở khóa' : 'Xác nhận Khóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 4: XÁC NHẬN XÓA TÀI KHOẢN ===================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xóa Tài Khoản Người Dùng?</h3>
                <p className="text-xs text-slate-500">{deletingUser.fullName} ({deletingUser.email})</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này sẽ vô hiệu hóa hoàn toàn thông tin người dùng khỏi hệ thống.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
