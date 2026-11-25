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
                requiresShipping: true,
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
                    format: CartItemFormat.PHYSICAL,
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

  it("keeps multi-store groups separated with per-store storeName during preview even before shipping address selection (BUG-039)", async () => {
    const multiStoreCartService = {
      getCartEntity: jest.fn().mockResolvedValue({
        id: "cart-multi",
        updatedAt: new Date(),
        items: [
          {
            id: "ci-huki",
            format: CartItemFormat.PHYSICAL,
            quantity: 1,
            book: {
              id: "book-huki",
              title: "Sách HuKi",
              status: BookStatus.PUBLISHED,
              format: BookFormat.PHYSICAL,
              price: 100000,
              storeId: "huki-official",
              ownerUserId: "seller-huki",
              coverUrl: null,
              isbn: null,
              physicalDetails: { physicalEnabled: true, stock: 5, reserved: 0, weight: 300 },
            },
          },
          {
            id: "ci-kimdong",
            format: CartItemFormat.PHYSICAL,
            quantity: 2,
            book: {
              id: "book-kimdong",
              title: "Sách Kim Đồng",
              status: BookStatus.PUBLISHED,
              format: BookFormat.PHYSICAL,
              price: 50000,
              storeId: "store-kim-dong",
              ownerUserId: "seller-kd",
              coverUrl: null,
              isbn: null,
              physicalDetails: { physicalEnabled: true, stock: 5, reserved: 0, weight: 200 },
            },
          },
        ],
      }),
      resolveStoreName: jest.fn().mockImplementation(async (storeId: string) =>
        storeId === "store-kim-dong" ? "Nhà Sách Kim Đồng" : "Nhà Sách HuKi Official",
      ),
    };

    const multiPricingCalculator = {
      calculate: jest.fn().mockImplementation(async (_userId, items) => {
        const byStore = new Map<string, any[]>();
        for (const it of items) {
          const list = byStore.get(it.storeId) || [];
          list.push(it);
          byStore.set(it.storeId, list);
        }
        const groups = Array.from(byStore.entries()).map(([storeId, gItems]) => ({
          storeId,
          ownerUserId: gItems[0].ownerUserId,
          requiresShipping: true,
          itemSubtotal: gItems.reduce((s, x) => s + x.subtotal, 0),
          shippingFee: 30000,
          storeVoucherDiscount: 0,
          platformVoucherDiscount: 0,
          shippingDiscount: 0,
          totalDiscount: 0,
          grandTotal: gItems.reduce((s, x) => s + x.subtotal, 0) + 30000,
          items: gItems,
        }));
        return {
          groups,
          itemSubtotal: items.reduce((s: number, x: any) => s + x.subtotal, 0),
          shippingTotal: groups.length * 30000,
          storeVoucherTotal: 0,
          platformVoucherDiscount: 0,
          shippingDiscountTotal: 0,
          discountTotal: 0,
          grandTotal: items.reduce((s: number, x: any) => s + x.subtotal, 0) + groups.length * 30000,
          appliedVouchers: {},
          vouchers: { stores: [] },
        };
      }),
    };

    const multiPrisma = {
      userAddress: { findFirst: jest.fn().mockResolvedValue(null) },
      checkoutSession: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: "session-multi", expiresAt: data.expiresAt }),
        ),
      },
    };

    const multiService = new CheckoutService(
      multiPrisma as any,
      multiStoreCartService as any,
      config as any,
      {} as any,
      { quote: jest.fn().mockResolvedValue({ isFlashSale: false, allowed: true }), getCustomBookDiscount: jest.fn().mockResolvedValue(null) } as any,
      {} as any,
      {} as any,
      multiPricingCalculator as any,
    );

    const previewRes = await multiService.preview("user-1", {} as any);
    expect(previewRes.groups).toHaveLength(2);
    expect(previewRes.groups.map((g: any) => ({ storeId: g.storeId, storeName: g.storeName }))).toEqual([
      { storeId: "huki-official", storeName: "Nhà Sách HuKi Official" },
      { storeId: "store-kim-dong", storeName: "Nhà Sách Kim Đồng" },
    ]);
  });
});

