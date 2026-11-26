import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'OFFENSIVE'
  | 'LANGUAGE_VIOLATION'
  | 'MISINFORMATION'
  | 'COPYRIGHT'
  | 'OTHER';
export type ReportDetectionSource = 'USER_REPORT' | 'AUTO_MODERATION';
export type ModerationAction = 'NONE' | 'WARN' | 'HIDE' | 'DELETE' | 'BAN';
export type ReportTargetType = 'POST' | 'COMMENT' | 'REVIEW' | 'USER' | 'STORE';

export interface ReportedContentPreview {
  id: string;
  targetType?: ReportTargetType;
  targetId?: string;
  content?: string;
  title?: string;
  rating?: number;
  authorId?: string;
  authorName?: string;
  status?: string;
  moderationNote?: string;
  createdAt?: string;
}

export interface ModerationReportItem {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  detectionSource?: ReportDetectionSource;
  violationCategory?: string;
  matchedKeywords?: string[];
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolutionNote?: string;
  actionTaken?: ModerationAction;
  action?: ModerationAction;
  content?: ReportedContentPreview | null;
  targetContent?: ReportedContentPreview | null;
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
      const rawList = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : []);
      const list: ModerationReportItem[] = rawList.map((item: any) => ({
        ...item,
        content: item.content || item.targetContent || null,
        targetContent: item.targetContent || item.content || null,
        actionTaken: item.actionTaken || item.action,
        resolutionNotes: item.resolutionNotes || item.resolutionNote,
      }));
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
      status?: 'RESOLVED' | 'DISMISSED';
      outcome?: 'RESOLVED' | 'DISMISSED';
      resolutionNotes?: string;
      note?: string;
      action?: ModerationAction;
    }
  ): Promise<ApiResponse<ModerationReportItem>> {
    const outcome = payload.outcome || payload.status || 'RESOLVED';
    const action: ModerationAction =
      outcome === 'DISMISSED' ? 'NONE' : (payload.action || 'HIDE');
    const rawNote = (payload.note || payload.resolutionNotes || '').trim();
    const note =
      rawNote.length >= 3
        ? rawNote
        : outcome === 'DISMISSED'
          ? 'Báo cáo không vi phạm tiêu chuẩn cộng đồng.'
          : `Quản trị viên đã xử lý báo cáo với biện pháp ${action}.`;

    return apiClient<ModerationReportItem>(`/admin/moderation/reports/${encodeURIComponent(id)}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ outcome, action, note }),
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

