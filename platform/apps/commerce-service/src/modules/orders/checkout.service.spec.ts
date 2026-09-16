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
  const service = new CheckoutService(
    prisma as any,
    cartService as any,
    config as any,
    {} as any,
    flashSales as any,
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
});
