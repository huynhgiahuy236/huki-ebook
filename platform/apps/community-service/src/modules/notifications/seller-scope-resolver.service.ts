import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SellerScopeResult {
  businessIds: string[];
  storeIds: string[];
  ownerUserIds: string[];
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class SellerScopeResolverService {
  private readonly logger = new Logger(SellerScopeResolverService.name);
  private readonly cache = new Map<string, { value: SellerScopeResult; expiresAt: number }>();
  private readonly businessBaseUrl?: string;

  constructor(@Optional() config?: ConfigService) {
    const rawUrl =
      config?.get<string>("services.businessUrl") || process.env.BUSINESS_SERVICE_URL;
    if (rawUrl) {
      const normalized = rawUrl.replace(/\/+$/, "");
      this.businessBaseUrl = normalized.endsWith("/api/v1")
        ? normalized
        : `${normalized}/api/v1`;
    }
  }

  async resolveSellerScope(userId: string): Promise<SellerScopeResult> {
    if (!userId || !this.businessBaseUrl) {
      return { businessIds: [], storeIds: [], ownerUserIds: [] };
    }

    const now = Date.now();
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const internalKey = process.env.INTERNAL_SERVICE_KEY;
    if (!internalKey) {
      return { businessIds: [], storeIds: [], ownerUserIds: [] };
    }

    try {
      const response = await fetch(
        `${this.businessBaseUrl}/internal/seller-scope/${encodeURIComponent(userId)}`,
        {
          headers: { "x-internal-service-key": internalKey },
          signal: AbortSignal.timeout(3_000),
        },
      );
      if (!response.ok) {
        return { businessIds: [], storeIds: [], ownerUserIds: [] };
      }
      const raw = (await response.json()) as any;
      const data = raw?.data ?? raw;
      const result: SellerScopeResult = {
        businessIds: Array.isArray(data?.businessIds) ? data.businessIds.map(String) : [],
        storeIds: Array.isArray(data?.storeIds) ? data.storeIds.map(String) : [],
        ownerUserIds: Array.isArray(data?.ownerUserIds) ? data.ownerUserIds.map(String) : [],
      };
      this.cache.set(userId, { value: result, expiresAt: now + CACHE_TTL_MS });
      return result;
    } catch (error) {
      this.logger.debug(
        `Seller scope lookup failed for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { businessIds: [], storeIds: [], ownerUserIds: [] };
    }
  }
}
