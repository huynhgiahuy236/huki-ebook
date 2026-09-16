import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorCode, throwBadRequest } from "@huki/shared/errors";

export interface FlashSaleQuote {
  isFlashSale: boolean;
  allowed: boolean;
  flashSaleId?: string;
  flashSaleName?: string;
  salePrice?: number;
  originalPrice?: number;
  maxPerUser?: number;
  remainingQuota?: number;
  reason?: string;
}

export interface FlashSaleCheckoutItem {
  bookId: string;
  quantity: number;
  flashSaleId?: string;
  isFlashSale?: boolean;
}

@Injectable()
export class FlashSaleClientService {
  private readonly logger = new Logger(FlashSaleClientService.name);

  constructor(private readonly config: ConfigService) {}

  async quote(
    userId: string,
    bookId: string,
    quantity: number,
  ): Promise<FlashSaleQuote> {
    const data = await this.request<FlashSaleQuote>("/validate-quota", {
      method: "POST",
      body: JSON.stringify({ userId, bookId, quantity }),
    });
    if (data.isFlashSale && !data.allowed) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
        data.reason || "Đã vượt hạn mức Flash Sale",
      );
    }
    return data;
  }

  async reserveOrder(
    orderId: string,
    userId: string,
    items: FlashSaleCheckoutItem[],
  ) {
    const grouped = new Map<string, FlashSaleCheckoutItem>();
    for (const item of items.filter((entry) => entry.isFlashSale)) {
      const key = `${item.flashSaleId}:${item.bookId}`;
      const current = grouped.get(key);
      grouped.set(key, {
        ...item,
        quantity: (current?.quantity || 0) + item.quantity,
      });
    }

    try {
      for (const item of grouped.values()) {
        const result = await this.request<any>("/reserve", {
          method: "POST",
          headers: this.internalHeaders(),
          body: JSON.stringify({
            orderId,
            userId,
            bookId: item.bookId,
            flashSaleId: item.flashSaleId,
            quantity: item.quantity,
          }),
        });
        if (!result?.isFlashSale) {
          throwBadRequest(
            ErrorCode.FLASH_SALE_NOT_ACTIVE,
            "Phiên Flash Sale đã kết thúc, vui lòng tạo lại đơn hàng",
          );
        }
      }
    } catch (error) {
      await this.releaseOrder(orderId).catch(() => undefined);
      throw error;
    }
  }

  async releaseOrder(orderId: string, bookIds?: string[]) {
    return this.request<{ success: boolean; released: number }>(
      "/release-order",
      {
        method: "POST",
        headers: this.internalHeaders(),
        body: JSON.stringify({
          orderId,
          ...(bookIds?.length ? { bookIds } : {}),
        }),
      },
    );
  }

  async hasReservations(orderId: string) {
    const result = await this.request<{ hasReservations: boolean }>(
      `/reservations/${orderId}`,
      { headers: this.internalHeaders() },
    );
    return result.hasReservations;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl =
      this.config.get<string>("PROMOTION_SERVICE_URL") ||
      `http://localhost:${this.config.get<string>("PROMOTION_SERVICE_PORT") || 3007}`;
    let response!: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/flash-sales${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error: any) {
      this.logger.error(`Promotion service request failed: ${error.message}`);
      throwBadRequest(
        ErrorCode.SYSTEM_UNAVAILABLE,
        "Dịch vụ Flash Sale tạm thời không khả dụng",
      );
    }

    const body = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      throwBadRequest(
        body.code || ErrorCode.FLASH_SALE_NOT_ACTIVE,
        body.message || "Không thể xử lý Flash Sale",
      );
    }
    return (body.data || body) as T;
  }

  private internalHeaders() {
    return {
      "x-internal-service-key":
        this.config.get<string>("INTERNAL_SERVICE_KEY") ||
        "huki-local-internal-service",
    };
  }
}
