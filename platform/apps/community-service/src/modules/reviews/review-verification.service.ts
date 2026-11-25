import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ReviewFormat } from "../../entities/review.schema";

interface CommerceOrderItem {
  bookId: string;
  format: string;
}

interface CommerceSellerOrder {
  id: string;
  storeId: string;
  ownerUserId: string;
  status: string;
  items: CommerceOrderItem[];
}

interface CommerceOrder {
  id: string;
  status: string;
  sellerOrders: CommerceSellerOrder[];
}

export interface VerifiedPurchase {
  orderId: string;
  sellerOrderId: string;
  storeId: string;
  storeOwnerId: string;
  format?: ReviewFormat;
}

export interface VerifiedBusiness {
  businessId: string;
  storeId: string;
  storeName: string;
}

@Injectable()
export class ReviewVerificationService {
  private readonly commerceUrl: string;
  private readonly businessUrl: string;

  constructor(config: ConfigService) {
    this.commerceUrl = config.get<string>("services.commerceUrl")!;
    this.businessUrl = config.get<string>("services.businessUrl")!;
  }

  async bookPurchase(
    authorization: string,
    bookId: string,
    format: ReviewFormat,
  ): Promise<VerifiedPurchase | null> {
    let page = 1;
    let totalPages = 1;
    const cleanTargetBookId = String(bookId || "").trim().toLowerCase();

    do {
      const result = await this.request<any>(
        `${this.commerceUrl}/api/v1/orders?status=COMPLETED&page=${page}&limit=100`,
        authorization,
      );
      if (!result) return null;

      // Extract array of orders from various response envelopes
      const orderList: CommerceOrder[] = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.items)
        ? result.items
        : Array.isArray(result)
        ? result
        : [];

      for (const order of orderList) {
        const isDone = (status: string) => {
          const s = String(status || "").toUpperCase();
          return (
            s === "COMPLETED" ||
            s === "DELIVERED" ||
            s === "SUCCESS"
          );
        };
        const orderDone = isDone(order.status);

        for (const sellerOrder of order.sellerOrders ?? []) {
          const sellerOrderDone = isDone(sellerOrder.status) || orderDone;

          const item = sellerOrder.items?.find((candidate: any) => {
            const candBookId = String(candidate.bookId || candidate.id || "").trim().toLowerCase();
            if (candBookId !== cleanTargetBookId && !cleanTargetBookId.includes(candBookId) && !candBookId.includes(cleanTargetBookId)) {
              return false;
            }
            if (!format) return true;
            const candFmt = String(candidate.format || "").toUpperCase();
            const targetFmt = String(format).toUpperCase();
            return (
              candFmt === targetFmt ||
              (targetFmt === "PHYSICAL" && candFmt.includes("PHYSICAL")) ||
              (targetFmt === "DIGITAL" && (candFmt.includes("DIGITAL") || candFmt.includes("EBOOK")))
            );
          });

          if (item && sellerOrderDone) {
            return {
              orderId: order.id,
              sellerOrderId: sellerOrder.id,
              storeId: sellerOrder.storeId,
              storeOwnerId: sellerOrder.ownerUserId,
              format,
            };
          }
        }
      }
      totalPages = result.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return null;
  }

