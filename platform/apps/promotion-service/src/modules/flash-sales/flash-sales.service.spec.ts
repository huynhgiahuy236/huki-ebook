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
      findFirst: jest.fn(),
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
  const eventBus: any = {
    publish: jest.fn().mockResolvedValue(undefined),
  };
  const service = new FlashSalesService(prisma, redis, eventBus);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
    prisma.flashSale.findMany.mockResolvedValue([]);
    prisma.flashSale.updateMany.mockResolvedValue({ count: 0 });
    prisma.flashSaleItem.findMany.mockResolvedValue([]);
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

  it("rejects creating a campaign that overlaps with an existing platform flash sale", async () => {
    prisma.flashSale.findFirst.mockResolvedValueOnce({
      id: "existing-fs-id",
      name: "Chiến dịch đang chạy",
      startsAt: new Date(Date.now() + 3_600_000),
      endsAt: new Date(Date.now() + 7_200_000),
    });

    await expect(
      service.create({
        name: "Chiến dịch mới trùng giờ",
        registrationStartsAt: new Date(Date.now() + 600_000).toISOString(),
        registrationEndsAt: new Date(Date.now() + 1_800_000).toISOString(),
        startsAt: new Date(Date.now() + 4_000_000).toISOString(),
        endsAt: new Date(Date.now() + 8_000_000).toISOString(),
      }),
    ).rejects.toThrow("trùng lặp");
  });

  it("allows creating a platform campaign when selling windows do not overlap", async () => {
    prisma.flashSale.findFirst.mockResolvedValueOnce(null); // No overlap
    prisma.flashSale.create.mockResolvedValueOnce({
      id: "new-non-overlapping-id",
      name: "Chiến dịch tuần sau",
      status: "SCHEDULED",
    });

    const created = await service.create({
      name: "Chiến dịch tuần sau",
      registrationStartsAt: new Date(Date.now() + 86_400_000).toISOString(),
      registrationEndsAt: new Date(Date.now() + 90_000_000).toISOString(),
      startsAt: new Date(Date.now() + 93_600_000).toISOString(),
      endsAt: new Date(Date.now() + 100_000_000).toISOString(),
    });

    expect(created.name).toBe("Chiến dịch tuần sau");
    expect(prisma.flashSale.create).toHaveBeenCalled();
  });

  it("rejects updating status to PAUSED as pause feature has been removed", async () => {
    prisma.flashSale.findUnique.mockResolvedValueOnce({
      ...campaign,
      status: "ACTIVE",
    });

    await expect(
      service.updateStatus(campaign.id, "PAUSED" as any, "IMMEDIATE" as any),
    ).rejects.toThrow("Tính năng Tạm Dừng đã được gỡ bỏ");
  });

  it("schedules graceful early ending in 5 minutes via endEarly", async () => {
    prisma.flashSale.findUnique.mockResolvedValueOnce({
      ...campaign,
      status: "ACTIVE",
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 3600000),
      items: [
        {
          id: "item-1",
          bookId: "book-1",
          storeId: "store-1",
        },
      ],
    });
    prisma.flashSale.update.mockResolvedValueOnce({
      ...campaign,
      status: "ACTIVE",
      endsAt: new Date(Date.now() + 300000),
    });

    const result = await service.endEarly(campaign.id);
    expect(prisma.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: campaign.id },
        data: expect.objectContaining({
          endsAt: expect.any(Date),
          pauseEffectiveAt: null,
        }),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "flash_sale.early_ending_scheduled",
        payload: expect.objectContaining({
          flashSaleId: campaign.id,
          participatingStoreIds: expect.arrayContaining(["store-1"]),
        }),
      }),
    );
  });

  it("cancels a scheduled or active campaign via cancel", async () => {
    prisma.flashSale.findUnique.mockResolvedValueOnce({
      ...campaign,
      status: "SCHEDULED",
      items: [],
    });
    prisma.flashSale.update.mockResolvedValueOnce({
      ...campaign,
      status: "CANCELLED",
      pauseEffectiveAt: null,
    });

    await service.cancel(campaign.id);

    expect(prisma.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: campaign.id },
        data: expect.objectContaining({
          status: "CANCELLED",
          pauseEffectiveAt: null,
        }),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "flash_sale.cancelled",
        payload: expect.objectContaining({
          flashSaleId: campaign.id,
        }),
      }),
    );
  });

  it("rejects registering a HIDDEN book with a clear status message", async () => {
    await expect(
      service.sellerRegisterItem(
        "store-1",
        {
          flashSaleId: campaign.id,
          bookId: item.bookId,
          salePrice: 80_000,
          stock: 5,
          maxPerUser: 1,
        },
        {
          flashSale: {
            ...campaign,
            scope: "SHOP",
            status: "SCHEDULED",
          },
          book: {
            id: item.bookId,
            title: "Sách Đang Ẩn",
            price: 200_000,
            available: 20,
            status: "HIDDEN",
            storeId: "store-1",
          },
        },
      ),
    ).rejects.toThrow("Đang ẩn");
  });
});
