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

  // ==========================================
  // PHASE 5: LINK, ATTRIBUTION & ANALYTICS
  // ==========================================

  /**
   * CTV: Create a new affiliate link
   */
  async createAffiliateLink(data: {
    targetUrl: string;
    customShortCode?: string;
    campaignName?: string;
    subId?: string;
    targetBookId?: string;
    targetStoreId?: string;
  }): Promise<ApiResponse<{
    id: string;
    profileId: string;
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    targetType: string;
    campaignName: string | null;
    subId: string | null;
    clickCount: number;
    conversionCount: number;
    createdAt: string;
  }>> {
    return apiClient('/affiliate/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * CTV: List my links
   */
  async listMyAffiliateLinks(params: {
    search?: string;
    targetType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{
    items: Array<{
      id: string;
      profileId: string;
      shortCode: string;
      shortUrl: string;
      originalUrl: string;
      targetType: string;
      campaignName: string | null;
      subId: string | null;
      clickCount: number;
      conversionCount: number;
      isActive: boolean;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient(`/affiliate/links?${query.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Public/CTV: Get book affiliate card & live commission rate
   */
  async getBookAffiliateCommissionCard(bookId: string): Promise<ApiResponse<{
    bookId: string;
    title: string;
    price: number;
    format: string;
    isEligible: boolean;
    effectiveRate: number;
    estimatedCommissionAmount: number;
    isAffiliateActive: boolean;
    existingShortUrl: string | null;
    cookieDurationDays: number;
  }>> {
    return apiClient(`/affiliate/books/${encodeURIComponent(bookId)}/commission-card`, {
      method: 'GET',
    });
  },

  /**
   * Public: Resolve short code for /r/[shortCode]
   */
  async resolveShortCode(shortCode: string): Promise<ApiResponse<{
    targetUrl: string;
    cookieToken: string | null;
    cookieMaxAgeSeconds?: number;
    shortCode?: string;
    isBot?: boolean;
    isThrottled?: boolean;
  }>> {
    return apiClient(`/affiliate/resolve/${encodeURIComponent(shortCode)}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  // ==========================================
  // PHASE 8 & 9: WALLET, DASHBOARDS & EXPORT
  // ==========================================

  /**
   * Authenticated CTV: Get wallet balance details
   */
  async getWalletBalance(): Promise<ApiResponse<{
    walletId: string;
    profileId: string;
    userId: string;
    availableBalance: number;
    netAvailableBalance: number;
    debtBalance: number;
    holdingBalance: number;
    pendingBalance: number;
    frozenBalance: number;
    lifetimeEarned: number;
    lifetimePaid: number;
    currency: string;
    updatedAt: string;
  }>> {
    return apiClient('/affiliate/wallet', { method: 'GET' });
  },

  /**
   * Authenticated CTV: Get wallet transactions history
   */
  async getWalletTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<ApiResponse<{
    items: Array<{
      id: string;
      walletId: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      currency: string;
      referenceType: string;
      referenceId: string;
      description: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.type) query.set('type', params.type);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    return apiClient(`/affiliate/wallet/transactions?${query.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Authenticated CTV: Get live dashboard stats
   */
  async getCtvDashboardStats(): Promise<ApiResponse<{
    profile: {
      id: string;
      affiliateCode: string;
      displayName: string;
      status: string;
    };
    metrics: {
      clicksCount: number;
      conversionsCount: number;
      conversionRate: number;
      pendingCommission: number;
      holdingCommission: number;
      availableCommission: number;
      netAvailableCommission: number;
      debtCommission: number;
      lifetimePaid: number;
      reversedCommission: number;
      currency: string;
    };
    recentCommissions: Array<{
      id: string;
      orderId: string;
      orderItemId: string;
      bookTitle: string;
      commissionAmount: number;
      commissionRate: number;
      status: string;
      holdingUntil: string | null;
      createdAt: string;
    }>;
    topLinks: Array<{
      id: string;
      shortCode: string;
      targetType: string;
      clickCount: number;
      conversionCount: number;
      createdAt: string;
    }>;
    version: string;
    refreshedAt: string;
  }>> {
    return apiClient('/affiliate/dashboard', { method: 'GET' });
  },

  /**
   * Seller: Get store affiliate performance dashboard
   */
  async getSellerDashboardStats(storeId: string): Promise<ApiResponse<{
    storeId: string;
    metrics: {
      totalAttributedOrders: number;
      totalAttributedRevenue: number;
      totalCommissionCost: number;
      pendingCommissionCost: number;
      settledCommissionCost: number;
      currency: string;
    };
    topBooks: Array<{
      bookId: string;
      bookTitle: string;
      ordersCount: number;
      revenue: number;
      commissionCost: number;
    }>;
    version: string;
    refreshedAt: string;
  }>> {
    return apiClient(`/seller/stores/${encodeURIComponent(storeId)}/affiliate/dashboard`, {
      method: 'GET',
    });
  },

  /**
   * Admin: Get platform-wide affiliate dashboard overview
   */
  async getAdminDashboardStats(): Promise<ApiResponse<{
    partners: {
      total: number;
      active: number;
      pendingReview: number;
      suspended: number;
      rejected: number;
    };
    financials: {
      totalAttributedRevenue: number;
      totalCommissionsPaid: number;
      totalCommissionsAvailable: number;
      totalCommissionsHolding: number;
      totalCommissionsPending: number;
      totalCommissionsReversed: number;
      currency: string;
    };
    traffic: {
      totalClicks: number;
      totalConversions: number;
      averageConversionRate: number;
    };
    version: string;
    refreshedAt: string;
  }>> {
    return apiClient('/admin/affiliates/dashboard', { method: 'GET' });
  },
};


