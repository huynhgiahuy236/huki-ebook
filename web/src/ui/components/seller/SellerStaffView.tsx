"use client";

import React, { useCallback, useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { memberApi, BusinessMemberItem } from '@/ui/api/memberApi';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { PERMISSION_GROUPS, ROLE_PRESETS, PermissionKey } from '@/ui/utils/permissions';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  initialPassword: 'StaffPassword123!',
  selectedPreset: 'SALES_STAFF',
  permissions: ['DASHBOARD_VIEW', 'ORDER_VIEW', 'ORDER_PROCESS', 'ORDER_CANCEL', 'PRODUCT_VIEW'],
};

function SellerStaffContent() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const businessId = user?.business?.id || activeBusinessId || undefined;

  const [members, setMembers] = useState<BusinessMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State (Direct Provisioning)
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'provision' || searchParams.get('action') === 'new') {
      setShowAddForm(true);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Permissions State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPreset, setEditPreset] = useState('CUSTOM');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password State
  const [resetPasswordMemberId, setResetPasswordMemberId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('NewStaffPassword123!');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Status Action State
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Delete Action State
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

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
  const handleSelectPreset = (presetId: string) => {
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
  const handleTogglePermission = (permKey: string) => {
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
  const handleToggleGroup = (group: any) => {
    const groupPermKeys = group.permissions.map((p: any) => p.key);
    const allSelected = groupPermKeys.every((k: string) => formData.permissions.includes(k));

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
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showToast?.('Vui lòng nhập họ và tên nhân viên.', 'error');
      return;
    }

    if (!formData.email.trim()) {
      showToast?.('Vui lòng nhập địa chỉ email nhân viên.', 'error');
      return;
    }

    if (formData.permissions.length === 0) {
      showToast?.('Vui lòng tích chọn ít nhất 1 quyền cho nhân viên.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const currentBizId = (businessId || user?.business?.id)!;
      const res = await memberApi.provisionMember(currentBizId, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        initialPassword: formData.initialPassword.trim() || 'StaffPassword123!',
        permissions: formData.permissions,
      });

      if (res.success) {
        showToast?.(`Đã tạo tài khoản cho nhân viên ${formData.fullName} với ${formData.permissions.length} quyền.`, 'success');
        setFormData(initialForm);
        setShowAddForm(false);
        loadMembers();
      } else {
        showToast?.(res.error?.message || 'Có lỗi xảy ra khi tạo tài khoản nhân viên.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Permissions Drawer
  const handleOpenEdit = (member: BusinessMemberItem) => {
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
  const handleSelectEditPreset = (presetId: string) => {
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
  const handleToggleEditPermission = (permKey: string) => {
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
  const handleToggleEditGroup = (group: any) => {
    const groupPermKeys = group.permissions.map((p: any) => p.key);
    const allSelected = groupPermKeys.every((k: string) => editPermissions.includes(k));

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
  const handleSavePermissions = async (memberId: string) => {
    if (editPermissions.length === 0) {
      showToast?.('Nhân viên phải có ít nhất 1 quyền để truy cập hệ thống.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const currentBizId = (businessId || user?.business?.id)!;
      const res = await memberApi.updateMemberPermissions(currentBizId, memberId, editPermissions);
      if (res.success) {
        showToast?.(`Đã cấp ${editPermissions.length} quyền cho nhân viên.`, 'success');
        setEditingMemberId(null);
        loadMembers();
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật phân quyền cho nhân viên.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Suspend / Active Status
  const handleToggleStatus = async (member: BusinessMemberItem) => {
    if (member.role === 'OWNER') return;
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setTogglingStatusId(member.id);

    try {
      const currentBizId = (businessId || user?.business?.id)!;
      const res = await memberApi.updateMemberStatus(currentBizId, member.id, nextStatus);
      if (res.success) {
        showToast?.(`Nhân viên ${member.user?.fullName || ''} đã được chuyển sang trạng thái ${
          nextStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'
        }.`, 'success');
        loadMembers();
      } else {
        showToast?.(res.error?.message || 'Không thể thay đổi trạng thái nhân viên.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (memberId: string) => {
    if (!newPasswordValue.trim()) {
      showToast?.('Vui lòng nhập mật khẩu mới.', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      const currentBizId = (businessId || user?.business?.id)!;
      const res = await memberApi.resetMemberPassword(
        currentBizId,
        memberId,
        newPasswordValue.trim()
      );
      if (res.success) {
        showToast?.(`Mật khẩu mới đã được cập nhật: "${newPasswordValue.trim()}". Vui lòng bàn giao cho nhân viên.`, 'success');
        setResetPasswordMemberId(null);
        setNewPasswordValue('NewStaffPassword123!');
      } else {
        showToast?.(res.error?.message || 'Không thể đặt lại mật khẩu.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (member: BusinessMemberItem) => {
    if (member.role === 'OWNER') return;
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(
        `Bạn có chắc chắn muốn xóa nhân viên "${member.user?.fullName || member.user?.email}" khỏi Doanh nghiệp không?`
      );
      if (!confirmDelete) return;
    }

    setDeletingMemberId(member.id);
    try {
      const currentBizId = (businessId || user?.business?.id)!;
      const res = await memberApi.removeMember(currentBizId, member.id);
      if (res.success) {
        showToast?.(`Nhân viên ${member.user?.fullName || ''} đã được xóa thành công.`, 'success');
        loadMembers();
      } else {
        showToast?.(res.error?.message || 'Không thể xóa nhân viên.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setDeletingMemberId(null);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const name = member.user?.fullName || '';
      const email = member.user?.email || '';
      const phone = member.user?.phone || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        phone.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || member.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-theme-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/seller/dashboard" className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">dashboard</span>
              <span>Kênh Người Bán</span>
            </Link>
            <span className="text-xs text-outline-variant">/</span>
            <span className="text-xs font-bold text-primary">Phân Quyền Nhân Viên</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-black text-on-surface">
            Quản Lý & Phân Quyền Nhân Viên
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Cấp tài khoản nhân sự tức thì (Direct Provisioning), phân quyền granular theo 17 chức năng độc lập.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showAddForm ? 'close' : 'person_add'}
          </span>
          <span>{showAddForm ? 'Đóng Biểu Mẫu' : 'Cấp Tài Khoản Mới'}</span>
        </button>
      </div>

      {/* Direct Provisioning Form */}
      {showAddForm && (
        <div className="bg-surface-container-lowest rounded-3xl border-2 border-primary/40 p-6 sm:p-8 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">how_to_reg</span>
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-on-surface">
                  Cấp Tài Khoản Nhân Viên Trực Tiếp (Direct Provisioning)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Tài khoản có hiệu lực ngay lập tức. Nhân viên đăng nhập bằng Email và Mật khẩu khởi tạo được cấp.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProvisionSubmit} className="space-y-6">
            {/* User Basic Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Họ và tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Địa chỉ Email (Tên đăng nhập) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien@example.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Initial Password Field */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-theme-border space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">key</span>
                  <span>Mật Khẩu Khởi Tạo Mặc Định</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.initialPassword}
                onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
              />
            </div>

            {/* Role Preset Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Chọn Mẫu Phân Quyền Nhanh (Role Presets)
                </label>
                <span className="text-xs text-on-surface-variant font-semibold">
                  Đã chọn: <strong className="text-primary">{formData.permissions.length}</strong> quyền
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ROLE_PRESETS.map((preset) => {
                  const isSelected = formData.selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                          : 'border-theme-border bg-surface-container-lowest hover:bg-surface-container'
                      }`}
                    >
                      <div className="font-bold text-xs text-on-surface flex items-center justify-between">
                        <span>{preset.name}</span>
                        {isSelected && <span className="material-symbols-outlined text-sm text-primary">check_circle</span>}
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Permissions Checklist */}
            <div className="space-y-4 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Chi Tiết 17 Quyền Chức Năng (Tùy Biến Granular)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPermKeys = group.permissions.map((p) => p.key);
                  const isAllGroupSelected = groupPermKeys.every((k) => formData.permissions.includes(k));

                  return (
                    <div key={group.name} className="p-4 rounded-2xl bg-surface-container-lowest border border-theme-border shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-theme-border">
                        <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">{group.icon}</span>
                          <span>{group.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group)}
                          className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          {isAllGroupSelected ? 'Bỏ chọn hết' : 'Chọn hết'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {group.permissions.map((perm) => {
                          const isChecked = formData.permissions.includes(perm.key);
                          return (
                            <label key={perm.key} className="flex items-start gap-2.5 text-xs text-on-surface cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="mt-0.5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                              />
                              <div>
                                <p className="font-semibold leading-tight">{perm.label}</p>
                                <p className="text-[10px] text-on-surface-variant">{perm.description}</p>
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 rounded-xl border border-theme-border text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-base">save</span>
                )}
                <span>Cấp Tài Khoản Ngay</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Members List & Filter */}
      <div className="bg-surface-container-lowest rounded-3xl border border-theme-border p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">group</span>
            <h2 className="text-base font-bold text-on-surface">
              Danh Sách Nhân Viên ({filteredMembers.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, email, sđt..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary w-48 sm:w-64"
              />
              <span className="material-symbols-outlined text-sm text-outline-variant absolute left-2.5 top-2">search</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Tạm khóa</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant space-y-2">
              <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
              <p className="text-xs">Đang tải danh sách nhân sự...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline-variant">person_search</span>
              <p className="text-xs">Không tìm thấy nhân viên phù hợp.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-on-surface-variant border-b border-theme-border">
                <tr>
                  <th className="py-3 px-3">Nhân Viên</th>
                  <th className="py-3 px-3">Email & SĐT</th>
                  <th className="py-3 px-3">Vai Trò</th>
                  <th className="py-3 px-3">Phân Quyền</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/60">
                {filteredMembers.map((member) => {
                  const isOwner = member.role === 'OWNER';
                  const isEditingThis = editingMemberId === member.id;
                  const isResettingPassThis = resetPasswordMemberId === member.id;

                  return (
                    <React.Fragment key={member.id}>
                      <tr className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {(member.user?.fullName || member.user?.email || 'U').charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-on-surface block">{member.user?.fullName || 'Chưa cập nhật'}</span>
                              {isOwner && (
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Chủ gian hàng</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono">
                          <span className="block text-on-surface">{member.user?.email}</span>
                          <span className="text-[11px] text-on-surface-variant">{member.user?.phone || '—'}</span>
                        </td>

                        <td className="py-3.5 px-3 font-semibold">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-surface-container border border-theme-border font-bold text-on-surface">
                            {member.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {isOwner ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">all_inclusive</span>
                              <span>Toàn quyền Master</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>{member.permissions?.length || 0} quyền</span>
                              <span className="material-symbols-outlined text-xs">edit</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            member.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {member.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          {!isOwner && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setResetPasswordMemberId(isResettingPassThis ? null : member.id)}
                                title="Đặt lại mật khẩu"
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">key</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(member)}
                                title={member.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
                                disabled={togglingStatusId === member.id}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">
                                  {member.status === 'ACTIVE' ? 'block' : 'lock_open'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                title="Xóa nhân viên"
                                disabled={deletingMemberId === member.id}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Edit Permissions Drawer */}
                      {isEditingThis && (
                        <tr className="bg-primary/5 border-b border-theme-border">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-primary/30 space-y-4 shadow-sm">
                              <div className="flex items-center justify-between pb-3 border-b border-theme-border">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
                                  Chỉnh sửa phân quyền cho: <u>{member.user?.fullName}</u> ({editPermissions.length} quyền)
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setEditingMemberId(null)}
                                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>

                              {/* Presets in edit */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {ROLE_PRESETS.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectEditPreset(p.id)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                      editPreset === p.id
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-surface-container border-theme-border text-on-surface hover:bg-surface-container-high'
                                    }`}
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>

                              {/* Groups checklist */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {PERMISSION_GROUPS.map((group) => {
                                  const groupKeys = group.permissions.map((p) => p.key);
                                  const isAllSelected = groupKeys.every((k) => editPermissions.includes(k));

                                  return (
                                    <div key={group.name} className="p-3 rounded-xl bg-surface-container border border-theme-border space-y-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b border-theme-border/60">
                                        <span className="font-bold text-[11px] text-on-surface flex items-center gap-1">
                                          <span className="material-symbols-outlined text-xs text-primary">{group.icon}</span>
                                          <span>{group.name}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleEditGroup(group)}
                                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                                        >
                                          {isAllSelected ? 'Bỏ hết' : 'Chọn hết'}
                                        </button>
                                      </div>

                                      <div className="space-y-1.5">
                                        {group.permissions.map((perm) => (
                                          <label key={perm.key} className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={editPermissions.includes(perm.key)}
                                              onChange={() => handleToggleEditPermission(perm.key)}
                                              className="rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                            />
                                            <span className="leading-tight text-[11px] font-medium">{perm.label}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
                                <button
                                  type="button"
                                  onClick={() => setEditingMemberId(null)}
                                  className="px-3.5 py-1.5 rounded-xl border border-theme-border text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                                >
                                  Đóng
                                </button>
                                <button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => handleSavePermissions(member.id)}
                                  className="px-5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 cursor-pointer flex items-center gap-1.5"
                                >
                                  {savingEdit && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                  <span>Lưu Thay Đổi Phân Quyền</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expandable Reset Password Drawer */}
                      {isResettingPassThis && (
                        <tr className="bg-amber-500/5 border-b border-theme-border">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-amber-500/30 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between pb-2 border-b border-theme-border">
                                <span className="font-bold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">key</span>
                                  <span>Đặt lại mật khẩu cho: <u>{member.user?.fullName}</u> ({member.user?.email})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setResetPasswordMemberId(null)}
                                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <input
                                  type="text"
                                  value={newPasswordValue}
                                  onChange={(e) => setNewPasswordValue(e.target.value)}
                                  placeholder="Nhập mật khẩu mới..."
                                  className="w-full flex-1 px-3.5 py-2 text-xs rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface focus:outline-none focus:border-amber-500 font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  disabled={resettingPassword}
                                  onClick={() => handleResetPasswordSubmit(member.id)}
                                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {resettingPassword && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                  <span>Xác Nhận Đặt Lại</span>
                                </button>
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
          )}
        </div>
      </div>
    </div>
  );
}

export function SellerStaffView() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
        <p className="mt-2 text-xs text-on-surface-variant">Đang tải phân quyền nhân sự...</p>
      </div>
    }>
      <SellerStaffContent />
    </Suspense>
  );
}

export default SellerStaffView;
