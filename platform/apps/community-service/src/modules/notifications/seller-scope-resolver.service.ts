import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SellerScopeResult {
  businessIds: string[];
  storeIds: string[];
  ownerUserIds: string[];
}

const CACHE_TTL_MS = 30_000;
const OFFICIAL_STORE_ALIASES = [
  '77777777-0000-4000-8000-000000000001',
  '88888888-0000-4000-8000-000000000001',
  '99999999-0000-4000-8000-000000000001',
  '3094e54e-2549-42cc-92fb-14a8f8589277',
  '1079fc76-a467-48a9-8034-b072aaa5afea',
  'nha-sach-huki-official',
  'huki-official',
];

function expandOfficialStoreAliases(ids: string[]): string[] {
  const result = new Set(ids.filter(Boolean));
  if (Array.from(result).some((id) => OFFICIAL_STORE_ALIASES.includes(id))) {
    OFFICIAL_STORE_ALIASES.forEach((alias) => result.add(alias));
  }
  return Array.from(result);
}

@Injectable()
export class SellerScopeResolverService {
  private readonly logger = new Logger(SellerScopeResolverService.name);
  private readonly cache = new Map<string, { value: SellerScopeResult; expiresAt: number }>();
  private readonly targetCache = new Map<string, { value: SellerScopeResult; expiresAt: number }>();
  private readonly businessBaseUrl?: string;
  private readonly internalKey?: string;

  constructor(@Optional() config?: ConfigService) {
    const rawUrl =
      config?.get<string>("services.businessUrl") || process.env.BUSINESS_SERVICE_URL;
    if (rawUrl) {
      const normalized = rawUrl.replace(/\/+$/, "");
      this.businessBaseUrl = normalized.endsWith("/api/v1")
        ? normalized
        : `${normalized}/api/v1`;
    }
    this.internalKey = (
      config?.get<string>("INTERNAL_SERVICE_KEY") ||
      process.env.INTERNAL_SERVICE_KEY
    )?.trim();
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

    const internalKey = this.internalKey || process.env.INTERNAL_SERVICE_KEY?.trim();
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
      const businessIds = Array.isArray(data?.businessIds) ? data.businessIds.map(String) : [];
      const storeIds = expandOfficialStoreAliases([
        ...(Array.isArray(data?.storeIds) ? data.storeIds.map(String) : []),
        ...businessIds,
      ]);
      const result: SellerScopeResult = {
        businessIds,
        storeIds,
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

  async resolveTarget(targetId: string): Promise<SellerScopeResult> {
    if (!targetId) {
      return { businessIds: [], storeIds: [], ownerUserIds: [] };
    }

    const now = Date.now();
    const cached = this.targetCache.get(targetId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const candidateTarget = OFFICIAL_STORE_ALIASES.includes(targetId)
      ? '99999999-0000-4000-8000-000000000001'
      : targetId;

    const internalKey = this.internalKey || process.env.INTERNAL_SERVICE_KEY?.trim();
    if (!this.businessBaseUrl || !internalKey) {
      return {
        businessIds: [targetId],
        storeIds: expandOfficialStoreAliases([targetId]),
        ownerUserIds: [],
      };
    }

    try {
      const response = await fetch(
        `${this.businessBaseUrl}/internal/resolve-target/${encodeURIComponent(candidateTarget)}`,
        {
          headers: { "x-internal-service-key": internalKey },
          signal: AbortSignal.timeout(3_000),
        },
      );
      if (!response.ok) {
        return {
          businessIds: [targetId],
          storeIds: expandOfficialStoreAliases([targetId]),
          ownerUserIds: [],
        };
      }
      const raw = (await response.json()) as any;
      const data = raw?.data ?? raw;
      const businessIds = Array.isArray(data?.businessIds) ? data.businessIds.map(String) : [];
      const storeIds = expandOfficialStoreAliases([
        targetId,
        ...(Array.isArray(data?.storeIds) ? data.storeIds.map(String) : []),
        ...businessIds,
      ]);
      const ownerUserIds: string[] = Array.isArray(data?.ownerUserIds)
        ? Array.from(new Set<string>(data.ownerUserIds.map(String)))
        : [];
      const result: SellerScopeResult = {
        businessIds,
        storeIds,
        ownerUserIds,
      };
      this.targetCache.set(targetId, { value: result, expiresAt: now + CACHE_TTL_MS });
      return result;
    } catch (error) {
      this.logger.debug(
        `Target scope lookup failed for ${targetId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        businessIds: [targetId],
        storeIds: expandOfficialStoreAliases([targetId]),
        ownerUserIds: [],
      };
    }
  }
}
