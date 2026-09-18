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
        findUnique: jest.fn().mockResolvedValue(order),
        findMany: jest.fn().mockResolvedValue([]),
      },
      refund: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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

  it("calculates regular payment link expiration using PolicyConfigService TTL", async () => {
    const { service, payos, tx } = setup();
    const startedAt = Date.now();

    await service.initiate("user-id", "order-id", {
      returnUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    const payosPayload = payos.createPaymentLink.mock.calls[0][0];
    // Default engineering placeholder is 120s
    expect(payosPayload.expiredAt * 1000 - startedAt).toBeGreaterThanOrEqual(119_000);
    expect(payosPayload.expiredAt * 1000 - startedAt).toBeLessThanOrEqual(121_000);
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

  it("records dynamic timeout label in order status history when expiring payments", async () => {
    const { service, prisma } = setup();
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

    await service.expirePendingPayments();
    expect(mockTx.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringMatching(/Mã QR PayOS hết hạn sau .* - Hệ thống tự động thu hồi và giải phóng tồn kho\./),
        }),
      }),
    );
  });

  describe("requestRefund (POL-11 / RMA-001 / RMA-002)", () => {
    it("rejects refund request when 7-day return window has expired for completed order", async () => {
      const { service, prisma } = setup();
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      prisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        userId: "user-id",
        status: "COMPLETED",
        sellerOrders: [{ id: "so-1", completedAt: eightDaysAgo }],
        payments: [{ id: "pay-1", status: PaymentStatus.SUCCEEDED, amount: 200000 }],
        refunds: [],
      });

      await expect(
        service.requestRefund(
          { sub: "user-id", role: "USER", email: "u@test.com" } as any,
          "order-1",
          { reason: "Item defective", amount: 200000 },
        ),
      ).rejects.toThrow();
    });

    it("accepts refund request when within 7-day return window for completed order", async () => {
      const { service, prisma } = setup();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        userId: "user-id",
        status: "COMPLETED",
        sellerOrders: [{ id: "so-1", completedAt: twoDaysAgo }],
        payments: [{ id: "pay-1", status: PaymentStatus.SUCCEEDED, amount: 200000 }],
        refunds: [],
      });

      const mockTx = {
        refund: {
          create: jest.fn().mockResolvedValue({
            id: "refund-1",
            orderId: "order-1",
            paymentId: "pay-1",
            amount: 200000,
            status: "PENDING",
          }),
        },
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

      const result = await service.requestRefund(
        { sub: "user-id", role: "USER", email: "u@test.com" } as any,
        "order-1",
        { reason: "Defective item", amount: 200000 },
      );

      expect(result.id).toBe("refund-1");
      expect(mockTx.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "order-1",
            amount: 200000,
            status: "PENDING",
          }),
        }),
      );
    });

    it("rejects refund request when requested amount exceeds un-refunded balance", async () => {
      const { service, prisma } = setup();
      prisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        userId: "user-id",
        status: "DELIVERED",
        payments: [{ id: "pay-1", status: PaymentStatus.SUCCEEDED, amount: 100000 }],
        refunds: [{ id: "ref-prev", amount: 60000, status: "SUCCEEDED" }],
      });

      await expect(
        service.requestRefund(
          { sub: "user-id", role: "USER", email: "u@test.com" } as any,
          "order-1",
          { reason: "Overcharge", amount: 50000 }, // Remaining is only 40000
        ),
      ).rejects.toThrow();
    });

    it("settleRefund revokes BookAccess when order is fully refunded (Task 50 / POL-04 EC-002)", async () => {
      const { service, prisma } = setup();
      prisma.refund.findUnique.mockResolvedValue({
        id: "ref-1",
        orderId: "order-1",
        paymentId: "pay-1",
        amount: 100000,
        status: "PENDING",
        payment: { id: "pay-1", amount: 100000 },
        order: { id: "order-1", userId: "user-1" },
      });

      const mockTx = {
        refund: {
          update: jest.fn().mockResolvedValue({ id: "ref-1", amount: 100000, status: "SUCCEEDED" }),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 100000 } }),
        },
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        bookAccess: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

      const result = await service.settleRefund(
        { sub: "admin-id", role: "PLATFORM_ADMIN", email: "admin@huki.vn" } as any,
        "ref-1",
        { succeeded: true, providerReference: "REFUND-TX-123" },
      );

      expect(result.status).toBe("SUCCEEDED");
      expect(mockTx.bookAccess.updateMany).toHaveBeenCalledWith({
        where: { orderId: "order-1", status: "ACTIVE" },
        data: { status: "REVOKED" },
      });
      expect(mockTx.payment.update).toHaveBeenCalledWith({
        where: { id: "pay-1" },
        data: { status: PaymentStatus.REFUNDED },
      });
    });

    describe("Task 60: Automated Refund Verification & Admin Retry", () => {
      it("listRefunds filters by user for regular customers", async () => {
        const { service, prisma } = setup();
        prisma.refund.findMany = jest.fn().mockResolvedValue([
          {
            id: "ref-1",
            amount: 50000,
            status: "PENDING",
            order: { id: "ord-1", userId: "user-1", grandTotal: 50000 },
            payment: { id: "pay-1", amount: 50000 },
          },
        ]);

        const res = await service.listRefunds({ sub: "user-1", role: "USER" } as any);

        expect(res).toHaveLength(1);
        expect(prisma.refund.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { order: { userId: "user-1" } },
          }),
        );
      });

      it("getRefund rejects non-owner non-admin access (IDOR)", async () => {
        const { service, prisma } = setup();
        prisma.refund.findUnique.mockResolvedValue({
          id: "ref-1",
          amount: 50000,
          order: { id: "ord-1", userId: "owner-1" },
          payment: { id: "pay-1", amount: 50000 },
        });

        await expect(
          service.getRefund({ sub: "attacker", role: "USER" } as any, "ref-1"),
        ).rejects.toThrow();
      });

      it("retryRefund allows platform admin to retry a failed refund", async () => {
        const { service, prisma } = setup();
        prisma.refund.findUnique.mockResolvedValue({
          id: "ref-failed",
          orderId: "order-1",
          paymentId: "pay-1",
          amount: 100000,
          status: "FAILED",
          provider: "PAYOS",
          payment: { id: "pay-1", amount: 100000 },
          order: { id: "order-1", userId: "user-1" },
        });

        const mockTx = {
          refund: {
            update: jest.fn().mockResolvedValue({
              id: "ref-failed",
              amount: 100000,
              status: "PENDING",
            }),
          },
          payment: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue({}) },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

        const res = await service.retryRefund(
          { sub: "admin-1", role: "PLATFORM_ADMIN" } as any,
          "ref-failed",
        );

        expect(res.status).toBe("PENDING");
        expect(mockTx.refund.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "ref-failed" },
            data: expect.objectContaining({ status: "PENDING", failedAt: null }),
          }),
        );
      });

      it("autoInitiateRefund creates pending refund for cancelled paid order", async () => {
        const { service, prisma } = setup();
        prisma.order.findUnique.mockResolvedValue({
          id: "ord-cancelled",
          payments: [
            { id: "pay-1", amount: 150000, status: PaymentStatus.SUCCEEDED, provider: "PAYOS" },
          ],
          refunds: [],
        });

        const mockTx = {
          refund: {
            create: jest.fn().mockResolvedValue({
              id: "ref-auto",
              orderId: "ord-cancelled",
              paymentId: "pay-1",
              amount: 150000,
              status: "PENDING",
            }),
          },
          payment: { update: jest.fn().mockResolvedValue({}) },
          order: { update: jest.fn().mockResolvedValue({}) },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        prisma.$transaction = jest.fn(async (cb) => cb(mockTx));

        const res = await service.autoInitiateRefund("ord-cancelled");

        expect(res).toBeDefined();
        expect(res!.id).toBe("ref-auto");
        expect(mockTx.refund.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              orderId: "ord-cancelled",
              amount: 150000,
              status: "PENDING",
            }),
          }),
        );
      });
    });
  });
});
