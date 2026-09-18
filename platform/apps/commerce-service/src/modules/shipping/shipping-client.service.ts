/**
 * Shipping Client Service - Commerce Service
 * Handles communication with Shipping Service for address and fee calculation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { throwBadRequest, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface ShippingAddressInput {
  province: string;
  district: string;
  ward: string;
  address: string;
  recipientName?: string;
  phone?: string;
}

export interface ShippingFeeQuote {
  carrier: string;
  service: string;
  shippingFee: number;
  codFee: number;
  totalFee: number;
  estimatedDays: { min: number; max: number };
}

export interface AddressValidationResult {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  province: string;
  provinceCode?: string;
  district: string;
  districtCode?: string;
  ward: string;
  wardCode?: string;
  communeType?: 'WARD' | 'COMMUNE' | 'SPECIAL_ZONE';
  isDefault: boolean;
}

@Injectable()
export class ShippingClientService {
  private readonly logger = new Logger(ShippingClientService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Get user's address by ID (validates ownership)
   */
  async getAddress(addressId: string, userId: string): Promise<AddressValidationResult> {
    const result = await this.request<{ data: AddressValidationResult }>(
      `/addresses/${addressId}`,
      { headers: this.internalHeaders() },
    );

    if (!result?.data) {
      throwNotFound(ErrorCode.ADDRESS_NOT_FOUND);
    }

    const addr = result.data;

    // Validate ownership
    if (addr.userId !== userId) {
      throwNotFound(ErrorCode.ADDRESS_NOT_FOUND, 'Address not found');
    }

    return addr;
  }

  /**
   * List user's addresses
   */
  async listAddresses(userId: string): Promise<AddressValidationResult[]> {
    const result = await this.request<{ data: AddressValidationResult[] }>(
      `/addresses?userId=${userId}`,
      { headers: this.internalHeaders() },
    );
    return result?.data || [];
  }

  /**
   * Calculate shipping fee for a group of items
   */
  async calculateShippingFee(input: {
    province: string;
    district: string;
    weight: number;
    codAmount?: number;
  }): Promise<ShippingFeeQuote> {
    const result = await this.request<{ data: ShippingFeeQuote }>(
      '/shipping/fee',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.internalHeaders() },
        body: JSON.stringify({
          province: input.province,
          district: input.district,
          weight: input.weight,
          codAmount: input.codAmount,
        }),
      },
    );

    if (!result?.data) {
      throwBadRequest(ErrorCode.SHIPPING_UNAVAILABLE);
    }

    return result.data;
  }

  /**
   * Get shipping fee for multiple seller orders
   * Returns fee per seller order based on weight
   */
  async calculateMultiSellerShipping(
    addresses: Array<{
      sellerOrderId: string;
      province: string;
      district: string;
      weight: number;
      codAmount?: number;
    }>,
  ): Promise<Map<string, ShippingFeeQuote>> {
    const result = await this.request<{ data: ShippingFeeQuote[] }>(
      '/shipping/fee/multi',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.internalHeaders() },
        body: JSON.stringify({ items: addresses }),
      },
    );

    const fees = new Map<string, ShippingFeeQuote>();
    const quotes = result?.data || [];

    for (let i = 0; i < addresses.length; i++) {
      if (quotes[i]) {
        fees.set(addresses[i].sellerOrderId, quotes[i]);
      }
    }

    return fees;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl =
      this.config.get<string>('SHIPPING_SERVICE_URL') ||
      `http://localhost:${this.config.get<string>('SHIPPING_SERVICE_PORT') || 3004}`;

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
      this.logger.error(`Shipping service request failed: ${error.message}`);
      throwBadRequest(ErrorCode.SHIPPING_UNAVAILABLE, 'Dịch vụ vận chuyển tạm thời không khả dụng');
    }

    const body = (await response.json().catch(() => ({}))) as any;

    // Handle 404 for address not found
    if (response.status === 404) {
      throwNotFound(ErrorCode.ADDRESS_NOT_FOUND);
    }

    if (!response.ok) {
      throwBadRequest(
        body.code || ErrorCode.SHIPPING_UNAVAILABLE,
        body.message || 'Không thể tính phí vận chuyển',
      );
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
