import { BadRequestException } from "@nestjs/common";
import {
  BookFormat,
  BookStatus,
  CartItemFormat,
} from "../../../prisma/generated/client";
import { CheckoutService } from "./checkout.service";

describe("CheckoutService (Prisma)", () => {
  const cartService = { getCartEntity: jest.fn() };
  const prisma = { checkoutSession: { create: jest.fn() } };
  const config = { get: jest.fn() };
  const flashSales = { quote: jest.fn() };
  const pricingCalculator = {
    calculate: jest.fn().mockImplementation(async (_userId, items) => {
      const itemSubtotal = items.reduce(
        (sum: number, i: any) => sum + i.subtotal,
        0,
      );
      return {
        groups: [
          {
            storeId: items[0]?.storeId ?? "store-id",
            ownerUserId: items[0]?.ownerUserId ?? "seller-id",
            requiresShipping: true,
            itemSubtotal,
            shippingFee: 30000,
            storeVoucherDiscount: 0,
            platformVoucherDiscount: 0,
            shippingDiscount: 0,
            totalDiscount: 0,
            grandTotal: itemSubtotal + 30000,
            items: items.map((it: any) => ({
              ...it,
              isFlashSale: it.unitPrice === 79000,
            })),
          },
        ],
        itemSubtotal,
        shippingTotal: 30000,
        storeVoucherTotal: 0,
        platformVoucherDiscount: 0,
        shippingDiscountTotal: 0,
        discountTotal: 0,
        grandTotal: itemSubtotal + 30000,
        appliedVouchers: {},
        vouchers: { stores: [] },
      };
    }),
  };
  const service = new CheckoutService(
    prisma as any,
    cartService as any,
    config as any,
    {} as any,
    flashSales as any,
    {} as any,
    {} as any,
    pricingCalculator as any,
  );
  beforeEach(() => jest.clearAllMocks());

  it("rejects preview when the Prisma cart has no items", async () => {
    cartService.getCartEntity.mockResolvedValue({ id: "cart-id", items: [] });
    await expect(service.preview("user-id", {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("applies the authoritative Flash Sale price and a 60-second session TTL", async () => {
    const startedAt = Date.now();
    cartService.getCartEntity.mockResolvedValue({
      id: "cart-id",
      updatedAt: new Date(),
      items: [
        {
          id: "cart-item-id",
          format: CartItemFormat.PHYSICAL,
          quantity: 1,
          book: {
            id: "book-id",
            title: "Sách Flash Sale",
            status: BookStatus.PUBLISHED,
            format: BookFormat.PHYSICAL,
            price: 249000,
            storeId: "store-id",
            ownerUserId: "seller-id",
            coverUrl: null,
            isbn: null,
            physicalDetails: {
              physicalEnabled: true,
              stock: 10,
              reserved: 0,
              weight: 300,
            },
          },
        },
      ],
    });
    flashSales.quote.mockResolvedValue({
      isFlashSale: true,
      allowed: true,
      flashSaleId: "campaign-id",
      flashSaleName: "Giờ vàng",
      salePrice: 79000,
      maxPerUser: 1,
    });
    prisma.checkoutSession.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "session-id", expiresAt: data.expiresAt }),
    );

    const result = await service.preview("user-id", {
      shippingAddress: {
        recipientName: "Nguyễn Văn A",
        phone: "0900000000",
        line1: "1 Đường Sách",
        province: "Hồ Chí Minh",
        district: "Quận 1",
        ward: "Bến Nghé",
      },
    });

    expect(result.itemSubtotal).toBe(79000);
    expect(result.groups[0].items[0]).toEqual(
      expect.objectContaining({ unitPrice: 79000, isFlashSale: true }),
    );
    expect(result.expiresAt.getTime() - startedAt).toBeGreaterThanOrEqual(
      59_000,
    );
    expect(result.expiresAt.getTime() - startedAt).toBeLessThanOrEqual(61_000);
  });

  it("calls affiliateCheckoutService.createPendingCommissions during confirm", async () => {
    const mockAffiliateService = {
      createPendingCommissions: jest.fn().mockResolvedValue([]),
    };

    const confirmPrisma = {
      checkoutSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: "session-1",
          userId: "user-1",
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60000),
          cartId: "cart-1",
          snapshot: {
            itemSubtotal: 100000,
            shippingTotal: 30000,
            discountTotal: 0,
            grandTotal: 130000,
            note: null,
            shippingAddress: { recipientName: "Test", phone: "0900000000", line1: "A", ward: "B", district: "C", province: "D" },
            groups: [
              {
                storeId: "store-1",
                ownerUserId: "seller-1",
                requiresShipping: false,
                itemSubtotal: 100000,
                shippingFee: 0,
                storeVoucherDiscount: 10000,
                grandTotal: 90000,
                items: [
                  {
                    bookId: "book-1",
                    title: "Sách Hay",
                    coverUrl: null,
                    isbn: null,
                    format: CartItemFormat.DIGITAL,
                    quantity: 1,
                    unitPrice: 100000,
                    subtotal: 100000,
                    weight: 0,
                  },
                ],
              },
            ],
          },
        }),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "ord-1",
          code: "ORD-TEST-001",
          grandTotal: 130000,
          paymentMethod: "COD",
          paymentStatus: "PENDING",
        }),
      },
      payment: { create: jest.fn().mockResolvedValue({}) },
      sellerOrder: { create: jest.fn().mockResolvedValue({ id: "so-1" }) },
      orderItem: { create: jest.fn().mockResolvedValue({ id: "oi-1" }) },
      bookAccess: { upsert: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      checkoutSession_update: jest.fn(),
      cartItem: { deleteMany: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return cb({
          checkoutSession: {
            findUnique: confirmPrisma.checkoutSession.findUnique,
            update: jest.fn().mockResolvedValue({}),
          },
          order: confirmPrisma.order,
          payment: confirmPrisma.payment,
          sellerOrder: confirmPrisma.sellerOrder,
          orderItem: confirmPrisma.orderItem,
          bookAccess: confirmPrisma.bookAccess,
          orderStatusHistory: confirmPrisma.orderStatusHistory,
          outboxEvent: confirmPrisma.outboxEvent,
          cartItem: confirmPrisma.cartItem,
        });
      }),
    };

    const confirmService = new CheckoutService(
      confirmPrisma as any,
      {} as any,
      config as any,
      { reserve: jest.fn() } as any,
      { quote: jest.fn() } as any,
      {} as any,
      { apply: jest.fn() } as any,
      pricingCalculator as any,
      undefined,
      mockAffiliateService as any,
    );

    const result = await confirmService.confirm("user-1", "idemp-key-1", {
      sessionId: "session-1",
      paymentMethod: "COD" as any,
      affiliateToken: "aff-token-abc",
    });

    expect(result.order.id).toBe("ord-1");
    expect(mockAffiliateService.createPendingCommissions).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ord-1",
        orderCode: "ORD-TEST-001",
        buyerUserId: "user-1",
        affiliateToken: "aff-token-abc",
        items: [
          expect.objectContaining({
            orderItemId: "oi-1",
            bookId: "book-1",
            storeId: "store-1",
            sellerDiscountAllocated: 10000,
          }),
        ],
      }),
    );
  });
});

