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
            s === "PROCESSING" ||
            s === "CONFIRMED" ||
            s === "PAID" ||
            s === "SHIPPED" ||
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
      return {
        storeId: book.storeId || book.businessId,
        ownerUserId: book.ownerUserId,
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
  ): Promise<VerifiedBusiness> {
    const businessBase = this.businessUrl.endsWith("/api/v1")
      ? this.businessUrl
      : `${this.businessUrl.replace(/\/+$/, "")}/api/v1`;

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
