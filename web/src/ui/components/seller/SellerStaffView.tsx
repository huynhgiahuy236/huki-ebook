"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { memberApi, BusinessMemberItem } from '@/ui/api/memberApi';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { PERMISSION_GROUPS, ROLE_PRESETS, PermissionKey } from '@/ui/utils/permissions';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '@/ui/components/common';

const staffBulkActionGroups: BulkActionGroup[] = [
  {
    groupLabel: 'TRẠNG THÁI NHÂN SỰ',
    actions: [
      { value: 'ACTIVATE_ALL', label: 'Mở khóa hoạt động các nhân sự đã chọn' },
      { value: 'SUSPEND_ALL', label: 'Tạm khóa các nhân sự đã chọn', isDanger: true, confirmMessage: 'Bạn có chắc chắn muốn tạm khóa các tài khoản nhân sự đã chọn?' },
    ],
  },
  {
    groupLabel: 'XUẤT DỮ LIỆU',
    actions: [
      { value: 'EXPORT_CSV', label: 'Xuất danh sách nhân viên (.csv)' },
    ],
  },
];
import AuditHistoryTimeline, { AuditLogItem } from '../common/AuditHistoryTimeline';
import SecurityPinModal from '../common/SecurityPinModal';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  initialPassword: 'StaffPassword123!',
  initialPin: '123456',
  selectedPreset: 'SALES_STAFF',
  permissions: ['DASHBOARD_VIEW', 'ORDER_VIEW', 'ORDER_PROCESS', 'ORDER_CANCEL', 'PRODUCT_VIEW'],
};

