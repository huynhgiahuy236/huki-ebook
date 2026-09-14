import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { memberApi } from '../../api/memberApi';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PERMISSIONS, PERMISSION_GROUPS, ROLE_PRESETS, can } from '../../utils/permissions';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  initialPassword: 'StaffPassword123!',
  selectedPreset: 'SALES_STAFF',
  permissions: ['DASHBOARD_VIEW', 'ORDER_VIEW', 'ORDER_PROCESS', 'ORDER_CANCEL', 'PRODUCT_VIEW'],
};

export default function SellerStaffPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  const businessId = user?.business?.id || activeBusinessId;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State (Direct Provisioning)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Permissions State
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [editPreset, setEditPreset] = useState('CUSTOM');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password State
  const [resetPasswordMemberId, setResetPasswordMemberId] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('NewStaffPassword123!');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Status Action State
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Delete Action State
  const [deletingMemberId, setDeletingMemberId] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load Members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    let currentBizId = businessId;

    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId(currentBizId);
        }
      } catch (err) {
        console.warn('Could not auto-fetch businessId', err);
      }
    }

    if (!currentBizId) {
      setError('Bạn chưa đăng ký doanh nghiệp hoặc hồ sơ chưa được kích hoạt.');
      setLoading(false);
      return;
    }

    try {
      const res = await memberApi.getBusinessMembers(currentBizId);
      if (res.success && Array.isArray(res.data)) {
        setMembers(res.data);
      } else {
        setError(res.error?.message || 'Không thể tải danh sách nhân viên.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [businessId, setActiveBusinessId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Handle Preset Change for Add Form
  const handleSelectPreset = (presetId) => {
    if (presetId === 'CUSTOM') {
      setFormData((prev) => ({ ...prev, selectedPreset: 'CUSTOM' }));
      return;
    }

    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        selectedPreset: presetId,
        permissions: [...preset.permissions],
      }));
    }
  };

  // Handle Permission Checkbox Toggle for Add Form
  const handleTogglePermission = (permKey) => {
    setFormData((prev) => {
      const current = prev.permissions;
      const next = current.includes(permKey)
        ? current.filter((k) => k !== permKey)
        : [...current, permKey];

      const matchingPreset = ROLE_PRESETS.find(
        (p) =>
          p.permissions.length === next.length &&
          p.permissions.every((k) => next.includes(k))
      );

      return {
        ...prev,
        selectedPreset: matchingPreset ? matchingPreset.id : 'CUSTOM',
        permissions: next,
      };
    });
  };

  // Handle Group Select/Deselect All for Add Form
  const handleToggleGroup = (group) => {
    const groupPermKeys = group.permissions.map((p) => p.key);
    const allSelected = groupPermKeys.every((k) => formData.permissions.includes(k));

    setFormData((prev) => {
      let next;
      if (allSelected) {
        next = prev.permissions.filter((k) => !groupPermKeys.includes(k));
      } else {
        next = Array.from(new Set([...prev.permissions, ...groupPermKeys]));
      }

      const matchingPreset = ROLE_PRESETS.find(
        (p) =>
          p.permissions.length === next.length &&
          p.permissions.every((k) => next.includes(k))
      );

      return {
        ...prev,
        selectedPreset: matchingPreset ? matchingPreset.id : 'CUSTOM',
        permissions: next,
      };
    });
  };

  // Submit Direct Provisioning
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showToast({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập họ và tên nhân viên.',
      });
      return;
    }

    if (!formData.email.trim()) {
      showToast({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập địa chỉ email nhân viên.',
      });
      return;
    }

    if (formData.permissions.length === 0) {
      showToast({
        type: 'error',
        title: 'Chưa cấp quyền',
        message: 'Vui lòng tích chọn ít nhất 1 quyền cho nhân viên.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const currentBizId = businessId || user?.business?.id;
      const res = await memberApi.provisionMember(currentBizId, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        initialPassword: formData.initialPassword.trim() || 'StaffPassword123!',
        permissions: formData.permissions,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Cấp tài khoản thành công',
          message: `Đã tạo tài khoản cho nhân viên ${formData.fullName} với ${formData.permissions.length} quyền.`,
        });
        setFormData(initialForm);
        setShowAddForm(false);
        loadMembers();
      } else {
        showToast({
          type: 'error',
          title: 'Không thể cấp tài khoản',
          message: res.error?.message || 'Có lỗi xảy ra khi tạo tài khoản nhân viên.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Permissions Drawer
  const handleOpenEdit = (member) => {
    if (member.role === 'OWNER') return;
    const perms = Array.isArray(member.permissions) ? member.permissions : [];
    setEditingMemberId(member.id);
    setEditPermissions([...perms]);
    const matchingPreset = ROLE_PRESETS.find(
      (p) =>
        p.permissions.length === perms.length &&
        p.permissions.every((k) => perms.includes(k))
    );
    setEditPreset(matchingPreset ? matchingPreset.id : 'CUSTOM');
  };

  // Select Preset in Edit Drawer
  const handleSelectEditPreset = (presetId) => {
    if (presetId === 'CUSTOM') {
      setEditPreset('CUSTOM');
      return;
    }
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setEditPreset(presetId);
      setEditPermissions([...preset.permissions]);
    }
  };

  // Toggle Single Permission in Edit Drawer
  const handleToggleEditPermission = (permKey) => {
    setEditPermissions((prev) => {
      const next = prev.includes(permKey)
        ? prev.filter((k) => k !== permKey)
        : [...prev, permKey];

      const matchingPreset = ROLE_PRESETS.find(
        (p) =>
          p.permissions.length === next.length &&
          p.permissions.every((k) => next.includes(k))
      );
      setEditPreset(matchingPreset ? matchingPreset.id : 'CUSTOM');
      return next;
    });
  };

  // Toggle Group in Edit Drawer
  const handleToggleEditGroup = (group) => {
    const groupPermKeys = group.permissions.map((p) => p.key);
    const allSelected = groupPermKeys.every((k) => editPermissions.includes(k));

    setEditPermissions((prev) => {
      let next;
      if (allSelected) {
        next = prev.filter((k) => !groupPermKeys.includes(k));
      } else {
        next = Array.from(new Set([...prev, ...groupPermKeys]));
      }

      const matchingPreset = ROLE_PRESETS.find(
        (p) =>
          p.permissions.length === next.length &&
          p.permissions.every((k) => next.includes(k))
      );
      setEditPreset(matchingPreset ? matchingPreset.id : 'CUSTOM');
      return next;
    });
  };

  // Save Permissions
  const handleSavePermissions = async (memberId) => {
    if (editPermissions.length === 0) {
      showToast({
        type: 'error',
        title: 'Chưa chọn quyền',
        message: 'Nhân viên phải có ít nhất 1 quyền để truy cập hệ thống.',
      });
      return;
    }

    setSavingEdit(true);
    try {
      const currentBizId = businessId || user?.business?.id;
      const res = await memberApi.updateMemberPermissions(currentBizId, memberId, editPermissions);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Cập nhật quyền thành công',
          message: `Đã cấp ${editPermissions.length} quyền cho nhân viên.`,
        });
        setEditingMemberId(null);
        loadMembers();
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi cập nhật quyền',
          message: res.error?.message || 'Không thể cập nhật phân quyền cho nhân viên.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Suspend / Active Status
  const handleToggleStatus = async (member) => {
    if (member.role === 'OWNER') return;
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setTogglingStatusId(member.id);

    try {
      const currentBizId = businessId || user?.business?.id;
      const res = await memberApi.updateMemberStatus(currentBizId, member.id, nextStatus);
      if (res.success) {
        showToast({
          type: 'success',
          title: nextStatus === 'ACTIVE' ? 'Đã kích hoạt tài khoản' : 'Đã tạm khóa tài khoản',
          message: `Nhân viên ${member.user?.fullName || ''} đã được chuyển sang trạng thái ${
            nextStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'
          }.`,
        });
        loadMembers();
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi đổi trạng thái',
          message: res.error?.message || 'Không thể thay đổi trạng thái nhân viên.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (memberId) => {
    if (!newPasswordValue.trim()) {
      showToast({
        type: 'error',
        title: 'Mật khẩu trống',
        message: 'Vui lòng nhập mật khẩu mới.',
      });
      return;
    }

    setResettingPassword(true);
    try {
      const currentBizId = businessId || user?.business?.id;
      const res = await memberApi.resetMemberPassword(
        currentBizId,
        memberId,
        newPasswordValue.trim()
      );
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Đặt lại mật khẩu thành công',
          message: `Mật khẩu mới đã được cập nhật: "${newPasswordValue.trim()}". Vui lòng bàn giao cho nhân viên.`,
        });
        setResetPasswordMemberId(null);
        setNewPasswordValue('NewStaffPassword123!');
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi đặt lại mật khẩu',
          message: res.error?.message || 'Không thể đặt lại mật khẩu.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (member) => {
    if (member.role === 'OWNER') return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa nhân viên "${member.user?.fullName || member.user?.email}" khỏi Doanh nghiệp không?`
    );
    if (!confirmDelete) return;

    setDeletingMemberId(member.id);
    try {
      const currentBizId = businessId || user?.business?.id;
      const res = await memberApi.removeMember(currentBizId, member.id);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Đã xóa nhân viên',
          message: `Nhân viên ${member.user?.fullName || ''} đã được xóa thành công.`,
        });
        loadMembers();
      } else {
        showToast({
          type: 'error',
          title: 'Lỗi xóa nhân viên',
          message: res.error?.message || 'Không thể xóa nhân viên.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setDeletingMemberId(null);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.fullName || '';
      const email = m.user?.email || '';
      const phone = m.user?.phone || '';
      const matchesSearch =
        searchQuery.trim() === '' ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && m.status === 'ACTIVE') ||
        (statusFilter === 'SUSPENDED' && m.status === 'SUSPENDED');

      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  const currentBizId = user?.business?.id || activeBusinessId;
  const canManage = can(PERMISSIONS.MEMBER_MANAGE, currentBizId, user);
  const canView = can(PERMISSIONS.MEMBER_VIEW, currentBizId, user) || canManage;

  if (!canView) {
    return (
      <div className="min-h-screen bg-surface-container-low py-16 text-on-surface">
        <div className="max-w-md mx-auto px-4 text-center space-y-4 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/60 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-error-container text-on-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface">Không Có Quyền Truy Cập (403)</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Tài khoản của bạn không được phân quyền xem hoặc quản trị nhân sự nội bộ. Vui lòng liên hệ Chủ Doanh Nghiệp (Owner) để được cấp quyền.
          </p>
          <div className="pt-2">
            <Link
              to="/seller/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95"
            >
              <span className="material-symbols-outlined text-sm">dashboard</span>
              Quay lại Bảng điều khiển
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low py-8 text-on-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <Link to="/seller/dashboard" className="hover:text-primary transition-colors">
            Kênh Người Bán
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-bold">Quản Trị Nhân Viên & Phân Quyền</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/60 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Quản Trị Nhân Viên & Phân Quyền
                </h1>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Cấp tài khoản trực tiếp, tùy biến ma trận quyền hạn và kiểm soát hoạt động nội bộ gian hàng.
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-3">
              <button
                id="btn-toggle-add-staff"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setEditingMemberId(null);
                  setResetPasswordMemberId(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
                  showAddForm
                    ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    : 'bg-primary text-white hover:opacity-95 shadow-md shadow-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {showAddForm ? 'close' : 'person_add'}
                </span>
                {showAddForm ? 'Đóng form' : 'Thêm Nhân Viên Mới'}
              </button>
            </div>
          )}
        </div>

        {/* Inline Expandable Form (Direct Provisioning) */}
        {showAddForm && (
          <div className="bg-surface-container-lowest rounded-2xl border border-primary/30 p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  Direct Provisioning
                </span>
                <h2 className="text-base font-bold text-on-surface">
                  Cấp Tài Khoản & Thiết Lập Quyền Nhân Viên
                </h2>
              </div>
              <span className="text-xs text-on-surface-variant">
                * Tài khoản được kích hoạt ngay không qua email mời
              </span>
            </div>

            <form onSubmit={handleProvisionSubmit} className="mt-6 space-y-6">
              {/* Row 1: Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Họ và tên nhân viên <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Email đăng nhập <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="VD: an.nguyen@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 0987654321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Mật khẩu khởi tạo <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mật khẩu ban đầu"
                      value={formData.initialPassword}
                      onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Chọn Preset vai trò nhanh */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                    Chọn nhanh vai trò mẫu (Role Presets)
                  </label>
                  <span className="text-xs text-on-surface-variant">
                    Đang chọn: <strong className="text-primary">{formData.permissions.length} quyền</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = formData.selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                            : 'bg-surface border-outline-variant/60 text-on-surface hover:border-outline-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold line-clamp-1">{preset.name}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                          )}
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-normal line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleSelectPreset('CUSTOM')}
                    className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                      formData.selectedPreset === 'CUSTOM'
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-surface border-outline-variant/60 text-on-surface hover:border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold">Tùy chỉnh riêng</span>
                      {formData.selectedPreset === 'CUSTOM' && (
                        <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
                      )}
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      Tự chọn quyền theo ý bạn
                    </span>
                  </button>
                </div>
              </div>

              {/* Row 3: Ma trận quyền chi tiết theo nhóm */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-bold text-on-surface">
                  Chi tiết ma trận phân quyền (Granular Permissions):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPermKeys = group.permissions.map((p) => p.key);
                    const selectedCount = groupPermKeys.filter((k) => formData.permissions.includes(k)).length;
                    const allSelected = selectedCount === groupPermKeys.length;

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-3"
                      >
                        {/* Group Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">
                              {group.icon}
                            </span>
                            <span className="font-bold text-sm text-on-surface">{group.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high font-semibold text-on-surface-variant">
                              {selectedCount}/{groupPermKeys.length}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleGroup(group)}
                            className="text-[11px] font-bold text-primary hover:underline"
                          >
                            {allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                          </button>
                        </div>

                        {/* Group Permissions List */}
                        <div className="space-y-2.5">
                          {group.permissions.map((perm) => {
                            const isChecked = formData.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-primary/5 border-primary/30 text-on-surface'
                                    : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
                                />
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-on-surface flex items-center justify-between">
                                    <span>{perm.label}</span>
                                    <code className="text-[10px] text-on-surface-variant font-mono bg-surface-container-high px-1.5 py-0.5 rounded">
                                      {perm.key}
                                    </code>
                                  </div>
                                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-normal">
                                    {perm.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md shadow-primary/20"
                >
                  {submitting && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                  Tạo Tài Khoản & Cấp Quyền
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60 shadow-xs">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-on-surface-variant font-semibold hidden sm:inline">Lọc trạng thái:</span>
            <div className="inline-flex rounded-lg border border-outline-variant/60 p-0.5 bg-surface-container-high text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'ALL' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
              >
                Tất cả ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'ACTIVE' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
              >
                Hoạt động
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SUSPENDED')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  statusFilter === 'SUSPENDED' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
              >
                Tạm khóa
              </button>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">
                progress_activity
              </span>
              <p className="text-sm font-medium">Đang tải danh sách nhân viên gian hàng...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error space-y-3">
              <span className="material-symbols-outlined text-4xl">error</span>
              <p className="text-sm font-bold">{error}</p>
              <button
                onClick={loadMembers}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Thử lại
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">group_off</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Chưa có nhân viên nào</h3>
                <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                  {searchQuery
                    ? 'Không tìm thấy nhân viên phù hợp với từ khóa tìm kiếm.'
                    : 'Hãy tạo tài khoản nhân viên đầu tiên để hỗ trợ xử lý đơn hàng, quản lý kho và bán sách.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  Thêm nhân viên ngay
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-high/60 border-b border-outline-variant/60 text-on-surface-variant font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-4">Nhân viên</th>
                    <th className="py-3.5 px-4">Liên hệ</th>
                    <th className="py-3.5 px-4">Vai trò & Quyền hạn</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Ngày tham gia</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredMembers.map((member) => {
                    const isOwner = member.role === 'OWNER';
                    const perms = Array.isArray(member.permissions) ? member.permissions : [];
                    const userName = member.user?.fullName || (isOwner ? 'Chủ Doanh Nghiệp' : 'Nhân viên');
                    const userEmail = member.user?.email || 'Chưa cập nhật';
                    const userPhone = member.user?.phone || 'Chưa có SĐT';
                    const initials = userName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(-2)
                      .join('')
                      .toUpperCase();

                    const isEditingThis = editingMemberId === member.id;
                    const isResettingPassThis = resetPasswordMemberId === member.id;

                    return (
                      <React.Fragment key={member.id}>
                        <tr className="hover:bg-surface-container-high/30 transition-colors">
                          {/* Member Name + Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isOwner
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                {initials || 'NV'}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                  <span>{userName}</span>
                                  {isOwner && (
                                    <span className="material-symbols-outlined text-amber-600 text-[16px]">
                                      verified
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-on-surface-variant">
                                  {isOwner ? 'Chủ sở hữu gian hàng' : 'Nhân sự nội bộ'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 text-on-surface">
                            <div className="font-semibold">{userEmail}</div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">{userPhone}</div>
                          </td>

                          {/* Role & Permissions */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                  <span className="material-symbols-outlined text-[13px]">shield</span>
                                  Toàn quyền Doanh nghiệp (Owner)
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                    {perms.length} quyền được cấp
                                  </span>
                                  {perms.slice(0, 2).map((p) => (
                                    <span
                                      key={p}
                                      className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-on-surface-variant"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {perms.length > 2 && (
                                    <span className="text-[10px] text-on-surface-variant font-medium">
                                      +{perms.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {member.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                Tạm khóa
                              </span>
                            )}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3.5 px-4 text-on-surface-variant">
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString('vi-VN')
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {isOwner ? (
                              <span className="text-[11px] font-semibold text-on-surface-variant italic">
                                Bất biến
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1 justify-end">
                                {/* Button Sửa Quyền */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditingThis) {
                                      setEditingMemberId(null);
                                    } else {
                                      handleOpenEdit(member);
                                      setResetPasswordMemberId(null);
                                    }
                                  }}
                                  title="Chỉnh sửa phân quyền"
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isEditingThis
                                      ? 'bg-primary text-white'
                                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                </button>

                                {/* Button Đặt lại mật khẩu */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isResettingPassThis) {
                                      setResetPasswordMemberId(null);
                                    } else {
                                      setResetPasswordMemberId(member.id);
                                      setEditingMemberId(null);
                                      setNewPasswordValue('NewStaffPassword123!');
                                    }
                                  }}
                                  title="Đặt lại mật khẩu tạm"
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isResettingPassThis
                                      ? 'bg-amber-500 text-white'
                                      : 'text-on-surface-variant hover:text-amber-600 hover:bg-surface-container-high'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">key</span>
                                </button>

                                {/* Button Tạm khóa / Mở khóa */}
                                <button
                                  type="button"
                                  disabled={togglingStatusId === member.id}
                                  onClick={() => handleToggleStatus(member)}
                                  title={member.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Kích hoạt lại tài khoản'}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    member.status === 'ACTIVE'
                                      ? 'text-on-surface-variant hover:text-amber-600 hover:bg-surface-container-high'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {member.status === 'ACTIVE' ? 'lock' : 'lock_open'}
                                  </span>
                                </button>

                                {/* Button Xóa thành viên */}
                                <button
                                  type="button"
                                  disabled={deletingMemberId === member.id}
                                  onClick={() => handleRemoveMember(member)}
                                  title="Xóa nhân viên"
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Inline Expandable Drawer for Editing Permissions */}
                        {isEditingThis && (
                          <tr className="bg-surface-container-high/40 border-b border-outline-variant/60 animate-in fade-in duration-200">
                            <td colSpan={6} className="p-5">
                              <div className="bg-surface-container-lowest rounded-xl p-5 border border-primary/30 space-y-5 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                      tune
                                    </span>
                                    <span className="font-bold text-sm text-on-surface">
                                      Chỉnh Sửa Quyền Hạn cho Nhân Viên: <u>{userName}</u> ({userEmail})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMemberId(null)}
                                    className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                  </button>
                                </div>

                                {/* Preset Selector in Edit Drawer */}
                                <div>
                                  <label className="text-xs font-bold text-on-surface block mb-2">
                                    Chọn nhanh vai trò mẫu (Role Presets):
                                  </label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {ROLE_PRESETS.map((preset) => {
                                      const isSelected = editPreset === preset.id;
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() => handleSelectEditPreset(preset.id)}
                                          className={`p-2.5 text-left rounded-lg border text-xs flex items-center justify-between transition-all ${
                                            isSelected
                                              ? 'bg-primary/10 border-primary text-primary font-bold'
                                              : 'bg-surface border-outline-variant/50 text-on-surface hover:border-outline-variant'
                                          }`}
                                        >
                                          <span className="line-clamp-1">{preset.name}</span>
                                          {isSelected && (
                                            <span className="material-symbols-outlined text-primary text-[15px]">
                                              check
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => handleSelectEditPreset('CUSTOM')}
                                      className={`p-2.5 text-left rounded-lg border text-xs flex items-center justify-between transition-all ${
                                        editPreset === 'CUSTOM'
                                          ? 'bg-primary/10 border-primary text-primary font-bold'
                                          : 'bg-surface border-outline-variant/50 text-on-surface hover:border-outline-variant'
                                      }`}
                                    >
                                      <span>Tùy chỉnh</span>
                                      {editPreset === 'CUSTOM' && (
                                        <span className="material-symbols-outlined text-primary text-[15px]">
                                          tune
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Permission Groups Matrix in Edit Drawer */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {PERMISSION_GROUPS.map((group) => {
                                    const groupPermKeys = group.permissions.map((p) => p.key);
                                    const selectedCount = groupPermKeys.filter((k) =>
                                      editPermissions.includes(k)
                                    ).length;
                                    const allSelected = selectedCount === groupPermKeys.length;

                                    return (
                                      <div
                                        key={group.id}
                                        className="rounded-lg border border-outline-variant/50 bg-surface p-3 space-y-2"
                                      >
                                        <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/30">
                                          <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-primary text-[18px]">
                                              {group.icon}
                                            </span>
                                            <span className="font-bold text-xs text-on-surface">
                                              {group.name}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high font-semibold text-on-surface-variant">
                                              {selectedCount}/{groupPermKeys.length}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleEditGroup(group)}
                                            className="text-[10px] font-bold text-primary hover:underline"
                                          >
                                            {allSelected ? 'Bỏ chọn' : 'Chọn hết'}
                                          </button>
                                        </div>

                                        <div className="space-y-1.5">
                                          {group.permissions.map((perm) => {
                                            const isChecked = editPermissions.includes(perm.key);
                                            return (
                                              <label
                                                key={perm.key}
                                                className={`flex items-center gap-2.5 p-1.5 rounded-md border cursor-pointer text-xs transition-all ${
                                                  isChecked
                                                    ? 'bg-primary/5 border-primary/30 text-on-surface font-semibold'
                                                    : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant'
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => handleToggleEditPermission(perm.key)}
                                                  className="w-3.5 h-3.5 rounded text-primary focus:ring-primary/20 accent-primary"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                  <span>{perm.label}</span>
                                                  <code className="text-[9px] text-on-surface-variant font-mono bg-surface-container-high px-1 py-0.2 rounded">
                                                    {perm.key}
                                                  </code>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Edit Drawer Actions */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/40">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMemberId(null)}
                                    className="px-3.5 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                                  >
                                    Đóng
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingEdit}
                                    onClick={() => handleSavePermissions(member.id)}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 shadow-xs"
                                  >
                                    {savingEdit && (
                                      <span className="material-symbols-outlined text-sm animate-spin">
                                        progress_activity
                                      </span>
                                    )}
                                    Lưu Thay Đổi Phân Quyền
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Inline Expandable Drawer for Resetting Password */}
                        {isResettingPassThis && (
                          <tr className="bg-amber-500/5 border-b border-outline-variant/60 animate-in fade-in duration-200">
                            <td colSpan={6} className="p-4">
                              <div className="bg-surface-container-lowest rounded-xl p-4 border border-amber-500/40 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-600 text-[20px]">
                                      key
                                    </span>
                                    <span className="font-bold text-xs text-on-surface">
                                      Đặt lại mật khẩu khởi tạo cho: <u>{userName}</u> ({userEmail})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setResetPasswordMemberId(null)}
                                    className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                  <div className="relative flex-1 w-full">
                                    <input
                                      type="text"
                                      value={newPasswordValue}
                                      onChange={(e) => setNewPasswordValue(e.target.value)}
                                      placeholder="Nhập mật khẩu mới..."
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-amber-500 font-mono"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setResetPasswordMemberId(null)}
                                      className="px-3 py-2 rounded-lg border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container-high"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      disabled={resettingPassword}
                                      onClick={() => handleResetPasswordSubmit(member.id)}
                                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                                    >
                                      {resettingPassword && (
                                        <span className="material-symbols-outlined text-sm animate-spin">
                                          progress_activity
                                        </span>
                                      )}
                                      Xác Nhận Đặt Lại Mật Khẩu
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
