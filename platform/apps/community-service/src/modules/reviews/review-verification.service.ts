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
    do {
      const result = await this.request<{
        items: CommerceOrder[];
        pagination: { totalPages: number };
      }>(
        `${this.commerceUrl}/api/v1/orders?status=COMPLETED&page=${page}&limit=100`,
        authorization,
      );
      if (!result) return null;
      for (const order of result.items ?? []) {
        for (const sellerOrder of order.sellerOrders ?? []) {
          const item = sellerOrder.items?.find(
            (candidate) =>
              candidate.bookId === bookId && candidate.format === format,
          );
          if (item && sellerOrder.status === "COMPLETED") {
            return {
              orderId: order.id,
              sellerOrderId: sellerOrder.id,
              storeId: sellerOrder.storeId,
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

  async storePurchase(
    authorization: string,
    orderId: string,
    storeId: string,
  ): Promise<VerifiedPurchase | null> {
    const order = await this.request<CommerceOrder>(
      `${this.commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}`,
      authorization,
      true,
    );
    if (!order || order.status !== "COMPLETED") return null;
    const sellerOrder = order.sellerOrders?.find(
      (candidate) =>
        candidate.storeId === storeId && candidate.status === "COMPLETED",
    );
    return sellerOrder
      ? {
          orderId: order.id,
          sellerOrderId: sellerOrder.id,
          storeId,
        }
      : null;
  }

  async businessAccess(
    authorization: string,
    actorId: string,
    storeId: string,
  ): Promise<VerifiedBusiness> {
    const storeResult = await this.request<{
      data: {
        id: string;
        name: string;
        business: { id: string };
      };
    }>(
      `${this.businessUrl}/stores/${encodeURIComponent(storeId)}`,
      authorization,
      true,
    );
    if (!storeResult?.data?.business?.id) {
      throw new ForbiddenException("Store access denied");
    }
    const businessId = storeResult.data.business.id;
    const member = await this.request<unknown>(
      `${this.businessUrl}/businesses/${encodeURIComponent(businessId)}/members/${encodeURIComponent(actorId)}`,
      authorization,
      true,
    );
    if (!member) throw new ForbiddenException("Store access denied");
    return {
      businessId,
      storeId,
      storeName: storeResult.data.name,
    };
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
