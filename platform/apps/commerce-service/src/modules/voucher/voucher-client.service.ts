/**
 * Voucher Client Service - Commerce Service
 * Handles communication with Promotion Service for voucher validation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { throwBadRequest, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export enum VoucherType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum VoucherScope {
  PLATFORM = 'PLATFORM',
  STORE = 'STORE',
}

export interface VoucherValidationInput {
  code: string;
  orderSubtotal?: number;
  storeId?: string;
  productType?: 'ALL' | 'PHYSICAL' | 'EBOOK';
}

export interface VoucherValidationResult {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    type: VoucherType;
    scope: VoucherScope;
    value: number;
    maxDiscountAmount?: number;
    minOrderAmount?: number;
    storeId?: string;
    productType?: string;
  };
  discount?: number;
  reason?: string;
}

export interface VoucherUsageInput {
  voucherId: string;
  orderId: string;
  discountAmount: number;
}

@Injectable()
export class VoucherClientService {
  private readonly logger = new Logger(VoucherClientService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Validate a voucher for checkout
   */
  async validate(
    userId: string,
    input: VoucherValidationInput,
  ): Promise<VoucherValidationResult> {
    const result = await this.request<{ data: VoucherValidationResult }>(
      '/vouchers/validate',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': userId,
          ...this.internalHeaders(),
        },
        body: JSON.stringify(input),
      },
    );

    return result?.data;
  }

  /**
   * Validate multiple vouchers at once
   */
  async validateMany(
    userId: string,
    inputs: VoucherValidationInput[],
  ): Promise<Map<string, VoucherValidationResult>> {
    const results = new Map<string, VoucherValidationResult>();

    // Validate in parallel
    const promises = inputs.map(async (input) => {
      const result = await this.validate(userId, input);
      results.set(input.code.toUpperCase(), result);
    });

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Apply/consume voucher usage after successful order
   */
  async apply(userId: string, input: VoucherUsageInput): Promise<void> {
    const result = await this.request<{ success: boolean }>(
      '/vouchers/apply',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': userId,
          ...this.internalHeaders(),
        },
        body: JSON.stringify(input),
      },
    );

    if (!result?.success) {
      throwBadRequest(ErrorCode.VOUCHER_USAGE_FAILED);
    }
  }

  /**
   * Get available vouchers for a user based on cart
   */
  async getAvailableVouchers(userId: string): Promise<any[]> {
    const result = await this.request<{ data: any[] }>(
      '/vouchers/available',
      { headers: { 'x-user-id': userId, ...this.internalHeaders() } },
    );

    return result?.data || [];
  }

  /**
   * Get vouchers by store
   */
  async getVouchersByStore(storeId: string): Promise<any[]> {
    const result = await this.request<{ data: any[] }>(
      `/vouchers?scope=STORE&storeId=${storeId}`,
      { headers: this.internalHeaders() },
    );

    return result?.data || [];
  }

  /**
   * Get platform vouchers
   */
  async getPlatformVouchers(): Promise<any[]> {
    const result = await this.request<{ data: any[] }>(
      '/vouchers?scope=PLATFORM',
      { headers: this.internalHeaders() },
    );

    return result?.data || [];
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl =
      this.config.get<string>('PROMOTION_SERVICE_URL') ||
      `http://localhost:${this.config.get<string>('PROMOTION_SERVICE_PORT') || 3007}`;

    let response!: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init.headers,
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error: any) {
      this.logger.error(`Promotion service request failed: ${error.message}`);
      throwBadRequest(ErrorCode.SYSTEM_UNAVAILABLE, 'Dịch vụ khuyến mãi tạm thời không khả dụng');
    }

    const body = (await response.json().catch(() => ({}))) as any;

    if (!response.ok) {
      const code = body.code || ErrorCode.VOUCHER_NOT_FOUND;
      throwBadRequest(code, body.message || 'Không thể xử lý voucher');
    }

    return (body.data || body) as T;
  }

  private internalHeaders() {
    return {
      'x-internal-service-key':
        this.config.get<string>('INTERNAL_SERVICE_KEY') ||
        'huki-local-internal-service',
    };
  }
}
