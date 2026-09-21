import { apiClient } from './apiClient';
import { ApiResponse } from './types';

export type SanctionLevel = 'WARNING' | 'PROBATION' | 'SUSPENSION' | 'BAN';
export type SanctionStatus = 'ACTIVE' | 'APPEALED' | 'LIFTED';
export type AppealDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AppealEvidenceMetadata {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SanctionAppeal {
  id: string;
  sanctionId: string;
  storeId: string;
  sellerId: string;
  reason: string;
  evidence?: {
    attachments?: AppealEvidenceMetadata[];
    urls?: string[];
    [key: string]: any;
  } | null;
  decision: AppealDecision;
  decisionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submittedAt: string;
  sanction?: Sanction;
}

export interface Sanction {
  id: string;
  storeId: string;
  sellerId: string;
  level: SanctionLevel;
  status: SanctionStatus;
  reason: string;
  violationCode?: string | null;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string | null;
  liftedBy?: string | null;
  liftedAt?: string | null;
  liftReason?: string | null;
  evidence?: any;
  metadata?: any;
  appeal?: SanctionAppeal | null;
}

export interface PaginatedAppealsResult {
  items: SanctionAppeal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const sanctionsApi = {
  /**
   * Lấy danh sách quyết định xử phạt của một cửa hàng (Seller)
   */
  getSanctionsByStore: async (storeId: string): Promise<ApiResponse<Sanction[]>> => {
    return apiClient<Sanction[]>(`/sanctions/store/${storeId}`, { method: 'GET' });
  },

  /**
   * Lấy quyết định xử phạt đang hiệu lực của cửa hàng
   */
  getActiveSanctionByStore: async (storeId: string): Promise<ApiResponse<Sanction | null>> => {
    return apiClient<Sanction | null>(`/sanctions/store/${storeId}/active`, { method: 'GET' });
  },

  /**
   * Lấy chi tiết xử phạt
   */
  getSanctionById: async (id: string): Promise<ApiResponse<Sanction>> => {
    return apiClient<Sanction>(`/sanctions/${id}`, { method: 'GET' });
  },

  /**
   * Tải tệp bằng chứng kháng nghị lên lưu trữ bền vững (R2 Pipeline)
   */
  uploadEvidence: async (
    sanctionId: string,
    file: File,
  ): Promise<ApiResponse<AppealEvidenceMetadata>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient<AppealEvidenceMetadata>(`/sanctions/${sanctionId}/appeal/evidence`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Gửi hồ sơ kháng nghị xử phạt (Seller - trong hạn 7 ngày)
   */
  submitAppeal: async (
    sanctionId: string,
    payload: {
      reason: string;
      evidence?: {
        attachments?: AppealEvidenceMetadata[];
        urls?: string[];
      };
    },
  ): Promise<ApiResponse<SanctionAppeal>> => {
    return apiClient<SanctionAppeal>(`/sanctions/${sanctionId}/appeal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy chi tiết hồ sơ kháng nghị của quyết định xử phạt
   */
  getAppealBySanctionId: async (sanctionId: string): Promise<ApiResponse<SanctionAppeal>> => {
    return apiClient<SanctionAppeal>(`/sanctions/${sanctionId}/appeal`, { method: 'GET' });
  },

  /**
   * Lấy danh sách hàng đợi kháng nghị cần xử lý (Admin)
   */
  getAppeals: async (query?: {
    page?: number;
    limit?: number;
    decision?: AppealDecision;
    storeId?: string;
  }): Promise<ApiResponse<PaginatedAppealsResult>> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.decision) params.append('decision', query.decision);
    if (query?.storeId) params.append('storeId', query.storeId);

    const queryString = params.toString();
    const endpoint = queryString ? `/sanctions/appeals?${queryString}` : '/sanctions/appeals';
    return apiClient<PaginatedAppealsResult>(endpoint, { method: 'GET' });
  },

  /**
   * Quản trị viên duyệt hồ sơ kháng nghị (APPROVED / REJECTED)
   */
  reviewAppeal: async (
    appealId: string,
    payload: {
      decision: 'APPROVED' | 'REJECTED';
      decisionReason?: string;
    },
  ): Promise<ApiResponse<SanctionAppeal>> => {
    return apiClient<SanctionAppeal>(`/sanctions/appeals/${appealId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
