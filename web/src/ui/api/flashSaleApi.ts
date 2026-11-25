import { apiClient } from "./apiClient";
import type { ApiResponse } from "./types";

export type FlashSaleScope = "PLATFORM" | "SHOP";

export interface FlashSaleItem {
  id: string;
  flashSaleId: string;
  flashSaleName?: string;
  scope?: FlashSaleScope;
  storeId?: string | null;
  bookId: string;
  bookTitle?: string;
  bookSlug?: string;
  coverUrl?: string;
  author?: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  discountPercent: number;
  stock: number;
  sold: number;
  totalAllocated: number;
  soldPercent: number;
  isSoldOut: boolean;
  maxPerUser: number;
  startsAt: string;
  endsAt: string;
  format?: string;
}

export interface FlashSaleSlot {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  scope?: FlashSaleScope;
  storeId?: string | null;
  storeName?: string;
  storeAvatar?: string;
  registrationStartsAt?: string | null;
  registrationEndsAt?: string | null;
  startsAt: string;
  endsAt: string;
  minStores?: number;
  maxStores?: number;
  discountPercent?: number;
  maxPerUser?: number;
  participatingStoresCount?: number;
  isUserStoreParticipating?: boolean;
  isRegistrationOpen?: boolean;
  registrationRemainingSeconds?: number;
  startsInSeconds?: number;
  status: "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";
  pauseEffectiveAt?: string | null;
  pauseRemainingSeconds?: number;
  remainingSeconds: number;
  totalItems: number;
  items: FlashSaleItem[];
}

export interface ShopFlashSaleGroup {
  storeId: string;
  storeName: string;
  storeAvatar: string;
  campaigns: FlashSaleSlot[];
}

export interface CreateFlashSalePayload {
  name: string;
  description?: string;
  bannerUrl?: string;
  scope?: FlashSaleScope;
  registrationStartsAt?: string;
  registrationEndsAt?: string;
  startsAt: string;
  endsAt: string;
  minStores?: number;
  maxStores?: number;
  discountPercent?: number;
  maxPerUser?: number;
}

export interface CreateFlashSaleItemPayload {
  flashSaleId: string;
  bookId: string;
  originalPrice: number;
  salePrice: number;
  stock: number;
  maxPerUser?: number;
}

export interface ValidateQuotaPayload {
  userId: string;
  bookId: string;
  flashSaleId?: string;
  quantity?: number;
}

export interface QuotaValidationResult {
  isFlashSale: boolean;
  allowed: boolean;
  flashSaleId?: string;
  flashSaleName?: string;
  bookId?: string;
  maxPerUser?: number;
  currentPurchased?: number;
  salePrice?: number;
  originalPrice?: number;
  remainingQuota?: number;
  reason?: string;
}

// In-memory cache & in-flight deduplication for active flash sale items to avoid N+1 requests from BookCards
let activeItemsCache: Map<string, FlashSaleItem> = new Map();
let cacheTimestamp = 0;
let activePreloadPromise: Promise<Map<string, FlashSaleItem>> | null = null;
const CACHE_TTL_MS = 15_000;

export function invalidateFlashSaleCache(): void {
  activeItemsCache.clear();
  cacheTimestamp = 0;
  activePreloadPromise = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('huki_flash_sale_updated', () => {
    invalidateFlashSaleCache();
  });
}

export async function preloadActiveFlashSales(): Promise<Map<string, FlashSaleItem>> {
  const now = Date.now();
  if (cacheTimestamp > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return activeItemsCache;
  }
  if (activePreloadPromise) {
    return activePreloadPromise;
  }

  activePreloadPromise = (async () => {
    try {
      const res = await flashSaleApi.getActiveFlashSales();
      if (res.success && Array.isArray(res.data)) {
        const map = new Map<string, FlashSaleItem>();
        res.data.forEach((slot) => {
          if (Array.isArray(slot.items)) {
            slot.items.forEach((it) => {
              if (it.bookId && it.salePrice) {
                map.set(it.bookId, it);
              }
            });
          }
        });
        activeItemsCache = map;
      }
    } catch {
      // ignore non-fatal public preload failures
    } finally {
      cacheTimestamp = Date.now();
      activePreloadPromise = null;
    }
    return activeItemsCache;
  })();

  return activePreloadPromise;
}

export function getCachedFlashSale(bookId: string): FlashSaleItem | null {
  return activeItemsCache.get(bookId) || null;
}

