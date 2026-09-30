import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface MemberUserData {
  fullName: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
}

export interface BusinessMemberItem {
  id: string;
  businessId: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'ORDER_STAFF' | 'CONTENT_STAFF' | 'FINANCE_STAFF';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_INVITATION' | 'INVITATION_EXPIRED';
  permissions: string[];
  invitedAt?: string;
  invitedBy?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: MemberUserData;
}

export interface ProvisionMemberPayload {
  fullName: string;
  email: string;
  phone?: string;
  initialPassword?: string;
  role?: 'ORDER_STAFF' | 'CONTENT_STAFF' | 'FINANCE_STAFF' | 'MANAGER';
  permissions: string[];
}

export const memberApi = {
  /**
   * Lấy danh sách thành viên trong Doanh nghiệp
   */
  getBusinessMembers: async (businessId: string): Promise<ApiResponse<BusinessMemberItem[]>> => {
    return apiClient<BusinessMemberItem[]>(`/businesses/${businessId}/members`, {
      method: 'GET',
    });
  },

  /**
   * Cấp tài khoản nhân viên trực tiếp (Direct Provisioning)
   */
  provisionMember: async (
    businessId: string,
    payload: ProvisionMemberPayload,
  ): Promise<ApiResponse<BusinessMemberItem>> => {
    return apiClient<BusinessMemberItem>(`/businesses/${businessId}/members/provision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Cập nhật danh sách quyền cho nhân viên
   */
  updateMemberPermissions: async (
    businessId: string,
    memberId: string,
    permissions: string[],
  ): Promise<ApiResponse<BusinessMemberItem>> => {
    return apiClient<BusinessMemberItem>(
      `/businesses/${businessId}/members/${memberId}/permissions`,
      {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      },
    );
  },

  /**
   * Cập nhật trạng thái nhân viên (ACTIVE hoặc SUSPENDED)
   */
  updateMemberStatus: async (
    businessId: string,
    memberId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ): Promise<ApiResponse<BusinessMemberItem>> => {
    return apiClient<BusinessMemberItem>(
      `/businesses/${businessId}/members/${memberId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
  },

  /**
   * Đặt lại mật khẩu khởi tạo cho nhân viên
   */
  resetMemberPassword: async (
    businessId: string,
    memberId: string,
    newPassword?: string,
  ): Promise<ApiResponse<{ temporaryPassword: string }>> => {
    return apiClient<{ temporaryPassword: string }>(
      `/businesses/${businessId}/members/${memberId}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      },
    );
  },

  /**
   * Xóa thành viên khỏi Doanh nghiệp
   */
  removeMember: async (businessId: string, memberId: string): Promise<ApiResponse<void>> => {
    return apiClient<void>(`/businesses/${businessId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy nhật ký quản trị phân quyền nhân sự (Staff Governance Audit Logs)
   */
  getMemberAuditLogs: async (
    businessId: string,
    params?: { page?: number; limit?: number; action?: string },
  ): Promise<ApiResponse<{ items: any[]; total: number; page: number; limit: number }>> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.action) query.append('action', params.action);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient<{ items: any[]; total: number; page: number; limit: number }>(
      `/members/business/${encodeURIComponent(businessId)}/audit-logs${queryString}`,
      {
        method: 'GET',
      },
    );
  },
};
