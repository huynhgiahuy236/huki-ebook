"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminApi } from '../../api/adminApi';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer, AdminActionButton } from './AdminUI';

// Seed initial users for fallback if API is not yet loaded
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

const LOCAL_STORAGE_KEY = 'huki_admin_users_list_v2';

export function AdminAccountsView() {
  const { showToast } = useToast();

  const [users, setUsers] = useState(INITIAL_USERS);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, any>>({});

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [lockingUser, setLockingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for Add Customer
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: 'Customer123!@#',
    address: '',
    notes: '',
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState<Record<string, string>>({});
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
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Smart Form Collapse Hooks
  const isNewCustomerDirty = Boolean(
    newCustomerForm.fullName.trim() ||
    newCustomerForm.email.trim() ||
    newCustomerForm.phone.trim() ||
    newCustomerForm.address.trim() ||
    newCustomerForm.notes.trim() ||
    (newCustomerForm.password && newCustomerForm.password !== 'Customer123!@#')
  );

  const isEditDirty = Boolean(
    editingUser && (
      editForm.fullName !== (editingUser.fullName || '') ||
      editForm.email !== (editingUser.email || '') ||
      editForm.phone !== (editingUser.phone || '') ||
      editForm.password !== '' ||
      editForm.role !== editingUser.role ||
      editForm.storeName !== (editingUser.storeName || '') ||
      editForm.status !== editingUser.status
    )
  );

  const addCustomerRef = useSmartFormCollapse({
    isOpen: showAddCustomerModal,
    onClose: () => {
      setShowAddCustomerModal(false);
      setNewCustomerErrors({});
    },
    isDirty: isNewCustomerDirty,
  });

  const editUserRef = useSmartFormCollapse({
    isOpen: Boolean(editingUser),
    onClose: () => {
      setEditingUser(null);
      setEditErrors({});
    },
    isDirty: isEditDirty,
  });

  // Load users from Real Backend Database API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setUsers(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data));
        }
      } else {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) setUsers(JSON.parse(saved));
          else setUsers(INITIAL_USERS);
        }
      }
    } catch (err) {
      console.warn('[AdminAccountsPage] Could not load from DB API, using local state cache', err);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) setUsers(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Toggle Password visibility for a specific row
  const togglePasswordVisibility = (userId: any) => {
    setVisiblePasswords((prev: any) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Copy password to clipboard
  const handleCopyPassword = (password: any, name: any) => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    showToast?.({
      title: 'Đã sao chép mật khẩu',
      message: `Mật khẩu của "${name}" đã được lưu vào bộ nhớ tạm.`,
      type: 'success',
    });
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      if (selectedRole !== 'ALL' && u.role !== selectedRole) {
        return false;
      }
      if (selectedStatus !== 'ALL' && u.status !== selectedStatus) {
        return false;
      }
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

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Statistics KPI calculation
  const stats = useMemo(() => {
    const total = users.length;
    const customers = users.filter((u: any) => u.role === 'CUSTOMER').length;
    const sellers = users.filter((u: any) => u.role === 'SELLER_ADMIN').length;
    const staff = users.filter((u: any) => u.role === 'SELLER_STAFF').length;
    const locked = users.filter((u: any) => u.status === 'LOCKED' || u.status === 'BLOCKED').length;
    return { total, customers, sellers, staff, locked };
  }, [users]);

  const validateNewCustomer = () => {
    const errs: Record<string, string> = {};
    if (!newCustomerForm.fullName.trim()) {
      errs.fullName = "Họ và tên khách hàng không được để trống.";
    } else if (newCustomerForm.fullName.trim().length < 2) {
      errs.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newCustomerForm.email.trim()) {
      errs.email = "Địa chỉ email không được để trống.";
    } else if (!emailRegex.test(newCustomerForm.email.trim())) {
      errs.email = "Định dạng email không hợp lệ (ví dụ: user@domain.com).";
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!newCustomerForm.phone.trim()) {
      errs.phone = "Số điện thoại không được để trống.";
    } else if (!phoneRegex.test(newCustomerForm.phone.trim().replace(/\s/g, ''))) {
      errs.phone = "Số điện thoại Việt Nam không hợp lệ.";
    }

    if (!newCustomerForm.password.trim()) {
      errs.password = "Mật khẩu ban đầu không được để trống.";
    } else if (newCustomerForm.password.trim().length < 6) {
      errs.password = "Mật khẩu ban đầu phải có tối thiểu 6 ký tự.";
    }

    setNewCustomerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Add Customer Submit Handler
  const handleAddCustomerSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateNewCustomer()) {
      showToast?.({
        title: 'Lỗi nhập liệu',
        message: 'Vui lòng kiểm tra lại các trường báo đỏ bên dưới form.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminApi.createCustomer({
        fullName: newCustomerForm.fullName.trim(),
        email: newCustomerForm.email.trim().toLowerCase(),
        phone: newCustomerForm.phone.trim(),
        password: newCustomerForm.password.trim() || 'Customer123!@#',
      });

      if (res.success && res.data) {
        setUsers((prev: any) => [res.data, ...prev]);
        showToast?.({
          title: 'Thêm khách hàng thành công',
          message: `Đã lưu tài khoản khách hàng "${res.data.fullName}" vào cơ sở dữ liệu.`,
          type: 'success',
        });
      } else {
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
        setUsers((prev: any) => [newUser, ...prev]);
        showToast?.({
          title: 'Thêm khách hàng thành công',
          message: `Tài khoản khách hàng "${newUser.fullName}" đã được tạo.`,
          type: 'success',
        });
      }

      setShowAddCustomerModal(false);
      setNewCustomerErrors({});
      setNewCustomerForm({
        fullName: '',
        email: '',
        phone: '',
        password: 'Customer123!@#',
        address: '',
        notes: '',
      });
    } catch (err) {
      console.error(err);
      showToast?.({
        title: 'Lỗi',
        message: 'Không thể tạo khách hàng vào cơ sở dữ liệu.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditErrors({});
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

  const validateEditUser = () => {
    const errs: Record<string, string> = {};
    if (!editForm.fullName.trim()) {
      errs.fullName = "Họ và tên không được để trống.";
    } else if (editForm.fullName.trim().length < 2) {
      errs.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email.trim()) {
      errs.email = "Email không được để trống.";
    } else if (!emailRegex.test(editForm.email.trim())) {
      errs.email = "Định dạng email không hợp lệ (ví dụ: user@domain.com).";
    }

    if (editForm.phone.trim()) {
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
      if (!phoneRegex.test(editForm.phone.trim().replace(/\s/g, ''))) {
        errs.phone = "Số điện thoại Việt Nam không hợp lệ.";
      }
    }

    if (editForm.password.trim() && editForm.password.trim().length < 6) {
      errs.password = "Mật khẩu mới nếu đặt lại phải có ít nhất 6 ký tự.";
    }

    if ((editForm.role === 'SELLER_ADMIN' || editForm.role === 'SELLER_STAFF') && !editForm.storeName.trim()) {
      errs.storeName = "Vui lòng nhập tên cửa hàng / doanh nghiệp của người bán.";
    }

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Edit User
  const handleSaveEditSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateEditUser()) {
      showToast?.({
        title: 'Lỗi nhập liệu',
        message: 'Vui lòng kiểm tra lại các trường lỗi trên form chỉnh sửa.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.updateUser(editForm.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        password: editForm.password.trim() || undefined,
        role: editForm.role,
        status: editForm.status,
        storeName: editForm.storeName.trim(),
      });

      setUsers((prev: any) =>
        prev.map((u: any) => {
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
      showToast?.({
        title: 'Cập nhật thành công',
        message: `Đã lưu thay đổi cho tài khoản "${editForm.fullName}" vào cơ sở dữ liệu.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast?.({
        title: 'Cập nhật thất bại',
        message: 'Có lỗi xảy ra khi cập nhật vào cơ sở dữ liệu.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Lock Confirm
  const handleConfirmLock = async () => {
    if (!lockingUser) return;
    if (lockingUser.role === 'PLATFORM_ADMIN') {
      showToast?.({
        title: 'Thao tác bị chặn',
        message: 'Không thể khóa tài khoản Quản trị viên sàn!',
        type: 'error',
      });
      setLockingUser(null);
      return;
    }

    try {
      await adminApi.toggleLockUser(lockingUser.id);
      const nextStatus = lockingUser.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
      setUsers((prev: any) =>
        prev.map((u: any) => (u.id === lockingUser.id ? { ...u, status: nextStatus } : u))
      );

      const actionText = nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';
      showToast?.({
        title: actionText,
        message: `${actionText} "${lockingUser.fullName}" trong database thành công.`,
        type: nextStatus === 'LOCKED' ? 'warning' : 'success',
      });
    } catch (err) {
      console.error(err);
      showToast?.({
        title: 'Lỗi',
        message: 'Không thể cập nhật trạng thái khóa vào database.',
        type: 'error',
      });
    } finally {
      setLockingUser(null);
    }
  };

  // Delete User Confirm
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (deletingUser.role === 'PLATFORM_ADMIN') {
      showToast?.({
        title: 'Thao tác bị chặn',
        message: 'Không thể xóa tài khoản Quản trị viên sàn!',
        type: 'error',
      });
      setDeletingUser(null);
      return;
    }

    try {
      await adminApi.deleteUser(deletingUser.id);
      setUsers((prev: any) => prev.filter((u: any) => u.id !== deletingUser.id));
      showToast?.({
        title: 'Đã xóa tài khoản',
        message: `Đã xóa tài khoản "${deletingUser.fullName}" khỏi cơ sở dữ liệu.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast?.({
        title: 'Lỗi',
        message: 'Không thể xóa người dùng khỏi database.',
        type: 'error',
      });
    } finally {
      setDeletingUser(null);
    }
  };

  // Helper format store name
  const renderRoleBadge = (user: any) => {
    const role = user.role;
    const store = user.storeName;

    if (role === 'PLATFORM_ADMIN') {
      return <AdminStatusBadge status="purple" label="Admin Sàn" icon="shield_person" />;
    }
    if (role === 'SELLER_ADMIN') {
      return (
        <span
          title={store ? `Doanh nghiệp / Gian hàng: ${store}` : 'Admin Gian Hàng'}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-help transition-all hover:bg-emerald-100"
        >
          <span className="material-symbols-outlined text-[13px] text-emerald-600">store</span>
          <span>Admin Seller</span>
          {store && (
            <span className="material-symbols-outlined text-[12px] text-emerald-500">info</span>
          )}
        </span>
      );
    }
    if (role === 'SELLER_STAFF') {
      return (
        <span
          title={store ? `Doanh nghiệp / Gian hàng: ${store}` : 'Nhân viên Gian Hàng'}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-help transition-all hover:bg-blue-100"
        >
          <span className="material-symbols-outlined text-[13px] text-blue-600">badge</span>
          <span>Nhân viên</span>
          {store && (
            <span className="material-symbols-outlined text-[12px] text-blue-500">info</span>
          )}
        </span>
      );
    }
    return <AdminStatusBadge status="neutral" label="Khách hàng" icon="person" />;
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 tracking-tight">
            Quản Lý Tài Khoản &amp; Người Dùng
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Quản trị toàn bộ tài khoản khách hàng, chủ shop và phân quyền hệ thống</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Làm mới dữ liệu từ Database"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Tổng Người Dùng</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</h3>
            <p className="text-[10.5px] text-gray-400 mt-0.5">Toàn bộ tài khoản</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">groups</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Khách Hàng</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#00875A] mt-1">{stats.customers}</h3>
            <p className="text-[10.5px] text-emerald-600 font-medium mt-0.5">Độc giả mua sách</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">shopping_bag</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Gian Hàng &amp; Nhân Sự</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{stats.sellers + stats.staff}</h3>
            <p className="text-[10.5px] text-indigo-600 font-medium mt-0.5">{stats.sellers} chủ shop · {stats.staff} nhân viên</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Đang Bị Khóa</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-red-600 mt-1">{stats.locked}</h3>
            <p className="text-[10.5px] text-red-500 font-medium mt-0.5">{stats.locked > 0 ? 'Cần kiểm tra' : 'An toàn'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">lock_person</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <AdminFilterTabs
          tabs={[
            { key: 'ALL', label: 'Tất Cả', count: stats.total },
            { key: 'CUSTOMER', label: 'Khách Hàng', count: stats.customers },
            { key: 'SELLER_ADMIN', label: 'Admin Seller', count: stats.sellers },
            { key: 'SELLER_STAFF', label: 'Nhân Viên', count: stats.staff },
            { key: 'PLATFORM_ADMIN', label: 'Admin Sàn', count: users.filter(u => u.role === 'PLATFORM_ADMIN').length },
          ]}
          activeTab={selectedRole}
          onChange={(tab) => {
            setSelectedRole(tab);
            setCurrentPage(1);
          }}
        />

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 focus:border-[#00875A] focus:outline-none text-gray-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã bị khóa</option>
          </select>

          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm tên, email, SĐT..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <AdminTableContainer>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">person_search</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Không Tìm Thấy Người Dùng Nào</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1350px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Người Dùng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Email</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Số Điện Thoại</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mật Khẩu</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Vai Trò</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ngày Tham Gia</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map((u: any, idx: number) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isPasswordVisible = visiblePasswords[u.id] || false;
                  const isPlatformAdmin = u.role === 'PLATFORM_ADMIN';

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                        {itemIndex}
                      </td>

                      {/* 2. Người Dùng: Avatar + Name */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 shrink-0 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.fullName} className="w-full h-full object-cover" />
                            ) : (
                              u.fullName?.charAt(0)?.toUpperCase() || 'U'
                            )}
                          </div>
                          <div className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors">
                            {u.fullName}
                          </div>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-gray-600">
                        {u.email}
                      </td>

                      {/* 4. Số điện thoại */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-gray-700">
                        {u.phone || <span className="text-gray-400 italic">Chưa cập nhật</span>}
                      </td>

                      {/* 5. Mật khẩu */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          title="Mật khẩu người dùng được băm bảo mật 1 chiều bằng Bcrypt trong database, không thể giải mã xem trực tiếp. Có thể đặt lại mật khẩu mới khi bấm Sửa."
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-600 shadow-2xs cursor-help"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">lock</span>
                          <span>Đã mã hóa Bcrypt</span>
                        </span>
                      </td>

                      {/* 6. Vai trò */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderRoleBadge(u)}
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {u.status === 'ACTIVE' ? (
                          <AdminStatusBadge status="success" label="Hoạt động" icon="check_circle" />
                        ) : (
                          <AdminStatusBadge status="danger" label="Đã khóa" icon="lock" />
                        )}
                      </td>

                      {/* 8. Ngày tham gia */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                      </td>

                      {/* 9. Thao tác */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AdminActionButton
                            variant="edit"
                            icon="edit"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            title="Chỉnh sửa thông tin"
                          />

                          {isPlatformAdmin ? (
                            <AdminActionButton
                              variant="neutral"
                              icon="lock"
                              size="sm"
                              disabled
                              title="Tài khoản Admin Sàn không thể bị khóa"
                            />
                          ) : (
                            <AdminActionButton
                              variant={u.status === 'LOCKED' || u.status === 'BLOCKED' ? 'unlock' : 'lock'}
                              icon={u.status === 'LOCKED' || u.status === 'BLOCKED' ? 'lock_open' : 'lock'}
                              size="sm"
                              onClick={() => setLockingUser(u)}
                              title={u.status === 'LOCKED' || u.status === 'BLOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            />
                          )}

                          {isPlatformAdmin ? (
                            <AdminActionButton
                              variant="neutral"
                              icon="delete"
                              size="sm"
                              disabled
                              title="Tài khoản Admin Sàn không thể bị xóa"
                            />
                          ) : (
                            <AdminActionButton
                              variant="danger"
                              icon="delete"
                              size="sm"
                              onClick={() => setDeletingUser(u)}
                              title="Xóa tài khoản"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="tài khoản"
        />
      </AdminTableContainer>

      {/* ===================== IN-PAGE FORM 1: THÊM KHÁCH HÀNG MỚI ===================== */}
      {showAddCustomerModal && (
        <div ref={addCustomerRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold border border-emerald-200">
                <span className="material-symbols-outlined text-xl">person_add</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Thêm Khách Hàng Mới</h3>
                <p className="text-xs text-gray-500">Lưu thông tin khách hàng mới trực tiếp vào cơ sở dữ liệu hệ thống</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAddCustomerModal(false);
                setNewCustomerErrors({});
              }}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleAddCustomerSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Họ và tên khách hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newCustomerForm.fullName}
                onChange={(e: any) => {
                  setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value });
                  if (newCustomerErrors.fullName) setNewCustomerErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                placeholder="VD: Nguyễn Thị Lan Anh..."
                className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                  newCustomerErrors.fullName ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                }`}
              />
              {newCustomerErrors.fullName && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  <span>{newCustomerErrors.fullName}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e: any) => {
                    setNewCustomerForm({ ...newCustomerForm, email: e.target.value });
                    if (newCustomerErrors.email) setNewCustomerErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="VD: lananh@gmail.com..."
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                    newCustomerErrors.email ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
                {newCustomerErrors.email && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    <span>{newCustomerErrors.email}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={(e: any) => {
                    setNewCustomerForm({ ...newCustomerForm, phone: e.target.value });
                    if (newCustomerErrors.phone) setNewCustomerErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="VD: 0988 123 456..."
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                    newCustomerErrors.phone ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
                {newCustomerErrors.phone && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    <span>{newCustomerErrors.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mật khẩu ban đầu <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewCustPassword ? 'text' : 'password'}
                  value={newCustomerForm.password}
                  onChange={(e: any) => {
                    setNewCustomerForm({ ...newCustomerForm, password: e.target.value });
                    if (newCustomerErrors.password) setNewCustomerErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Nhập mật khẩu..."
                  className={`w-full pl-3.5 pr-10 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 font-mono focus:outline-none transition-all ${
                    newCustomerErrors.password ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewCustPassword(!showNewCustPassword)}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  title={showNewCustPassword ? 'Ẩn' : 'Hiện'}
                >
                  <span className="material-symbols-outlined text-base">
                    {showNewCustPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Địa chỉ giao hàng mặc định (Tùy chọn)
              </label>
              <input
                type="text"
                value={newCustomerForm.address}
                onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                placeholder="VD: Số 12 Nguyễn Văn Bảo, Phường 5, Gò Vấp, TP.HCM"
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomerErrors({});
                }}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer text-gray-700"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-[#00875A] hover:bg-[#00734c] text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Đang lưu...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Lưu Vào Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== IN-PAGE FORM 2: CHỈNH SỬA THÔNG TIN NGƯỜI DÙNG ===================== */}
      {editingUser && (
        <div ref={editUserRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <span className="material-symbols-outlined text-xl">edit_note</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Chỉnh Sửa Thông Tin Người Dùng</h3>
                <p className="text-xs text-gray-500">Tài khoản: <strong>{editingUser.fullName}</strong></p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setEditErrors({});
              }}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveEditSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e: any) => {
                  setEditForm({ ...editForm, fullName: e.target.value });
                  if (editErrors.fullName) setEditErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                  editErrors.fullName ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e: any) => {
                    setEditForm({ ...editForm, email: e.target.value });
                    if (editErrors.email) setEditErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                    editErrors.email ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e: any) => {
                    setEditForm({ ...editForm, phone: e.target.value });
                    if (editErrors.phone) setEditErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                    editErrors.phone ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mật khẩu mới (Nếu cần đặt lại)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editForm.password}
                  onChange={(e: any) => {
                    setEditForm({ ...editForm, password: e.target.value });
                    if (editErrors.password) setEditErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Để trống nếu giữ nguyên mật khẩu..."
                  className={`w-full pl-3.5 pr-10 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 font-mono focus:outline-none transition-all ${
                    editErrors.password ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  title={showEditPassword ? 'Ẩn' : 'Hiện'}
                >
                  <span className="material-symbols-outlined text-base">
                    {showEditPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Vai trò</label>
                <select
                  disabled={editingUser.role === 'PLATFORM_ADMIN'}
                  value={editForm.role}
                  onChange={(e: any) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                  <option value="SELLER_ADMIN">Admin Seller (Chủ shop)</option>
                  <option value="SELLER_STAFF">Nhân viên gian hàng (SELLER_STAFF)</option>
                  {editingUser.role === 'PLATFORM_ADMIN' && <option value="PLATFORM_ADMIN">Admin Sàn</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Trạng thái</label>
                <select
                  disabled={editingUser.role === 'PLATFORM_ADMIN'}
                  value={editForm.status}
                  onChange={(e: any) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#00875A] focus:bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="ACTIVE">Hoạt động (Active)</option>
                  <option value="LOCKED">Đã khóa (Locked)</option>
                </select>
              </div>
            </div>

            {(editForm.role === 'SELLER_ADMIN' || editForm.role === 'SELLER_STAFF') && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Cửa Hàng / Doanh Nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.storeName}
                  onChange={(e: any) => {
                    setEditForm({ ...editForm, storeName: e.target.value });
                    if (editErrors.storeName) setEditErrors((prev) => ({ ...prev, storeName: "" }));
                  }}
                  placeholder="VD: Nhà Sách Nhã Nam Hà Nội..."
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs text-gray-900 focus:outline-none transition-all ${
                    editErrors.storeName ? "border-rose-400 focus:border-rose-500 bg-rose-50/30" : "border-gray-200 focus:border-[#00875A] focus:bg-white"
                  }`}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditErrors({});
                }}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer text-gray-700"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-[#00875A] hover:bg-[#00734c] text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Đang lưu...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== IN-PAGE CONFIRMATION 3: XÁC NHẬN KHÓA / MỞ KHÓA ===================== */}
      {lockingUser && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <span className="material-symbols-outlined text-xl">
                {lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED' ? 'lock_open' : 'lock'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED' ? 'Mở Khóa Tài Khoản?' : 'Khóa Tài Khoản Người Dùng?'}
              </h3>
              <p className="text-xs text-gray-500">{lockingUser.fullName} ({lockingUser.email})</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED'
              ? 'Sau khi mở khóa trong database, người dùng này có thể đăng nhập và tiếp tục sử dụng tất cả dịch vụ trên sàn HUKI.'
              : 'Khi bị khóa, tài khoản này sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể thực hiện các giao dịch trên sàn.'}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-amber-200/60">
            <button
              type="button"
              onClick={() => setLockingUser(null)}
              className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmLock}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer shadow-xs ${
                lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {lockingUser.status === 'LOCKED' || lockingUser.status === 'BLOCKED' ? 'Xác nhận Mở khóa' : 'Xác nhận Khóa'}
            </button>
          </div>
        </div>
      )}

      {/* ===================== IN-PAGE CONFIRMATION 4: XÁC NHẬN XÓA TÀI KHOẢN ===================== */}
      {deletingUser && (
        <div className="mt-4 bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">delete_forever</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Xóa Tài Khoản Người Dùng?</h3>
              <p className="text-xs text-gray-500">{deletingUser.fullName} ({deletingUser.email})</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Bạn có chắc chắn muốn xóa tài khoản này khỏi database không? Hành động này sẽ vô hiệu hóa hoàn toàn thông tin người dùng khỏi hệ thống.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-rose-200/60">
            <button
              type="button"
              onClick={() => setDeletingUser(null)}
              className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Xác nhận Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccountsView;
