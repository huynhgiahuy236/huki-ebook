import { Logger } from '@nestjs/common';

export interface SellerScope {
  isPlatformAdmin: boolean;
  businessIds: string[];
  storeIds: string[];
  ownerUserIds: string[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class BusinessServiceClient {
  private static instance: BusinessServiceClient;
  private readonly logger = new Logger(BusinessServiceClient.name);
  private readonly scopeCache = new Map<string, CacheEntry<SellerScope>>();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds TTL

  private constructor() {}

  public static getInstance(): BusinessServiceClient {
    if (!BusinessServiceClient.instance) {
      BusinessServiceClient.instance = new BusinessServiceClient();
    }
    return BusinessServiceClient.instance;
  }

  private getBaseUrl(): string {
    return (
      process.env.BUSINESS_SERVICE_URL ||
      `http://localhost:${process.env.BUSINESS_SERVICE_PORT || 3002}`
    );
  }

  private getInternalKey(): string {
    return (
      process.env.INTERNAL_SERVICE_KEY ||
      'huki-production-internal-key-2026-very-secure'
    );
  }

  async getSellerScope(userId: string): Promise<SellerScope> {
    const cached = this.scopeCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const defaultScope: SellerScope = {
      isPlatformAdmin: false,
      businessIds: [],
      storeIds: [],
      ownerUserIds: [userId],
    };

    try {
      const url = `${this.getBaseUrl()}/api/v1/internal/seller-scope/${encodeURIComponent(userId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-internal-service-key': this.getInternalKey(),
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch seller scope for ${userId}: status ${response.status}`);
        return cached?.data || defaultScope;
      }

      const body = await response.json();
      const scope: SellerScope = body.data || body;

      this.scopeCache.set(userId, {
        data: scope,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return scope;
    } catch (err: any) {
      this.logger.warn(`Error contacting business-service for seller scope (${userId}): ${err?.message || err}`);
      return cached?.data || defaultScope;
    }
  }

  clearCache(): void {
    this.scopeCache.clear();
  }
}
