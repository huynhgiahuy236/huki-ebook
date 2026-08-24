import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '../../../prisma/generated/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const order = {
    id: 'order-id',
    code: 'ORD-ABC',
    userId: 'user-id',
    grandTotal: 100000,
    paymentMethod: PaymentMethod.ONLINE_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    status: 'PENDING_PAYMENT',
  };

  function setup() {
    const tx = {
      payment: { create: jest.fn().mockImplementation(({ data }) => ({ id: 'payment-id', ...data, createdAt: new Date() })) },
      order: { update: jest.fn() },
    };
    const prisma: any = {
      payment: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      order: { findFirst: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const payos: any = {
      createPaymentLink: jest.fn().mockResolvedValue({
        orderCode: 123,
        paymentLinkId: 'link-id',
        checkoutUrl: 'https://pay.payos.vn/link-id',
        qrCode: 'qr',
      }),
      verifyWebhook: jest.fn().mockReturnValue(true),
    };
    const reservations: any = { release: jest.fn() };
    return { service: new PaymentsService(prisma, payos, reservations), prisma, payos, tx };
  }

  it('creates a PayOS payment attempt for the order owner', async () => {
    const { service, payos, tx } = setup();
    const result = await service.initiate('user-id', 'order-id', {
      returnUrl: 'http://localhost/success',
      cancelUrl: 'http://localhost/cancel',
    });
    expect(payos.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000 }));
    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ provider: 'PAYOS', status: PaymentStatus.PROCESSING }),
    }));
    expect(result.checkoutUrl).toBe('https://pay.payos.vn/link-id');
  });

  it('does not process a webhook with an invalid signature', async () => {
    const { service, payos, prisma } = setup();
    payos.verifyWebhook.mockReturnValue(false);
    await expect(service.handlePayOSWebhook({
      code: '00', desc: 'success', success: true,
      data: { orderCode: 123, amount: 100000 }, signature: 'bad',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('acknowledges a duplicate successful webhook without another transaction', async () => {
    const { service, prisma } = setup();
    prisma.payment.findFirst.mockResolvedValue({ ...order, status: PaymentStatus.SUCCEEDED });
    await expect(service.handlePayOSWebhook({
      code: '00', desc: 'success', success: true,
      data: { orderCode: 123, amount: 100000 }, signature: 'valid',
    })).resolves.toEqual({ success: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
