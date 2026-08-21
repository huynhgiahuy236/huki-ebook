import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PayOSWebhookDto } from './dto/payment.dto';

interface CreatePaymentLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt: number;
}

interface PayOSResponse<T> {
  code: string;
  desc: string;
  data: T;
}

export interface PayOSPaymentLink {
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  status: string;
  amount: number;
}

@Injectable()
export class PayOSService {
  private readonly baseUrl = 'https://api-merchant.payos.vn';

  constructor(private readonly config: ConfigService) {}

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PayOSPaymentLink> {
    const credentials = this.credentials();
    const signedFields = {
      amount: input.amount,
      cancelUrl: input.cancelUrl,
      description: input.description,
      orderCode: input.orderCode,
      returnUrl: input.returnUrl,
    };
    const response = await fetch(`${this.baseUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': credentials.clientId,
        'x-api-key': credentials.apiKey,
      },
      body: JSON.stringify({
        ...signedFields,
        expiredAt: input.expiredAt,
        signature: this.sign(signedFields, credentials.checksumKey),
      }),
    });
    const payload = (await response.json()) as PayOSResponse<PayOSPaymentLink>;
    if (!response.ok || payload.code !== '00' || !payload.data) {
      throw new ServiceUnavailableException(`PayOS rejected payment link: ${payload.desc ?? response.status}`);
    }
    return payload.data;
  }

  verifyWebhook(payload: PayOSWebhookDto): boolean {
    const { checksumKey } = this.credentials();
    const expected = this.sign(payload.data as unknown as Record<string, unknown>, checksumKey);
    const supplied = payload.signature?.toLowerCase() ?? '';
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
  }

  private credentials() {
    const clientId = this.config.get<string>('payos.clientId') ?? process.env.PAYOS_CLIENT_ID;
    const apiKey = this.config.get<string>('payos.apiKey') ?? process.env.PAYOS_API_KEY;
    const checksumKey = this.config.get<string>('payos.checksumKey') ?? process.env.PAYOS_CHECKSUM_KEY;
    if (!clientId || !apiKey || !checksumKey) {
      throw new ServiceUnavailableException('PayOS credentials are not configured');
    }
    return { clientId, apiKey, checksumKey };
  }

  private sign(data: Record<string, unknown>, checksumKey: string): string {
    const query = Object.keys(data)
      .sort()
      .map((key) => `${key}=${this.stringify(data[key])}`)
      .join('&');
    return createHmac('sha256', checksumKey).update(query).digest('hex');
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') {
      const ordered = Object.keys(value as object)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          result[key] = (value as Record<string, unknown>)[key];
          return result;
        }, {});
      return JSON.stringify(ordered);
    }
    return String(value);
  }
}
