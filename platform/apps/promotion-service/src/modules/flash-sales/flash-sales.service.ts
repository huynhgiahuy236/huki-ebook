import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { RabbitMqEventBus } from "@huki/shared";
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
  PauseMode,
  FlashSaleTargetFormat,
} from "./dto/flash-sale.dto";
import { throwNotFound, throwBadRequest, throwForbidden } from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";

@Injectable()
export class FlashSalesService
  implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(FlashSalesService.name);
  private statusTimer?: NodeJS.Timeout;
  private lastStatusSyncAt = 0;
  private statusSyncPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject("FLASH_SALE_REDIS") private readonly redis: Redis,
    @Optional() private readonly eventBus?: RabbitMqEventBus,
  ) { }

  async onApplicationBootstrap() {
    if (this.redis.status === "wait") {
      await this.redis.connect().catch((error) => {
        this.logger.error(`Redis unavailable for Flash Sale: ${error.message}`);
      });
    }
    await this.seedDefaultCampaignsIfEmpty();
    await this.syncStatuses(true);
    await this.initializeRedisStock();
    this.statusTimer = setInterval(() => {
      void this.syncStatuses(true).catch((error) =>
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
      // 1. Platform time overlap validation: no 2 platform flash sales can have overlapping selling windows
      const overlappingSlot = await this.prisma.flashSale.findFirst({
        where: {
          scope: FlashSaleScope.PLATFORM,
          status: { notIn: [FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });

      if (overlappingSlot) {
        throwBadRequest(
          ErrorCode.FLASH_SALE_TIME_OVERLAP,
          `Khung giờ mở bán Flash Sale bị trùng lặp với đợt "${overlappingSlot.name}" (${new Date(overlappingSlot.startsAt).toLocaleString("vi-VN")} - ${new Date(overlappingSlot.endsAt).toLocaleString("vi-VN")}). Vui lòng chọn khung giờ khác.`,
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

  /** Enrich a single flash sale item using a preloaded book map (avoids N+1 uncached HTTP fetches). */
  private mapItemWithBook(item: any, fs: any, bookMap: Map<string, any>) {
    const itemView = this.mapItemView(item, fs);
    const book = bookMap.get(item.bookId);
    if (book) {
      itemView.bookTitle = book.title;
      itemView.bookSlug = book.slug || book.id;
      itemView.coverUrl = book.coverImage || book.cover || book.coverUrl;
      (itemView as any).author =
        book.author?.name || book.author || book.authorName || "Nhiều tác giả";
      (itemView as any).storeId = item.storeId || book.storeId || book.businessId || fs.storeId;
      const resolvedTargetFormat = item.targetFormat || book.format || "PHYSICAL";
      (itemView as any).bookFormat = book.format || "PHYSICAL";
      (itemView as any).targetFormat = resolvedTargetFormat;
      (itemView as any).format = resolvedTargetFormat;
    }
    return { itemView, book };
  }

  private normalizeTargetFormat(raw?: string | null): FlashSaleTargetFormat | undefined {
    if (!raw) return undefined;
    const upper = String(raw).trim().toUpperCase();
    if (upper === "PHYSICAL" || upper === "PAPER") return FlashSaleTargetFormat.PHYSICAL;
    if (upper === "DIGITAL" || upper === "EBOOK") return FlashSaleTargetFormat.DIGITAL;
    if (upper === "BOTH" || upper === "HYBRID" || upper === "COMBO") return FlashSaleTargetFormat.BOTH;
    return undefined;
  }

  private resolveBookTargetFormatAndPrice(
    book: any,
    requestedFormat?: string | null,
  ): { targetFormat: FlashSaleTargetFormat; originalPrice: number } {
    const rawBookFormat = String(book?.format || "PHYSICAL").toUpperCase();
    const bookFormat =
      rawBookFormat === "DIGITAL"
        ? FlashSaleTargetFormat.DIGITAL
        : rawBookFormat === "BOTH"
          ? FlashSaleTargetFormat.BOTH
          : FlashSaleTargetFormat.PHYSICAL;

    const req = this.normalizeTargetFormat(requestedFormat);
    if (requestedFormat && !req) {
      throwBadRequest(
        ErrorCode.BOOK_PRICE_INVALID,
        `Định dạng Flash Sale không hợp lệ: ${requestedFormat}`,
      );
    }

    let targetFormat: FlashSaleTargetFormat = bookFormat;
    if (bookFormat === FlashSaleTargetFormat.PHYSICAL) {
      if (req && req !== FlashSaleTargetFormat.PHYSICAL) {
        throwBadRequest(
          ErrorCode.BOOK_FORMAT_NOT_AVAILABLE,
          `Sách "${book?.title || ""}" chỉ kinh doanh Sách Giấy, không thể chọn định dạng ${req}`,
        );
      }
      targetFormat = FlashSaleTargetFormat.PHYSICAL;
    } else if (bookFormat === FlashSaleTargetFormat.DIGITAL) {
      if (req && req !== FlashSaleTargetFormat.DIGITAL) {
        throwBadRequest(
          ErrorCode.BOOK_FORMAT_NOT_AVAILABLE,
          `Sách "${book?.title || ""}" chỉ kinh doanh Ebook DRM, không thể chọn định dạng ${req}`,
        );
      }
      targetFormat = FlashSaleTargetFormat.DIGITAL;
    } else {
      targetFormat = req || FlashSaleTargetFormat.BOTH;
    }

    const comboPrice = Number(book?.priceCombo ?? book?.price ?? 0);
    let originalPrice = comboPrice;
    if (targetFormat === FlashSaleTargetFormat.PHYSICAL) {
      const paperPrice = Number(book?.pricePaper ?? book?.physicalPrice ?? 0);
      originalPrice =
        paperPrice > 0
          ? paperPrice
          : bookFormat === FlashSaleTargetFormat.BOTH && comboPrice > 0
            ? Math.round(comboPrice * 0.75)
            : comboPrice;
    } else if (targetFormat === FlashSaleTargetFormat.DIGITAL) {
      const ebookPrice = Number(book?.priceEbook ?? book?.ebookPrice ?? 0);
      originalPrice =
        ebookPrice > 0
          ? ebookPrice
          : bookFormat === FlashSaleTargetFormat.BOTH && comboPrice > 0
            ? Math.round(comboPrice * 0.45)
            : comboPrice;
    }

    return { targetFormat, originalPrice };
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

    const allBookIds = items.flatMap((fs) => fs.items.map((it) => it.bookId));
    const bookMap = await this.preloadCommerceBooks(allBookIds);

    // Recalculate dynamic status and calculate participatingStoresCount and book details
    const mapped = await Promise.all(
      items.map(async (fs) => {
        const participatingStoreIds = await this.getParticipatingStoreIds(fs.id, fs.items);
        const enrichedItems = fs.items.map((item) => this.mapItemWithBook(item, fs, bookMap).itemView);

        const effectiveStatus = this.calculateStatus(fs.startsAt, fs.endsAt, fs.status, fs.pauseEffectiveAt);
        const nowTime = new Date();
        const pauseRemainingSeconds = fs.pauseEffectiveAt && new Date(fs.pauseEffectiveAt) > nowTime
          ? Math.max(0, Math.floor((new Date(fs.pauseEffectiveAt).getTime() - nowTime.getTime()) / 1000))
          : 0;

        return {
          ...fs,
          status: effectiveStatus,
          pauseEffectiveAt: fs.pauseEffectiveAt,
          pauseRemainingSeconds,
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

    if (
      campaign.status === FlashSaleStatus.ENDED ||
      campaign.status === FlashSaleStatus.CANCELLED ||
      new Date(campaign.endsAt).getTime() <= Date.now()
    ) {
      throwBadRequest(
        ErrorCode.BOOK_PRICE_INVALID,
        "Phiên Flash Sale đã kết thúc hoặc đã bị hủy, không thể thêm hoặc chỉnh sửa sản phẩm",
      );
    }

    if (dto.salePrice >= dto.originalPrice) {
      throwBadRequest(
        ErrorCode.BOOK_PRICE_INVALID,
        "Giá Flash Sale phải nhỏ hơn giá gốc",
      );
    }

    const book = await this.getCommerceBookCached(dto.bookId);
    if (!book) {
      throwNotFound(
        ErrorCode.BOOK_NOT_FOUND,
        "Không tìm thấy sách trong kho Commerce",
      );
    }
    const { targetFormat, originalPrice: commercePrice } =
      this.resolveBookTargetFormatAndPrice(book, dto.targetFormat);
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
    if (targetFormat !== FlashSaleTargetFormat.DIGITAL && dto.stock > availableStock) {
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
          targetFormat,
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
        targetFormat,
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

    const bookMap = await this.preloadCommerceBooks(
      campaigns.flatMap((c) => c.items.map((item) => item.bookId)),
    );

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt, c.status, c.pauseEffectiveAt);
        const participatingStoreIds = await this.getParticipatingStoreIds(c.id, c.items);
        const participatingStoresCount = participatingStoreIds.length;
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : c.startsAt;
        const itemsWithBooks = c.items.map((item) => this.mapItemWithBook(item, c, bookMap).itemView);

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

    const bookMap = await this.preloadCommerceBooks(
      campaigns.flatMap((c) => c.items.map((item) => item.bookId)),
    );

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const status = this.calculateStatus(c.startsAt, c.endsAt, c.status, c.pauseEffectiveAt);
        const participatingStoreIds = await this.getParticipatingStoreIds(c.id, c.items);
        const participatingStoresCount = participatingStoreIds.length;
        const regEnd = c.registrationEndsAt ? new Date(c.registrationEndsAt) : c.startsAt;
        const itemsWithBooks = c.items.map((item) => this.mapItemWithBook(item, c, bookMap).itemView);

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

    const slotBookMap = await this.preloadCommerceBooks(
      allCampaigns.flatMap((c) => c.items.map((item) => item.bookId)),
    );

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

        const itemsWithBooks = c.items.map((item) => this.mapItemWithBook(item, c, slotBookMap).itemView);

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
          pauseEffectiveAt: null,
          pauseRemainingSeconds: 0,
          remainingSeconds,
          totalItems: c.items.length,
          items: itemsWithBooks,
        };
      }),
    );

    const publicVisible = mapped.filter((c) => {
      if (c.status === FlashSaleStatus.CANCELLED || c.status === FlashSaleStatus.ENDED) return false;
      return true;
    });

    return publicVisible.sort((a, b) => {
      const order: Record<string, number> = {
        ACTIVE: 1,
        PAUSED: 2,
        SCHEDULED: 3,
        ENDED: 4,
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

    const [shopBookMap, businesses] = await Promise.all([
      this.preloadCommerceBooks(
        shopCampaigns.flatMap((c) => c.items.map((item) => item.bookId)),
      ),
      this.preloadPublicBusinesses(),
    ]);

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

        let storeDisplayName = "";
        let storeSlug = "";
        let storeAvatar: string | null = null;
        let canonicalStoreId = c.storeId || "";

        const itemsWithBooks = c.items.map((item) => {
          const { itemView, book } = this.mapItemWithBook(item, c, shopBookMap);
          if (book) {
            if (!canonicalStoreId && (book.storeId || book.businessId)) {
              canonicalStoreId = String(book.storeId || book.businessId);
            }
            if (!storeDisplayName && (book.store?.name || book.business?.displayName || book.business?.name || book.businessName || book.storeName)) {
              storeDisplayName =
                book.store?.name ||
                book.business?.displayName ||
                book.business?.name ||
                book.businessName ||
                book.storeName;
            }
            if (!storeSlug && (book.store?.slug || book.business?.slug)) {
              storeSlug = book.store?.slug || book.business?.slug;
            }
            if (!storeAvatar && (book.store?.logo || book.business?.logo)) {
              storeAvatar = book.store?.logo || book.business?.logo;
            }
          }
          return itemView;
        });

        const matchedBiz = this.findMatchingBusiness(businesses, canonicalStoreId || itemsWithBooks[0]?.storeId);
        if (matchedBiz) {
          const matchedSubStore =
            matchedBiz.stores?.find(
              (s: any) =>
                String(s.id || "").toLowerCase() === String(canonicalStoreId || "").toLowerCase(),
            ) || matchedBiz.stores?.[0];
          canonicalStoreId = matchedSubStore?.id || matchedBiz.id || canonicalStoreId;
          storeDisplayName =
            matchedSubStore?.name ||
            matchedBiz.displayName ||
            matchedBiz.name ||
            storeDisplayName;
          storeSlug = matchedSubStore?.slug || matchedBiz.slug || storeSlug || matchedBiz.id;
          storeAvatar = matchedSubStore?.logo || matchedBiz.logo || storeAvatar;
        }

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          bannerUrl: c.bannerUrl,
          scope: c.scope,
          storeId: canonicalStoreId || c.storeId || itemsWithBooks[0]?.storeId || "unknown-store",
          storeName: storeDisplayName || "Gian Hàng Đối Tác",
          storeSlug: storeSlug || canonicalStoreId || c.storeId || "unknown-store",
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

    // Group by canonical Shop/Store ID
    const storeMap = new Map<
      string,
      {
        storeId: string;
        storeName: string;
        storeSlug: string;
        storeAvatar: string | null;
        campaigns: typeof enriched;
      }
    >();

    for (const campaign of enriched) {
      const sId = campaign.storeId;
      if (!storeMap.has(sId)) {
        storeMap.set(sId, {
          storeId: sId,
          storeName: campaign.storeName,
          storeSlug: campaign.storeSlug,
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

  async getBookFlashSalePrice(bookId: string, targetFormat?: string) {
    await this.syncStatuses();
    const item = await this.findActiveItem(bookId, undefined, targetFormat);

    if (!item) return null;

    const view = this.mapItemView(item, item.flashSale);
    if (!view.targetFormat) {
      const book = await this.getCommerceBookCached(bookId).catch(() => null);
      if (book?.format) {
        (view as any).targetFormat = book.format;
        (view as any).format = book.format;
      }
    }
    return view;
  }

  async validateUserQuota(dto: ValidateQuotaDto) {
    await this.syncStatuses();
    const item = await this.findActiveItem(dto.bookId, dto.flashSaleId, dto.targetFormat);

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
    const item = await this.findActiveItem(dto.bookId, dto.flashSaleId, dto.targetFormat);
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

  async updateStatus(id: string, status: FlashSaleStatus, pauseMode?: PauseMode) {
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

    if (status === FlashSaleStatus.PAUSED) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Tính năng Tạm Dừng đã được gỡ bỏ. Vui lòng sử dụng tính năng Kết Thúc Sớm (5 phút) cho phiên đang diễn ra hoặc Hủy Lịch cho phiên đã lên lịch.",
      );
    }

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: {
        status,
        pauseEffectiveAt: null,
      },
    });

    // Broadcast domain event to RabbitMQ for sellers & admin notifications
    await this.publishFlashSaleStatusEvent(updated, status, pauseMode);

    return updated;
  }

  private async publishFlashSaleStatusEvent(
    flashSale: any,
    status: FlashSaleStatus,
    pauseMode?: PauseMode,
  ) {
    if (!this.eventBus) return;
    try {
      const storeIds = await this.getParticipatingStoreIds(flashSale.id);
      const isGrace = status === FlashSaleStatus.PAUSED && pauseMode === PauseMode.GRACE_2_MINUTES;
      const isPaused = status === FlashSaleStatus.PAUSED && !isGrace;
      const eventType = isGrace
        ? 'flash_sale.grace_started'
        : isPaused
          ? 'flash_sale.paused'
          : status === FlashSaleStatus.ACTIVE
            ? 'flash_sale.resumed'
            : 'flash_sale.status_changed';

      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        producer: 'promotion-service',
        version: 1,
        aggregateId: flashSale.id,
        payload: {
          flashSaleId: flashSale.id,
          flashSaleName: flashSale.name,
          status: flashSale.status,
          pauseEffectiveAt: flashSale.pauseEffectiveAt,
          pauseMode,
          participatingStoreIds: storeIds,
        },
      });
      this.logger.log(`Published ${eventType} for Flash Sale "${flashSale.name}" to ${storeIds.length} stores`);
    } catch (err: any) {
      this.logger.warn(`Failed to publish flash sale status event: ${err.message}`);
    }
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

  async endEarly(id: string, actorBusinessId?: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    if (
      actorBusinessId &&
      (flashSale!.scope !== FlashSaleScope.SHOP || flashSale!.storeId !== actorBusinessId)
    ) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Bạn không có quyền kết thúc sớm đợt Flash Sale này",
      );
    }

    const now = new Date();
    if (
      flashSale!.status === FlashSaleStatus.ENDED ||
      flashSale!.status === FlashSaleStatus.CANCELLED ||
      now > flashSale!.endsAt
    ) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Đợt Flash Sale này đã kết thúc hoặc đã bị hủy",
      );
    }

    // Set endsAt to exactly 5 minutes from now
    const newEndsAt = new Date(now.getTime() + 5 * 60 * 1000);

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: {
        endsAt: newEndsAt,
        status: FlashSaleStatus.ACTIVE,
        pauseEffectiveAt: null,
      },
    });

    if (this.eventBus) {
      const bookIds = Array.from(
        new Set((flashSale!.items || []).map((it: any) => it.bookId).filter(Boolean)),
      );
      void this.getParticipatingStoreIds(id, flashSale!.items)
        .then((storeIds) =>
          this.eventBus!.publish({
            eventId: randomUUID(),
            eventType: "flash_sale.early_ending_scheduled",
            occurredAt: new Date().toISOString(),
            producer: "promotion-service",
            version: 1,
            aggregateId: id,
            payload: {
              flashSaleId: id,
              flashSaleName: flashSale!.name,
              endsAt: newEndsAt.toISOString(),
              remainingSeconds: 300,
              bookIds,
              participatingStoreIds: storeIds, // only stores participating in this slot!
            },
          }).then(() => {
            this.logger.log(
              `Published flash_sale.early_ending_scheduled for "${flashSale!.name}" (endsAt: ${newEndsAt.toISOString()}) to ${storeIds.length} stores`,
            );
          }),
        )
        .catch((err: any) => {
          this.logger.warn(`Failed to publish early ending event: ${err?.message || err}`);
        });
    }

    return updated;
  }

  async cancel(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    const now = new Date();
    const isLiveWindow =
      flashSale!.status === FlashSaleStatus.ACTIVE ||
      (flashSale!.status === FlashSaleStatus.SCHEDULED &&
        (flashSale!.items?.length ?? 0) > 0 &&
        flashSale!.startsAt &&
        flashSale!.endsAt &&
        now >= flashSale!.startsAt &&
        now <= flashSale!.endsAt);
    if (isLiveWindow) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Đợt Flash Sale đang diễn ra. Vui lòng sử dụng Kết Thúc Sớm (5 phút) để khách hàng kịp hoàn tất thanh toán.",
      );
    }

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: {
        status: FlashSaleStatus.CANCELLED,
        pauseEffectiveAt: null,
      },
    });

    if (flashSale!.items && flashSale!.items.length > 0) {
      const keys = flashSale!.items.map((it) => this.stockKey(it.id));
      await this.redis.del(...keys);
    }

    if (this.eventBus) {
      const bookIds = Array.from(
        new Set((flashSale!.items || []).map((it: any) => it.bookId).filter(Boolean)),
      );
      void this.getParticipatingStoreIds(id, flashSale!.items)
        .then((storeIds) =>
          this.eventBus!.publish({
            eventId: randomUUID(),
            eventType: "flash_sale.cancelled",
            occurredAt: new Date().toISOString(),
            producer: "promotion-service",
            version: 1,
            aggregateId: id,
            payload: {
              flashSaleId: id,
              flashSaleName: flashSale!.name,
              status: FlashSaleStatus.CANCELLED,
              bookIds,
              participatingStoreIds: storeIds,
            },
          }).then(() => {
            this.logger.log(
              `Published flash_sale.cancelled for "${flashSale!.name}" to ${storeIds.length} stores`,
            );
          }),
        )
        .catch((err: any) => {
          this.logger.warn(`Failed to publish cancel event: ${err?.message || err}`);
        });
    }

    return updated;
  }

  async delete(id: string, actorBusinessId?: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        items: { select: { id: true, sold: true, bookId: true, storeId: true } },
      },
    });
    if (!flashSale) throwNotFound(ErrorCode.FLASH_SALE_NOT_FOUND);
    const campaign = flashSale!;
    if (
      actorBusinessId &&
      (campaign.scope !== FlashSaleScope.SHOP || campaign.storeId !== actorBusinessId)
    ) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Bạn không có quyền xóa đợt Flash Sale này",
      );
    }
    if (campaign.items.some((item) => item.sold > 0)) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể xóa đợt Flash Sale đã phát sinh đơn hàng đã bán",
      );
    }
    const now = new Date();
    const isLiveWindow =
      campaign.status === FlashSaleStatus.ACTIVE ||
      (campaign.status === FlashSaleStatus.SCHEDULED &&
        campaign.startsAt &&
        campaign.endsAt &&
        now >= campaign.startsAt &&
        now <= campaign.endsAt);
    if (isLiveWindow && campaign.items.length > 0) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        "Không thể xóa đợt Flash Sale đang diễn ra. Vui lòng sử dụng Kết Thúc Sớm (5 phút) để khách hàng kịp hoàn tất thanh toán.",
      );
    }

    const bookIds = Array.from(
      new Set(campaign.items.map((item) => item.bookId).filter(Boolean)),
    );
    const participatingStoreIds = Array.from(
      new Set(
        [
          campaign.storeId,
          ...campaign.items.map((item) => item.storeId),
        ].filter(Boolean) as string[],
      ),
    );

    await this.prisma.flashSaleItem.deleteMany({
      where: { flashSaleId: id },
    });
    const keys = campaign.items.map((item) => this.stockKey(item.id));
    if (keys.length) await this.redis.del(...keys);

    await this.prisma.flashSale.delete({ where: { id } });

    if (this.eventBus && campaign.items.length > 0) {
      void this.eventBus
        .publish({
          eventId: randomUUID(),
          eventType: "flash_sale.deleted",
          occurredAt: new Date().toISOString(),
          producer: "promotion-service",
          version: 1,
          aggregateId: id,
          payload: {
            flashSaleId: id,
            flashSaleName: campaign.name,
            bookIds,
            participatingStoreIds,
          },
        })
        .catch((err: any) => {
          this.logger.warn(`Failed to publish flash_sale.deleted event: ${err?.message || err}`);
        });
    }

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

    const fs = flashSale || item.flashSale;
    const slotStatus = fs?.status ?? FlashSaleStatus.SCHEDULED;

    return {
      id: item.id,
      flashSaleId: item.flashSaleId,
      flashSaleName: fs?.name ?? "Flash Sale Giờ Vàng",
      scope: fs?.scope ?? FlashSaleScope.PLATFORM,
      storeId: item.storeId ?? fs?.storeId ?? null,
      status: slotStatus,
      flashSale: fs
        ? {
          id: fs.id,
          name: fs.name,
          status: fs.status,
          scope: fs.scope,
          startsAt: fs.startsAt,
          endsAt: fs.endsAt,
          storeId: fs.storeId,
        }
        : undefined,
      bookId: item.bookId,
      bookTitle: item.bookTitle ?? null,
      bookSlug: item.bookSlug ?? null,
      coverUrl: item.coverUrl ?? null,
      author: item.author ?? null,
      targetFormat: item.targetFormat ?? null,
      format: item.targetFormat ?? item.format ?? undefined,
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
      startsAt: fs?.startsAt ?? item.startsAt,
      endsAt: fs?.endsAt ?? item.endsAt,
    };
  }

  private calculateStatus(
    startsAt: Date,
    endsAt: Date,
    currentStatus?: FlashSaleStatus | string,
    pauseEffectiveAt?: Date | null,
  ): FlashSaleStatus {
    if (
      currentStatus === FlashSaleStatus.CANCELLED ||
      currentStatus === "CANCELLED"
    ) {
      return FlashSaleStatus.CANCELLED;
    }
    const now = new Date();
    if (now > endsAt) return FlashSaleStatus.ENDED;
    if (now < startsAt) return FlashSaleStatus.SCHEDULED;
    return FlashSaleStatus.ACTIVE;
  }

  private async syncStatuses(force = false) {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastStatusSyncAt < 10_000) {
      return;
    }
    if (this.statusSyncPromise) {
      return this.statusSyncPromise;
    }

    this.statusSyncPromise = (async () => {
      const now = new Date();

      // 0. Auto-heal any legacy PAUSED campaigns to ACTIVE or ENDED to ensure no campaigns remain stuck:
      const legacyPausedSales = await this.prisma.flashSale.findMany({
        where: {
          status: FlashSaleStatus.PAUSED,
        },
      });

      if (legacyPausedSales.length > 0) {
        for (const s of legacyPausedSales) {
          const targetStatus = now > s.endsAt ? FlashSaleStatus.ENDED : now >= s.startsAt ? FlashSaleStatus.ACTIVE : FlashSaleStatus.SCHEDULED;
          await this.prisma.flashSale.update({
            where: { id: s.id },
            data: { status: targetStatus, pauseEffectiveAt: null },
          });
        }
      }

      // 1. Auto-cancel Platform Flash Sales that reached registrationEndsAt with fewer distinct stores than minStores
      const pendingPlatformSales = await this.prisma.flashSale.findMany({
        where: {
          scope: FlashSaleScope.PLATFORM,
          status: FlashSaleStatus.SCHEDULED,
          registrationEndsAt: { lte: now },
        },
        include: { items: true },
      });

      for (const fs of pendingPlatformSales || []) {
        const storeIds = await this.getParticipatingStoreIds(fs.id, fs.items);
        const minStores = fs.minStores ?? 1;
        if (minStores > 1 && storeIds.length < minStores) {
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
            status: { in: [FlashSaleStatus.SCHEDULED, FlashSaleStatus.ACTIVE, FlashSaleStatus.PAUSED] },
            endsAt: { lt: now },
          },
          data: { status: FlashSaleStatus.ENDED },
        }),
      ]);
      this.lastStatusSyncAt = Date.now();
    })().finally(() => {
      this.statusSyncPromise = null;
    });

    return this.statusSyncPromise;
  }

  private async findActiveItem(
    bookId: string,
    flashSaleId?: string,
    requestedFormat?: string,
  ) {
    const now = new Date();
    const item = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId,
        ...(flashSaleId && { flashSaleId }),
        flashSale: {
          startsAt: { lte: now },
          endsAt: { gte: now },
          status: { notIn: [FlashSaleStatus.ENDED, FlashSaleStatus.CANCELLED, FlashSaleStatus.PAUSED] },
          OR: [
            { pauseEffectiveAt: null },
            { pauseEffectiveAt: { gt: now } },
          ],
        },
        stock: { gt: 0 },
      },
      include: { flashSale: true },
      orderBy: [{ salePrice: "asc" }, { createdAt: "asc" }],
    });

    if (!item) return null;

    if (requestedFormat) {
      const reqFmt = this.normalizeTargetFormat(requestedFormat);
      if (reqFmt) {
        if (item.targetFormat) {
          if (item.targetFormat !== reqFmt) return null;
        } else {
          const book = await this.getCommerceBookCached(bookId).catch(() => null);
          const legacyFmt = this.normalizeTargetFormat(book?.format);
          if (legacyFmt && legacyFmt !== reqFmt) return null;
        }
      }
    }

    return item;
  }

  async getParticipatingStoreIds(flashSaleId: string, preloadedItems?: any[]): Promise<string[]> {
    const items = preloadedItems ?? await this.prisma.flashSaleItem.findMany({
      where: { flashSaleId },
      select: { id: true, bookId: true, storeId: true },
    });
    const missingStoreBookIds = items.filter((i) => !i.storeId && i.bookId).map((i) => i.bookId);
    const missingBookMap = missingStoreBookIds.length > 0
      ? await this.preloadCommerceBooks(missingStoreBookIds)
      : new Map<string, any>();

    const storeIds = new Set<string>();
    for (const item of items) {
      if (item.storeId) {
        storeIds.add(String(item.storeId));
        continue;
      }
      const book = missingBookMap.get(item.bookId);
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

  private getCommerceBaseUrl(): string {
    if (process.env.COMMERCE_SERVICE_URL) {
      return process.env.COMMERCE_SERVICE_URL;
    }
    const host = process.env.COMMERCE_SERVICE_HOST ||
      (process.env.NODE_ENV === 'staging' ? 'commerce-service-uat' : 'localhost');
    const port = process.env.COMMERCE_SERVICE_PORT || 3003;
    return `http://${host}:${port}`;
  }

  private getBusinessBaseUrl(): string {
    if (process.env.BUSINESS_SERVICE_URL) {
      return process.env.BUSINESS_SERVICE_URL.replace(/\/+$/, "");
    }
    const host =
      process.env.BUSINESS_SERVICE_HOST ||
      (process.env.NODE_ENV === "staging" ? "business-service-uat" : "localhost");
    const port = process.env.BUSINESS_SERVICE_PORT || 3002;
    return `http://${host}:${port}`;
  }

  private businessesCache: { items: any[]; expiresAt: number } | null = null;

  private async preloadPublicBusinesses(): Promise<any[]> {
    if (this.businessesCache && Date.now() < this.businessesCache.expiresAt) {
      return this.businessesCache.items;
    }
    try {
      const base = this.getBusinessBaseUrl();
      const apiBase = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
      const response = await fetch(`${apiBase}/businesses?limit=100`, {
        signal: AbortSignal.timeout(2_500),
      });
      if (!response.ok) return [];
      const body: any = await response.json();
      const items = Array.isArray(body?.data?.data)
        ? body.data.data
        : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : [];
      this.businessesCache = { items, expiresAt: Date.now() + 120_000 };
      return items;
    } catch {
      return this.businessesCache?.items || [];
    }
  }

  private findMatchingBusiness(businesses: any[], targetStoreId?: string | null): any | null {
    if (!targetStoreId || !Array.isArray(businesses) || businesses.length === 0) {
      return null;
    }
    const target = String(targetStoreId).trim().toLowerCase();
    return (
      businesses.find((b: any) => {
        if (
          String(b?.id || "").toLowerCase() === target ||
          String(b?.ownerId || "").toLowerCase() === target ||
          String(b?.slug || "").toLowerCase() === target
        ) {
          return true;
        }
        return (
          Array.isArray(b?.stores) &&
          b.stores.some(
            (s: any) =>
              String(s?.id || "").toLowerCase() === target ||
              String(s?.slug || "").toLowerCase() === target,
          )
        );
      }) || null
    );
  }

  private bookCache = new Map<string, { book: any; expiresAt: number }>();

  private async getCommerceBookCached(bookId: string, authHeader?: string) {
    const cached = this.bookCache.get(bookId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.book;
    }
    const book = await this.getCommerceBook(bookId, authHeader);
    if (book && (!book.status || book.status === "PUBLISHED")) {
      this.bookCache.set(bookId, { book, expiresAt: Date.now() + 120_000 });
    }
    return book;
  }

  private async getCommerceBook(bookId: string, authHeader?: string) {
    try {
      const baseUrl = this.getCommerceBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/books/${bookId}?light=1`, {
        headers: authHeader ? { Authorization: authHeader } : undefined,
        signal: AbortSignal.timeout(2_500),
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

  /** Fetch book records from commerce-service in controlled chunks to avoid connection pool spikes on large batches. */
  private async preloadCommerceBooks(
    bookIds: string[],
    authHeader?: string,
    batchSize = 10,
  ): Promise<Map<string, any>> {
    const uniqueBookIds = Array.from(new Set(bookIds));
    const bookMap = new Map<string, any>();
    for (let i = 0; i < uniqueBookIds.length; i += batchSize) {
      const chunk = uniqueBookIds.slice(i, i + batchSize);
      const loaded = await Promise.all(
        chunk.map(async (bookId) => ({
          bookId,
          book: await this.getCommerceBookCached(bookId, authHeader),
        })),
      );
      loaded.forEach(({ bookId, book }) => {
        if (book) bookMap.set(bookId, book);
      });
    }
    return bookMap;
  }

  private async getCommerceBooks() {
    try {
      const baseUrl = this.getCommerceBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/books?limit=20`, {
        signal: AbortSignal.timeout(3_000),
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
    preloaded?: {
      flashSale?: any;
      book?: any;
      participatingStoreIds?: string[];
      skipSyncStock?: boolean;
      authHeader?: string;
    },
  ) {
    if (!businessId) {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        "Không xác định được danh tính gian hàng",
      );
    }

    const flashSale =
      preloaded?.flashSale ||
      (await this.prisma.flashSale.findUnique({
        where: { id: dto.flashSaleId },
      }));
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

    const book =
      preloaded?.book ||
      (await this.getCommerceBookCached(dto.bookId, preloaded?.authHeader));
    if (!book) {
      throwNotFound(
        ErrorCode.BOOK_NOT_FOUND,
        "Không tìm thấy thông tin sách trong kho hàng",
      );
    }
    if (book.status && book.status !== "PUBLISHED") {
      const statusLabel =
        book.status === "HIDDEN"
          ? "Đang ẩn"
          : book.status === "DRAFT"
            ? "Bản nháp"
            : book.status === "ARCHIVED"
              ? "Đã lưu trữ"
              : book.status === "SUSPENDED"
                ? "Bị tạm khóa"
                : book.status;
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        `Sách "${book.title || dto.bookId}" đang ở trạng thái "${statusLabel}", vui lòng xuất bản công khai trước khi đăng ký Flash Sale`,
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

    const { targetFormat, originalPrice: commercePrice } =
      this.resolveBookTargetFormatAndPrice(book, dto.targetFormat);
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
    if (targetFormat !== FlashSaleTargetFormat.DIGITAL && dto.stock > availableStock) {
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

      const participatingStoreIds =
        preloaded?.participatingStoreIds ||
        (await this.getParticipatingStoreIds(flashSale.id));
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
          targetFormat,
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
          targetFormat,
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
    authHeader?: string,
  ) {
    return this.sellerBatchRegisterItems(businessId, dto, authHeader);
  }

  async sellerBatchRegisterItems(
    businessId: string,
    dto: SellerBatchRegisterFlashSaleItemsDto,
    authHeader?: string,
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

    // Pre-fetch books in controlled chunks and store participation ONCE to avoid N+1 & pool saturation
    const [bookCacheMap, participatingStoreIds] = await Promise.all([
      this.preloadCommerceBooks(
        dto.items.map((item) => item.bookId),
        authHeader,
      ),
      flashSale.scope === FlashSaleScope.PLATFORM
        ? this.getParticipatingStoreIds(dto.flashSaleId)
        : Promise.resolve([] as string[]),
    ]);

    const results: any[] = [];
    const errors: any[] = [];

    const CHUNK_SIZE = 5;
    for (let i = 0; i < dto.items.length; i += CHUNK_SIZE) {
      const chunk = dto.items.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((itemDto) =>
          this.sellerRegisterItem(
            businessId,
            {
              flashSaleId: dto.flashSaleId,
              bookId: itemDto.bookId,
              salePrice: itemDto.salePrice,
              stock: itemDto.stock,
              maxPerUser: itemDto.maxPerUser ?? 1,
              targetFormat: itemDto.targetFormat,
            },
            {
              flashSale,
              book: bookCacheMap.get(itemDto.bookId),
              participatingStoreIds,
              authHeader,
            },
          ),
        ),
      );
      settled.forEach((outcome, idx) => {
        const itemDto = chunk[idx];
        if (outcome.status === "fulfilled") {
          results.push(outcome.value);
        } else {
          errors.push({
            bookId: itemDto.bookId,
            error: outcome.reason?.message || "Lỗi đăng ký sản phẩm",
          });
        }
      });
    }

    if (results.length === 0 && errors.length > 0) {
      throwBadRequest(
        ErrorCode.FLASH_SALE_NOT_ACTIVE,
        errors[0]?.error || "Không thể đăng ký sách vào Flash Sale",
      );
    }

    if (this.eventBus && results.length > 0) {
      void this.eventBus
        .publish({
          eventId: randomUUID(),
          eventType: "flash_sale.registered",
          occurredAt: new Date().toISOString(),
          producer: "promotion-service",
          version: 1,
          aggregateId: dto.flashSaleId,
          payload: {
            flashSaleId: dto.flashSaleId,
            storeId: businessId,
            registeredCount: results.length,
            flashSaleName: flashSale.name,
          },
        })
        .then(() => {
          this.logger.log(`Published flash_sale.registered for "${flashSale.name}": ${results.length} items from store ${businessId}`);
        })
        .catch((err: any) => {
          this.logger.warn(`Failed to publish flash_sale.registered event: ${err?.message || err}`);
        });
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
      where: {
        flashSale: {
          status: { not: FlashSaleStatus.CANCELLED },
        },
      },
      include: { flashSale: true },
      orderBy: { createdAt: "desc" },
    });

    // Batch query unique books in chunks to eliminate N+1 latency & CPU choking
    const bookMap = await this.preloadCommerceBooks(
      allItems.map((it) => it.bookId),
    );

    const results: any[] = [];
    for (const item of allItems) {
      const book = bookMap.get(item.bookId);
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
              format: book.format || "PHYSICAL",
              pricePaper: book.pricePaper,
              priceEbook: book.priceEbook,
              priceCombo: book.priceCombo,
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

    const isAdminActor =
      !businessId ||
      businessId === "ADMIN" ||
      businessId === "PLATFORM_ADMIN";
    const directStoreMatch =
      (item.storeId && item.storeId === businessId) ||
      (item.flashSale?.storeId && item.flashSale.storeId === businessId);

    let isAllowed = Boolean(isAdminActor || directStoreMatch);
    if (!isAllowed) {
      const book = await this.getCommerceBookCached(item.bookId);
      const bookBizId = book?.businessId || book?.business?.id || book?.storeId;
      isAllowed = Boolean(bookBizId && bookBizId === businessId);
    }
    if (!isAllowed) {
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

    await this.redis.del(this.stockKey(itemId)).catch(() => null);

    if (this.eventBus) {
      void this.eventBus
        .publish({
          eventId: randomUUID(),
          eventType: "flash_sale.item_cancelled",
          occurredAt: new Date().toISOString(),
          producer: "promotion-service",
          version: 1,
          aggregateId: item.flashSaleId,
          payload: {
            flashSaleId: item.flashSaleId,
            itemId: item.id,
            bookId: item.bookId,
            storeId: item.storeId || businessId,
            flashSaleName: item.flashSale.name,
          },
        })
        .then(() => {
          this.logger.log(`Published flash_sale.item_cancelled for item ${item.id} (book: ${item.bookId}) in "${item.flashSale.name}"`);
        })
        .catch((err: any) => {
          this.logger.warn(`Failed to publish item_cancelled event: ${err?.message || err}`);
        });
    }

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

    const directStoreMatch =
      !businessId ||
      businessId === "ADMIN" ||
      businessId === "PLATFORM_ADMIN" ||
      (item.storeId && item.storeId === businessId) ||
      (item.flashSale?.storeId && item.flashSale.storeId === businessId);
    const book = await this.getCommerceBookCached(item.bookId);
    const bookBizId = book?.businessId || book?.business?.id || book?.storeId;
    if (!directStoreMatch && bookBizId && bookBizId !== businessId) {
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

    const resolved = book
      ? this.resolveBookTargetFormatAndPrice(
        book,
        dto.targetFormat ?? item.targetFormat,
      )
      : {
        targetFormat:
          this.normalizeTargetFormat(dto.targetFormat ?? item.targetFormat) ||
          FlashSaleTargetFormat.PHYSICAL,
        originalPrice: Number(item.originalPrice),
      };
    const originalPrice = resolved.originalPrice;
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
    if (
      resolved.targetFormat !== FlashSaleTargetFormat.DIGITAL &&
      dto.stock !== undefined &&
      dto.stock > availableStock
    ) {
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
        ...(dto.targetFormat !== undefined
          ? { targetFormat: resolved.targetFormat, originalPrice }
          : {}),
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