export function SellerStaffView() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const businessId = user?.business?.id || activeBusinessId || undefined;

  // Security PIN Confirmation Modal State
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    actionName: string;
    description: string;
    onSuccess: (pin: string) => Promise<void> | void;
  }>({
    isOpen: false,
    actionName: '',
    description: '',
    onSuccess: () => {},
  });

  const [members, setMembers] = useState<BusinessMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // In-Page Add/Edit Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams?.get('action') === 'provision' || searchParams?.get('action') === 'new') {
      setShowAddForm(true);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const generateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData((prev) => ({ ...prev, initialPin: randomPin }));
    showToast({ title: 'Đã tạo mã PIN ngẫu nhiên', message: `Mã PIN mới: ${randomPin}` }, 'info');
  };

  // In-Page Edit Permissions State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPreset, setEditPreset] = useState('CUSTOM');
  const [savingEdit, setSavingEdit] = useState(false);

  // In-Page Reset Password State
  const [resetPasswordMemberId, setResetPasswordMemberId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('NewStaffPassword123!');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Action Loading States
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Tab State: Members vs Governance Audit Timeline
  const [activeStaffTab, setActiveStaffTab] = useState<'members' | 'audit_logs'>('members');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

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
    } catch {
      setError('Lỗi kết nối khi tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [businessId, setActiveBusinessId]);

  const appendAuditLog = useCallback((bizId: string, logItem: Omit<AuditLogItem, 'id' | 'timestamp'>) => {
    const fullItem: AuditLogItem = {
      ...logItem,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    setAuditLogs((prev) => [fullItem, ...prev]);

    // Publish Realtime event across tabs & windows
    realtimeSyncBus.publish('STAFF_AUDIT_LOG_CREATED', {
      log: fullItem,
      businessId: bizId,
    });
  }, []);

  // Listen to Realtime Events
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'STAFF_AUDIT_LOG_CREATED' && (msg.payload as any)?.log) {
        const incomingLog = (msg.payload as any).log as AuditLogItem;
        setAuditLogs((prev) => {
          if (prev.some((l) => l.id === incomingLog.id)) return prev;
          return [incomingLog, ...prev];
        });
      }
    });
    return () => unsub();
  }, []);

  // Load Governance Audit Logs (Authoritative Server Source)
  const loadAuditLogs = useCallback(async () => {
    let currentBizId = businessId;
    if (!currentBizId) {
      try {
        const myBiz = await businessApi.getMyBusiness();
        if (myBiz.success && myBiz.data?.id) {
          currentBizId = myBiz.data.id;
          setActiveBusinessId(currentBizId);
        }
      } catch (err) {
        console.warn('Could not auto-fetch businessId for audit logs', err);
      }
    }

    if (!currentBizId) return;

    setLoadingAuditLogs(true);
    setAuditError(null);
    try {
      let serverLogs: AuditLogItem[] = [];
      try {
        const res = await memberApi.getMemberAuditLogs(currentBizId, { limit: 50 });
        if (res.success && res.data?.items) {
          serverLogs = res.data.items.map((log: any) => ({
            id: log.id,
            actorId: log.actorId,
            actorRole: log.actorRole,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            storeId: log.storeId,
            timestamp: log.createdAt || log.timestamp,
            ipAddress: log.ipAddress,
            requestId: log.requestId,
            changedFields: log.changedFields,
            stateBefore: log.beforeState,
            stateAfter: log.afterState,
            metadata: log.metadata,
          }));
        }
      } catch (apiErr) {
        console.warn('Server audit log fetch failed', apiErr);
      }

      const allLogs = serverLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).map((log) => {
        if (!log.actorName && (log.actorId === user?.id || log.actorRole === 'OWNER')) {
          return {
            ...log,
            actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
            actorEmail: user?.email || log.actorEmail,
          };
        }
        return log;
      });

      setAuditLogs(allLogs);
    } catch (err: any) {
      setAuditError(err?.message || 'Không thể tải nhật ký phân quyền nhân sự.');
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [businessId, setActiveBusinessId, user]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (activeStaffTab === 'audit_logs') {
      loadAuditLogs();
    }
  }, [activeStaffTab, loadAuditLogs]);

  // Handle Select Role Preset
  const handleSelectPreset = (presetId: string) => {
    const found = ROLE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        selectedPreset: presetId,
        permissions: [...found.permissions],
      }));
    }
  };

  const handleTogglePermission = (permKey: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      const newPerms = exists
        ? prev.permissions.filter((k) => k !== permKey)
        : [...prev.permissions, permKey];
      return {
        ...prev,
        selectedPreset: 'CUSTOM',
        permissions: newPerms,
      };
    });
  };

  const handleToggleGroup = (group: (typeof PERMISSION_GROUPS)[0]) => {
    const groupPermKeys = group.permissions.map((p) => p.key);
    const isAllSelected = groupPermKeys.every((k) => formData.permissions.includes(k));

    setFormData((prev) => {
      let newPerms: string[];
      if (isAllSelected) {
        newPerms = prev.permissions.filter((k) => !groupPermKeys.includes(k as PermissionKey));
      } else {
        const set = new Set([...prev.permissions, ...groupPermKeys]);
        newPerms = Array.from(set);
      }
      return {
        ...prev,
        selectedPreset: 'CUSTOM',
        permissions: newPerms,
      };
    });
  };

  // Submit Provisioning
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.initialPassword.trim()) {
      showToast({ title: 'Thiếu thông tin', message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.' }, 'error');
      return;
    }

    if (!formData.initialPin?.trim() || !/^\d{6}$/.test(formData.initialPin.trim())) {
      showToast({ title: 'Mã PIN không hợp lệ', message: 'Mã PIN bảo mật phải gồm đúng 6 chữ số (0-9).' }, 'error');
      return;
    }

    if (formData.permissions.length === 0) {
      showToast({ title: 'Chưa phân quyền', message: 'Nhân viên cần được cấp ít nhất 1 quyền chức năng.' }, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const currentBizId = businessId || user?.business?.id || activeBusinessId;
      if (!currentBizId) {
        showToast({ title: 'Lỗi', message: 'Không xác định được mã doanh nghiệp.' }, 'error');
        return;
      }

      const res = await memberApi.provisionMember(currentBizId, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        initialPassword: formData.initialPassword.trim(),
        initialPin: formData.initialPin.trim(),
        role: 'ORDER_STAFF',
        permissions: formData.permissions,
      });

      if (res.success) {
        // Record Realtime Governance Audit Log
        appendAuditLog(currentBizId, {
          actorId: user?.id || 'admin',
          actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
          actorEmail: user?.email,
          actorRole: user?.role || 'OWNER',
          action: 'CREATE',
          resource: 'Member',
          resourceId: res.data?.id || `mem-${Date.now()}`,
          storeId: currentBizId,
          changedFields: ['fullName', 'email', 'phone', 'role', 'permissions', 'initialPin'],
          stateBefore: null,
          stateAfter: {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || undefined,
            role: 'ORDER_STAFF',
            status: 'ACTIVE',
            permissions: formData.permissions,
            initialPin: '******',
          },
          metadata: {
            staffName: formData.fullName.trim(),
            staffEmail: formData.email.trim(),
            permissionsCount: formData.permissions.length,
            preset: formData.selectedPreset,
            initialPinConfigured: true,
            note: 'Cấp tài khoản & mã PIN bảo mật 6 số trực tiếp (Direct Provisioning)',
          },
        });

        showToast({
          title: 'Cấp tài khoản thành công',
          message: `Nhân viên ${formData.fullName} (${formData.email}) đã được tạo và kích hoạt kèm mã PIN 6 số.`,
        }, 'success');
        setFormData(initialForm);
        setShowAddForm(false);
        await loadMembers();
      } else {
        showToast({ title: 'Cấp tài khoản thất bại', message: res.error?.message || 'Có lỗi xảy ra.' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi kết nối', message: err?.message || 'Không thể kết nối đến máy chủ.' }, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Permissions Mode
  const handleOpenEdit = (member: BusinessMemberItem) => {
    if (activeStaffTab !== 'members') setActiveStaffTab('members');
    setEditingMemberId(member.id);
    setShowAddForm(true);

    const memPerms = member.permissions || [];
    const matchedPreset = ROLE_PRESETS.find(
      (p) =>
        p.permissions.length === memPerms.length &&
        p.permissions.every((k) => memPerms.includes(k))
    );

    setFormData({
      fullName: member.user?.fullName || '',
      email: member.user?.email || '',
      phone: member.user?.phone || '',
      initialPassword: '',
      initialPin: '',
      selectedPreset: matchedPreset ? matchedPreset.id : 'CUSTOM',
      permissions: [...memPerms],
    });

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleOpenCreate = () => {
    if (activeStaffTab !== 'members') setActiveStaffTab('members');
    setEditingMemberId(null);
    setFormData(initialForm);
    setShowAddForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingMemberId(null);
    setFormData(initialForm);
  };

  const handleSavePermissions = async (memberId: string) => {
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    if (formData.permissions.length === 0) {
      showToast({ title: 'Lỗi phân quyền', message: 'Nhân viên phải có ít nhất 1 quyền chức năng.' }, 'error');
      return;
    }

    const targetMember = members.find((m) => m.id === memberId);
    const staffName = targetMember?.user?.fullName || targetMember?.user?.email || 'Nhân viên';

    setPinModalConfig({
      isOpen: true,
      actionName: `Cập nhật phân quyền cho ${staffName}`,
      description: `Thao tác thay đổi quyền hạn cho nhân sự "${staffName}" (${formData.permissions.length} quyền) yêu cầu xác thực bằng mã PIN 6 số của bạn.`,
      onSuccess: async (_pin: string) => {
        setSubmitting(true);
        try {
          const res = await memberApi.updateMemberPermissions(currentBizId, memberId, formData.permissions);
          if (res.success) {
            appendAuditLog(currentBizId, {
              actorId: user?.id || 'admin',
              actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
              actorEmail: user?.email,
              actorRole: user?.role || 'OWNER',
              action: 'PERMISSION_CHANGE',
              resource: 'Member',
              resourceId: memberId,
              storeId: currentBizId,
              changedFields: ['permissions'],
              stateBefore: { permissions: targetMember?.permissions || [] },
              stateAfter: { permissions: formData.permissions },
              metadata: {
                staffName,
                staffEmail: targetMember?.user?.email,
                previousCount: targetMember?.permissions?.length || 0,
                newCount: formData.permissions.length,
                pinVerified: true,
                note: 'Đã xác thực mã PIN bảo mật khi cập nhật phân quyền nhân sự',
              },
            });

            showToast({ title: 'Thành công', message: `Đã cập nhật phân quyền nhân viên "${staffName}" và lưu nhật ký quản trị.` }, 'success');
            handleCloseForm();
            await loadMembers();
          } else {
            showToast({ title: 'Thất bại', message: res.error?.message || 'Không thể lưu phân quyền.' }, 'error');
          }
        } catch {
          showToast({ title: 'Lỗi', message: 'Lỗi kết nối khi cập nhật quyền.' }, 'error');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMemberId) {
      await handleSavePermissions(editingMemberId);
    } else {
      await handleProvisionSubmit(e);
    }
  };

  // Reset Password
  const handleResetPassword = async (memberId: string) => {
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    if (!newPasswordValue.trim() || newPasswordValue.length < 6) {
      showToast({ title: 'Mật khẩu yếu', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' }, 'error');
      return;
    }

    const targetMember = members.find((m) => m.id === memberId);
    const staffName = targetMember?.user?.fullName || targetMember?.user?.email || 'Nhân viên';

    setPinModalConfig({
      isOpen: true,
      actionName: `Đặt lại mật khẩu cho ${staffName}`,
      description: `Thao tác đặt lại mật khẩu cho nhân sự "${staffName}" yêu cầu xác thực bằng mã PIN 6 số của bạn để ghi nhận nhật ký trách nhiệm.`,
      onSuccess: async (_pin: string) => {
        setResettingPassword(true);
        try {
          const res = await memberApi.resetMemberPassword(currentBizId, memberId, newPasswordValue.trim());
          if (res.success) {
            appendAuditLog(currentBizId, {
              actorId: user?.id || 'admin',
              actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
              actorEmail: user?.email,
              actorRole: user?.role || 'OWNER',
              action: 'PIN_CHANGE',
              resource: 'Member',
              resourceId: memberId,
              storeId: currentBizId,
              changedFields: ['password'],
              stateBefore: null,
              stateAfter: { passwordUpdated: true },
              metadata: {
                staffName,
                staffEmail: targetMember?.user?.email,
                pinVerified: true,
                note: 'Đã xác thực mã PIN bảo mật khi đặt lại mật khẩu cho nhân sự',
              },
            });

            showToast({
              title: 'Đặt lại mật khẩu thành công',
              message: `Mật khẩu mới đã được áp dụng và ghi nhận vào Audit Log.`,
            }, 'success');
            setResetPasswordMemberId(null);
            setNewPasswordValue('NewStaffPassword123!');
          } else {
            showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể đặt lại mật khẩu.' }, 'error');
          }
        } catch {
          showToast({ title: 'Lỗi', message: 'Lỗi kết nối khi đặt lại mật khẩu.' }, 'error');
        } finally {
          setResettingPassword(false);
        }
      },
    });
  };

  // Toggle Status
  const handleToggleStatus = async (member: BusinessMemberItem) => {
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    const newStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'mở khóa' : 'tạm khóa';
    const staffName = member.user?.fullName || member.user?.email || 'Nhân viên';

    setPinModalConfig({
      isOpen: true,
      actionName: `${newStatus === 'ACTIVE' ? 'Mở khóa' : 'Tạm khóa'} tài khoản ${staffName}`,
      description: `Thao tác ${actionText} tài khoản nhân sự "${staffName}" yêu cầu xác thực bằng mã PIN 6 số của bạn để ghi nhận nhật ký trách nhiệm.`,
      onSuccess: async (_pin: string) => {
        setTogglingStatusId(member.id);
        try {
          const res = await memberApi.updateMemberStatus(currentBizId, member.id, newStatus);
          if (res.success) {
            appendAuditLog(currentBizId, {
              actorId: user?.id || 'admin',
              actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
              actorEmail: user?.email,
              actorRole: user?.role || 'OWNER',
              action: newStatus === 'ACTIVE' ? 'ACTIVATE' : 'SUSPEND',
              resource: 'Member',
              resourceId: member.id,
              storeId: currentBizId,
              changedFields: ['status'],
              stateBefore: { status: member.status },
              stateAfter: { status: newStatus },
              metadata: {
                staffName,
                staffEmail: member.user?.email,
                pinVerified: true,
                note: `Đã xác thực mã PIN bảo mật khi ${actionText} tài khoản nhân sự`,
              },
            });

            showToast({
              title: 'Cập nhật trạng thái',
              message: `Đã ${actionText} tài khoản nhân viên thành công và ghi nhận Audit Log.`,
            }, 'info');
            await loadMembers();
          } else {
            showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật trạng thái.' }, 'error');
          }
        } catch {
          showToast({ title: 'Lỗi', message: 'Lỗi kết nối khi cập nhật trạng thái.' }, 'error');
        } finally {
          setTogglingStatusId(null);
        }
      },
    });
  };

  // Remove Member
  const handleRemoveMember = async (member: BusinessMemberItem) => {
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    const confirmName = member.user?.fullName || member.user?.email || 'nhân viên này';

    setPinModalConfig({
      isOpen: true,
      actionName: `Xóa nhân sự ${confirmName}`,
      description: `Hành động này sẽ xóa vĩnh viễn tài khoản của "${confirmName}" và thu hồi mọi quyền hạn. Vui lòng xác thực bằng mã PIN 6 số của bạn để thực hiện.`,
      onSuccess: async (_pin: string) => {
        setDeletingMemberId(member.id);
        try {
          const res = await memberApi.removeMember(currentBizId, member.id);
          if (res.success) {
            appendAuditLog(currentBizId, {
              actorId: user?.id || 'admin',
              actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
              actorEmail: user?.email,
              actorRole: user?.role || 'OWNER',
              action: 'DELETE',
              resource: 'Member',
              resourceId: member.id,
              storeId: currentBizId,
              changedFields: ['deletedAt'],
              stateBefore: { status: member.status, role: member.role },
              stateAfter: { status: 'DELETED' },
              metadata: {
                staffName: confirmName,
                staffEmail: member.user?.email,
                pinVerified: true,
                note: 'Đã xác thực mã PIN bảo mật khi thu hồi quyền và xóa nhân sự khỏi doanh nghiệp',
              },
            });

            showToast({ title: 'Đã xóa nhân viên', message: `Nhân viên ${confirmName} đã được xóa khỏi hệ thống.` }, 'success');
            await loadMembers();
          } else {
            showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể xóa nhân viên.' }, 'error');
          }
        } catch {
          showToast({ title: 'Lỗi', message: 'Lỗi kết nối khi xóa nhân viên.' }, 'error');
        } finally {
          setDeletingMemberId(null);
        }
      },
    });
  };

  // Filtered members
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

      const memberDate = (member as any).createdAt || (member as any).joinedAt;
      const matchesDate = matchesDateFilter(memberDate, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [members, searchQuery, statusFilter, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (actionId: string) => {
    if (selectedIds.length === 0) return;
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    setBulkLoading(true);
    try {
      if (actionId === 'ACTIVATE_ALL' || actionId === 'SUSPEND_ALL') {
        const newStatus = actionId === 'ACTIVATE_ALL' ? 'ACTIVE' : 'SUSPENDED';
        const targetMembers = members.filter((m) => selectedIds.includes(m.id) && m.role !== 'OWNER');
        let count = 0;
        for (const m of targetMembers) {
          const res = await memberApi.updateMemberStatus(currentBizId, m.id, newStatus);
          if (res.success) count++;
        }
        showToast({ title: 'Cập nhật hàng loạt', message: `Đã cập nhật trạng thái cho ${count} nhân sự.` }, 'success');
        await loadMembers();
        setSelectedIds([]);
      } else if (actionId === 'EXPORT_CSV') {
        const selected = members.filter((m) => selectedIds.includes(m.id));
        const headers = ['Mã Nhân Sự', 'Họ Và Tên', 'Email', 'Số Điện Thoại', 'Vai Trò', 'Trạng Thái', 'Số Lượng Quyền'];
        const rows = selected.map((m) => [
          m.id,
          `"${(m.user?.fullName || '').replace(/"/g, '""')}"`,
          `"${(m.user?.email || '').replace(/"/g, '""')}"`,
          `"${(m.user?.phone || '').replace(/"/g, '""')}"`,
          m.role,
          m.status,
          m.permissions ? m.permissions.length : 0,
        ].join(','));
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Danh_Sach_Nhan_Su_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast({ title: 'Xuất file thành công', message: `Đã xuất ${selected.length} dòng nhân sự.` }, 'success');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Thao tác thất bại' }, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);


  const staffColumns: Column<BusinessMemberItem>[] = useMemo(
    () => [
      {
        key: 'user',
        title: 'Nhân Viên & Liên Hệ',
        minWidth: 260,
        render: (_val, member) => {
          const isOwner = member.role === 'OWNER';
          return (
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs uppercase border border-slate-200 shrink-0">
                {(member.user?.fullName || member.user?.email || 'U').charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 block break-words line-clamp-1 text-xs" title={member.user?.fullName}>
                    {member.user?.fullName || 'Chưa cập nhật'}
                  </span>
                  {isOwner && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      Chủ gian hàng
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate" title={member.user?.email}>
                  {member.user?.email} {member.user?.phone ? `• ${member.user.phone}` : ''}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'role',
        title: 'Vai Trò',
        width: 140,
        render: (_val, member) => (
          <div className="py-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] bg-slate-100 border border-slate-200 font-bold text-slate-700">
              {member.role}
            </span>
          </div>
        ),
      },
      {
        key: 'permissions',
        title: 'Phân Quyền',
        width: 180,
        render: (_val, member) => {
          const isOwner = member.role === 'OWNER';
          if (isOwner) {
            return (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">all_inclusive</span>
                <span>Toàn quyền Master</span>
              </span>
            );
          }
          const isEditingThis = editingMemberId === member.id;
          return (
            <button
              type="button"
              onClick={() => handleOpenEdit(member)}
              className={`font-semibold text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isEditingThis
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs ring-2 ring-emerald-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-800 hover:text-emerald-700 border-slate-300'
              }`}
              title="Nhấn để mở form chỉnh sửa phân quyền cho nhân viên này"
            >
              <span>{member.permissions?.length || 0} quyền hạn</span>
              <span className="material-symbols-outlined text-[13px]">edit</span>
            </button>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 130,
        align: 'center',
        render: (_val, member) => (
          <SellerStatusBadge
            variant={member.status === 'ACTIVE' ? 'success' : 'danger'}
            dot
            text={member.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
          />
        ),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 140,
        align: 'right',
        render: (_val, member) => {
          const isOwner = member.role === 'OWNER';
          if (isOwner) {
            return <span className="text-slate-400 text-xs italic">Không áp dụng</span>;
          }
          const isResettingPassThis = resetPasswordMemberId === member.id;
          return (
            <div className="flex items-center justify-end gap-1">
              <SellerActionButton
                type="button"
                variant={editingMemberId === member.id ? 'primary' : 'ghost'}
                size="sm"
                icon="edit"
                title="Chỉnh sửa phân quyền"
                onClick={() => handleOpenEdit(member)}
              />
              <SellerActionButton
                type="button"
                variant="ghost"
                size="sm"
                icon="key"
                title="Đặt lại mật khẩu"
                onClick={() => setResetPasswordMemberId(isResettingPassThis ? null : member.id)}
              />
              <SellerActionButton
                type="button"
                variant="ghost"
                size="sm"
                icon={member.status === 'ACTIVE' ? 'block' : 'lock_open'}
                title={member.status === 'ACTIVE' ? 'Tạm khóa' : 'Mở khóa'}
                loading={togglingStatusId === member.id}
                onClick={() => handleToggleStatus(member)}
              />
              <SellerActionButton
                type="button"
                variant="danger"
                size="sm"
                icon="delete"
                title="Xóa nhân viên"
                loading={deletingMemberId === member.id}
                onClick={() => handleRemoveMember(member)}
              />
            </div>
          );
        },
      },
    ],
    [resetPasswordMemberId, togglingStatusId, deletingMemberId, handleOpenEdit, handleToggleStatus, handleRemoveMember]
  );

  const renderExpandedMemberDetail = (member: BusinessMemberItem) => {
    const isOwner = member.role === 'OWNER';
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs">
        {/* Card 1: Thông tin nhân sự */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
            <span className="material-symbols-outlined text-[16px] text-[#00875A]">badge</span>
            <span>Hồ Sơ Nhân Sự</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Họ và tên:</span>
              <span className="font-semibold text-slate-900">{member.user?.fullName || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="font-mono text-slate-800">{member.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số điện thoại:</span>
              <span className="font-mono text-slate-800">{member.user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vai trò:</span>
              <span className="font-bold text-slate-900">{member.role}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Phân quyền module */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
            <span className="material-symbols-outlined text-[16px] text-amber-600">lock_person</span>
            <span>Phân Quyền Module</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng quyền được cấp:</span>
              <span className="font-bold text-slate-900">
                {isOwner ? 'Toàn quyền Master (100%)' : `${member.permissions?.length || 0} chức năng`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trạng thái tài khoản:</span>
              <span className={`font-bold ${member.status === 'ACTIVE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {member.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa truy cập'}
              </span>
            </div>
            {!isOwner && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(member)}
                  className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>Chỉnh sửa bảng phân quyền</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Thao tác bảo mật */}
        <div className="space-y-2 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-blue-600">security</span>
              <span>Bảo Mật Tài Khoản</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {isOwner
                ? 'Tài khoản chủ gian hàng có toàn quyền tối cao trên sàn.'
                : 'Bạn có thể đặt lại mật khẩu hoặc khóa tức thì tài khoản nhân sự này khi cần.'}
            </p>
          </div>
          {!isOwner && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPasswordMemberId(member.id)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">key</span>
                <span>Đổi Mật Khẩu</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(member)}
                className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {member.status === 'ACTIVE' ? 'block' : 'lock_open'}
                </span>
                <span>{member.status === 'ACTIVE' ? 'Tạm Khóa' : 'Mở Khóa'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

    return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Phân Quyền &amp; Quản Lý Nhân Sự</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cấp tài khoản nhân sự tức thì (Direct Provisioning) và phân quyền chi tiết theo 17 chức năng độc lập
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SellerActionButton
            type="button"
            variant="secondary"
            size="sm"
            icon="refresh"
            loading={loading}
            onClick={loadMembers}
          >
            Làm Mới
          </SellerActionButton>

          {showAddForm && editingMemberId ? (
            <div className="flex items-center gap-2">
              <SellerActionButton
                type="button"
                variant="primary"
                size="sm"
                icon="person_add"
                onClick={handleOpenCreate}
              >
                + Cấp Tài Khoản Mới
              </SellerActionButton>
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                icon="close"
                onClick={handleCloseForm}
              >
                Đóng Chỉnh Sửa
              </SellerActionButton>
            </div>
          ) : (
            <SellerActionButton
              type="button"
              variant={showAddForm ? 'neutral' : 'primary'}
              size="sm"
              icon={showAddForm ? 'close' : 'person_add'}
              onClick={() => {
                if (showAddForm) {
                  handleCloseForm();
                } else {
                  handleOpenCreate();
                }
              }}
            >
              {showAddForm ? 'Đóng Biểu Mẫu' : 'Cấp Tài Khoản Mới'}
            </SellerActionButton>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveStaffTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeStaffTab === 'members'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span className="material-symbols-outlined text-base">badge</span>
          <span>Danh Sách Nhân Viên ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStaffTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeStaffTab === 'audit_logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span className="material-symbols-outlined text-base">history_edu</span>
          <span>Lịch Sử Thao Tác Phân Quyền</span>
        </button>
      </div>

      {activeStaffTab === 'audit_logs' ? (
        <AuditHistoryTimeline
          title="Lịch Sử Thao Tác Phân Quyền & Quản Trị Nhân Sự"
          description="Theo dõi toàn bộ nhật ký cấp tài khoản, cập nhật vai trò, phân quyền hoặc xóa tài khoản nhân sự trong Doanh nghiệp."
          items={auditLogs}
          loading={loadingAuditLogs}
          error={auditError}
          onRetry={loadAuditLogs}
          emptyTitle="Chưa có nhật ký phân quyền nhân sự"
          emptyMessage="Chưa ghi nhận thao tác phân quyền hoặc thay đổi nhân sự nào trong Doanh nghiệp."
        />
      ) : (
        <>
          {/* Direct Provisioning & Edit Permissions Form (In-Page Collapsible) */}
          {showAddForm && (
        <div ref={formRef} className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900">
              <span className={`material-symbols-outlined text-xl ${editingMemberId ? 'text-blue-600' : 'text-emerald-600'}`}>
                {editingMemberId ? 'manage_accounts' : 'how_to_reg'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingMemberId
                      ? `Chỉnh Sửa Phân Quyền Nhân Sự: ${formData.fullName || formData.email}`
                      : 'Cấp Tài Khoản Nhân Viên Trực Tiếp (Direct Provisioning)'}
                  </h2>
                  {editingMemberId && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Chế độ chỉnh sửa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {editingMemberId
                    ? 'Điều chỉnh và phân công lại các quyền hạn chức năng cho nhân viên'
                    : 'Tài khoản có hiệu lực ngay lập tức sau khi tạo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng biểu mẫu"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  readOnly={Boolean(editingMemberId)}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    editingMemberId ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-900'
                  } focus:outline-none focus:border-slate-400`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ Email (Tên đăng nhập) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  readOnly={Boolean(editingMemberId)}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien@example.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    editingMemberId ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-900 font-mono'
                  } focus:outline-none focus:border-slate-400`}
                />
                {editingMemberId && (
                  <span className="text-[10px] text-slate-400 mt-1 block">Tài khoản đã tạo, không thể đổi email</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  readOnly={Boolean(editingMemberId)}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    editingMemberId ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-900'
                  } focus:outline-none focus:border-slate-400`}
                />
              </div>
            </div>

            {/* Initial Password & 6-Digit PIN Security (Only when creating new) */}
            {!editingMemberId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mật Khẩu Khởi Tạo */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-500">key</span>
                      <span>Mật Khẩu Khởi Tạo Mặc Định</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-bold text-slate-600 hover:underline cursor-pointer"
                    >
                      {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.initialPassword}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400">
                    Nhân viên sẽ được yêu cầu đổi mật khẩu cá nhân ở lần đầu đăng nhập.
                  </p>
                </div>

                {/* Mã PIN Bảo Mật 6 Số */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-700">pin</span>
                      <span>Mã PIN Bảo Mật (6 Số) <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateRandomPin}
                        className="text-[10.5px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
                        title="Tự động sinh mã PIN 6 số ngẫu nhiên"
                      >
                        <span className="material-symbols-outlined text-[12px]">refresh</span>
                        <span>Tạo ngẫu nhiên</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-[10.5px] font-bold text-slate-600 hover:underline cursor-pointer"
                      >
                        {showPin ? 'Ẩn PIN' : 'Hiện PIN'}
                      </button>
                    </div>
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={6}
                    pattern="[0-9]*"
                    value={formData.initialPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, initialPin: val });
                    }}
                    placeholder="Nhập 6 số (VD: 123456)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-emerald-300 bg-white text-emerald-950 focus:outline-none focus:border-emerald-600 font-mono font-bold tracking-widest text-center"
                  />
                  <p className="text-[10px] text-emerald-800">
                    Mã PIN 6 số dùng để xác thực các giao dịch nhạy cảm hoặc duyệt tác vụ nội bộ.
                  </p>
                </div>
              </div>
            ) : (
              /* Information Banner when in Edit Mode */
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3 text-xs text-blue-900">
                <span className="material-symbols-outlined text-lg text-blue-600 shrink-0">verified_user</span>
                <div className="space-y-0.5">
                  <p className="font-bold">
                    Đang chỉnh sửa phân quyền cho tài khoản: {formData.fullName} ({formData.email})
                  </p>
                  <p className="text-[11px] text-blue-800/80">
                    Bạn có thể chọn Mẫu phân quyền nhanh (Role Presets) hoặc tùy chỉnh chi tiết 17 quyền hạn bên dưới, sau đó nhấn <strong>Cập Nhật Phân Quyền</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Role Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mẫu Phân Quyền Nhanh (Role Presets)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ROLE_PRESETS.map((preset) => {
                  const isSelected = formData.selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{preset.name}</span>
                        {isSelected && <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>}
                      </div>
                      <p className={`text-[10px] leading-tight ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Permissions Checklist */}
            <div className="space-y-2.5 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Chi Tiết 17 Quyền Chức Năng ({formData.permissions.length} quyền đã chọn)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPermKeys = group.permissions.map((p) => p.key);
                  const isAllGroupSelected = groupPermKeys.every((k) => formData.permissions.includes(k));

                  return (
                    <div key={group.name} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-slate-500">{group.icon}</span>
                          <span>{group.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group)}
                          className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          {isAllGroupSelected ? 'Bỏ chọn' : 'Chọn hết'}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {group.permissions.map((perm) => {
                          const isChecked = formData.permissions.includes(perm.key);
                          return (
                            <label key={perm.key} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                              />
                              <div>
                                <p className="font-medium text-[11px] leading-tight">{perm.label}</p>
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                onClick={handleCloseForm}
              >
                Hủy
              </SellerActionButton>
              <SellerActionButton
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                icon={editingMemberId ? 'save' : 'how_to_reg'}
              >
                {editingMemberId ? 'Cập Nhật Phân Quyền' : 'Cấp Tài Khoản Ngay'}
              </SellerActionButton>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search with Split Date Filter and Integrated Bulk Actions */}
      <DataTableFilterBar
        searchPlaceholder="Tìm tên, email, sđt..."
        searchQuery={searchQuery}
        onSearchChange={(v: string) => {
          setSearchQuery(v);
          setCurrentPage(1);
        }}
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        extraFilters={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="SUSPENDED">Tạm khóa</option>
          </select>
        }
        dateFilter={dateFilter}
        onDateFilterChange={(v: DateFilterValue) => {
          setDateFilter(v);
          setCurrentPage(1);
        }}
        bulkActionGroups={staffBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredMembers.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="nhân sự"
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Staff Grouped Data Table Standardized */}
      <GroupedDataTable<BusinessMemberItem>
        columns={staffColumns}
        data={paginatedMembers}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        getCheckboxProps={(m) => ({ disabled: m.role === 'OWNER' })}
        expandable={true}
        expandedRowRender={renderExpandedMemberDetail}
        emptyTitle="Không tìm thấy nhân viên phù hợp"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy nhân sự khớp với từ khóa "${searchQuery}"`
            : 'Hiện chưa có nhân sự nào trong danh sách.'
        }
        emptyIcon="group"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredMembers.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'nhân sự',
        }}
        className="w-full"
      />
        </>
      )}
      {/* Security PIN Confirmation Modal */}
      <SecurityPinModal
        isOpen={pinModalConfig.isOpen}
        onClose={() => setPinModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={pinModalConfig.onSuccess}
        actionName={pinModalConfig.actionName}
        description={pinModalConfig.description}
        storeId={businessId || user?.business?.id || activeBusinessId || 'store-default'}
      />
    </div>
  );
}
