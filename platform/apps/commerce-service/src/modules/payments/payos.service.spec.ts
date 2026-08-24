import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PayOSService } from './payos.service';

describe('PayOSService', () => {
  const checksumKey = 'checksum-secret';
  const config = {
    get: jest.fn((key: string) => ({
      'payos.clientId': 'client-id',
      'payos.apiKey': 'api-key',
      'payos.checksumKey': checksumKey,
    })[key]),
  } as unknown as ConfigService;

  afterEach(() => jest.restoreAllMocks());

  it('creates a payment link with the PayOS HMAC signature', async () => {
    const response = {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 123,
        paymentLinkId: 'link-id',
        checkoutUrl: 'https://pay.payos.vn/web/link-id',
        qrCode: 'qr-content',
        status: 'PENDING',
        amount: 100000,
      },
    };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response);

    await expect(new PayOSService(config).createPaymentLink({
      orderCode: 123,
      amount: 100000,
      description: 'HUKI ORDER',
      returnUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
      expiredAt: 2_000_000_000,
    })).resolves.toEqual(response.data);

    const request = fetchMock.mock.calls[0][1]!;
    const body = JSON.parse(String(request.body));
    const signed = 'amount=100000&cancelUrl=http://localhost/cancel&description=HUKI ORDER&orderCode=123&returnUrl=http://localhost/success';
    expect(body.signature).toBe(createHmac('sha256', checksumKey).update(signed).digest('hex'));
    expect((request.headers as Record<string, string>)['x-client-id']).toBe('client-id');
  });

  it('accepts a correctly signed webhook and rejects tampering', () => {
    const data = { amount: 100000, orderCode: 123, reference: 'FT123' };
    const signature = createHmac('sha256', checksumKey)
      .update('amount=100000&orderCode=123&reference=FT123')
      .digest('hex');
    const service = new PayOSService(config);
    expect(service.verifyWebhook({ code: '00', desc: 'success', success: true, data, signature })).toBe(true);
    expect(service.verifyWebhook({ code: '00', desc: 'success', success: true, data: { ...data, amount: 1 }, signature })).toBe(false);
  });
});