export const flashSaleApi = {
  getAll: async (params?: { scope?: FlashSaleScope; status?: string }): Promise<ApiResponse<FlashSaleSlot[]>> => {
    const query = new URLSearchParams({ limit: '100' });
    if (params?.scope) query.set('scope', params.scope);
    if (params?.status) query.set('status', params.status);
    return apiClient<FlashSaleSlot[]>(`/flash-sales?${query.toString()}`, {
      method: "GET",
      skipAuth: true,
    });
  },
  getTimeSlots: async (scope?: FlashSaleScope): Promise<ApiResponse<FlashSaleSlot[]>> => {
    const url = scope ? `/flash-sales/slots?scope=${scope}` : "/flash-sales/slots";
    return apiClient<FlashSaleSlot[]>(url, { method: "GET", skipAuth: true });
  },

  getActiveFlashSales: async (scope?: FlashSaleScope): Promise<ApiResponse<FlashSaleSlot[]>> => {
    const url = scope ? `/flash-sales/active?scope=${scope}` : "/flash-sales/active";
    return apiClient<FlashSaleSlot[]>(url, { method: "GET", skipAuth: true });
  },

  getGroupedShopFlashSales: async (): Promise<ApiResponse<ShopFlashSaleGroup[]>> => {
    return apiClient<ShopFlashSaleGroup[]>("/flash-sales/shops/grouped", {
      method: "GET",
      skipAuth: true,
    });
  },

  getUpcomingFlashSales: async (scope?: FlashSaleScope): Promise<ApiResponse<FlashSaleSlot[]>> => {
    const url = scope ? `/flash-sales/upcoming?scope=${scope}` : "/flash-sales/upcoming";
    return apiClient<FlashSaleSlot[]>(url, {
      method: "GET",
      skipAuth: true,
    });
  },

  getBookPrice: async (bookId: string): Promise<ApiResponse<FlashSaleItem>> => {
    const cached = activeItemsCache.get(bookId);
    if (cached) {
      return { success: true, data: cached };
    }
    return apiClient<FlashSaleItem>(`/flash-sales/price/${bookId}`, {
      method: "GET",
      skipAuth: true,
    });
  },

  validateQuota: async (
    payload: ValidateQuotaPayload,
  ): Promise<ApiResponse<QuotaValidationResult>> => {
    return apiClient<QuotaValidationResult>("/flash-sales/validate-quota", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createFlashSale: async (
    payload: CreateFlashSalePayload,
  ): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>("/flash-sales", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  addItem: async (
    payload: CreateFlashSaleItemPayload,
  ): Promise<ApiResponse<FlashSaleItem>> => {
    return apiClient<FlashSaleItem>("/flash-sales/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (
    id: string,
    status: "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED",
    pauseMode?: "IMMEDIATE" | "GRACE_2_MINUTES",
  ): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>(`/flash-sales/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, pauseMode }),
    });
  },

  endEarly: async (id: string): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>(`/flash-sales/${id}/end-early`, {
      method: "PATCH",
    });
  },

  cancelFlashSale: async (id: string): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>(`/flash-sales/${id}/cancel`, {
      method: "PATCH",
    });
  },

  updateItemStock: async (
    itemId: string,
    stock: number,
  ): Promise<ApiResponse<FlashSaleItem>> => {
    return apiClient<FlashSaleItem>(`/flash-sales/items/${itemId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stock }),
    });
  },

  deleteFlashSale: async (
    id: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>(`/flash-sales/${id}`, {
      method: "DELETE",
    });
  },

  // SELLER APIS
  getSellerSlots: async (): Promise<ApiResponse<FlashSaleSlot[]>> => {
    return apiClient<FlashSaleSlot[]>("/flash-sales/seller/slots", {
      method: "GET",
    });
  },

  createSellerSlot: async (
    payload: CreateFlashSalePayload,
  ): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>("/flash-sales/seller/slots", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getSellerMyItems: async (): Promise<ApiResponse<any[]>> => {
    return apiClient<any[]>("/flash-sales/seller/my-items", {
      method: "GET",
    });
  },

  sellerRegisterItem: async (payload: {
    flashSaleId: string;
    bookId: string;
    salePrice: number;
    stock: number;
    maxPerUser?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient<any>("/flash-sales/seller/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  sellerRegisterBatch: async (payload: {
    flashSaleId: string;
    items: Array<{
      bookId: string;
      salePrice: number;
      stock: number;
      maxPerUser?: number;
    }>;
  }): Promise<ApiResponse<any>> => {
    return apiClient<any>("/flash-sales/seller/register-batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  sellerCancelItem: async (
    itemId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient<{ success: boolean; message: string }>(
      `/flash-sales/seller/items/${itemId}`,
      {
        method: "DELETE",
      },
    );
  },

  sellerUpdateItem: async (
    itemId: string,
    payload: {
      salePrice?: number;
      stock?: number;
      maxPerUser?: number;
    },
  ): Promise<ApiResponse<any>> => {
    return apiClient<any>(`/flash-sales/seller/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  sellerDeleteSlot: async (
    slotId: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient<any>(`/flash-sales/seller/slots/${slotId}`, {
      method: "DELETE",
    });
  },
};

