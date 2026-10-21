import { apiClient } from '@/ui/api/apiClient';
import type { ApiResponse } from '@/ui/api/types';
import type { AffiliateProfile, PartnerStatus } from '@/types/affiliate';

export interface CodeAvailabilityResponse {
  code: string;
  available: boolean;
  reason?: string;
}

export interface MyProfileResponse {
  hasProfile: boolean;
  profile: (AffiliateProfile & {
    isCoolingDown?: boolean;
    cooldownRemainingMs?: number;
    canResubmit?: boolean;
    remainingResubmits?: number;
    cooldownUntil?: string | null;
    resubmitCount?: number;
  }) | null;
}

export interface ProgramInfoResponse {
  name: string;
  termsVersion: string;
  privacyVersion: string;
  rates: {
    physical: number;
    ebook: number;
    audio: number;
  };
  holdingDays: {
    physical: number;
    digitalHours: number;
  };
  minPayoutAmount: number;
  cookieDurationDays: number;
}

export interface AdminListApplicationsResponse {
  items: AffiliateProfile[];
  total: number;
  page: number;
  totalPages: number;
}

export const affiliateApi = {
  /**
   * Public: Get program info & rates
   */
  async getProgramInfo(): Promise<ApiResponse<ProgramInfoResponse>> {
    return apiClient<ProgramInfoResponse>('/affiliate/program', {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Public: Check if affiliateCode is available
   */
  async checkCodeAvailability(code: string): Promise<ApiResponse<CodeAvailabilityResponse>> {
    return apiClient<CodeAvailabilityResponse>(
      `/affiliate/code-availability?code=${encodeURIComponent(code)}`,
      {
        method: 'GET',
        skipAuth: true,
      }
    );
  },

  /**
   * Authenticated: Get current user's profile and application status
   */
  async getMyProfile(): Promise<ApiResponse<MyProfileResponse>> {
    return apiClient<MyProfileResponse>('/affiliate/me', {
      method: 'GET',
    });
  },

  /**
   * Authenticated: Submit new application
   */
  async submitApplication(data: any): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>('/affiliate/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Authenticated: Resubmit requested changes
   */
  async resubmitApplication(data: any): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>('/affiliate/me/resubmit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin: List applications in review queue
   */
  async adminListApplications(params: {
    status?: PartnerStatus;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<AdminListApplicationsResponse>> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient<AdminListApplicationsResponse>(`/admin/affiliates?${query.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Admin: View application detail with audit timeline
   */
  async adminGetApplicationDetail(id: string): Promise<ApiResponse<{ profile: AffiliateProfile; auditTimeline: any[] }>> {
    return apiClient<{ profile: AffiliateProfile; auditTimeline: any[] }>(`/admin/affiliates/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Admin: Approve application
   */
  async adminApprove(id: string): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>(`/admin/affiliates/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Admin: Request changes
   */
  async adminRequestChanges(
    id: string,
    reason: string,
    requestedChanges?: Record<string, string>
  ): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>(`/admin/affiliates/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ reason, requestedChanges }),
    });
  },

  /**
   * Admin: Reject application
   */
  async adminReject(id: string, reason: string): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>(`/admin/affiliates/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Admin: Suspend active partner
   */
  async adminSuspend(id: string, reason: string): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>(`/admin/affiliates/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Admin: Re-activate suspended partner
   */
  async adminActivate(id: string): Promise<ApiResponse<AffiliateProfile>> {
    return apiClient<AffiliateProfile>(`/admin/affiliates/${id}/activate`, {
      method: 'POST',
    });
  },

  // ==========================================
  // PHASE 4: SELLER POLICY & BOOK ELIGIBILITY
  // ==========================================

  /**
   * Seller: Get store affiliate settings & platform caps
   */
  async getStoreAffiliateSettings(storeId: string): Promise<ApiResponse<{
    storeSetting: {
      storeId: string;
      isEnabled: boolean;
      autoEnrollNewBooks: boolean;
      physicalRate: number | null;
      ebookRate: number | null;
      audioRate: number | null;
      version: number;
    };
    platformPolicy: {
      id: string;
      name: string;
      defaultPhysicalRate: number;
      defaultEbookRate: number;
      defaultAudioRate: number;
      minRate: number;
      maxPhysicalRate: number;
      maxDigitalRate: number;
      cookieDurationDays: number;
      physicalHoldingDays: number;
      digitalHoldingHours: number;
    };
    effectiveRates: {
      physicalRate: number;
      ebookRate: number;
      audioRate: number;
    };
  }>> {
    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/settings`, {
      method: 'GET',
    });
  },

  /**
   * Seller: Update store affiliate settings
   */
  async updateStoreAffiliateSettings(
    storeId: string,
    data: {
      isEnabled?: boolean;
      autoEnrollNewBooks?: boolean;
      physicalRate?: number | null;
      ebookRate?: number | null;
      audioRate?: number | null;
    }
  ): Promise<ApiResponse<any>> {
    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Seller: List store books with affiliate status, dynamic inheritance & net breakdown
   */
  async listStoreAffiliateBooks(
    storeId: string,
    params: {
      search?: string;
      format?: string;
      isEligible?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<{
    items: Array<{
      bookId: string;
      title: string;
      slug: string;
      format: 'PHYSICAL' | 'DIGITAL' | 'BOTH';
      price: number;
      coverImage: string | null;
      isEligible: boolean;
      hasExplicitOverride: boolean;
      customRate: number | null;
      effectiveRate: number;
      rateSource: 'CUSTOM' | 'STORE_FORMAT' | 'PLATFORM_DEFAULT';
      notes?: string | null;
      sellerNetBreakdown: {
        grossPrice: number;
        platformFeePercent: number;
        platformFeeAmount: number;
        affiliateRatePercent: number;
        affiliateCommissionAmount: number;
        sellerNetRevenue: number;
        sellerNetMarginPercent: number;
      };
    }>;
    total: number;
    page: number;
    totalPages: number;
    caps: {
      minRate: number;
      maxPhysicalRate: number;
      maxDigitalRate: number;
    };
  }>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.format) query.set('format', params.format);
    if (params.isEligible !== undefined) query.set('isEligible', String(params.isEligible));
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/books?${query.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Seller: Update book affiliate override
   */
  async updateBookAffiliateSetting(
    storeId: string,
    bookId: string,
    data: {
      isEligible?: boolean;
      customRate?: number | null;
      notes?: string | null;
    }
  ): Promise<ApiResponse<any>> {
    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/books/${encodeURIComponent(bookId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Seller: Bulk update book affiliate settings
   */
  async bulkUpdateBooksAffiliate(
    storeId: string,
    data: {
      bookIds: string[];
      isEligible?: boolean;
      customRate?: number | null;
      notes?: string | null;
    }
  ): Promise<ApiResponse<{ updatedCount: number }>> {
    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/books/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Seller: Calculate live Seller-Net revenue preview
   */
  async previewSellerNet(
    storeId: string,
    params: {
      price: number;
      format: string;
      customRate?: number;
    }
  ): Promise<ApiResponse<{
    grossPrice: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    affiliateRatePercent: number;
    affiliateCommissionAmount: number;
    sellerNetRevenue: number;
    sellerNetMarginPercent: number;
  }>> {
    const query = new URLSearchParams();
    query.set('price', params.price.toString());
    query.set('format', params.format);
    if (params.customRate !== undefined) query.set('customRate', params.customRate.toString());

    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/preview-net?${query.toString()}`, {
      method: 'GET',
    });
  },
};

