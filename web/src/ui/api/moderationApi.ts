import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'OFFENSIVE' | 'MISINFORMATION' | 'COPYRIGHT' | 'OTHER';
export type ModerationAction = 'NONE' | 'WARN' | 'HIDE' | 'DELETE' | 'BAN';
export type ReportTargetType = 'POST' | 'COMMENT' | 'REVIEW' | 'USER' | 'STORE';

export interface ModerationReportItem {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  actionTaken?: ModerationAction;
  targetContent?: {
    id: string;
    content?: string;
    title?: string;
    rating?: number;
    authorName?: string;
    createdAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ModerationListResponse {
  data: ModerationReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const moderationApi = {
  /**
   * List paginated moderation reports
   */
  async listReports(query: {
    page?: number;
    limit?: number;
    status?: ReportStatus | string;
    targetType?: ReportTargetType | string;
    reason?: ReportReason | string;
  } = {}): Promise<ApiResponse<ModerationListResponse>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.status && query.status !== 'ALL') params.set('status', query.status);
    if (query.targetType && query.targetType !== 'ALL') params.set('targetType', query.targetType);
    if (query.reason && query.reason !== 'ALL') params.set('reason', query.reason);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<any>(`/admin/moderation/reports${qs}`);

    if (res.success && res.data) {
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : []);
      const pagination = raw.pagination || {
        page: query.page || 1,
        limit: query.limit || 10,
        total: list.length,
        totalPages: Math.ceil(list.length / (query.limit || 10)) || 1,
      };
      return {
        success: true,
        data: {
          data: list,
          pagination,
        },
      };
    }

    return {
      success: false,
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
      error: res.error,
    };
  },

  /**
   * Get single report details
   */
  async getReport(id: string): Promise<ApiResponse<ModerationReportItem>> {
    return apiClient<ModerationReportItem>(`/admin/moderation/reports/${encodeURIComponent(id)}`);
  },

  /**
   * Move report to REVIEWING status
   */
  async startReview(id: string): Promise<ApiResponse<ModerationReportItem>> {
    return apiClient<ModerationReportItem>(`/admin/moderation/reports/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
    });
  },

  /**
   * Resolve or dismiss report
   */
  async resolveReport(
    id: string,
    payload: {
      status: 'RESOLVED' | 'DISMISSED';
      resolutionNotes?: string;
      action?: ModerationAction;
    }
  ): Promise<ApiResponse<ModerationReportItem>> {
    return apiClient<ModerationReportItem>(`/admin/moderation/reports/${encodeURIComponent(id)}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Direct content moderation action
   */
  async moderateContent(
    targetType: ReportTargetType,
    id: string,
    payload: {
      action: ModerationAction;
      reason?: string;
    }
  ): Promise<ApiResponse<{ id: string; action: ModerationAction }>> {
    return apiClient<{ id: string; action: ModerationAction }>(
      `/admin/moderation/content/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },
};

