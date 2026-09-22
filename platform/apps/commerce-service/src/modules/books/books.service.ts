import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { getSellerScope } from '../../common/seller-scope.util';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { paginate } from '../../common/pagination.util';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookListQueryDto, BookSortBy } from './dto/book-list-query.dto';
import { BookFormat, BookStatus } from '../../../prisma/generated/client';
import { throwConflict, throwNotFound, throwForbidden, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { SanctionsService } from '../sanctions/sanctions.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly sanctionsService?: SanctionsService,
  ) {}

  async create(dto: CreateBookDto, actor: BookActor) {
    const scope = await getSellerScope(actor);
    // Business is the storefront. The physical column is still named store_id
    // for database compatibility while the Store domain is being retired.
    const storeId = dto.businessId || dto.storeId || (scope.storeIds.length > 0 ? scope.storeIds[0] : actor.sub) || '00000000-0000-0000-0000-000000000000';

    if (this.sanctionsService) {
      await this.sanctionsService.assertCanMutateBooks(storeId);
    }

    const format = dto.format || (dto.physicalDetails ? (dto.digitalDetails ? BookFormat.BOTH : BookFormat.PHYSICAL) : BookFormat.DIGITAL);
    const description = dto.description ? dto.description.trim() : 'Mô tả tác phẩm sách';
    const price = dto.price ?? 0;

    await this.validateCatalog(dto.categoryId ?? null, dto.authorId ?? null, dto.publisherId ?? null);

    const title = dto.title.trim();
    const slug = dto.slug ?? toCatalogSlug(title);
    await this.ensureSlugAvailable(storeId, slug);

    const book = await this.prisma.$transaction(async (tx) => {
      const created = await tx.book.create({
        data: {
          storeId,
          ownerUserId: actor.sub,
          title,
          normalizedTitle: normalizeCatalogText(title),
          slug,
          isbn: dto.isbn ?? null,
          description,
          price,
          coverUrl: dto.coverUrl || dto.coverImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOYh4ba1idBkiR2I8t0pbdA5FVcmBvHkOWsn-6ihQAw4v36GBdi9qZb-Ef2l9Q7pwf8U5b-YhC_MHz4uICBBj1fVy10mzaI1UWVXqpQY8u2Pt0bsfSl7mZtxUx2jwedu3VpfRL-dHGtqxlrkAAJCUYiX9sL3DilKi9JH38UBhTg7gbdhOvQ49VfEsuXjVZSGFMhjkdSxAVpWEetgSSRzLHqYif101iDoUn8nRyClOOEC8cuhL8j3JLag',
          categoryId: dto.categoryId ?? null,
          authorId: dto.authorId ?? null,
          publisherId: dto.publisherId ?? null,
          format,
          status: BookStatus.DRAFT,
        },
      });

      // Create physical details
      if (dto.physicalDetails || format === BookFormat.PHYSICAL || format === BookFormat.BOTH) {
        await tx.physicalBookDetails.create({
          data: {
            bookId: created.id,
            stock: dto.physicalDetails?.stock ?? 100,
            reserved: 0,
            weight: dto.physicalDetails?.weight ?? 300,
            physicalEnabled: dto.physicalDetails?.physicalEnabled ?? true,
          },
        });
      }

      // Create digital details
      if (dto.digitalDetails || format === BookFormat.DIGITAL || format === BookFormat.BOTH) {
        await tx.digitalBookDetails.create({
          data: {
            bookId: created.id,
            digitalEnabled: dto.digitalDetails?.digitalEnabled ?? true,
          },
        });
      }

      return created;
    });

    return this.findOne(book.id, actor);
  }

  async findOne(id: string, actor?: BookActor) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        author: true,
        publisher: true,
        physicalDetails: true,
        digitalDetails: true,
      },
    });

    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);

    const canAccess = await this.canManage(book, actor);
    if (book!.status !== BookStatus.PUBLISHED && !canAccess) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    const discountsMap = await this.getDiscountsMap([book!.id]);
    return this.serializeBook(book!, canAccess, discountsMap.get(book!.id));
  }

  async findAll(query: BookListQueryDto) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throwBadRequest(ErrorCode.VALIDATION_ERROR);
    }

    const where: any = { status: BookStatus.PUBLISHED };

    if (query.business || query.store) where.storeId = query.business || query.store;
    if (query.format) where.format = query.format;
    if (query.category) where.categoryId = query.category;
    if (query.author) where.authorId = query.author;
    if (query.publisher) where.publisherId = query.publisher;
    if (query.search) {
      const search = normalizeCatalogText(query.search);
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { normalizedTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const direction = query.order.toLowerCase();
    if (query.sortBy === BookSortBy.PUBLISHED_AT) orderBy.publishedAt = direction;
    else if (query.sortBy === BookSortBy.PRICE) orderBy.price = direction;
    else if (query.sortBy === BookSortBy.TITLE) orderBy.title = direction;
    else orderBy.createdAt = direction;

    // Select needed fields for public list view (including real inventory metrics)
    const listSelect = {
      id: true,
      storeId: true,
      title: true,
      slug: true,
      isbn: true,
      description: true,
      price: true,
      format: true,
      status: true,
      coverUrl: true,
      publishedAt: true,
      viewCount: true,
      category: true,
      author: true,
      publisher: true,
      physicalDetails: {
        select: {
          stock: true,
          reserved: true,
          physicalEnabled: true,
          weight: true,
        },
      },
    };


    const [books, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        select: listSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    const bookIds = books.map(b => b.id);
    const discountsMap = await this.getDiscountsMap(bookIds);

    return paginate(books.map(b => this.serializeBook(b, false, discountsMap.get(b.id))), total, query.page, query.limit);
  }

  async findOwned(query: BookListQueryDto, actor: BookActor) {
    const scope = await getSellerScope(actor);
    const conditions: any[] = [];

    if (!scope.isPlatformAdmin) {
      const orConditions: any[] = [];
      if (scope.storeIds.length > 0) {
        orConditions.push({ storeId: { in: scope.storeIds } });
      }
      if (scope.businessIds.length > 0) {
        orConditions.push({ storeId: { in: scope.businessIds } });
      }
      if (scope.ownerUserIds.length > 0) {
        orConditions.push({ ownerUserId: { in: scope.ownerUserIds } });
      }
      if (actor.sub) {
        orConditions.push({ ownerUserId: actor.sub });
      }

      if (query.business || query.store) {
        const target = (query.business || query.store) as string;
        orConditions.push({ storeId: target });
      }

      if (orConditions.length === 0) {
        return paginate([], 0, query.page, query.limit);
      }
      conditions.push({ OR: orConditions });
    } else if (query.business || query.store) {
      const target = (query.business || query.store) as string;
      conditions.push({
        OR: [
          { storeId: target },
          { storeId: { in: [query.business, query.store].filter(Boolean) as string[] } },
        ],
      });
    }

    if (query.format) conditions.push({ format: query.format });
    if (query.category) conditions.push({ categoryId: query.category });
    if (query.search) {
      const search = normalizeCatalogText(query.search);
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { normalizedTitle: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = conditions.length > 0 ? { AND: conditions } : {};

    const orderBy: any = {};
    const direction = query.order.toLowerCase();
    if (query.sortBy === BookSortBy.PUBLISHED_AT) orderBy.publishedAt = direction;
    else if (query.sortBy === BookSortBy.PRICE) orderBy.price = direction;
    else if (query.sortBy === BookSortBy.TITLE) orderBy.title = direction;
    else orderBy.createdAt = direction;

    const [books, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        include: {
          category: true,
          author: true,
          publisher: true,
          physicalDetails: true,
          digitalDetails: true,
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    return paginate(books.map(book => this.serializeBook(book, true)), total, query.page, query.limit);
  }

  async findBySlug(slug: string, actor?: BookActor) {
    const book = await this.prisma.book.findFirst({
      where: { slug },
      include: {
        category: true,
        author: true,
        publisher: true,
        physicalDetails: true,
        digitalDetails: true,
      },
    });

    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);

    const canAccess = await this.canManage(book, actor);
    if (book!.status !== BookStatus.PUBLISHED && !canAccess) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    const discountsMap = await this.getDiscountsMap([book!.id]);
    return this.serializeBook(book!, canAccess, discountsMap.get(book!.id));
  }

  async update(id: string, dto: UpdateBookDto, actor: BookActor) {
    const existing = await this.prisma.book.findUnique({ where: { id } });
    if (!existing) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    const canManage = await this.canManage(existing, actor);
    if (!canManage) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

    if (existing!.status === BookStatus.ARCHIVED) {
      throwConflict(ErrorCode.BOOK_ARCHIVED);
    }

    if (this.sanctionsService) {
      await this.sanctionsService.assertCanMutateBooks(existing!.storeId);
    }

    const categoryId = dto.categoryId ?? existing!.categoryId;
    const authorId = dto.authorId ?? existing!.authorId;
    const publisherId = dto.publisherId ?? existing!.publisherId;

    if (categoryId || authorId || publisherId) {
      await this.validateCatalog(categoryId, authorId, publisherId);
    }

    const title = dto.title?.trim() ?? existing!.title;
    const slug = dto.slug ?? existing!.slug;

    if (slug !== existing!.slug) {
      await this.ensureSlugAvailable(existing!.storeId, slug, id);
    }

    const coverUrl = (dto as any).coverUrl || (dto as any).coverImage || existing!.coverUrl;

    const updated = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.update({
        where: { id },
        data: {
          title,
          normalizedTitle: normalizeCatalogText(title),
          slug,
          isbn: dto.isbn === undefined ? existing!.isbn : dto.isbn ?? null,
          description: dto.description?.trim() ?? existing!.description,
          price: dto.price ?? existing!.price,
          coverUrl,
          categoryId,
          authorId,
          publisherId,
          format: dto.format ?? existing!.format,
        },
      });

      if (dto.physicalDetails) {
        const dim = (dto.physicalDetails.length && dto.physicalDetails.width && dto.physicalDetails.height)
          ? `${dto.physicalDetails.length}x${dto.physicalDetails.width}x${dto.physicalDetails.height}`
          : undefined;

        await tx.physicalBookDetails.upsert({
          where: { bookId: id },
          create: {
            bookId: id,
            stock: dto.physicalDetails.stock ?? 100,
            weight: dto.physicalDetails.weight ?? 300,
            dimensions: dim,
            physicalEnabled: dto.physicalDetails.physicalEnabled ?? true,
          },
          update: {
            ...(dto.physicalDetails.stock !== undefined ? { stock: dto.physicalDetails.stock } : {}),
            ...(dto.physicalDetails.weight !== undefined ? { weight: dto.physicalDetails.weight } : {}),
            ...(dim !== undefined ? { dimensions: dim } : {}),
            ...(dto.physicalDetails.physicalEnabled !== undefined ? { physicalEnabled: dto.physicalDetails.physicalEnabled } : {}),
          },
        });
      }

      if (dto.digitalDetails) {
        await tx.digitalBookDetails.upsert({
          where: { bookId: id },
          create: {
            bookId: id,
            digitalEnabled: dto.digitalDetails.digitalEnabled ?? true,
          },
          update: {
            ...(dto.digitalDetails.digitalEnabled !== undefined ? { digitalEnabled: dto.digitalDetails.digitalEnabled } : {}),
          },
        });
      }

      return book;
    });

    return this.findOne(updated.id, actor);
  }

  async findForWrite(id: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    const canManage = await this.canManage(book, actor);
    if (!canManage) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);
    return book;
  }

  async publish(id: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    const canManage = await this.canManage(book, actor);
    if (!canManage) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

    return this.prisma.book.update({
      where: { id },
      data: {
        status: BookStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async remove(id: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    const canManage = await this.canManage(book, actor);
    if (!canManage) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

    await this.prisma.book.delete({ where: { id } });
  }

  private async canManage(book: any, actor?: BookActor): Promise<boolean> {
    if (!actor) return false;
    if (actor.role === 'PLATFORM_ADMIN') return true;
    if (book.ownerUserId === actor.sub) return true;

    const scope = await getSellerScope(actor);
    return (
      scope.ownerUserIds.includes(book.ownerUserId) ||
      scope.storeIds.includes(book.storeId) ||
      scope.businessIds.includes(book.storeId)
    );
  }

  private async validateCatalog(categoryId: string | null, authorId: string | null, publisherId: string | null) {
    if (categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat || !cat.isActive) throwNotFound(ErrorCode.CATEGORY_NOT_FOUND);
    }
    if (authorId) {
      const author = await this.prisma.author.findUnique({ where: { id: authorId } });
      if (!author || !author.isActive) throwNotFound(ErrorCode.AUTHOR_NOT_FOUND);
    }
    if (publisherId) {
      const pub = await this.prisma.publisher.findUnique({ where: { id: publisherId } });
      if (!pub || !pub.isActive) throwNotFound(ErrorCode.PUBLISHER_NOT_FOUND);
    }
  }

  private validateFormatPayload(format: BookFormat, physical?: any, digital?: any) {
    if ((new Set<BookFormat>([BookFormat.PHYSICAL, BookFormat.BOTH])).has(format) && !physical) {
      throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
    }
    if ((new Set<BookFormat>([BookFormat.DIGITAL, BookFormat.BOTH])).has(format) && !digital) {
      throwConflict(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
    }
  }

  private async ensureSlugAvailable(storeId: string, slug: string, excludeId?: string) {
    const existing = await this.prisma.book.findFirst({
      where: { storeId, slug, ...(excludeId && { NOT: { id: excludeId } }) },
    });
    if (existing) throwConflict(ErrorCode.BOOK_SLUG_EXISTS);
  }

  private async getDiscountsMap(bookIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!bookIds || bookIds.length === 0) return map;

    const promotionPort = process.env.PROMOTION_SERVICE_PORT || 3007;
    try {
      const res = await fetch(`http://localhost:${promotionPort}/api/v1/discounts/batch-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookIds }),
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        const items = json.data || json;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.bookId && (item.isCurrentlyActive ?? true)) {
              map.set(item.bookId, item);
            }
          }
        }
      }
    } catch {
      // Ignore promotion service unreachable in testing
    }
    return map;
  }

  private serializeBook(book: any, isPrivate: boolean, discount?: any) {
    const physical = book.physicalDetails;
    const stock = physical?.stock ?? 0;
    const reserved = physical?.reserved ?? 0;
    const available = Math.max(0, stock - reserved);

    const basePrice = Number(book.price);
    let salePrice = basePrice;
    let originalPrice: number | undefined = undefined;
    let discountPercent: number | undefined = undefined;
    let discountAmount: number | undefined = undefined;
    let hasActiveDiscount = false;

    if (discount && discount.value > 0) {
      if (discount.type === 'PERCENTAGE') {
        salePrice = Math.max(0, Math.round(basePrice * (1 - Number(discount.value) / 100)));
        discountPercent = Number(discount.value);
        discountAmount = basePrice - salePrice;
        originalPrice = basePrice;
        hasActiveDiscount = true;
      } else if (discount.type === 'FIXED_AMOUNT') {
        salePrice = Math.max(0, Math.round(basePrice - Number(discount.value)));
        discountAmount = Number(discount.value);
        discountPercent = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;
        originalPrice = basePrice;
        hasActiveDiscount = true;
      }
    }

    return {
      id: book.id,
      storeId: book.storeId,
      businessId: book.storeId,
      title: book.title,
      slug: book.slug,
      isbn: book.isbn,
      description: book.description,
      price: salePrice,
      originalPrice,
      discountPercent,
      discountAmount,
      discountType: discount?.type ?? null,
      hasActiveDiscount,
      format: book.format,
      status: book.status,
      coverUrl: book.coverUrl,
      publishedAt: book.publishedAt,
      viewCount: book.viewCount,
      category: book.category,
      author: book.author,
      publisher: book.publisher,
      stock,
      reserved,
      available,
      weight: physical?.weight ?? null,
      physicalEnabled: physical?.physicalEnabled ?? true,
      ...(isPrivate && {
        physicalDetails: book.physicalDetails,
        digitalDetails: book.digitalDetails,
      }),
    };
  }
}

