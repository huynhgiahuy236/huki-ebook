import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { EscrowService } from "./escrow.service";
import { OrderStatus, PaymentStatus, SellerOrderStatus } from "../../../prisma/generated/client";

describe("OrdersService (Prisma)", () => {
  let prisma: any;
  let reservations: any;
  let completion: any;
  let flashSales: any;
  let escrow: EscrowService;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      sellerOrder: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      payment: { updateMany: jest.fn() },
      orderStatusHistory: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      outboxEvent: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        if (typeof cb === "function") {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };
    reservations = {
      release: jest.fn().mockResolvedValue(undefined),
    };
    completion = {
      completeIfReady: jest.fn().mockResolvedValue(undefined),
    };
    flashSales = {
      releaseOrder: jest.fn().mockResolvedValue(undefined),
    };
    escrow = new EscrowService(prisma);
    const configService = {
      get: jest.fn((key: string, defaultVal?: any) => defaultVal),
    };
    service = new OrdersService(
      prisma,
      reservations,
      completion,
      flashSales,
      escrow,
      configService as any,
    );
  });

  it("prevents another seller from reading an order", async () => {
    prisma.sellerOrder.findUnique.mockResolvedValue({
      ownerUserId: "owner-id",
      items: [],
      order: null,
    });
    await expect(
      service.sellerDetail(
        { sub: "other-id", role: "BUSINESS" } as any,
        "seller-id",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an invalid seller state transition in a Prisma transaction", async () => {
    prisma.sellerOrder.findUnique.mockResolvedValue({
      id: "seller-id",
      ownerUserId: "seller-id",
      status: "SHIPPED",
      items: [],
      orderId: "order-id",
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        sellerOrder: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: "seller-id",
              ownerUserId: "seller-id",
              status: "SHIPPED",
              items: [],
              orderId: "order-id",
            }),
        },
      }),
    );
    await expect(
      service.confirm(
        { sub: "seller-id", role: "BUSINESS" } as any,
        "seller-id",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe("Task 58: Buyer Cancel Before Payment", () => {
    const mockUnpaidOrder = {
      id: "order-1",
      code: "ORD-12345",
      userId: "buyer-1",
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      sellerOrders: [
        {
          id: "so-1",
          ownerUserId: "seller-1",
          storeId: "store-1",
          status: SellerOrderStatus.PENDING_PAYMENT,
          items: [{ id: "item-1", bookId: "book-1" }],
        },
      ],
    };

    it("successfully cancels unpaid order, releases inventory and invalidates payment links", async () => {
      prisma.order.findFirst.mockResolvedValue(mockUnpaidOrder);

      const res = await service.cancelBuyer("buyer-1", "order-1", {
        reason: "Đổi ý không mua nữa",
      });

      expect(res).toBeDefined();
      expect(reservations.release).toHaveBeenCalledWith(
        expect.anything(),
        "order-1",
        ["item-1"],
      );
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          orderId: "order-1",
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
        data: expect.objectContaining({
          status: PaymentStatus.CANCELLED,
        }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: expect.objectContaining({
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          cancelReason: "Đổi ý không mua nữa",
        }),
      });
      expect(flashSales.releaseOrder).toHaveBeenCalledWith("order-1", ["book-1"]);
    });

    it("rejects non-owner cancellation (IDOR protection)", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelBuyer("attacker-id", "order-1", { reason: "hack" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("is idempotent when order is already cancelled", async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockUnpaidOrder,
        status: OrderStatus.CANCELLED,
      });

      const res = await service.cancelBuyer("buyer-1", "order-1", {
        reason: "Hủy lại",
      });

      expect(res.status).toBe(OrderStatus.CANCELLED);
      expect(reservations.release).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it("rejects cancellation if order was already shipped", async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockUnpaidOrder,
        sellerOrders: [
          {
            ...mockUnpaidOrder.sellerOrders[0],
            status: SellerOrderStatus.SHIPPED,
          },
        ],
      });

      await expect(
        service.cancelBuyer("buyer-1", "order-1", { reason: "hủy" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("rejects cancellation before payment if order was already paid", async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockUnpaidOrder,
        paymentStatus: PaymentStatus.SUCCEEDED,
      });

      await expect(
        service.cancelBuyer("buyer-1", "order-1", { reason: "hủy" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("Task 59: Cancel During Packing", () => {
    const mockPackingOrder = {
      id: "order-1",
      code: "ORD-12345",
      userId: "buyer-1",
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.SUCCEEDED,
      sellerOrders: [
        {
          id: "so-1",
          orderId: "order-1",
          ownerUserId: "seller-1",
          storeId: "store-1",
          status: SellerOrderStatus.PREPARING,
          items: [{ id: "item-1", bookId: "book-1" }],
        },
      ],
    };

    it("buyer submits cancellation request during packing", async () => {
      prisma.order.findFirst.mockResolvedValue(mockPackingOrder);

      const res = await service.requestCancellation(
        "buyer-1",
        "order-1",
        "so-1",
        { reason: "Đặt nhầm địa chỉ giao hàng" },
      );

      expect(res).toBeDefined();
      expect(prisma.sellerOrder.update).toHaveBeenCalledWith({
        where: { id: "so-1" },
        data: expect.objectContaining({
          cancelReason: "Đặt nhầm địa chỉ giao hàng",
        }),
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Buyer requested cancellation during packing",
          }),
        }),
      );
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "ORDER_CANCEL_REQUESTED",
          }),
        }),
      );
    });

    it("rejects buyer request if sub-order was already shipped", async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockPackingOrder,
        sellerOrders: [
          {
            ...mockPackingOrder.sellerOrders[0],
            status: SellerOrderStatus.SHIPPED,
          },
        ],
      });

      await expect(
        service.requestCancellation("buyer-1", "order-1", "so-1", {
          reason: "hủy",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("seller approves cancellation request, releases inventory and updates status", async () => {
      prisma.sellerOrder.findUnique.mockResolvedValue({
        id: "so-1",
        orderId: "order-1",
        ownerUserId: "seller-1",
        storeId: "store-1",
        status: SellerOrderStatus.PREPARING,
        cancelReason: "Khách đổi ý",
        items: [{ id: "item-1", bookId: "book-1" }],
        order: mockPackingOrder,
      });
      prisma.sellerOrder.findMany.mockResolvedValue([
        { id: "so-1", status: SellerOrderStatus.CANCELLED },
      ]);

      const res = await service.approveCancellation(
        { sub: "seller-1", role: "BUSINESS" } as any,
        "so-1",
      );

      expect(res).toBeDefined();
      expect(reservations.release).toHaveBeenCalledWith(
        expect.anything(),
        "order-1",
        ["item-1"],
      );
      expect(prisma.sellerOrder.update).toHaveBeenCalledWith({
        where: { id: "so-1" },
        data: expect.objectContaining({
          status: SellerOrderStatus.CANCELLED,
        }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: expect.objectContaining({
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUND_PENDING,
        }),
      });
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "ORDER_CANCEL_APPROVED",
          }),
        }),
      );
    });

    it("seller rejects cancellation request and continues fulfillment", async () => {
      prisma.sellerOrder.findUnique.mockResolvedValue({
        id: "so-1",
        orderId: "order-1",
        ownerUserId: "seller-1",
        storeId: "store-1",
        status: SellerOrderStatus.PREPARING,
        items: [{ id: "item-1", bookId: "book-1" }],
        order: mockPackingOrder,
      });

      const res = await service.rejectCancellation(
        { sub: "seller-1", role: "BUSINESS" } as any,
        "so-1",
        { reason: "Hàng đã in mã vận đơn và đang bọc gói xong" },
      );

      expect(res).toBeDefined();
      expect(reservations.release).not.toHaveBeenCalled();
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Seller rejected cancellation during packing",
            description: "Hàng đã in mã vận đơn và đang bọc gói xong",
          }),
        }),
      );
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "ORDER_CANCEL_REJECTED",
          }),
        }),
      );
    });

    it("prevents unauthorized seller from approving another store's sub-order", async () => {
      prisma.sellerOrder.findUnique.mockResolvedValue({
        id: "so-1",
        orderId: "order-1",
        ownerUserId: "other-seller",
        storeId: "other-store",
        status: SellerOrderStatus.PREPARING,
        items: [],
        order: mockPackingOrder,
      });

      await expect(
        service.approveCancellation(
          { sub: "seller-1", role: "BUSINESS" } as any,
          "so-1",
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("Task 62: Dispute Submission UI & Backend (POL-12)", () => {
    const mockDeliveredOrder = {
      id: "order-1",
      code: "ORD-99999",
      userId: "buyer-1",
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.SUCCEEDED,
      sellerOrders: [
        {
          id: "so-1",
          ownerUserId: "seller-1",
          storeId: "store-1",
          status: SellerOrderStatus.COMPLETED,
          items: [{ id: "item-1", bookId: "book-1" }],
        },
      ],
    };

    it("allows eligible buyer to submit dispute with valid payload", async () => {
      prisma.order.findFirst.mockResolvedValue(mockDeliveredOrder);

      const res = await service.createDispute("buyer-1", "order-1", {
        type: "DAMAGED" as any,
        description: "Sách bị rách bìa trước và ướt các trang đầu. Kiện hàng có dấu hiệu bị cấn móp trong lúc vận chuyển.",
        resolution: "REFUND" as any,
        evidence: ["https://storage.huki.vn/evidence/img1.jpg"],
        sellerOrderId: "so-1",
      });

      expect(res).toBeDefined();
      expect(res.status).toBe("DISPUTE_OPENED");
      expect(res.type).toBe("DAMAGED");
      expect(res.resolution).toBe("REFUND");

      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "order-1",
            sellerOrderId: "so-1",
            toStatus: "DISPUTE_OPENED",
            title: "Yêu cầu mở khiếu nại (Dispute Opened)",
          }),
        }),
      );

      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "dispute.created",
            aggregateId: "order-1",
          }),
        }),
      );

      // Boundaries verified: No refund executed, no inventory released in Task 62
      expect(reservations.release).not.toHaveBeenCalled();
    });

    it("rejects dispute submission if order does not belong to buyer (IDOR)", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.createDispute("attacker-id", "order-1", {
          type: "DAMAGED" as any,
          description: "Sách bị rách bìa trước và ướt các trang đầu. Kiện hàng có dấu hiệu bị cấn móp trong lúc vận chuyển.",
          resolution: "REFUND" as any,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects dispute submission on CANCELLED orders", async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockDeliveredOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.createDispute("buyer-1", "order-1", {
          type: "DAMAGED" as any,
          description: "Sách bị rách bìa trước và ướt các trang đầu. Kiện hàng có dấu hiệu bị cấn móp trong lúc vận chuyển.",
          resolution: "REFUND" as any,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("Task 63: Evidence Upload System (POL-12 / Deliverables)", () => {
    const mockOrder = {
      id: "order-1",
      userId: "buyer-1",
      status: OrderStatus.COMPLETED,
      sellerOrders: [
        {
          id: "so-1",
          ownerUserId: "seller-1",
          storeId: "store-1",
        },
      ],
    };

    it("uploads valid evidence file for eligible buyer", async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrder);

      const mockFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "damage_evidence.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 1024 * 500, // 500KB
        buffer: Buffer.from("fake-image-bytes"),
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      const res = await service.uploadDisputeEvidence("buyer-1", "order-1", mockFile);

      expect(res).toBeDefined();
      expect(res.url).toContain("disputes/order-1/");
      expect(res.key).toContain("disputes/order-1/");
      expect(res.key.endsWith(".jpg")).toBe(true);
      expect(res.filename).toBe("damage_evidence.jpg");
      expect(res.mimeType).toBe("image/jpeg");
    });

    it("rejects evidence upload when file is missing or empty", async () => {
      await expect(
        service.uploadDisputeEvidence("buyer-1", "order-1", undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects evidence upload when file exceeds 5MB size limit", async () => {
      const oversizedFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "huge.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.alloc(6 * 1024 * 1024),
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      await expect(
        service.uploadDisputeEvidence("buyer-1", "order-1", oversizedFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects evidence upload with invalid MIME type", async () => {
      const invalidFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "malicious.exe",
        encoding: "7bit",
        mimetype: "application/x-msdownload",
        size: 1024,
        buffer: Buffer.from("fake-exe"),
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      await expect(
        service.uploadDisputeEvidence("buyer-1", "order-1", invalidFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects evidence upload if order does not belong to buyer (IDOR)", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      const mockFile: Express.Multer.File = {
        fieldname: "file",
        originalname: "damage.png",
        encoding: "7bit",
        mimetype: "image/png",
        size: 1024,
        buffer: Buffer.from("fake-png"),
        destination: "",
        filename: "",
        path: "",
        stream: null as any,
      };

      await expect(
        service.uploadDisputeEvidence("attacker-id", "order-1", mockFile),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("authorizes evidence access for buyer, store seller, and admin", async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      // Buyer access
      const buyerAccess = await service.getDisputeEvidenceAccess(
        { sub: "buyer-1", role: "CUSTOMER" } as any,
        "order-1",
        "disputes/order-1/evidence-1.jpg",
      );
      expect(buyerAccess.accessUrl).toBeDefined();

      // Seller access
      const sellerAccess = await service.getDisputeEvidenceAccess(
        { sub: "seller-1", role: "BUSINESS" } as any,
        "order-1",
        "disputes/order-1/evidence-1.jpg",
      );
      expect(sellerAccess.accessUrl).toBeDefined();

      // Admin access
      const adminAccess = await service.getDisputeEvidenceAccess(
        { sub: "admin-1", role: "PLATFORM_ADMIN" } as any,
        "order-1",
        "disputes/order-1/evidence-1.jpg",
      );
      expect(adminAccess.accessUrl).toBeDefined();

      // Unauthorized third party
      await expect(
        service.getDisputeEvidenceAccess(
          { sub: "unrelated-user", role: "CUSTOMER" } as any,
          "order-1",
          "disputes/order-1/evidence-1.jpg",
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("Task 64: Admin Arbitration Flow", () => {
    const mockDisputeHistory = [
      {
        id: "hist-1",
        orderId: "order-1",
        sellerOrderId: "so-1",
        fromStatus: "DELIVERED",
        toStatus: "DISPUTE_OPENED",
        title: "Yêu cầu mở khiếu nại (Dispute Opened)",
        description: "Sách bị rách bìa và móp góc nghiêm trọng",
        actorType: "USER",
        actorId: "buyer-1",
        metadata: {
          disputeId: "disp-123",
          disputeType: "DAMAGED",
          resolution: "REFUND",
          evidence: ["disputes/order-1/evidence-1.jpg"],
          sellerOrderId: "so-1",
        },
        createdAt: new Date("2026-06-01T10:00:00Z"),
        order: {
          id: "order-1",
          code: "ORD-9999",
          userId: "buyer-1",
          grandTotal: "250000",
          paymentMethod: "PAYOS",
          paymentStatus: "PAID",
          status: "DELIVERED",
          sellerOrders: [
            {
              id: "so-1",
              code: "SO-9999-1",
              storeId: "store-1",
              ownerUserId: "seller-1",
              grandTotal: "250000",
              status: "DELIVERED",
              carrier: "GHTK",
              trackingCode: "GHTK123456",
              items: [
                {
                  id: "item-1",
                  bookId: "book-1",
                  bookTitle: "Lập Trình TypeScript Nâng Cao",
                  quantity: 1,
                  unitPrice: "250000",
                  subtotal: "250000",
                  format: "PHYSICAL",
                },
              ],
            },
          ],
        },
      },
    ];

    it("allows PLATFORM_ADMIN to list disputes", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockDisputeHistory);

      const result = await service.adminListDisputes({
        sub: "admin-1",
        role: "PLATFORM_ADMIN",
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("disp-123");
      expect(result.data[0].orderCode).toBe("ORD-9999");
      expect(result.data[0].status).toBe("DISPUTE_OPENED");
    });

    it("rejects non-admin actor from listing disputes", async () => {
      await expect(
        service.adminListDisputes({
          sub: "buyer-1",
          role: "CUSTOMER",
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.adminListDisputes({
          sub: "seller-1",
          role: "BUSINESS",
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows PLATFORM_ADMIN to retrieve dispute detail and evidence context", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockDisputeHistory);

      const detail = await service.adminGetDisputeDetail(
        { sub: "admin-1", role: "PLATFORM_ADMIN" } as any,
        "disp-123",
      );

      expect(detail.disputeId).toBe("disp-123");
      expect(detail.buyerId).toBe("buyer-1");
      expect(detail.targetSellerOrder?.code).toBe("SO-9999-1");
      expect(detail.evidence).toHaveLength(1);
      expect(detail.isFinalized).toBe(false);
    });

    it("records valid arbitration ruling BUYER_WINS with audit and outbox event", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockDisputeHistory);
      prisma.orderStatusHistory.create = jest.fn().mockResolvedValue({ id: "hist-ruling" });
      prisma.outboxEvent.create = jest.fn().mockResolvedValue({ id: "evt-ruling" });

      const rulingResult = await service.adminArbitrateDispute(
        { sub: "admin-1", email: "admin@huki.vn", role: "PLATFORM_ADMIN" } as any,
        "disp-123",
        {
          ruling: "BUYER_WINS" as any,
          notes: "Đã thẩm định video mở hộp: kiện hàng nguyên vẹn nhưng sách bị rách nát. Chấp thuận hoàn tiền 100%.",
        },
      );

      expect(rulingResult.disputeId).toBe("disp-123");
      expect(rulingResult.ruling).toBe("BUYER_WINS");
      expect(rulingResult.status).toBe("RULING_BUYER_WINS");

      // Verify audit trail
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "order-1",
          toStatus: "RULING_BUYER_WINS",
          actorType: "ADMIN",
          actorId: "admin-1",
          description: expect.stringContaining("Đã thẩm định video mở hộp"),
        }),
      });

      // Verify domain event emitted
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "dispute.resolved",
          aggregateId: "order-1",
          payload: expect.objectContaining({
            disputeId: "disp-123",
            ruling: "BUYER_WINS",
            resolvedBy: "admin-1",
          }),
        }),
      });
    });

    it("records PARTIAL_SETTLEMENT ruling and validates refund percentage", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockDisputeHistory);
      prisma.orderStatusHistory.create = jest.fn().mockResolvedValue({ id: "hist-ruling-2" });
      prisma.outboxEvent.create = jest.fn().mockResolvedValue({ id: "evt-ruling-2" });

      // Valid partial settlement
      const partialResult = await service.adminArbitrateDispute(
        { sub: "admin-1", email: "admin@huki.vn", role: "PLATFORM_ADMIN" } as any,
        "disp-123",
        {
          ruling: "PARTIAL_SETTLEMENT" as any,
          notes: "Thỏa thuận hai bên: hoàn 50% cho khách, 50% cho người bán.",
          refundPercentage: 50,
        },
      );

      expect(partialResult.ruling).toBe("PARTIAL_SETTLEMENT");
      expect(partialResult.refundPercentage).toBe(50);

      // Invalid percentage (e.g. 0 or 100)
      await expect(
        service.adminArbitrateDispute(
          { sub: "admin-1", email: "admin@huki.vn", role: "PLATFORM_ADMIN" } as any,
          "disp-123",
          {
            ruling: "PARTIAL_SETTLEMENT" as any,
            notes: "Invalid percentage test",
            refundPercentage: 0,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects arbitration when dispute is already finalized in a terminal state", async () => {
      const finalizedHistory = [
        ...mockDisputeHistory,
        {
          id: "hist-2",
          orderId: "order-1",
          sellerOrderId: "so-1",
          fromStatus: "DISPUTE_OPENED",
          toStatus: "RULING_BUYER_WINS",
          title: "Phán quyết trọng tài: BUYER_WINS",
          description: "Đã phân xử xong",
          actorType: "ADMIN",
          actorId: "admin-1",
          metadata: {
            disputeId: "disp-123",
            ruling: "BUYER_WINS",
          },
          createdAt: new Date("2026-06-01T12:00:00Z"),
          order: mockDisputeHistory[0].order,
        },
      ];

      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(finalizedHistory);

      await expect(
        service.adminArbitrateDispute(
          { sub: "admin-2", email: "admin2@huki.vn", role: "PLATFORM_ADMIN" } as any,
          "disp-123",
          {
            ruling: "SELLER_WINS" as any,
            notes: "Cố tình phân xử lại hồ sơ đã hoàn tất",
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("rejects arbitration attempts from non-admin actors (IDOR / RBAC protection)", async () => {
      await expect(
        service.adminArbitrateDispute(
          { sub: "buyer-1", role: "CUSTOMER" } as any,
          "disp-123",
          {
            ruling: "BUYER_WINS" as any,
            notes: "Buyer attempts to self-arbitrate",
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.adminArbitrateDispute(
          { sub: "seller-1", role: "BUSINESS" } as any,
          "disp-123",
          {
            ruling: "SELLER_WINS" as any,
            notes: "Seller attempts to self-arbitrate",
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("Task 65: Escrow Fund Freezing (POL-14 / POL-12)", () => {
    it("calculates 85/15 revenue split correctly according to POL-14 (SPLIT-001)", () => {
      const split = escrow.calculateEscrowSplit(200000);
      expect(split.totalAmount).toBe(200000);
      expect(split.platformFee).toBe(30000); // 15%
      expect(split.sellerNet).toBe(170000); // 85%
    });

    it("freezes escrow on dispute creation and records ESCROW_FROZEN audit entry", async () => {
      const mockOrder = {
        id: "order-1",
        code: "ORD-12345",
        userId: "buyer-1",
        grandTotal: "200000",
        paymentMethod: "ONLINE_PAYMENT",
        paymentStatus: PaymentStatus.SUCCEEDED,
        status: OrderStatus.PROCESSING,
        sellerOrders: [
          {
            id: "so-1",
            grandTotal: "200000",
            status: SellerOrderStatus.PREPARING,
            ownerUserId: "seller-1",
          },
        ],
      };
      prisma.order.findFirst = jest.fn().mockResolvedValue(mockOrder);
      prisma.orderStatusHistory.create = jest.fn().mockResolvedValue({ id: "hist-1" });
      prisma.outboxEvent.create = jest.fn().mockResolvedValue({ id: "evt-1" });

      const disputeResult = await service.createDispute("buyer-1", "order-1", {
        type: "DAMAGED" as any,
        description: "Bìa sách bị rách nát hoàn toàn khi mở hộp kiểm tra chất lượng.",
        resolution: "REFUND" as any,
        sellerOrderId: "so-1",
      });

      expect(disputeResult.escrowStatus).toBe("ESCROW_FROZEN");
      expect(disputeResult.frozenAmount).toBe(200000);
      expect(disputeResult.sellerPortion).toBe(170000);
      expect(disputeResult.platformFee).toBe(30000);

      // Verify ESCROW_FROZEN history creation
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "order-1",
          toStatus: "ESCROW_FROZEN",
          title: expect.stringContaining("Đóng băng ký quỹ Escrow"),
          metadata: expect.objectContaining({
            frozenAmount: 200000,
            sellerPortion: 170000,
            platformFee: 30000,
          }),
        }),
      });

      // Verify escrow.frozen outbox event
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "escrow.frozen",
          aggregateId: "order-1",
          payload: expect.objectContaining({
            frozenAmount: 200000,
            sellerPortion: 170000,
            platformFee: 30000,
          }),
        }),
      });
    });

    it("canReleaseEscrow returns false when escrow is frozen by active dispute", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue([
        {
          id: "hist-freeze",
          orderId: "order-1",
          toStatus: "ESCROW_FROZEN",
          createdAt: new Date("2026-06-01T10:00:00Z"),
        },
      ]);

      const check = await escrow.canReleaseEscrow("order-1");
      expect(check.canRelease).toBe(false);
      expect(check.reason).toContain("ESCROW_FROZEN");
    });

    it("canReleaseEscrow returns true when order is valid and has no active dispute", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue([]);
      prisma.order.findUnique = jest.fn().mockResolvedValue({
        id: "order-1",
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.SUCCEEDED,
      });

      const check = await escrow.canReleaseEscrow("order-1");
      expect(check.canRelease).toBe(true);
    });

    it("unfreezes escrow on BUYER_WINS arbitration ruling and routes to refund", async () => {
      const mockHistory = [
        {
          id: "hist-freeze",
          orderId: "order-1",
          sellerOrderId: "so-1",
          toStatus: "DISPUTE_OPENED",
          description: "Khách khiếu nại sách rách",
          actorType: "USER",
          actorId: "buyer-1",
          metadata: { disputeId: "disp-123", sellerOrderId: "so-1" },
          createdAt: new Date("2026-06-01T10:00:00Z"),
          order: {
            id: "order-1",
            code: "ORD-12345",
            grandTotal: "200000",
            sellerOrders: [{ id: "so-1", grandTotal: "200000" }],
          },
        },
      ];

      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockHistory);
      prisma.orderStatusHistory.create = jest.fn().mockResolvedValue({ id: "hist-unfreeze" });
      prisma.outboxEvent.create = jest.fn().mockResolvedValue({ id: "evt-unfreeze" });

      const rulingResult = await service.adminArbitrateDispute(
        { sub: "admin-1", email: "admin@huki.vn", role: "PLATFORM_ADMIN" } as any,
        "disp-123",
        {
          ruling: "BUYER_WINS" as any,
          notes: "Video mở hộp hợp lệ, chấp thuận hoàn tiền 100%",
        },
      );

      expect(rulingResult.escrowStatus).toBe("ESCROW_UNFROZEN");
      expect(rulingResult.routing).toBe("REFUND_BUYER");
      expect(rulingResult.refundAmount).toBe(200000);
      expect(rulingResult.sellerSettlement).toBe(0);

      // Verify escrow.unfrozen outbox event
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "escrow.unfrozen",
          aggregateId: "order-1",
          payload: expect.objectContaining({
            routing: "REFUND_BUYER",
            refundAmount: 200000,
            sellerSettlement: 0,
          }),
        }),
      });
    });

    it("unfreezes escrow on SELLER_WINS arbitration ruling and routes to seller settlement", async () => {
      const mockHistory = [
        {
          id: "hist-freeze",
          orderId: "order-1",
          sellerOrderId: "so-1",
          toStatus: "DISPUTE_OPENED",
          description: "Khách khiếu nại sách rách",
          actorType: "USER",
          actorId: "buyer-1",
          metadata: { disputeId: "disp-123", sellerOrderId: "so-1" },
          createdAt: new Date("2026-06-01T10:00:00Z"),
          order: {
            id: "order-1",
            code: "ORD-12345",
            grandTotal: "200000",
            sellerOrders: [{ id: "so-1", grandTotal: "200000" }],
          },
        },
      ];

      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue(mockHistory);
      prisma.orderStatusHistory.create = jest.fn().mockResolvedValue({ id: "hist-unfreeze" });
      prisma.outboxEvent.create = jest.fn().mockResolvedValue({ id: "evt-unfreeze" });

      const rulingResult = await service.adminArbitrateDispute(
        { sub: "admin-1", email: "admin@huki.vn", role: "PLATFORM_ADMIN" } as any,
        "disp-123",
        {
          ruling: "SELLER_WINS" as any,
          notes: "Người bán chứng minh hàng nguyên vẹn lúc xuất kho, bác khiếu nại",
        },
      );

      expect(rulingResult.escrowStatus).toBe("ESCROW_UNFROZEN");
      expect(rulingResult.routing).toBe("SETTLE_SELLER");
      expect(rulingResult.refundAmount).toBe(0);
      expect(rulingResult.sellerSettlement).toBe(170000); // 85% of 200,000
    });

    it("PLATFORM_ADMIN can list all frozen escrows", async () => {
      prisma.orderStatusHistory.findMany = jest.fn().mockResolvedValue([
        {
          id: "hist-freeze-1",
          orderId: "order-1",
          toStatus: "ESCROW_FROZEN",
          description: "Đóng băng ký quỹ do có tranh chấp",
          metadata: { disputeId: "disp-1", sellerOrderId: "so-1" },
          createdAt: new Date("2026-06-01T10:00:00Z"),
          order: {
            id: "order-1",
            code: "ORD-1",
            grandTotal: "300000",
            sellerOrders: [{ id: "so-1", grandTotal: "300000" }],
          },
        },
      ]);

      const list = await escrow.listFrozenEscrows({
        sub: "admin-1",
        role: "PLATFORM_ADMIN",
      } as any);

      expect(list.totalCount).toBe(1);
      expect(list.totalFrozenAmount).toBe(300000);
      expect(list.totalFrozenSellerPortion).toBe(255000); // 85% of 300,000
    });
  });
});



