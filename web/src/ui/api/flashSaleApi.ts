import { apiClient } from "./apiClient";
import type { ApiResponse } from "./types";

export interface FlashSaleItem {
  id: string;
  flashSaleId: string;
  flashSaleName?: string;
  bookId: string;
  bookTitle?: string;
  bookSlug?: string;
  coverUrl?: string;
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
}

export interface FlashSaleSlot {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED";
  remainingSeconds: number;
  totalItems: number;
  items: FlashSaleItem[];
}

export interface CreateFlashSalePayload {
  name: string;
  description?: string;
  bannerUrl?: string;
  startsAt: string;
  endsAt: string;
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

export const flashSaleApi = {
  getAll: async (): Promise<ApiResponse<FlashSaleSlot[]>> => {
    return apiClient<FlashSaleSlot[]>("/flash-sales?limit=100", {
      method: "GET",
    });
  },
  getTimeSlots: async (): Promise<ApiResponse<FlashSaleSlot[]>> => {
    return apiClient<FlashSaleSlot[]>("/flash-sales/slots", { method: "GET" });
  },

  getActiveFlashSales: async (): Promise<ApiResponse<FlashSaleSlot[]>> => {
    return apiClient<FlashSaleSlot[]>("/flash-sales/active", { method: "GET" });
  },

  getUpcomingFlashSales: async (): Promise<ApiResponse<FlashSaleSlot[]>> => {
    return apiClient<FlashSaleSlot[]>("/flash-sales/upcoming", {
      method: "GET",
    });
  },

  getBookPrice: async (bookId: string): Promise<ApiResponse<FlashSaleItem>> => {
    return apiClient<FlashSaleItem>(`/flash-sales/price/${bookId}`, {
      method: "GET",
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
    status: "SCHEDULED" | "ACTIVE" | "ENDED",
  ): Promise<ApiResponse<FlashSaleSlot>> => {
    return apiClient<FlashSaleSlot>(`/flash-sales/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
};
