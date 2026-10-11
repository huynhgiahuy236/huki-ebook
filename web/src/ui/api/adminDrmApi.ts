import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface DrmOverviewData {
  totalEncryptedBooks: number;
  activeReadersCount: number;
  revokedDevicesCount: number;
  kmsHardwareClusters: string;
  kmsLatencyMs: number;
  algorithmSummary: string;
}

export interface DrmLicenseItem {
  id: string; // licenseCode ví dụ: DRM-LIC-8000
  licenseId: string; // uuid
  bookId: string;
  bookTitle: string;
  publisher: string;
  isbn: string;
  algorithm: string;
  issuedLicenses: number;
  activeReaders: number;
  encryptionCluster: string;
  keyFingerprint: string;
  watermarkEngine: string;
  securityStatus: 'secure' | 'upgrade_needed';
  statusLabel: string;
  revokedDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrmLicenseListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: DrmLicenseItem[];
}

export interface DrmLicenseQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'secure' | 'upgrade_needed';
}

export interface IntegrityScanResult {
  scannedCount: number;
  compromisedCount: number;
  kmsLatencyMs: number;
  healthyCount: number;
  scanDurationMs: number;
  status: string;
  timestamp: string;
}

// Giúp đảm bảo kết nối thông suốt dù dev server có restart rewrite hay chưa
function resolveDrmUrl(path: string): string {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://localhost:3003/api/v1${path}`;
  }
  return path;
}

export const adminDrmApi = {
  /**
   * Lấy số liệu thống kê tổng quan của DRM Vault
   */
  async getOverview(): Promise<ApiResponse<DrmOverviewData>> {
    return apiClient<DrmOverviewData>(resolveDrmUrl('/admin/drm/overview'));
  },

  /**
   * Lấy danh sách chứng chỉ bản quyền DRM phân trang và lọc
   */
  async getLicenses(query: DrmLicenseQuery = {}): Promise<ApiResponse<DrmLicenseListResponse>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search?.trim()) params.set('search', query.search.trim());
    if (query.status && query.status !== 'all') params.set('status', query.status);

    const queryString = params.toString();
    const endpoint = resolveDrmUrl(`/admin/drm/licenses${queryString ? `?${queryString}` : ''}`);
    return apiClient<DrmLicenseListResponse>(endpoint);
  },

  /**
   * Luân chuyển khóa (Rotate Key) cho giấy phép DRM
   */
  async rotateKey(licenseIdOrCode: string): Promise<ApiResponse<any>> {
    return apiClient<any>(resolveDrmUrl(`/admin/drm/licenses/${encodeURIComponent(licenseIdOrCode)}/rotate`), {
      method: 'POST',
    });
  },

  /**
   * Quét toàn vẹn bản quyền DRM (Integrity Scan)
   */
  async scanIntegrity(): Promise<ApiResponse<IntegrityScanResult>> {
    return apiClient<IntegrityScanResult>(resolveDrmUrl('/admin/drm/integrity-scan'), {
      method: 'POST',
    });
  },

  /**
   * Khởi tạo phiên đọc sách và ghi nhận thiết bị độc giả
   */
  async startSession(bookIdOrCode: string, payload: { userId?: string; deviceId?: string; deviceName?: string; ipAddress?: string } = {}): Promise<ApiResponse<any>> {
    return apiClient<any>(resolveDrmUrl(`/admin/drm/licenses/${encodeURIComponent(bookIdOrCode)}/session`), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Kết thúc phiên đọc sách
   */
  async endSession(bookIdOrCode: string): Promise<ApiResponse<any>> {
    return apiClient<any>(resolveDrmUrl(`/admin/drm/licenses/${encodeURIComponent(bookIdOrCode)}/session-leave`), {
      method: 'POST',
    });
  },
};