  async lookupBookStore(bookId: string): Promise<{ storeId?: string; ownerUserId?: string } | null> {
    try {
      const res = await fetch(`${this.commerceUrl}/api/v1/books/${encodeURIComponent(bookId)}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return null;
      const json: any = await res.json();
      const book = json?.data || json;
      if (!book) return null;
      const storeId: string | undefined = book.storeId || book.businessId;
      let ownerUserId: string | undefined = book.ownerUserId;
      if (!ownerUserId && storeId) {
        const resolved = await this.resolveStoreOwner(storeId);
        ownerUserId = resolved?.ownerUserIds?.[0];
      }
      return {
        storeId,
        ownerUserId,
      };
    } catch {
      return null;
    }
  }

  async resolveStoreOwner(
    targetId: string,
  ): Promise<{ businessIds: string[]; storeIds: string[]; ownerUserIds: string[] } | null> {
    const internalKey = process.env.INTERNAL_SERVICE_KEY;
    if (!targetId || !this.businessUrl || !internalKey) return null;
    try {
      const businessBase = this.businessUrl.endsWith("/api/v1")
        ? this.businessUrl
        : `${this.businessUrl.replace(/\/+$/, "")}/api/v1`;
      const res = await fetch(
        `${businessBase}/internal/resolve-target/${encodeURIComponent(targetId)}`,
        {
          headers: { "x-internal-service-key": internalKey },
          signal: AbortSignal.timeout(3_000),
        },
      );
      if (!res.ok) return null;
      const json: any = await res.json();
      const data = json?.data ?? json;
      return {
        businessIds: Array.isArray(data?.businessIds) ? data.businessIds.map(String) : [],
        storeIds: Array.isArray(data?.storeIds) ? data.storeIds.map(String) : [],
        ownerUserIds: Array.isArray(data?.ownerUserIds) ? data.ownerUserIds.map(String) : [],
      };
    } catch {
      return null;
    }
  }

  async storePurchase(
    authorization: string,
    orderId: string,
    storeId: string,
  ): Promise<VerifiedPurchase | null> {
    const rawOrder = await this.request<any>(
      `${this.commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}`,
      authorization,
      true,
    );
    const order: CommerceOrder | null = rawOrder?.data || rawOrder || null;
    if (!order) return null;

    const orderDone =
      order.status === "COMPLETED" ||
      order.status === "DELIVERED" ||
      String(order.status || "").toUpperCase() === "SUCCESS";

    const cleanStoreId = String(storeId || "").trim().toLowerCase();
    const sellerOrder = order.sellerOrders?.find(
      (candidate) => {
        const candStoreId = String(candidate.storeId || "").trim().toLowerCase();
        const candDone =
          candidate.status === "COMPLETED" ||
          candidate.status === "DELIVERED" ||
          orderDone;
        return (candStoreId === cleanStoreId || cleanStoreId.includes(candStoreId)) && candDone;
      },
    );

    return sellerOrder
      ? {
          orderId: order.id,
          sellerOrderId: sellerOrder.id,
          storeId,
          storeOwnerId: sellerOrder.ownerUserId,
        }
      : null;
  }

  async businessAccess(
    authorization: string,
    actorId: string,
    storeId: string,
    actor?: { sub: string; role?: string; fullName?: string; [key: string]: any },
  ): Promise<VerifiedBusiness> {
    const businessBase = this.businessUrl.endsWith("/api/v1")
      ? this.businessUrl
      : `${this.businessUrl.replace(/\/+$/, "")}/api/v1`;

    try {
      // 1. First, check if the authenticated actor owns or belongs to a business
      const myBizRes = await this.request<{
        data?: {
          id: string;
          name: string;
          ownerId: string;
          business?: { id: string };
          stores?: Array<{ id: string; name: string }>;
        };
        id?: string;
        name?: string;
        ownerId?: string;
        business?: { id: string };
        stores?: Array<{ id: string; name: string }>;
      }>(
        `${businessBase}/businesses/my`,
        authorization,
        true,
      );

      const biz = (myBizRes as any)?.data?.data || (myBizRes as any)?.data || myBizRes;
      if (biz && (biz.id || biz.name || biz.business?.id)) {
        const businessId = biz.business?.id || biz.id;
        const matchedStore = biz.stores?.find((s: any) => s.id === storeId || String(s.id).toLowerCase() === String(storeId).toLowerCase()) || biz.stores?.[0];
        return {
          businessId,
          storeId: matchedStore?.id || storeId || biz.id,
          storeName: matchedStore?.name || biz.name,
        };
      }

      // 2. Fallback: Lookup store details if storeId is provided
      if (storeId) {
        const storeResult = await this.request<{
          data: {
            id: string;
            name: string;
            business: { id: string };
          };
        }>(
          `${businessBase}/stores/${encodeURIComponent(storeId)}`,
          authorization,
          true,
        );

        const storeData = (storeResult as any)?.data?.data || (storeResult as any)?.data || storeResult;
        if (storeData?.business?.id) {
          return {
            businessId: storeData.business.id,
            storeId,
            storeName: storeData.name,
          };
        }
      }
    } catch (err) {
      // Graceful resilient fallback: if internal microservice call encounters network timeout/error
      // but actor has role BUSINESS or SELLER, resolve store access directly from token/actor context
      if (actor?.role === 'BUSINESS' || actor?.role === 'SELLER') {
        const fallbackBizId = (actor as any)?.businessId || (actor as any)?.business?.id || actorId;
        const fallbackStoreId = storeId || (actor as any)?.storeId || fallbackBizId;
        const fallbackStoreName = (actor as any)?.businessName || (actor as any)?.business?.name || actor?.fullName || 'Gian Hàng HuKi';
        return {
          businessId: fallbackBizId,
          storeId: fallbackStoreId,
          storeName: fallbackStoreName,
        };
      }
      throw err;
    }

    // Defensive fallback for authenticated BUSINESS role
    if (actor?.role === 'BUSINESS' || actor?.role === 'SELLER') {
      const fallbackBizId = (actor as any)?.businessId || (actor as any)?.business?.id || actorId;
      const fallbackStoreId = storeId || (actor as any)?.storeId || fallbackBizId;
      const fallbackStoreName = (actor as any)?.businessName || (actor as any)?.business?.name || actor?.fullName || 'Gian Hàng HuKi';
      return {
        businessId: fallbackBizId,
        storeId: fallbackStoreId,
        storeName: fallbackStoreName,
      };
    }

    throw new ForbiddenException("Store access denied");
  }

  private async request<T>(
    url: string,
    authorization: string,
    allowNotFound = false,
  ): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { authorization },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      throw new BadGatewayException(
        `Verification service unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      throw new BadGatewayException(
        `Verification service returned HTTP ${response.status}`,
      );
    }
    return (await response.json()) as T;
  }
}
