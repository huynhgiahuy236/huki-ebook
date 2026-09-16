import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import Redis from "ioredis";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateFlashSaleDto,
  CreateFlashSaleItemDto,
  FlashSaleQueryDto,
  FlashSaleItemQueryDto,
  FlashSaleStatus,
  ValidateQuotaDto,
  ReserveFlashSaleDto,
  ReleaseFlashSaleOrderDto,
} from "./dto/flash-sale.dto";
import { throwNotFound, throwBadRequest } from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";

@Injectable()
export class FlashSalesService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(FlashSalesService.name);
  private statusTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @Inject("FLASH_SALE_REDIS") private readonly redis: Redis,
  ) {}

  async onApplicationBootstrap() {
    if (this.redis.status === "wait") {
      await this.redis.connect().catch((error) => {
        this.logger.error(`Redis unavailable for Flash Sale: ${error.message}`);
      });
    }
    await this.seedDefaultCampaignsIfEmpty();
    await this.syncStatuses();
    await this.initializeRedisStock();
    this.statusTimer = setInterval(() => {
      void this.syncStatuses().catch((error) =>
        this.logger.error("Unable to synchronize Flash Sale statuses", error),
      );
    }, 15_000);
    this.statusTimer.unref();
  }

  onModuleDestroy() {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.redis.disconnect();
  }

  async create(dto: CreateFlashSaleDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throwBadRequest(
        ErrorCode.BANNER_INVALID_DATE_RANGE,
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
    }

    const status = this.calculateStatus(startsAt, endsAt);

    return this.prisma.flashSale.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        bannerUrl: dto.bannerUrl ?? null,
        startsAt,
        endsAt,
        status,
      },
    });
  }

  async findAll(query: FlashSaleQueryDto) {
    await this.syncStatuses();
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.flashSale.findMany({
        where,
        orderBy: { startsAt: "asc" },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 50),
        take: query.limit ?? 50,
        include: { items: true },
      }),
      this.prisma.flashSale.count({ where }),
    ]);

    // Recalculate dynamic status based on time
    const mapped = items.map((fs) => ({
      ...fs,
      status: fs.status,
      totalItems: fs.items.length,
      totalStock: fs.items.reduce((sum, item) => sum + item.stock, 0),
      totalSold: fs.items.reduce((sum, item) => sum + item.sold, 0),
    }));

    return {
      items: mapped,
      pagination: {
        page: query.page ?? 1,
        limit: query.limit ?? 50,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 50)),
      },
    };
  }

  async findOne(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    const fs = flashSale!;
    return {
      ...fs,
      status: fs.status,
      items: fs.items.map((item) => this.mapItemView(item, fs)),
    };
  }

  async addItem(dto: CreateFlashSaleItemDto) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id: dto.flashSaleId },
    });
    if (!flashSale)
      throwNotFound(
        ErrorCode.FLASH_SALE_NOT_FOUND,
        "Không tìm thấy phiên Flash Sale",
      );
    const campaign = flashSale!;

    if (dto.salePrice >= dto.originalPrice) {
      throwBadRequest(
        ErrorCode.BOOK_PRICE_INVALID,
        "Giá Flash Sale phải nhỏ hơn giá gốc",
      );
    }

    const book = await this.getCommerceBook(dto.bookId);
    if (!book) {
      throwNotFound(
        ErrorCode.BOOK_NOT_FOUND,
        "Không tìm thấy sách trong kho Commerce",
      );
    }
    const commercePrice = Number(book.price);
    if (dto.salePrice >= commercePrice) {
      throwBadRequest(
        ErrorCode.BOOK_PRICE_INVALID,
        "Giá Flash Sale phải nhỏ hơn giá hiện tại trong Commerce",
      );
    }
    const availableStock = Number(
      book.available ??
        Math.max(0, Number(book.stock || 0) - Number(book.reserved || 0)),
    );
    if (dto.stock > availableStock) {
      throwBadRequest(
        ErrorCode.INVENTORY_INSUFFICIENT,
        `Kho Flash Sale (${dto.stock}) không được vượt tồn khả dụng (${availableStock})`,
      );
    }

    const overlapping = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId: dto.bookId,
        flashSaleId: { not: dto.flashSaleId },
        flashSale: {
          status: { not: FlashSaleStatus.ENDED },
          startsAt: { lt: campaign.endsAt },
          endsAt: { gt: campaign.startsAt },
        },
      },
    });
    if (overlapping) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
        "Sách đã thuộc một phiên Flash Sale có thời gian chồng lấn",
      );
    }

    const existing = await this.prisma.flashSaleItem.findFirst({
      where: { flashSaleId: dto.flashSaleId, bookId: dto.bookId },
    });
    if (existing) {
      const updated = await this.prisma.flashSaleItem.update({
        where: { id: existing.id },
        data: {
          originalPrice: commercePrice,
          salePrice: dto.salePrice,
          stock: dto.stock,
          maxPerUser: dto.maxPerUser ?? 1,
        },
      });
      await this.syncItemStock(updated.id, updated.stock);
      return updated;
    }

    const created = await this.prisma.flashSaleItem.create({
      data: {
        flashSaleId: dto.flashSaleId,
        bookId: dto.bookId,
        originalPrice: commercePrice,
        salePrice: dto.salePrice,
        stock: dto.stock,
        maxPerUser: dto.maxPerUser ?? 1,
        sold: 0,
      },
    });
    await this.syncItemStock(created.id, created.stock);
    return created;
  }

  async findItems(query: FlashSaleItemQueryDto) {
    const where: any = {};
    if (query.flashSaleId) where.flashSaleId = query.flashSaleId;
    if (query.bookId) where.bookId = query.bookId;

    const items = await this.prisma.flashSaleItem.findMany({
      where,
      include: { flashSale: true },
    });

    return items.map((item) => this.mapItemView(item, item.flashSale));
  }

  async getActiveFlashSales() {
    await this.syncStatuses();
    const now = new Date();
    const campaigns = await this.prisma.flashSale.findMany({
      where: {
        status: FlashSaleStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        items: true,
      },
      orderBy: { startsAt: "asc" },
    });

    return campaigns.map((c) => ({
      ...c,
      status: FlashSaleStatus.ACTIVE,
      remainingSeconds: Math.max(
        0,
        Math.floor((c.endsAt.getTime() - now.getTime()) / 1000),
      ),
      items: c.items.map((item) => this.mapItemView(item, c)),
    }));
  }

  async getUpcomingFlashSales() {
    await this.syncStatuses();
    const now = new Date();
    const campaigns = await this.prisma.flashSale.findMany({
      where: {
        status: FlashSaleStatus.SCHEDULED,
        startsAt: { gt: now },
      },
      include: {
        items: true,
      },
      orderBy: { startsAt: "asc" },
    });

    return campaigns.map((c) => ({
      ...c,
      status: FlashSaleStatus.SCHEDULED,
      startsInSeconds: Math.max(
        0,
        Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
      ),
      items: c.items.map((item) => this.mapItemView(item, c)),
    }));
  }

  async getTimeSlots() {
    await this.syncStatuses();
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const allCampaigns = await this.prisma.flashSale.findMany({
      where: {
        startsAt: { lt: endOfDay },
        endsAt: { gte: startOfDay },
      },
      orderBy: { startsAt: "asc" },
      include: { items: true },
    });

    return allCampaigns.map((c) => {
      const status = c.status;
      const remainingSeconds =
        status === FlashSaleStatus.ACTIVE
          ? Math.max(0, Math.floor((c.endsAt.getTime() - now.getTime()) / 1000))
          : status === FlashSaleStatus.SCHEDULED
            ? Math.max(
                0,
                Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
              )
            : 0;

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        bannerUrl: c.bannerUrl,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        status,
        remainingSeconds,
        totalItems: c.items.length,
        items: c.items.map((item) => this.mapItemView(item, c)),
      };
    });
  }

  async getBookFlashSalePrice(bookId: string) {
    await this.syncStatuses();
    const item = await this.findActiveItem(bookId);

    if (!item) return null;

    return this.mapItemView(item, item.flashSale);
  }

  async validateUserQuota(dto: ValidateQuotaDto) {
    await this.syncStatuses();
    const item = await this.findActiveItem(dto.bookId, dto.flashSaleId);

    if (!item) {
      return {
        isFlashSale: false,
        allowed: true,
        reason: "Không có phiên Flash Sale đang hoạt động cho sách này",
      };
    }

    const quotaKey = this.quotaKey(dto.userId, item.flashSaleId, dto.bookId);
    const stockKey = this.stockKey(item.id);
    const [quotaValue, stockValue] = await this.redis.mget(quotaKey, stockKey);
    const currentPurchased = Number(quotaValue || 0);
    const remainingStock =
      stockValue === null ? item.stock : Number(stockValue);
    const requestedQty = dto.quantity ?? 1;
    const maxPerUser = item.maxPerUser ?? 1;

    if (currentPurchased + requestedQty > maxPerUser) {
      return {
        isFlashSale: true,
        allowed: false,
        flashSaleId: item.flashSaleId,
        flashSaleName: item.flashSale.name,
        bookId: dto.bookId,
        maxPerUser,
        currentPurchased,
        requestedQty,
        salePrice: item.salePrice,
        originalPrice: item.originalPrice,
        reason: `Mỗi khách hàng chỉ được mua tối đa ${maxPerUser} cuốn với giá Flash Sale (${item.salePrice.toLocaleString("vi-VN")} đ)!`,
      };
    }

    if (remainingStock < requestedQty) {
      return {
        isFlashSale: true,
        allowed: false,
        reason: "Số lượng sách Flash Sale trong kho đã hết!",
        outOfStock: true,
      };
    }

    return {
      isFlashSale: true,
      allowed: true,
      flashSaleId: item.flashSaleId,
      flashSaleName: item.flashSale.name,
      bookId: dto.bookId,
      maxPerUser,
      currentPurchased,
      salePrice: item.salePrice,
      originalPrice: item.originalPrice,
      remainingQuota: maxPerUser - currentPurchased,
      remainingStock,
    };
  }

  async reserveQuotaAndStock(dto: ReserveFlashSaleDto) {
    await this.syncStatuses();
    const item = await this.findActiveItem(dto.bookId, dto.flashSaleId);
    if (!item) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Phiên Flash Sale đã kết thúc hoặc không còn áp dụng",
      );
    }
    const activeItem = item!;

    const quotaKey = this.quotaKey(
      dto.userId,
      activeItem.flashSaleId,
      dto.bookId,
    );
    const stockKey = this.stockKey(activeItem.id);
    const reservationKey = this.reservationKey(dto.orderId, activeItem.id);
    const indexKey = this.reservationIndexKey(dto.orderId);
    const ttlSeconds = Math.max(
      86_400,
      Math.ceil((activeItem.flashSale.endsAt.getTime() - Date.now()) / 1000) +
        86_400,
    );
    const reservationTtl = 30 * 24 * 60 * 60;

    const result = Number(
      await this.redis.eval(
        `
          if redis.call('EXISTS', KEYS[3]) == 1 then return 2 end
          if redis.call('EXISTS', KEYS[2]) == 0 then
            redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[5])
          end
          local quota = tonumber(redis.call('GET', KEYS[1]) or '0')
          local quantity = tonumber(ARGV[1])
          local maximum = tonumber(ARGV[2])
          local stock = tonumber(redis.call('GET', KEYS[2]) or '0')
          if quota + quantity > maximum then return -1 end
          if stock < quantity then return -2 end
          redis.call('INCRBY', KEYS[1], quantity)
          redis.call('EXPIRE', KEYS[1], ARGV[5])
          redis.call('DECRBY', KEYS[2], quantity)
          redis.call('HSET', KEYS[3],
            'itemId', ARGV[4], 'bookId', ARGV[6], 'campaignId', ARGV[7],
            'userId', ARGV[8], 'quantity', ARGV[1], 'quotaKey', KEYS[1],
            'stockKey', KEYS[2], 'indexKey', KEYS[4])
          redis.call('EXPIRE', KEYS[3], ARGV[9])
          redis.call('SADD', KEYS[4], KEYS[3])
          redis.call('EXPIRE', KEYS[4], ARGV[9])
          return 1
        `,
        4,
        quotaKey,
        stockKey,
        reservationKey,
        indexKey,
        dto.quantity,
        activeItem.maxPerUser,
        activeItem.stock,
        activeItem.id,
        ttlSeconds,
        dto.bookId,
        activeItem.flashSaleId,
        dto.userId,
        reservationTtl,
      ),
    );

    if (result === -1) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
        `Mỗi khách hàng chỉ được mua tối đa ${activeItem.maxPerUser} cuốn với giá Flash Sale`,
      );
    }
    if (result === -2) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_STOCK_EXHAUSTED,
        "Số lượng Flash Sale đã hết",
      );
    }

    if (result === 1) {
      const updated = await this.prisma.flashSaleItem.updateMany({
        where: { id: activeItem.id, stock: { gte: dto.quantity } },
        data: {
          stock: { decrement: dto.quantity },
          sold: { increment: dto.quantity },
        },
      });
      if (!updated.count) {
        await this.releaseReservation(reservationKey, false);
        throwBadRequest(
          ErrorCode.FLASH_SALE_STOCK_EXHAUSTED,
          "Kho Flash Sale vừa hết, vui lòng thử lại",
        );
      }
    }

    return {
      success: true,
      replayed: result === 2,
      isFlashSale: true,
      flashSaleId: activeItem.flashSaleId,
      salePrice: activeItem.salePrice,
    };
  }

  async releaseOrder(dto: ReleaseFlashSaleOrderDto) {
    const indexKey = this.reservationIndexKey(dto.orderId);
    const reservationKeys = await this.redis.smembers(indexKey);
    let released = 0;

    for (const key of reservationKeys) {
      const reservation = await this.redis.hgetall(key);
      if (
        dto.bookIds?.length &&
        (!reservation.bookId || !dto.bookIds.includes(reservation.bookId))
      ) {
        continue;
      }
      released += await this.releaseReservation(key);
    }

    if ((await this.redis.scard(indexKey)) === 0)
      await this.redis.del(indexKey);
    return { success: true, released };
  }

  async hasOrderReservations(orderId: string) {
    return {
      orderId,
      hasReservations:
        (await this.redis.scard(this.reservationIndexKey(orderId))) > 0,
    };
  }

  async updateStatus(id: string, status: FlashSaleStatus) {
    const flashSale = await this.prisma.flashSale.findUnique({ where: { id } });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    const campaign = flashSale!;
    const now = new Date();
    if (
      status === FlashSaleStatus.ACTIVE &&
      (now < campaign.startsAt || now > campaign.endsAt)
    ) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Chỉ có thể kích hoạt chiến dịch trong khung giờ đã cấu hình",
      );
    }
    return this.prisma.flashSale.update({
      where: { id },
      data: { status },
    });
  }

  async updateItemStock(id: string, stock: number) {
    if (!Number.isInteger(stock) || stock < 0) {
      throwBadRequest(
        ErrorCode.VALIDATION_MIN_VALUE,
        "Tồn Flash Sale không hợp lệ",
      );
    }
    const item = await this.prisma.flashSaleItem.findUnique({ where: { id } });
    if (!item) throwNotFound(ErrorCode.FLASH_SALE_ITEM_NOT_FOUND);
    const currentItem = item!;
    const book = await this.getCommerceBook(currentItem.bookId);
    const availableStock = Number(book?.available ?? 0);
    if (book && stock > availableStock) {
      throwBadRequest(
        ErrorCode.INVENTORY_INSUFFICIENT,
        `Kho Flash Sale (${stock}) không được vượt tồn khả dụng (${availableStock})`,
      );
    }
    const updated = await this.prisma.flashSaleItem.update({
      where: { id },
      data: { stock },
    });
    await this.syncItemStock(id, stock, true);
    return updated;
  }

  async delete(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: { select: { id: true, sold: true } } },
    });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    const campaign = flashSale!;
    if (
      campaign.status === FlashSaleStatus.ACTIVE ||
      campaign.items.some((item) => item.sold > 0)
    ) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể xóa chiến dịch đang hoạt động hoặc đã phát sinh giao dịch",
      );
    }

    await this.prisma.flashSaleItem.deleteMany({
      where: { flashSaleId: id },
    });
    const keys = campaign.items.map((item) => this.stockKey(item.id));
    if (keys.length) await this.redis.del(...keys);

    await this.prisma.flashSale.delete({ where: { id } });
    return { success: true };
  }

  private mapItemView(item: any, flashSale?: any) {
    const discount = item.originalPrice - item.salePrice;
    const discountPercent = Math.round((discount / item.originalPrice) * 100);
    const totalAllocated = item.stock + item.sold;
    const soldPercent =
      totalAllocated > 0
        ? Math.min(100, Math.round((item.sold / totalAllocated) * 100))
        : 0;
    const isSoldOut = item.stock <= 0;

    return {
      id: item.id,
      flashSaleId: item.flashSaleId,
      flashSaleName: flashSale?.name ?? "Flash Sale Giờ Vàng",
      bookId: item.bookId,
      originalPrice: item.originalPrice,
      salePrice: item.salePrice,
      discount,
      discountPercent,
      stock: item.stock,
      sold: item.sold,
      totalAllocated,
      soldPercent,
      isSoldOut,
      maxPerUser: item.maxPerUser ?? 1,
      startsAt: flashSale?.startsAt,
      endsAt: flashSale?.endsAt,
    };
  }

  private calculateStatus(startsAt: Date, endsAt: Date): FlashSaleStatus {
    const now = new Date();
    if (now < startsAt) return FlashSaleStatus.SCHEDULED;
    if (now > endsAt) return FlashSaleStatus.ENDED;
    return FlashSaleStatus.ACTIVE;
  }

  private async syncStatuses() {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.flashSale.updateMany({
        where: {
          status: FlashSaleStatus.SCHEDULED,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        data: { status: FlashSaleStatus.ACTIVE },
      }),
      this.prisma.flashSale.updateMany({
        where: {
          status: { in: [FlashSaleStatus.SCHEDULED, FlashSaleStatus.ACTIVE] },
          endsAt: { lt: now },
        },
        data: { status: FlashSaleStatus.ENDED },
      }),
    ]);
  }

  private async findActiveItem(bookId: string, flashSaleId?: string) {
    const now = new Date();
    return this.prisma.flashSaleItem.findFirst({
      where: {
        bookId,
        ...(flashSaleId && { flashSaleId }),
        flashSale: {
          status: FlashSaleStatus.ACTIVE,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        stock: { gt: 0 },
      },
      include: { flashSale: true },
      orderBy: [{ salePrice: "asc" }, { createdAt: "asc" }],
    });
  }

  private quotaKey(userId: string, campaignId: string, bookId: string) {
    return `quota:user:${userId}:${campaignId}:${bookId}`;
  }

  private stockKey(itemId: string) {
    return `flash:stock:${itemId}`;
  }

  private reservationKey(orderId: string, itemId: string) {
    return `flash:reservation:${orderId}:${itemId}`;
  }

  private reservationIndexKey(orderId: string) {
    return `flash:reservation:index:${orderId}`;
  }

  private async syncItemStock(
    itemId: string,
    stock: number,
    overwrite = false,
  ) {
    const key = this.stockKey(itemId);
    if (overwrite) {
      await this.redis.set(key, stock);
    } else {
      await this.redis.set(key, stock, "NX");
    }
  }

  private async initializeRedisStock() {
    const items = await this.prisma.flashSaleItem.findMany({
      where: { flashSale: { status: { not: FlashSaleStatus.ENDED } } },
      select: { id: true, stock: true },
    });
    await Promise.all(
      items.map((item) => this.syncItemStock(item.id, item.stock)),
    );
  }

  private async releaseReservation(reservationKey: string, restoreDb = true) {
    const reservation = await this.redis.hgetall(reservationKey);
    if (!reservation.itemId || !reservation.quantity) return 0;

    const quantity = Number(reservation.quantity);
    const released = Number(
      await this.redis.eval(
        `
          if redis.call('EXISTS', KEYS[3]) == 0 then return 0 end
          local quantity = tonumber(ARGV[1])
          local quota = tonumber(redis.call('GET', KEYS[1]) or '0')
          if quota <= quantity then
            redis.call('DEL', KEYS[1])
          else
            redis.call('DECRBY', KEYS[1], quantity)
          end
          redis.call('INCRBY', KEYS[2], quantity)
          redis.call('DEL', KEYS[3])
          redis.call('SREM', KEYS[4], KEYS[3])
          return 1
        `,
        4,
        reservation.quotaKey,
        reservation.stockKey,
        reservationKey,
        reservation.indexKey,
        quantity,
      ),
    );

    if (released && restoreDb) {
      await this.prisma.flashSaleItem.updateMany({
        where: { id: reservation.itemId, sold: { gte: quantity } },
        data: {
          stock: { increment: quantity },
          sold: { decrement: quantity },
        },
      });
    }
    return released;
  }

  private async getCommerceBook(bookId: string) {
    try {
      const baseUrl =
        process.env.COMMERCE_SERVICE_URL ||
        `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 3003}`;
      const response = await fetch(`${baseUrl}/api/v1/books/${bookId}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as any;
      return body.data || body;
    } catch (error: any) {
      this.logger.warn(
        `Could not validate commerce stock for ${bookId}: ${error.message}`,
      );
      return null;
    }
  }

  private async getCommerceBooks() {
    try {
      const baseUrl =
        process.env.COMMERCE_SERVICE_URL ||
        `http://localhost:${process.env.COMMERCE_SERVICE_PORT || 3003}`;
      const response = await fetch(`${baseUrl}/api/v1/books?limit=20`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return [];
      const body = (await response.json()) as any;
      const books = body.data || body;
      return Array.isArray(books) ? books : [];
    } catch (error: any) {
      this.logger.warn(
        `Could not load Commerce books for Flash Sale seed: ${error.message}`,
      );
      return [];
    }
  }

  private async seedDefaultCampaignsIfEmpty() {
    try {
      const count = await this.prisma.flashSale.count();
      if (count > 0) return;

      const catalogBooks = (await this.getCommerceBooks())
        .filter((book: any) => Number(book.available ?? 0) > 0)
        .slice(0, 5);
      if (!catalogBooks.length) {
        this.logger.warn(
          "Skipping Flash Sale seed because Commerce has no available books",
        );
        return;
      }

      this.logger.log(
        "Seeding initial Flash Sale campaigns from Commerce catalog...",
      );
      const now = new Date();

      // Session 1: Active now (starts 1h ago, ends in 3h)
      const activeStart = new Date(now.getTime() - 60 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      // Session 2: Upcoming later today (starts in 4h, ends in 7h)
      const upStart = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const upEnd = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      // Session 3: Evening session (starts in 8h, ends in 12h)
      const eveStart = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const eveEnd = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      const s1 = await this.prisma.flashSale.create({
        data: {
          name: "Flash Sale Trưa Rực Rỡ 12H - 15H 🔥",
          description: "Giảm giá sốc đến 70% các tựa sách bán chạy nhất",
          startsAt: activeStart,
          endsAt: activeEnd,
          status: FlashSaleStatus.ACTIVE,
        },
      });

      const s2 = await this.prisma.flashSale.create({
        data: {
          name: "Flash Sale Chiều Hoàng Kim 16H - 19H ⚡",
          description: "Deal vàng sách công nghệ và kinh tế độc quyền",
          startsAt: upStart,
          endsAt: upEnd,
          status: FlashSaleStatus.SCHEDULED,
        },
      });

      const s3 = await this.prisma.flashSale.create({
        data: {
          name: "Flash Sale Đêm Săn Deal 20H - 24H 🌙",
          description: "Cú đêm săn sách văn học và kỹ năng sống",
          startsAt: eveStart,
          endsAt: eveEnd,
          status: FlashSaleStatus.SCHEDULED,
        },
      });

      for (const book of catalogBooks) {
        const originalPrice = Number(book.price);
        const allocatedStock = Math.max(
          1,
          Math.min(10, Number(book.available)),
        );
        await this.prisma.flashSaleItem.create({
          data: {
            flashSaleId: s1.id,
            bookId: book.id,
            originalPrice,
            salePrice: Math.max(1, Math.round(originalPrice * 0.4)),
            stock: allocatedStock,
            sold: 0,
            maxPerUser: 1,
          },
        });
        await this.prisma.flashSaleItem.create({
          data: {
            flashSaleId: s2.id,
            bookId: book.id,
            originalPrice,
            salePrice: Math.max(1, Math.round(originalPrice * 0.5)),
            stock: allocatedStock,
            sold: 0,
            maxPerUser: 1,
          },
        });
        await this.prisma.flashSaleItem.create({
          data: {
            flashSaleId: s3.id,
            bookId: book.id,
            originalPrice,
            salePrice: Math.max(1, Math.round(originalPrice * 0.45)),
            stock: allocatedStock,
            sold: 0,
            maxPerUser: 1,
          },
        });
      }

      this.logger.log("Seeded Flash Sale campaigns successfully");
    } catch (err: any) {
      this.logger.warn(`Could not seed flash sales: ${err?.message}`);
    }
  }
}
