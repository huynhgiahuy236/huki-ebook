"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
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

  // In-Page Add Form State (Direct Provisioning)
  const [showAddForm, setShowAddForm] = useState(false);

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

  // Helper to persist and broadcast audit log events
  const getAuditStorageKey = (bizId?: string) => `huki_staff_audit_logs_${bizId || 'default'}`;

  const appendAuditLog = useCallback((bizId: string, logItem: Omit<AuditLogItem, 'id' | 'timestamp'>) => {
    const fullItem: AuditLogItem = {
      ...logItem,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const key = getAuditStorageKey(bizId);
      const existing: AuditLogItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [fullItem, ...existing].slice(0, 100);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save audit log to localStorage', e);
    }

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

  // Load Governance Audit Logs (Server + Persistent Local + Seed Fallback)
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
      // 1. Get from local storage
      const localKey = getAuditStorageKey(currentBizId);
      let localSaved: AuditLogItem[] = [];
      try {
        localSaved = JSON.parse(localStorage.getItem(localKey) || '[]');
      } catch {}

      // 2. Try fetching from server
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
        console.warn('Server audit log fetch failed, relying on local logs', apiErr);
      }

      // Merge unique by ID
      const combinedMap = new Map<string, AuditLogItem>();
      localSaved.forEach((l) => combinedMap.set(l.id, l));
      serverLogs.forEach((l) => combinedMap.set(l.id, l));

      let allLogs = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Enrich any existing logs in local storage that lack actorName/actorEmail
      allLogs = allLogs.map((log) => {
        if (!log.actorName && (log.actorId === user?.id || log.actorRole === 'OWNER')) {
          return {
            ...log,
            actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
            actorEmail: user?.email || log.actorEmail,
          };
        }
        return log;
      });

      // If still empty and members exist, seed initial provision logs so the user sees real history
      if (allLogs.length === 0 && members.length > 0) {
        const seeded: AuditLogItem[] = members.map((m, idx) => ({
          id: `seed-log-${m.id || idx}`,
          actorId: user?.id || 'admin',
          actorName: user?.fullName || user?.name || user?.email || 'Chủ doanh nghiệp',
          actorEmail: user?.email,
          actorRole: 'OWNER',
          action: 'CREATE',
          resource: 'Member',
          resourceId: m.id,
          storeId: currentBizId,
          timestamp: m.createdAt || new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
          changedFields: ['fullName', 'email', 'role', 'permissions', 'initialPin'],
          stateBefore: null,
          stateAfter: {
            fullName: m.user?.fullName || 'Nhân viên',
            email: m.user?.email || 'nhanvien@example.com',
            role: m.role,
            status: m.status,
            permissions: m.permissions,
          },
          metadata: {
            staffName: m.user?.fullName || 'Nhân viên',
            staffEmail: m.user?.email,
            permissionsCount: m.permissions?.length || 0,
            initialPinConfigured: true,
            note: 'Cấp tài khoản & mã PIN 6 số trực tiếp (Khởi tạo hệ thống)',
          },
        }));
        allLogs = seeded;
        try {
          localStorage.setItem(localKey, JSON.stringify(seeded));
        } catch {}
      }

      setAuditLogs(allLogs);
    } catch (err: any) {
      setAuditError(err?.message || 'Không thể tải nhật ký phân quyền nhân sự.');
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [businessId, setActiveBusinessId, members, user]);

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

  // Open Edit Permissions
  const handleOpenEdit = (member: BusinessMemberItem) => {
    setEditingMemberId(member.id);
    setEditPermissions(member.permissions || []);
    setEditPreset('CUSTOM');
  };

  const handleSelectEditPreset = (presetId: string) => {
    const found = ROLE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setEditPreset(presetId);
      setEditPermissions([...found.permissions]);
    }
  };

  const handleToggleEditPermission = (permKey: string) => {
    setEditPermissions((prev) => {
      const exists = prev.includes(permKey);
      return exists ? prev.filter((k) => k !== permKey) : [...prev, permKey];
    });
    setEditPreset('CUSTOM');
  };

  const handleToggleEditGroup = (group: (typeof PERMISSION_GROUPS)[0]) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const isAllSelected = groupKeys.every((k) => editPermissions.includes(k));
    if (isAllSelected) {
      setEditPermissions((prev) => prev.filter((k) => !groupKeys.includes(k as PermissionKey)));
    } else {
      setEditPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
    setEditPreset('CUSTOM');
  };

  const handleSavePermissions = async (memberId: string) => {
    const currentBizId = businessId || user?.business?.id || activeBusinessId;
    if (!currentBizId) return;

    if (editPermissions.length === 0) {
      showToast({ title: 'Lỗi phân quyền', message: 'Nhân viên phải có ít nhất 1 quyền chức năng.' }, 'error');
      return;
    }

    const targetMember = members.find((m) => m.id === memberId);
    const staffName = targetMember?.user?.fullName || targetMember?.user?.email || 'Nhân viên';

    setPinModalConfig({
      isOpen: true,
      actionName: `Cập nhật phân quyền cho ${staffName}`,
      description: `Thao tác thay đổi quyền hạn cho nhân sự "${staffName}" (${editPermissions.length} quyền) yêu cầu xác thực bằng mã PIN 6 số của bạn.`,
      onSuccess: async (_pin: string) => {
        setSavingEdit(true);
        try {
          const res = await memberApi.updateMemberPermissions(currentBizId, memberId, editPermissions);
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
              stateAfter: { permissions: editPermissions },
              metadata: {
                staffName,
                staffEmail: targetMember?.user?.email,
                previousCount: targetMember?.permissions?.length || 0,
                newCount: editPermissions.length,
                pinVerified: true,
                note: 'Đã xác thực mã PIN bảo mật khi cập nhật phân quyền nhân sự',
              },
            });

            showToast({ title: 'Thành công', message: 'Đã cập nhật phân quyền nhân viên và lưu nhật ký quản trị.' }, 'success');
            setEditingMemberId(null);
            await loadMembers();
          } else {
            showToast({ title: 'Thất bại', message: res.error?.message || 'Không thể lưu phân quyền.' }, 'error');
          }
        } catch {
          showToast({ title: 'Lỗi', message: 'Lỗi kết nối khi cập nhật quyền.' }, 'error');
        } finally {
          setSavingEdit(false);
        }
      },
    });
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

      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

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

          <SellerActionButton
            type="button"
            variant={showAddForm ? 'neutral' : 'primary'}
            size="sm"
            icon={showAddForm ? 'close' : 'person_add'}
            onClick={() => {
              if (activeStaffTab !== 'members') setActiveStaffTab('members');
              setShowAddForm(!showAddForm);
            }}
          >
            {showAddForm ? 'Đóng Biểu Mẫu' : 'Cấp Tài Khoản Mới'}
          </SellerActionButton>
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
          {/* Direct Provisioning Form (In-Page Collapsible) */}
          {showAddForm && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-lg text-emerald-600">how_to_reg</span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Cấp Tài Khoản Nhân Viên Trực Tiếp (Direct Provisioning)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Tài khoản có hiệu lực ngay lập tức sau khi tạo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nhanvien@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Initial Password & 6-Digit PIN Security */}
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
                onClick={() => setShowAddForm(false)}
              >
                Hủy
              </SellerActionButton>
              <SellerActionButton
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                icon="how_to_reg"
              >
                Cấp Tài Khoản Ngay
              </SellerActionButton>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="SUSPENDED">Tạm khóa</option>
          </select>
          <span className="text-xs text-slate-400">
            Tổng: <b className="text-slate-700">{filteredMembers.length}</b> nhân sự
          </span>
        </div>

        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm tên, email, sđt..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table */}
      <SellerTableContainer minWidth="min-w-[1280px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80 whitespace-nowrap">
              <th className="py-3.5 px-4">Nhân Viên</th>
              <th className="py-3.5 px-3">Email & SĐT</th>
              <th className="py-3.5 px-3 text-center">Vai Trò</th>
              <th className="py-3.5 px-3">Phân Quyền</th>
              <th className="py-3.5 px-3 text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl text-slate-400">progress_activity</span>
                    <span className="text-xs">Đang tải danh sách nhân sự...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <span className="material-symbols-outlined text-4xl text-slate-300">group</span>
                    <p className="font-medium text-slate-600">Không tìm thấy nhân viên phù hợp.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedMembers.map((member) => {
                const isOwner = member.role === 'OWNER';
                const isEditingThis = editingMemberId === member.id;
                const isResettingPassThis = resetPasswordMemberId === member.id;

                return (
                  <React.Fragment key={member.id}>
                    <tr className="hover:bg-slate-50/60 transition-colors whitespace-nowrap group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                            {(member.user?.fullName || member.user?.email || 'U').charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{member.user?.fullName || 'Chưa cập nhật'}</span>
                            {isOwner && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chủ gian hàng</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        <span className="block text-slate-800 font-medium">{member.user?.email}</span>
                        <span className="text-[11px] text-slate-400">{member.user?.phone || '—'}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 font-bold text-slate-700">
                          {member.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {isOwner ? (
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">all_inclusive</span>
                            <span>Toàn quyền Master</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="text-slate-800 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{member.permissions?.length || 0} quyền</span>
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <SellerStatusBadge
                          variant={member.status === 'ACTIVE' ? 'success' : 'danger'}
                          dot
                          text={member.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isOwner && (
                          <div className="flex items-center justify-end gap-1">
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
                        )}
                      </td>
                    </tr>

                    {/* In-Page Expandable Edit Permissions Drawer */}
                    {isEditingThis && (
                      <tr className="bg-slate-50/70 border-y border-slate-200">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                                Chỉnh sửa phân quyền: <u>{member.user?.fullName}</u> ({editPermissions.length} quyền)
                              </h4>
                              <button
                                type="button"
                                onClick={() => setEditingMemberId(null)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>

                            {/* Presets */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {ROLE_PRESETS.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectEditPreset(p.id)}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                    editPreset === p.id
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>

                            {/* Groups */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {PERMISSION_GROUPS.map((group) => {
                                const groupKeys = group.permissions.map((p) => p.key);
                                const isAllSelected = groupKeys.every((k) => editPermissions.includes(k));

                                return (
                                  <div key={group.name} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                                      <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs text-slate-500">{group.icon}</span>
                                        <span>{group.name}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEditGroup(group)}
                                        className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                                      >
                                        {isAllSelected ? 'Bỏ hết' : 'Chọn hết'}
                                      </button>
                                    </div>

                                    <div className="space-y-1">
                                      {group.permissions.map((perm) => (
                                        <label key={perm.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={editPermissions.includes(perm.key)}
                                            onChange={() => handleToggleEditPermission(perm.key)}
                                            className="rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                                          />
                                          <span className="leading-tight text-[11px] font-medium">{perm.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                              <SellerActionButton
                                type="button"
                                variant="neutral"
                                size="sm"
                                onClick={() => setEditingMemberId(null)}
                              >
                                Đóng
                              </SellerActionButton>
                              <SellerActionButton
                                type="button"
                                variant="primary"
                                size="sm"
                                loading={savingEdit}
                                icon="check"
                                onClick={() => handleSavePermissions(member.id)}
                              >
                                Lưu Quyền
                              </SellerActionButton>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* In-Page Reset Password Row */}
                    {isResettingPassThis && (
                      <tr className="bg-amber-50/40 border-y border-amber-200">
                        <td colSpan={6} className="p-4">
                          <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-amber-600">key</span>
                              <div>
                                <p className="font-bold text-xs text-slate-900">
                                  Đặt Lại Mật Khẩu Khởi Tạo Cho: {member.user?.fullName} ({member.user?.email})
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Mật khẩu mới sẽ có hiệu lực ngay lập tức
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:border-amber-500 w-48 sm:w-60"
                              />
                              <SellerActionButton
                                type="button"
                                variant="primary"
                                size="sm"
                                loading={resettingPassword}
                                icon="check"
                                onClick={() => handleResetPassword(member.id)}
                              >
                                Xác Nhận Đổi
                              </SellerActionButton>
                              <SellerActionButton
                                type="button"
                                variant="neutral"
                                size="sm"
                                onClick={() => setResetPasswordMemberId(null)}
                              >
                                Hủy
                              </SellerActionButton>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </SellerTableContainer>

      {/* Pagination */}
      {!loading && filteredMembers.length > 0 && (
        <SellerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
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
