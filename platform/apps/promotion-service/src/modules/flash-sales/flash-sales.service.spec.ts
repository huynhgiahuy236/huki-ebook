import { FlashSalesService } from "./flash-sales.service";

describe("FlashSalesService", () => {
  const campaign = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Giờ vàng",
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 3_600_000),
    status: "ACTIVE",
  };
  const item = {
    id: "20000000-0000-4000-8000-000000000001",
    flashSaleId: campaign.id,
    bookId: "30000000-0000-4000-8000-000000000001",
    originalPrice: 200_000,
    salePrice: 80_000,
    stock: 10,
    sold: 0,
    maxPerUser: 1,
    createdAt: new Date(),
    flashSale: campaign,
  };
  const prisma: any = {
    flashSale: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn(),
    },
    flashSaleItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const redis: any = {
    status: "ready",
    mget: jest.fn(),
    eval: jest.fn(),
    set: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
    hgetall: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    disconnect: jest.fn(),
  };
  const service = new FlashSalesService(prisma, redis);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
    prisma.flashSale.updateMany.mockResolvedValue({ count: 0 });
  });

  it("rejects a campaign whose end is not after its start", async () => {
    await expect(
      service.create({
        name: "Sai thời gian",
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        endsAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });

  it("reads quota and remaining stock from Redis", async () => {
    prisma.flashSaleItem.findFirst.mockResolvedValue(item);
    redis.mget.mockResolvedValue(["1", "9"]);

    const result = await service.validateUserQuota({
      userId: "user-1",
      bookId: item.bookId,
      quantity: 1,
    });

    expect(result.allowed).toBe(false);
    expect(result.currentPurchased).toBe(1);
  });

  it("rejects an atomic reservation when Redis reports quota exceeded", async () => {
    prisma.flashSaleItem.findFirst.mockResolvedValue(item);
    redis.eval.mockResolvedValue(-1);

    await expect(
      service.reserveQuotaAndStock({
        orderId: "40000000-0000-4000-8000-000000000001",
        userId: "user-1",
        bookId: item.bookId,
        flashSaleId: campaign.id,
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("reserves stock once and persists sold quantity", async () => {
    prisma.flashSaleItem.findFirst.mockResolvedValue(item);
    prisma.flashSaleItem.updateMany.mockResolvedValue({ count: 1 });
    redis.eval.mockResolvedValue(1);

    const result = await service.reserveQuotaAndStock({
      orderId: "40000000-0000-4000-8000-000000000001",
      userId: "user-1",
      bookId: item.bookId,
      flashSaleId: campaign.id,
      quantity: 1,
    });

    expect(result.isFlashSale).toBe(true);
    expect(prisma.flashSaleItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { decrement: 1 }, sold: { increment: 1 } },
      }),
    );
  });

  it("restores quota and Flash Sale stock when an order is cancelled", async () => {
    const orderId = "40000000-0000-4000-8000-000000000001";
    const reservationKey = `flash:reservation:${orderId}:${item.id}`;
    redis.smembers.mockResolvedValue([reservationKey]);
    redis.hgetall.mockResolvedValue({
      itemId: item.id,
      bookId: item.bookId,
      quantity: "1",
      quotaKey: `quota:user:user-1:${campaign.id}:${item.bookId}`,
      stockKey: `flash:stock:${item.id}`,
      indexKey: `flash:reservation:index:${orderId}`,
    });
    redis.eval.mockResolvedValue(1);
    redis.scard.mockResolvedValue(0);
    prisma.flashSaleItem.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.releaseOrder({ orderId });

    expect(result).toEqual({ success: true, released: 1 });
    expect(prisma.flashSaleItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { increment: 1 }, sold: { decrement: 1 } },
      }),
    );
  });
});
