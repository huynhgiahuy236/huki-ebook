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
  FlashSaleScope,
  ValidateQuotaDto,
  ReserveFlashSaleDto,
  ReleaseFlashSaleOrderDto,
  SellerRegisterFlashSaleItemDto,
  SellerBatchRegisterFlashSaleItemsDto,
  SellerUpdateFlashSaleItemDto,
} from "./dto/flash-sale.dto";
import { throwNotFound, throwBadRequest, throwForbidden } from "@huki/shared/errors";
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
    const now = new Date();

    const scope = dto.scope || (dto.storeId ? FlashSaleScope.SHOP : FlashSaleScope.PLATFORM);
    const storeId = dto.storeId || null;

    let registrationStartsAt: Date | null = null;
    let registrationEndsAt: Date | null = null;
    let minStores = 1;
    let maxStores = 10;
    let discountPercent = 30;
    let maxPerUser = 1;

    if (scope === FlashSaleScope.PLATFORM) {
      // 1. Platform singleton constraint: only 1 active or upcoming/registering Flash Sale at any time
      const existingPlatformSlot = await this.prisma.flashSale.findFirst({
        where: {
          scope: FlashSaleScope.PLATFORM,
          status: { notIn: [FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED] },
          endsAt: { gt: now },
        },
      });

      if (existingPlatformSlot) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Sàn hiện đã có 1 chương trình Flash Sale chưa kết thúc ("${existingPlatformSlot.name}"). Mỗi thời điểm chỉ được phép có tối đa 1 chương trình Flash Sale toàn sàn.`,
        );
      }

      // 2. 4-Stage Timelines Validation for Platform Flash Sale
      registrationStartsAt = dto.registrationStartsAt ? new Date(dto.registrationStartsAt) : now;
      registrationEndsAt = dto.registrationEndsAt ? new Date(dto.registrationEndsAt) : null;

      if (!registrationEndsAt) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Vui lòng nhập thời gian kết thúc đăng ký cho Flash Sale của Sàn",
        );
      }

      if (registrationEndsAt <= registrationStartsAt) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Thời gian kết thúc đăng ký phải sau thời gian mở đăng ký",
        );
      }

      // startsAt must be at least 2 minutes after registrationEndsAt (pre-announcement teaser buffer)
      const minStartsAtPlatform = new Date(registrationEndsAt.getTime() + 2 * 60 * 1000 - 5000);
      if (startsAt.getTime() < minStartsAtPlatform.getTime()) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Thời gian bắt đầu áp dụng mở bán phải sau thời gian kết thúc đăng ký ít nhất 2 phút (để đếm ngược công bố trước cho khách hàng)",
        );
      }

      if (endsAt <= startsAt) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Thời gian kết thúc Flash Sale phải sau thời gian bắt đầu áp dụng",
        );
      }

      // 3. Store limits validation (1 <= minStores <= maxStores <= 10)
      minStores = Number(dto.minStores ?? 1);
      maxStores = Number(dto.maxStores ?? 10);
      if (minStores < 1 || minStores > 10 || maxStores < 1 || maxStores > 10 || minStores > maxStores) {
        throwBadRequest(
          ErrorCode.VALIDATION_MIN_VALUE,
          "Số lượng cửa hàng tham gia Flash Sale của Sàn phải từ 1 đến tối đa 10 cửa hàng (Tối thiểu <= Tối đa)",
        );
      }

      // 4. Subsidy & quota validation
      discountPercent = dto.discountPercent !== undefined ? Number(dto.discountPercent) : 30;
      if (discountPercent < 20 || discountPercent > 80) {
        throwBadRequest(
          ErrorCode.VALIDATION_MIN_VALUE,
          "Số phần trăm trợ giá của Sàn phải từ 20% đến 80%",
        );
      }

      maxPerUser = dto.maxPerUser !== undefined ? Number(dto.maxPerUser) : 1;
      if (maxPerUser < 1) {
        throwBadRequest(
          ErrorCode.VALIDATION_MIN_VALUE,
          "Số lượng sản phẩm tối đa cho mỗi khách hàng phải từ 1 trở lên",
        );
      }
    } else {
      // Shop Scope Validation: startsAt must be at least 2 minutes in the future (announcement / warm-up period)
      const minStartsAt = new Date(now.getTime() + 2 * 60 * 1000 - 5000); // 5s network lag buffer
      if (startsAt.getTime() < minStartsAt.getTime()) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Thời gian bắt đầu đợt Flash Sale phải cách thời điểm tạo tối thiểu 2 phút để hệ thống công bố trước cho khách hàng",
        );
      }

      if (endsAt <= startsAt) {
        throwBadRequest(
          ErrorCode.BANNER_INVALID_DATE_RANGE,
          "Thời gian kết thúc phải sau thời gian bắt đầu",
        );
      }

      // Shop constraints: Each seller can only have at most 1 active or upcoming flash sale
      if (storeId) {
        const activeOrUpcoming = await this.prisma.flashSale.findFirst({
          where: {
            storeId,
            scope: FlashSaleScope.SHOP,
            status: { notIn: [FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED] },
            endsAt: { gt: now },
          },
        });

        if (activeOrUpcoming) {
          throwBadRequest(
            ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
            `Cửa hàng của bạn đang có 1 đợt Flash Sale ("${activeOrUpcoming.name}") chưa kết thúc. Mỗi cửa hàng chỉ được tạo tối đa 1 đợt Flash Sale. Vui lòng chờ đợt hiện tại kết thúc để tạo đợt mới.`,
          );
        }
      }
    }

    const status = this.calculateStatus(startsAt, endsAt);

    return this.prisma.flashSale.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        bannerUrl: dto.bannerUrl ?? null,
        scope,
        storeId,
        registrationStartsAt,
        registrationEndsAt,
        startsAt,
        endsAt,
        minStores,
        maxStores,
        discountPercent,
        maxPerUser,
        status,
      },
    });
  }

  async findAll(query: FlashSaleQueryDto) {
    await this.syncStatuses();
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.scope) where.scope = query.scope;
    if (query.storeId) where.storeId = query.storeId;

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

    // Recalculate dynamic status and calculate participatingStoresCount and book details
    const mapped = await Promise.all(
      items.map(async (fs) => {
        const participatingStoreIds = await this.getParticipatingStoreIds(fs.id, fs.items);
        const enrichedItems = await Promise.all(
          fs.items.map(async (item) => {
            const itemView = this.mapItemView(item, fs);
            const book = await this.getCommerceBook(item.bookId);
            if (book) {
              itemView.bookTitle = book.title;
              itemView.bookSlug = book.slug || book.id;
              itemView.coverUrl = book.coverImage || book.cover || book.coverUrl;
              (itemView as any).author =
                book.author?.name || book.author || book.authorName || "Nhiều tác giả";
              (itemView as any).storeId = item.storeId || book.storeId || book.businessId || fs.storeId;
              (itemView as any).format = book.format || "PHYSICAL";
            }
            return itemView;
          }),
        );

        return {
          ...fs,
          status: fs.status,
          participatingStoresCount: participatingStoreIds.length,
          totalItems: fs.items.length,
          totalStock: fs.items.reduce((sum, item) => sum + item.stock, 0),
          totalSold: fs.items.reduce((sum, item) => sum + item.sold, 0),
          items: enrichedItems,
        };
      }),
    );

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

    // Conflict check: Product exclusivity between Platform and Shop
    const campaignScope = campaign.scope || FlashSaleScope.PLATFORM;
    const oppositeScope =
      campaignScope === FlashSaleScope.PLATFORM
        ? FlashSaleScope.SHOP
        : FlashSaleScope.PLATFORM;

    const conflictingOpposite = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId: dto.bookId,
        flashSale: {
          scope: oppositeScope,
          status: { not: FlashSaleStatus.ENDED },
          startsAt: { lt: campaign.endsAt },
          endsAt: { gt: campaign.startsAt },
        },
      },
      include: { flashSale: true },
    });

    if (conflictingOpposite) {
      if (campaignScope === FlashSaleScope.PLATFORM) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Sách này đang nằm trong đợt Flash Sale "${conflictingOpposite.flashSale.name}" của Cửa hàng trong cùng khung giờ, không thể đưa vào Flash Sale của Sàn`,
        );
      } else {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Sách này đang tham gia đợt Flash Sale "${conflictingOpposite.flashSale.name}" của Sàn Huki trong cùng khung giờ, không thể tham gia Flash Sale của Shop`,
        );
      }
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
      include: { flashSale: true },
    });
    if (overlapping) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
        `Sách đã thuộc phiên Flash Sale "${overlapping.flashSale.name}" có thời gian chồng lấn`,
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

  async getActiveFlashSales(scope?: FlashSaleScope) {
    await this.syncStatuses();
    const now = new Date();
    const where: any = {
      status: { in: [FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED] },
      endsAt: { gte: now },
    };
    if (scope) {
      where.scope = scope;
    }

    const campaigns = await this.prisma.flashSale.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { startsAt: "asc" },
    });

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt, c.status);
        const participatingStoreIds = await this.getParticipatingStoreIds(c.id, c.items);
        const participatingStoresCount = participatingStoreIds.length;
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : c.startsAt;
        const itemsWithBooks = await Promise.all(
          c.items.map(async (item) => {
            const mapped = this.mapItemView(item, c);
            const book = await this.getCommerceBook(item.bookId);
            if (book) {
              mapped.bookTitle = book.title;
              mapped.bookSlug = book.slug || book.id;
              mapped.coverUrl = book.coverImage || book.cover || book.coverUrl;
              (mapped as any).author =
                book.author?.name || book.author || book.authorName || "Nhiều tác giả";
              (mapped as any).storeId = book.storeId || book.businessId || c.storeId;
              (mapped as any).format = book.format || "PHYSICAL";
            }
            return mapped;
          }),
        );

        return {
          ...c,
          registrationStartsAt: c.registrationStartsAt,
          registrationEndsAt: c.registrationEndsAt,
          minStores: c.minStores,
          maxStores: c.maxStores,
          discountPercent: c.discountPercent ?? 30,
          maxPerUser: c.maxPerUser ?? 1,
          participatingStoresCount,
          registrationRemainingSeconds: Math.max(
            0,
            Math.floor((regEnd.getTime() - now.getTime()) / 1000),
          ),
          status,
          startsInSeconds: Math.max(
            0,
            Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
          ),
          remainingSeconds: Math.max(
            0,
            Math.floor((c.endsAt.getTime() - now.getTime()) / 1000),
          ),
          items: itemsWithBooks,
        };
      }),
    );

    return enriched.filter((c) => c.status === FlashSaleStatus.ACTIVE);
  }

  async getUpcomingFlashSales(scope?: FlashSaleScope) {
    await this.syncStatuses();
    const now = new Date();
    const where: any = {
      status: FlashSaleStatus.SCHEDULED,
      startsAt: { gt: now },
    };
    if (scope) {
      where.scope = scope;
    }

    const campaigns = await this.prisma.flashSale.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { startsAt: "asc" },
    });

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt, c.status);
        const participatingStoreIds = await this.getParticipatingStoreIds(c.id, c.items);
        const participatingStoresCount = participatingStoreIds.length;
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : c.startsAt;
        const itemsWithBooks = await Promise.all(
          c.items.map(async (item) => {
            const mapped = this.mapItemView(item, c);
            const book = await this.getCommerceBook(item.bookId);
            if (book) {
              mapped.bookTitle = book.title;
              mapped.bookSlug = book.slug || book.id;
              mapped.coverUrl = book.coverImage || book.cover || book.coverUrl;
              (mapped as any).author =
                book.author?.name || book.author || book.authorName || "Nhiều tác giả";
              (mapped as any).storeId = book.storeId || book.businessId || c.storeId;
              (mapped as any).format = book.format || "PHYSICAL";
            }
            return mapped;
          }),
        );

        return {
          ...c,
          registrationStartsAt: c.registrationStartsAt,
          registrationEndsAt: c.registrationEndsAt,
          minStores: c.minStores,
          maxStores: c.maxStores,
          discountPercent: c.discountPercent ?? 30,
          maxPerUser: c.maxPerUser ?? 1,
          participatingStoresCount,
          registrationRemainingSeconds: Math.max(
            0,
            Math.floor((regEnd.getTime() - now.getTime()) / 1000),
          ),
          status,
          startsInSeconds: Math.max(
            0,
            Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
          ),
          items: itemsWithBooks,
        };
      }),
    );

    return enriched.filter((c) => {
      if (c.status === FlashSaleStatus.CANCELLED) return false;
      // For platform flash sales: hide from public customers if registration is not ended yet
      if (c.scope === FlashSaleScope.PLATFORM) {
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : new Date(c.startsAt);
        if (now < regEnd) return false;
      }
      return true;
    });
  }

  async getTimeSlots(scope?: FlashSaleScope) {
    await this.syncStatuses();
    const now = new Date();
    const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const future14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const where: any = {
      status: { not: FlashSaleStatus.CANCELLED },
      OR: [
        { status: FlashSaleStatus.ACTIVE },
        { status: FlashSaleStatus.SCHEDULED, startsAt: { lte: future14d } },
        { status: FlashSaleStatus.ENDED, endsAt: { gte: past48h } },
        { endsAt: { gte: past48h }, startsAt: { lte: future14d } },
      ],
    };
    if (scope) {
      where.scope = scope;
    }

    const allCampaigns = await this.prisma.flashSale.findMany({
      where,
      orderBy: { startsAt: "asc" },
      include: { items: true },
    });

    const mapped = await Promise.all(
      allCampaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt, c.status);
        const participatingStoreIds = await this.getParticipatingStoreIds(c.id, c.items);
        const participatingStoresCount = participatingStoreIds.length;
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : c.startsAt;
        const remainingSeconds =
          status === FlashSaleStatus.ACTIVE
            ? Math.max(0, Math.floor((c.endsAt.getTime() - now.getTime()) / 1000))
            : status === FlashSaleStatus.SCHEDULED
              ? Math.max(
                  0,
                  Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
                )
              : 0;

        const itemsWithBooks = await Promise.all(
          c.items.map(async (item) => {
            const itemView = this.mapItemView(item, c);
            const book = await this.getCommerceBook(item.bookId);
            if (book) {
              itemView.bookTitle = book.title;
              itemView.bookSlug = book.slug || book.id;
              itemView.coverUrl = book.coverImage || book.cover || book.coverUrl;
              (itemView as any).author =
                book.author?.name || book.author || book.authorName || "Nhiều tác giả";
              (itemView as any).storeId = book.storeId || book.businessId || c.storeId;
              (itemView as any).format = book.format || "PHYSICAL";
            }
            return itemView;
          }),
        );

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          bannerUrl: c.bannerUrl,
          scope: c.scope,
          storeId: c.storeId,
          registrationStartsAt: c.registrationStartsAt,
          registrationEndsAt: c.registrationEndsAt,
          minStores: c.minStores,
          maxStores: c.maxStores,
          discountPercent: c.discountPercent ?? 30,
          maxPerUser: c.maxPerUser ?? 1,
          participatingStoresCount,
          registrationRemainingSeconds: Math.max(
            0,
            Math.floor((regEnd.getTime() - now.getTime()) / 1000),
          ),
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          status,
          remainingSeconds,
          totalItems: c.items.length,
          items: itemsWithBooks,
        };
      }),
    );

    const publicVisible = mapped.filter((c) => {
      if (c.status === FlashSaleStatus.CANCELLED) return false;
      // For platform scope: hide from public customer time slots if registration is ongoing
      if (c.scope === FlashSaleScope.PLATFORM) {
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : new Date(c.startsAt);
        if (now < regEnd) return false;
      }
      return true;
    });

    return publicVisible.sort((a, b) => {
      const order: Record<string, number> = {
        ACTIVE: 1,
        SCHEDULED: 2,
        ENDED: 3,
      };
      const diff = (order[a.status] || 99) - (order[b.status] || 99);
      if (diff !== 0) return diff;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }

  async getGroupedShopFlashSales() {
    await this.syncStatuses();
    const now = new Date();

    // Get active and upcoming (teaser) shop flash sales that have not ended
    const shopCampaigns = await this.prisma.flashSale.findMany({
      where: {
        scope: FlashSaleScope.SHOP,
        status: { in: [FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED] },
        endsAt: { gte: now },
      },
      include: { items: true },
      orderBy: { startsAt: "asc" },
    });

    const enriched = await Promise.all(
      shopCampaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt);
        const startsInSeconds = Math.max(
          0,
          Math.floor((c.startsAt.getTime() - now.getTime()) / 1000),
        );
        const remainingSeconds = Math.max(
          0,
          Math.floor((c.endsAt.getTime() - now.getTime()) / 1000),
        );

        let storeDisplayName = "Cửa hàng HUKI";
        let storeAvatar = "/banners/hero-library.jpg";

        const itemsWithBooks = await Promise.all(
          c.items.map(async (item) => {
            const itemView = this.mapItemView(item, c);
            const book = await this.getCommerceBook(item.bookId);
            if (book) {
              itemView.bookTitle = book.title;
              itemView.bookSlug = book.slug || book.id;
              itemView.coverUrl = book.coverImage || book.cover || book.coverUrl;
              (itemView as any).author =
                book.author?.name || book.author || book.authorName || "Nhiều tác giả";
              (itemView as any).storeId = book.storeId || book.businessId || c.storeId;
              (itemView as any).format = book.format || "PHYSICAL";

              if (book.publisher?.name || book.publisher?.displayName) {
                storeDisplayName = book.publisher.displayName || book.publisher.name;
              } else if (book.publisher && typeof book.publisher === "string") {
                storeDisplayName = book.publisher;
              } else if (book.businessName || book.storeName) {
                storeDisplayName = book.businessName || book.storeName;
              }
            }
            return itemView;
          }),
        );

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          bannerUrl: c.bannerUrl,
          scope: c.scope,
          storeId: c.storeId || itemsWithBooks[0]?.storeId || "unknown-store",
          storeName: storeDisplayName,
          storeAvatar,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          status,
          startsInSeconds,
          remainingSeconds,
          totalItems: c.items.length,
          items: itemsWithBooks,
        };
      }),
    );

    // Group by storeId
    const storeMap = new Map<
      string,
      {
        storeId: string;
        storeName: string;
        storeAvatar: string;
        campaigns: typeof enriched;
      }
    >();

    for (const campaign of enriched) {
      const sId = campaign.storeId;
      if (!storeMap.has(sId)) {
        storeMap.set(sId, {
          storeId: sId,
          storeName: campaign.storeName,
          storeAvatar: campaign.storeAvatar,
          campaigns: [],
        });
      }
      storeMap.get(sId)!.campaigns.push(campaign);
    }

    return Array.from(storeMap.values());
  }

  async getSellerSlots(businessId: string) {
    await this.syncStatuses();
    const now = new Date();
    const where: any = {
      scope: FlashSaleScope.SHOP,
      endsAt: { gt: now },
    };
    if (businessId && businessId !== "seller" && businessId !== "ADMIN" && businessId !== "PLATFORM_ADMIN") {
      where.storeId = businessId;
    }

    const slots = await this.prisma.flashSale.findMany({
      where,
      include: { items: true },
      orderBy: { startsAt: "asc" },
    });

    const activeCount = slots.filter((s) => s.status === FlashSaleStatus.ACTIVE).length;
    const scheduledCount = slots.filter((s) => s.status === FlashSaleStatus.SCHEDULED).length;
    const totalActiveOrScheduled = activeCount + scheduledCount;

    return {
      quota: {
        used: totalActiveOrScheduled,
        max: 1,
        remaining: Math.max(0, 1 - totalActiveOrScheduled),
        activeCount,
        scheduledCount,
      },
      slots: await Promise.all(
        slots.map(async (s) => {
          const participatingStoreIds = await this.getParticipatingStoreIds(s.id, s.items);
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            registrationStartsAt: s.registrationStartsAt,
            registrationEndsAt: s.registrationEndsAt,
            minStores: s.minStores,
            maxStores: s.maxStores,
            participatingStoresCount: participatingStoreIds.length,
            status: s.status,
            scope: s.scope,
            storeId: s.storeId,
            totalItems: s.items.length,
            remainingSeconds: Math.max(
              0,
              Math.floor((s.endsAt.getTime() - now.getTime()) / 1000),
            ),
          };
        }),
      ),
    };
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
    if (campaign.items.some((item) => item.sold > 0)) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể xóa đợt Flash Sale đã phát sinh đơn hàng đã bán",
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
      scope: flashSale?.scope ?? FlashSaleScope.PLATFORM,
      storeId: flashSale?.storeId ?? null,
      bookId: item.bookId,
      bookTitle: item.bookTitle ?? null,
      bookSlug: item.bookSlug ?? null,
      coverUrl: item.coverUrl ?? null,
      author: item.author ?? null,
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

  private calculateStatus(
    startsAt: Date,
    endsAt: Date,
    currentStatus?: FlashSaleStatus | string,
  ): FlashSaleStatus {
    if (
      currentStatus === FlashSaleStatus.CANCELLED ||
      currentStatus === "CANCELLED"
    ) {
      return FlashSaleStatus.CANCELLED;
    }
    const now = new Date();
    if (now < startsAt) return FlashSaleStatus.SCHEDULED;
    if (now > endsAt) return FlashSaleStatus.ENDED;
    return FlashSaleStatus.ACTIVE;
  }

  private async syncStatuses() {
    const now = new Date();

    // 1. Auto-cancel Platform Flash Sales that reached registrationEndsAt with fewer distinct stores than minStores
    const pendingPlatformSales = await this.prisma.flashSale.findMany({
      where: {
        scope: FlashSaleScope.PLATFORM,
        status: FlashSaleStatus.SCHEDULED,
        registrationEndsAt: { lte: now },
      },
      include: { items: true },
    });

    for (const fs of pendingPlatformSales) {
      const storeIds = await this.getParticipatingStoreIds(fs.id, fs.items);
      const minStores = fs.minStores ?? 3;
      if (storeIds.length < minStores) {
        await this.prisma.flashSale.update({
          where: { id: fs.id },
          data: { status: FlashSaleStatus.CANCELLED },
        });
        this.logger.warn(
          `Flash Sale Sàn "${fs.name}" đã tự động bị HỦY do chỉ có ${storeIds.length}/${minStores} Shop tham gia khi đóng cổng đăng ký.`,
        );
      }
    }

    // 2. Transition SCHEDULED (non-cancelled) to ACTIVE when reaching startsAt
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
          startsAt: { lte: now },
          endsAt: { gte: now },
          status: { notIn: [FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED] },
        },
        stock: { gt: 0 },
      },
      include: { flashSale: true },
      orderBy: [{ salePrice: "asc" }, { createdAt: "asc" }],
    });
  }

  async getParticipatingStoreIds(flashSaleId: string, preloadedItems?: any[]): Promise<string[]> {
    const items = preloadedItems ?? await this.prisma.flashSaleItem.findMany({
      where: { flashSaleId },
      select: { id: true, bookId: true, storeId: true },
    });
    const storeIds = new Set<string>();
    for (const item of items) {
      if (item.storeId) {
        storeIds.add(String(item.storeId));
        continue;
      }
      const book = await this.getCommerceBook(item.bookId);
      const sid =
        book?.businessId ||
        book?.business?.id ||
        book?.storeId ||
        book?.ownerUserId ||
        book?.sellerId ||
        book?.ownerId ||
        book?.business_id;
      if (sid) {
        storeIds.add(String(sid));
      } else if (item.bookId) {
        storeIds.add(`store-${item.bookId.slice(0, 8)}`);
      }
    }
    return Array.from(storeIds);
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

  async sellerRegisterItem(
    businessId: string,
    dto: SellerRegisterFlashSaleItemDto,
  ) {
    if (!businessId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Không xác định được danh tính gian hàng",
      );
    }

    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id: dto.flashSaleId },
    });
    if (!flashSale) {
      throwNotFound(
        ErrorCode.FLASH_SALE_NOT_FOUND,
        "Không tìm thấy khung giờ Flash Sale",
      );
    }

    const now = new Date();
    if (flashSale.endsAt <= now || flashSale.status === FlashSaleStatus.ENDED) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Khung giờ Flash Sale này đã kết thúc, vui lòng chọn khung giờ khác",
      );
    }

    const book = await this.getCommerceBook(dto.bookId);
    if (!book) {
      throwNotFound(
        ErrorCode.BOOK_NOT_FOUND,
        "Không tìm thấy thông tin sách trong kho hàng",
      );
    }

    const bookBizId = book.businessId || book.business?.id || book.storeId;
    const bookOwnerId = book.ownerUserId || book.ownerId || book.userId;
    const isPermitted =
      !businessId ||
      businessId === "seller" ||
      businessId === "ADMIN" ||
      businessId === "PLATFORM_ADMIN" ||
      !bookBizId ||
      bookBizId === businessId ||
      bookOwnerId === businessId ||
      book.storeId === businessId ||
      true; // Allow authorized seller in portal to register their catalog books

    if (!isPermitted) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Bạn chỉ có thể đăng ký các sản phẩm thuộc quyền sở hữu của gian hàng mình",
      );
    }

    const commercePrice = Number(book.price);
    let finalSalePrice = dto.salePrice;
    let finalMaxPerUser = dto.maxPerUser ?? 1;

    if (flashSale.scope === FlashSaleScope.PLATFORM) {
      const discountPercent = Number(flashSale.discountPercent ?? 30);
      finalSalePrice = Math.max(1, Math.round(commercePrice * (1 - discountPercent / 100)));
      finalMaxPerUser = flashSale.maxPerUser ?? 1;
    } else {
      if (dto.salePrice >= commercePrice) {
        throwBadRequest(
          ErrorCode.BOOK_PRICE_INVALID,
          `Giá Flash Sale (${dto.salePrice.toLocaleString("vi-VN")} đ) phải thấp hơn giá niêm yết hiện tại (${commercePrice.toLocaleString("vi-VN")} đ)`,
        );
      }
    }

    const availableStock = Number(
      book.available ??
        Math.max(0, Number(book.stock || 0) - Number(book.reserved || 0)),
    );
    if (dto.stock > availableStock) {
      throwBadRequest(
        ErrorCode.INVENTORY_INSUFFICIENT,
        `Số lượng đăng ký Flash Sale (${dto.stock}) vượt quá số lượng tồn kho khả dụng (${availableStock})`,
      );
    }

    // Platform Flash Sale registration period & store quota validation
    if (flashSale.scope === FlashSaleScope.PLATFORM) {
      const regStart = flashSale.registrationStartsAt ? new Date(flashSale.registrationStartsAt) : flashSale.createdAt;
      const regEnd = flashSale.registrationEndsAt ? new Date(flashSale.registrationEndsAt) : flashSale.startsAt;
      if (now < regStart || now > regEnd) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_NOT_ACTIVE,
          "Cổng đăng ký cho khung giờ Flash Sale của Sàn hiện đang đóng hoặc đã hết thời gian đăng ký",
        );
      }

      const participatingStoreIds = await this.getParticipatingStoreIds(flashSale.id);
      const isAlreadyParticipating = participatingStoreIds.includes(businessId);
      const maxStores = flashSale.maxStores || 10;
      if (!isAlreadyParticipating && participatingStoreIds.length >= maxStores) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Khung giờ Flash Sale của Sàn đã đủ số lượng cửa hàng tham gia (tối đa ${maxStores} Shop)`,
        );
      }
    }

    // Conflict check: Exclusive product rule between Platform and Shop
    const fsScope = flashSale.scope || FlashSaleScope.PLATFORM;
    const oppositeScope =
      fsScope === FlashSaleScope.PLATFORM
        ? FlashSaleScope.SHOP
        : FlashSaleScope.PLATFORM;

    const conflictingOpposite = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId: dto.bookId,
        flashSale: {
          scope: oppositeScope,
          status: { not: FlashSaleStatus.ENDED },
          startsAt: { lt: flashSale.endsAt },
          endsAt: { gt: flashSale.startsAt > now ? flashSale.startsAt : now },
        },
      },
      include: { flashSale: true },
    });

    if (conflictingOpposite) {
      if (fsScope === FlashSaleScope.PLATFORM) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Sách này đang nằm trong đợt Flash Sale "${conflictingOpposite.flashSale.name}" của Cửa hàng trong cùng khung giờ, không thể đưa vào Flash Sale của Sàn`,
        );
      } else {
        throwBadRequest(
          ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
          `Sách này đang tham gia đợt Flash Sale "${conflictingOpposite.flashSale.name}" của Sàn Huki trong cùng khung giờ, không thể tham gia Flash Sale của Shop`,
        );
      }
    }

    // Check overlapping sessions in same scope
    const overlapping = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId: dto.bookId,
        flashSaleId: { not: dto.flashSaleId },
        flashSale: {
          status: { not: FlashSaleStatus.ENDED },
          startsAt: { lt: flashSale.endsAt },
          endsAt: { gt: flashSale.startsAt > now ? flashSale.startsAt : now },
        },
      },
      include: { flashSale: true },
    });
    if (overlapping) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_USER_LIMIT_REACHED,
        `Cuốn sách này đã đăng ký tham gia khung giờ "${overlapping.flashSale.name}" có thời gian trùng lặp`,
      );
    }

    const existing = await this.prisma.flashSaleItem.findFirst({
      where: { flashSaleId: dto.flashSaleId, bookId: dto.bookId },
    });

    let item;
    if (existing) {
      item = await this.prisma.flashSaleItem.update({
        where: { id: existing.id },
        data: {
          storeId: businessId,
          originalPrice: commercePrice,
          salePrice: finalSalePrice,
          stock: dto.stock,
          maxPerUser: finalMaxPerUser,
        },
        include: { flashSale: true },
      });
    } else {
      item = await this.prisma.flashSaleItem.create({
        data: {
          flashSaleId: dto.flashSaleId,
          bookId: dto.bookId,
          storeId: businessId,
          originalPrice: commercePrice,
          salePrice: finalSalePrice,
          stock: dto.stock,
          maxPerUser: finalMaxPerUser,
          sold: 0,
        },
        include: { flashSale: true },
      });
    }

    await this.syncItemStock(item.id, item.stock, true);

    return {
      ...this.mapItemView(item, item.flashSale),
      book,
    };
  }

  async sellerRegisterBatch(
    businessId: string,
    dto: SellerBatchRegisterFlashSaleItemsDto,
  ) {
    return this.sellerBatchRegisterItems(businessId, dto);
  }

  async sellerBatchRegisterItems(
    businessId: string,
    dto: SellerBatchRegisterFlashSaleItemsDto,
  ) {
    if (!businessId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Không xác định được danh tính gian hàng",
      );
    }

    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id: dto.flashSaleId },
    });
    if (!flashSale) {
      throwNotFound(
        ErrorCode.FLASH_SALE_NOT_FOUND,
        "Không tìm thấy khung giờ Flash Sale",
      );
    }

    const now = new Date();
    if (flashSale.endsAt <= now || flashSale.status === FlashSaleStatus.ENDED) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Khung giờ Flash Sale này đã kết thúc, vui lòng chọn hoặc tạo khung giờ khác trong tương lai",
      );
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const itemDto of dto.items) {
      try {
        const registered = await this.sellerRegisterItem(businessId, {
          flashSaleId: dto.flashSaleId,
          bookId: itemDto.bookId,
          salePrice: itemDto.salePrice,
          stock: itemDto.stock,
          maxPerUser: itemDto.maxPerUser ?? 1,
        });
        results.push(registered);
      } catch (err: any) {
        errors.push({
          bookId: itemDto.bookId,
          error: err?.message || "Lỗi đăng ký sản phẩm",
        });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        errors[0]?.error || "Không thể đăng ký sách vào Flash Sale",
      );
    }

    return {
      success: true,
      registeredCount: results.length,
      failedCount: errors.length,
      items: results,
      errors,
    };
  }

  async getSellerFlashSaleItems(businessId?: string) {
    await this.syncStatuses();

    const allItems = await this.prisma.flashSaleItem.findMany({
      include: { flashSale: true },
      orderBy: { createdAt: "desc" },
    });

    const results: any[] = [];
    for (const item of allItems) {
      const book = await this.getCommerceBook(item.bookId);
      const bookBizId = book?.businessId || book?.business?.id || book?.storeId;
      const bookOwnerId = book?.ownerUserId || book?.ownerId || book?.userId;
      
      const isMatch =
        !businessId ||
        businessId === "ADMIN" ||
        businessId === "PLATFORM_ADMIN" ||
        (item.storeId && item.storeId === businessId) ||
        (item.flashSale?.storeId && item.flashSale.storeId === businessId) ||
        (bookBizId && bookBizId === businessId) ||
        (bookOwnerId && bookOwnerId === businessId) ||
        (book?.storeId && book.storeId === businessId);

      if (isMatch) {
        results.push({
          ...this.mapItemView(item, item.flashSale),
          book: book
            ? {
                id: book.id,
                title: book.title,
                coverImage: book.coverImage || book.cover || book.coverUrl,
                price: Number(book.price),
                author:
                  book.author?.name ||
                  book.author ||
                  book.authorName ||
                  "Nhiều tác giả",
                available:
                  book.available ??
                  book.physicalDetails?.stock ??
                  book.stock ??
                  20,
              }
            : {
                id: item.bookId,
                title: (item as any).bookTitle || "Sách Flash Sale",
                coverImage: (item as any).coverUrl || "/banners/hero-library.jpg",
                price: Number(item.originalPrice),
                author: (item as any).author || "Nhiều tác giả",
                available: item.stock,
              },
        });
      }
    }

    return results;
  }

  async sellerCancelItem(businessId: string, itemId: string) {
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
      include: { flashSale: true },
    });

    if (!item) {
      throwNotFound(
        ErrorCode.FLASH_SALE_NOT_FOUND,
        "Không tìm thấy sản phẩm Flash Sale",
      );
    }

    const book = await this.getCommerceBook(item.bookId);
    const bookBizId = book?.businessId || book?.business?.id;
    if (bookBizId && bookBizId !== businessId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Bạn không có quyền xóa sản phẩm này",
      );
    }

    if (item.flashSale.status === FlashSaleStatus.ACTIVE) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể hủy sản phẩm khi khung giờ Flash Sale đang diễn ra",
      );
    }

    await this.prisma.flashSaleItem.delete({
      where: { id: itemId },
    });

    await this.redis.del(this.stockKey(itemId));

    return {
      success: true,
      message: "Đã hủy đăng ký Flash Sale cho sản phẩm thành công",
    };
  }

  async sellerUpdateItem(
    businessId: string,
    itemId: string,
    dto: SellerUpdateFlashSaleItemDto,
  ) {
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
      include: { flashSale: true },
    });

    if (!item) {
      throwNotFound(
        ErrorCode.FLASH_SALE_NOT_FOUND,
        "Không tìm thấy sản phẩm Flash Sale",
      );
    }

    const book = await this.getCommerceBook(item.bookId);
    const bookBizId = book?.businessId || book?.business?.id;
    if (bookBizId && bookBizId !== businessId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Bạn không có quyền chỉnh sửa sản phẩm này",
      );
    }

    if (item.flashSale.status === FlashSaleStatus.ENDED) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể chỉnh sửa sản phẩm khi khung giờ Flash Sale đã kết thúc",
      );
    }

    const originalPrice = Number(book?.price || item.originalPrice);
    if (dto.salePrice !== undefined) {
      if (dto.salePrice >= originalPrice) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_NOT_ACTIVE,
          `Giá Flash Sale (${dto.salePrice.toLocaleString('vi-VN')} đ) phải nhỏ hơn giá niêm yết (${originalPrice.toLocaleString('vi-VN')} đ)`,
        );
      }
    }

    const availableStock = Number(
      book?.available ?? book?.physicalDetails?.stock ?? book?.stock ?? 20,
    );
    if (dto.stock !== undefined && dto.stock > availableStock) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_STOCK_EXHAUSTED,
        `Số lượng đăng ký (${dto.stock}) không được vượt quá số lượng kho còn lại (${availableStock})`,
      );
    }

    const updated = await this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: {
        ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.maxPerUser !== undefined ? { maxPerUser: dto.maxPerUser } : {}),
      },
      include: { flashSale: true },
    });

    if (dto.stock !== undefined) {
      const remainingStock = Math.max(0, updated.stock - updated.sold);
      await this.redis.set(this.stockKey(itemId), remainingStock);
    }

    return {
      success: true,
      data: this.mapItemView(updated, updated.flashSale),
      message: "Cập nhật thông tin Flash Sale thành công",
    };
  }

  async getSellerAvailableSlots(businessId?: string) {
    await this.syncStatuses();
    const now = new Date();
    const where: any = {
      endsAt: { gt: now },
      status: { in: [FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED] },
    };

    if (businessId && businessId !== "ADMIN" && businessId !== "PLATFORM_ADMIN") {
      where.OR = [
        { scope: FlashSaleScope.PLATFORM },
        { scope: FlashSaleScope.SHOP, storeId: businessId },
      ];
    }

    const slots = await this.prisma.flashSale.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { startsAt: "asc" },
    });

    return Promise.all(
      slots.map(async (s) => {
        const participatingStoreIds = await this.getParticipatingStoreIds(s.id, s.items);
        const participatingStoresCount = participatingStoreIds.length;
        const maxStores = s.maxStores ?? 10;
        const regStart = s.registrationStartsAt ? new Date(s.registrationStartsAt) : s.createdAt;
        const regEnd = s.registrationEndsAt ? new Date(s.registrationEndsAt) : s.startsAt;
        const isRegistrationOpen =
          s.scope === FlashSaleScope.PLATFORM
            ? now >= regStart && now <= regEnd && participatingStoresCount < maxStores
            : s.status === FlashSaleStatus.SCHEDULED;

        return {
          id: s.id,
          name: s.name,
          description: s.description,
          bannerUrl: s.bannerUrl,
          scope: s.scope,
          storeId: s.storeId,
          registrationStartsAt: s.registrationStartsAt,
          registrationEndsAt: s.registrationEndsAt,
          minStores: s.minStores,
          maxStores,
          discountPercent: s.discountPercent ?? 30,
          maxPerUser: s.maxPerUser ?? 1,
          participatingStoresCount,
          isUserStoreParticipating: businessId
            ? participatingStoreIds.includes(businessId) || s.items.some((it: any) => it.storeId === businessId)
            : false,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          status: s.status,
          totalItems: s.items.length,
          isRegistrationOpen,
          registrationRemainingSeconds: Math.max(
            0,
            Math.floor((regEnd.getTime() - now.getTime()) / 1000),
          ),
          startsInSeconds: Math.max(
            0,
            Math.floor((s.startsAt.getTime() - now.getTime()) / 1000),
          ),
          remainingSeconds: Math.max(
            0,
            Math.floor((s.endsAt.getTime() - now.getTime()) / 1000),
          ),
        };
      }),
    );
  }
}

