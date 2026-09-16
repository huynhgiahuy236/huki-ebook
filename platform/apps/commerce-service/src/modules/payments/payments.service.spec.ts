import { BadRequestException } from "@nestjs/common";
import { PaymentMethod, PaymentStatus } from "../../../prisma/generated/client";
import { PaymentsService } from "./payments.service";

describe("PaymentsService", () => {
  const order = {
    id: "order-id",
    code: "ORD-ABC",
    userId: "user-id",
    grandTotal: 100000,
    paymentMethod: PaymentMethod.ONLINE_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    status: "PENDING_PAYMENT",
  };

  function setup() {
    const tx = {
      payment: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: "payment-id",
          ...data,
          createdAt: new Date(),
        })),
      },
      order: { update: jest.fn() },
    };
    const prisma: any = {
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue(order),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const payos: any = {
      createPaymentLink: jest.fn().mockResolvedValue({
        orderCode: 123,
        paymentLinkId: "link-id",
        checkoutUrl: "https://pay.payos.vn/link-id",
        qrCode: "qr",
      }),
      verifyWebhook: jest.fn().mockReturnValue(true),
    };
    const reservations: any = { release: jest.fn(), reserve: jest.fn() };
    const flashSales: any = {
      hasReservations: jest.fn().mockResolvedValue(false),
      releaseOrder: jest.fn().mockResolvedValue({ success: true }),
    };
    return {
      service: new PaymentsService(prisma, payos, reservations, flashSales),
      prisma,
      payos,
      tx,
      reservations,
      flashSales,
    };
  }

  it("creates a PayOS payment attempt for the order owner", async () => {
    const { service, payos, tx } = setup();
    const result = await service.initiate("user-id", "order-id", {
      returnUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });
    expect(payos.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000 }),
    );
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "PAYOS",
          status: PaymentStatus.PROCESSING,
        }),
      }),
    );
    expect(result.checkoutUrl).toBe("https://pay.payos.vn/link-id");
  });

  it("limits a Flash Sale PayOS payment link to 60 seconds", async () => {
    const { service, payos, tx, flashSales } = setup();
    flashSales.hasReservations.mockResolvedValue(true);
    const startedAt = Date.now();

    await service.initiate("user-id", "order-id", {
      returnUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    const payosPayload = payos.createPaymentLink.mock.calls[0][0];
    expect(payosPayload.expiredAt * 1000 - startedAt).toBeGreaterThanOrEqual(
      59_000,
    );
    expect(payosPayload.expiredAt * 1000 - startedAt).toBeLessThanOrEqual(
      60_000,
    );
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          callbackData: expect.objectContaining({ isFlashSaleOrder: true }),
        }),
      }),
    );
  });

  it("does not process a webhook with an invalid signature", async () => {
    const { service, payos, prisma } = setup();
    payos.verifyWebhook.mockReturnValue(false);
    await expect(
      service.handlePayOSWebhook({
        code: "00",
        desc: "success",
        success: true,
        data: { orderCode: 123, amount: 100000 },
        signature: "bad",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate successful webhook without another transaction", async () => {
    const { service, prisma } = setup();
    prisma.payment.findFirst.mockResolvedValue({
      ...order,
      status: PaymentStatus.SUCCEEDED,
    });
    await expect(
      service.handlePayOSWebhook({
        code: "00",
        desc: "success",
        success: true,
        data: { orderCode: 123, amount: 100000 },
        signature: "valid",
      }),
    ).resolves.toEqual({ success: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("expires payments that reached 2 minutes TTL and releases reserved stock", async () => {
    const { service, prisma, reservations } = setup();
    const expiredPayment = {
      id: "pay-1",
      orderId: "order-id",
      status: PaymentStatus.PROCESSING,
      expiresAt: new Date(Date.now() - 5000),
      order: {
        id: "order-id",
        code: "ORD-123",
        userId: "user-id",
        sellerOrders: [{ id: "so-1", items: [{ id: "item-1" }] }],
      },
    };
    prisma.payment.findMany.mockResolvedValue([expiredPayment]);
    const mockTx = {
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      sellerOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { update: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

    const res = await service.expirePendingPayments();
    expect(res.expired).toBeGreaterThanOrEqual(1);
    expect(reservations.release).toHaveBeenCalledWith(mockTx, "order-id", [
      "item-1",
    ]);
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-id" },
        data: expect.objectContaining({
          status: "CANCELLED",
          paymentStatus: PaymentStatus.EXPIRED,
        }),
      }),
    );
  });

  it("handles late webhook: restores order when stock is available", async () => {
    const { service, prisma } = setup();
    const latePayment = {
      id: "pay-late",
      orderId: "order-id",
      status: PaymentStatus.EXPIRED,
      amount: 100000,
      order: {
        id: "order-id",
        code: "ORD-123",
        userId: "user-id",
        status: "CANCELLED",
        sellerOrders: [
          {
            id: "so-1",
            items: [
              {
                id: "item-1",
                bookId: "book-1",
                format: "PHYSICAL",
                quantity: 2,
              },
            ],
          },
        ],
      },
    };
    prisma.payment.findFirst.mockResolvedValue(latePayment);
    const mockTx = {
      physicalBookDetails: {
        findUnique: jest.fn().mockResolvedValue({
          bookId: "book-1",
          physicalEnabled: true,
          stock: 10,
          reserved: 2,
        }),
      },
      payment: { update: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
      sellerOrder: { updateMany: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      bookAccess: { upsert: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

    const res = await service.handlePayOSWebhook({
      code: "00",
      desc: "success",
      success: true,
      data: { orderCode: 123, amount: 100000, reference: "REF-123" },
      signature: "valid",
    });

    expect(res).toEqual({ success: true, restored: true });
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-id" },
        data: expect.objectContaining({
          status: "PROCESSING",
          paymentStatus: PaymentStatus.SUCCEEDED,
        }),
      }),
    );
  });

  it("handles late webhook: triggers auto refund when stock is exhausted", async () => {
    const { service, prisma } = setup();
    const latePayment = {
      id: "pay-late",
      orderId: "order-id",
      status: PaymentStatus.EXPIRED,
      amount: 100000,
      order: {
        id: "order-id",
        code: "ORD-123",
        userId: "user-id",
        status: "CANCELLED",
        sellerOrders: [
          {
            id: "so-1",
            items: [
              {
                id: "item-1",
                bookId: "book-1",
                format: "PHYSICAL",
                quantity: 2,
              },
            ],
          },
        ],
      },
    };
    prisma.payment.findFirst.mockResolvedValue(latePayment);
    const mockTx = {
      physicalBookDetails: {
        findUnique: jest.fn().mockResolvedValue({
          bookId: "book-1",
          physicalEnabled: true,
          stock: 1,
          reserved: 1,
        }), // 1 - 1 = 0 < 2 -> out of stock
      },
      payment: { update: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
      refund: { create: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

    const res = await service.handlePayOSWebhook({
      code: "00",
      desc: "success",
      success: true,
      data: { orderCode: 123, amount: 100000, reference: "REF-123" },
      signature: "valid",
    });

    expect(res).toEqual({
      success: true,
      restored: false,
      refundPending: true,
    });
    expect(mockTx.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order-id",
          status: "PENDING",
          amount: 100000,
        }),
      }),
    );
  });

  it("does not restore an expired Flash Sale order from a late webhook", async () => {
    const { service, prisma, reservations } = setup();
    prisma.payment.findFirst.mockResolvedValue({
      id: "pay-flash-late",
      orderId: "order-id",
      status: PaymentStatus.EXPIRED,
      amount: 100000,
      callbackData: { isFlashSaleOrder: true },
      order: {
        id: "order-id",
        code: "ORD-123",
        userId: "user-id",
        status: "CANCELLED",
        sellerOrders: [
          {
            id: "so-1",
            items: [
              {
                id: "item-1",
                bookId: "book-1",
                format: "PHYSICAL",
                quantity: 1,
              },
            ],
          },
        ],
      },
    });
    const mockTx = {
      physicalBookDetails: {
        findUnique: jest.fn().mockResolvedValue({
          bookId: "book-1",
          physicalEnabled: true,
          stock: 10,
          reserved: 0,
        }),
      },
      payment: { update: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
      refund: { create: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn(async (callback) => callback(mockTx));

    const result = await service.handlePayOSWebhook({
      code: "00",
      desc: "success",
      success: true,
      data: { orderCode: 123, amount: 100000, reference: "REF-FLASH" },
      signature: "valid",
    });

    expect(result).toEqual({
      success: true,
      restored: false,
      refundPending: true,
    });
    expect(reservations.reserve).not.toHaveBeenCalled();
  });
});
