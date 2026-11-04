import { Inject, Injectable, OnModuleInit, Optional, HttpStatus } from '@nestjs/common';
import { EBOOK_STORAGE, EbookStorage } from './storage/storage.interfaces';

export const REAL_EBOOK_MAPPINGS: Record<string, string> = {
  '1001-cach-giu-chan-khach-hang': 'ebooks/1001-cach-giu-chan-khach-hang.pdf',
  '101-y-tuong-quang-cao-khon-ngoan': 'ebooks/101-y-tuong-quang-cao-khon-ngoan.pdf',
  '12-tuyet-ky-ban-hang-brian-tracy': 'ebooks/12-tuyet-ky-ban-hang-brian-tracy.pdf',
  '7-thoi-quen-de-thanh-dat': 'ebooks/7-thoi-quen-de-thanh-dat.pdf',
  'ai-lay-mieng-phomat-cua-toi': 'ebooks/ai-lay-mieng-phomat-cua-toi.pdf',
  'bi-quyet-gay-dung-co-nghiep-bac-ty': 'ebooks/bi-quyet-gay-dung-co-ngo-bac-ty.pdf',
  'chiec-lexus-va-cay-oliu': 'ebooks/chiec-lexus-va-cay-oliu.pdf',
  'chien-thang-con-quy-trong-ban': 'ebooks/chien-thang-con-quy-trong-ban.pdf',
  'con-duong-phia-truoc': 'ebooks/con-duong-phia-truoc.pdf',
  'dac-nhan-tam': 'ebooks/dac-nhan-tam.pdf',
  'dam-chap-nhan': 'ebooks/dam-chap-nhan.pdf',
  'dam-nghi-lon': 'ebooks/dam-nghi-lon.pdf',
  'danh-cap-y-tuong': 'ebooks/danh-cap-y-tuong.pdf',
  'doc-vi-bat-ky-ai': 'ebooks/doc-vi-bat-ky-ai.pdf',
  'doc-vi-khach-hang': 'ebooks/doc-vi-khach-hang.pdf',
  'dung-bao-gio-di-an-mot-minh': 'ebooks/dung-bao-gio-di-an-mot-minh.pdf',
  'facebook-marketing-tu-a-den-z': 'ebooks/facebook-marketing-a-z.pdf',
  'hanh-trinh-ve-phuong-dong': 'ebooks/hanh-trinh-ve-phuong-dong.pdf',
  'hen-ban-tren-dinh-thanh-cong': 'ebooks/hen-ban-tren-dinh-thanh-cong.pdf',
  'kotler-ban-ve-tiep-thi': 'ebooks/kotler-ban-ve-tiep-thi.pdf',
  'lam-chu-tu-duy-thay-doi-van-menh': 'ebooks/lam-chu-tu-duy-thay-doi-van-menh.pdf',
  'ngay-xua-co-mot-con-bo': 'ebooks/ngay-xua-co-mot-con-bo.pdf',
  'nha-gia-kim': 'ebooks/nhagiakim.pdf',
  'nghe-thuat-ban-hang-bac-cao': 'ebooks/nghe-thuat-ban-hang-bac-cao.pdf',
  'nghi-lon-de-thanh-cong': 'ebooks/nghi-lon-de-thanh-cong.pdf',
  'nghi-lon-va-lam-giau': 'ebooks/nghi-lon-va-lam-giau.pdf',
  'the-gioi-phang': 'ebooks/the-gioi-phang.pdf',
  'the-gioi-phang-the-world-is-flat': 'ebooks/the-gioi-phang.pdf',
  'toi-tai-gioi-ban-cung-the': 'ebooks/toi-tai-gioi-ban-cung-the.pdf',
  'tren-duong-bang-tony-buoi-sang': 'ebooks/tren-duong-bang-tony-buoi-sang.pdf',
  'tren-duong-bang': 'ebooks/tren-duong-bang-tony-buoi-sang.pdf',
  'tu-duy-dot-pha': 'ebooks/tu-duy-dot-pha.pdf',
  'tu-huyet-cam-xuc': 'ebooks/tu-huyet-cam-xuc.pdf',
  'tu-tot-den-vi-dai': 'ebooks/tu-tot-den-vi-dai.pdf',
  'tuoi-tre-dang-gia-bao-nhieu': 'ebooks/tuoi-tre-dang-gia-bao-nhieu.pdf',
  'ty-phu-ban-giay': 'ebooks/ty-phu-ban-giay.pdf',
  'ty-phu-ban-giay-delivering-happiness': 'ebooks/ty-phu-ban-giay.pdf',
  'vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua': 'ebooks/vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua.pdf',
};
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
import { DrmVaultService } from './drm-vault.service';

@Injectable()
export class BooksService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly sanctionsService?: SanctionsService,
    @Optional() private readonly drmVaultService?: DrmVaultService,
    @Optional() @Inject(EBOOK_STORAGE) private readonly ebookStorage?: EbookStorage,
  ) {}

  async onModuleInit() {
    try {
      await this.syncRealPdfKeys();
    } catch (err: any) {
      console.warn('[BooksService] Tự động đồng bộ khóa PDF khởi động:', err?.message || err);
    }
  }

  async syncRealPdfKeys() {
    for (const [slug, pdfKey] of Object.entries(REAL_EBOOK_MAPPINGS)) {
      const book = await this.prisma.book.findFirst({
        where: { slug },
        include: { digitalDetails: true },
      });
      if (book) {
        if (!book.digitalDetails) {
          await this.prisma.digitalBookDetails.create({
            data: {
              bookId: book.id,
              pdfKey,
              digitalEnabled: true,
              accessType: 'FREE',
            },
          }).catch(() => null);
        } else if (book.digitalDetails.pdfKey !== pdfKey) {
          await this.prisma.digitalBookDetails.update({
            where: { bookId: book.id },
            data: { pdfKey, digitalEnabled: true },
          }).catch(() => null);
        }
      }
    }
  }

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

      // Persist affiliate eligibility choice (Seller explicitly chooses Yes/No during creation)
      if (dto.enableAffiliate !== undefined) {
        await tx.bookAffiliateSetting.create({
          data: {
            bookId: created.id,
            storeId,
            isEligible: Boolean(dto.enableAffiliate),
            updatedBy: actor.sub,
          },
        });
      }

      return created;
    });

    // Tự động cấp phép DRM nếu là sách số (DIGITAL hoặc BOTH)
    if (format === BookFormat.DIGITAL || format === BookFormat.BOTH) {
      try {
        await this.drmVaultService?.provisionLicenseForBook(book.id);
      } catch (err) {
        // Log warning nhưng không chặn luồng tạo sách
        console.warn(`[DRM Auto-provision] Không thể cấp khóa ngay cho sách ${book.id}:`, err);
      }
    }

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
        affiliateSetting: true,
      },
    });

    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);

    const canAccess = await this.canManage(book, actor);
    if (book!.status !== BookStatus.PUBLISHED && !canAccess) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    const discountsMap = await this.getDiscountsMap([book!.id]);
    const sales = await this.prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        bookId: book!.id,
        sellerOrder: {
          status: { not: 'CANCELLED' },
          order: { status: { not: 'CANCELLED' } },
        },
      },
    });
    const soldCount = sales._sum.quantity || 0;
    return this.serializeBook(book!, canAccess, discountsMap.get(book!.id), soldCount);
  }

  async findAll(query: BookListQueryDto) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throwBadRequest(ErrorCode.VALIDATION_ERROR);
    }

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    } else if (!query.status) {
      where.status = BookStatus.PUBLISHED;
    }

    if (query.business || query.store) where.storeId = query.business || query.store;
    if (query.format) where.format = query.format;
    const catVal = query.categoryId || query.category;
    if (catVal) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(catVal);
      if (isUuid) {
        where.categoryId = catVal;
      } else {
        where.category = { is: { slug: catVal } };
      }
    }
    if (query.author) where.authorId = query.author;
    if (query.publisher) where.publisherId = query.publisher;
    if (query.search) {
      const rawSearch = query.search.trim();
      const search = normalizeCatalogText(query.search);
      where.OR = [
        { title: { contains: rawSearch, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { normalizedTitle: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: rawSearch, mode: 'insensitive' } },
        { author: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
        { author: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
        { publisher: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
        { publisher: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
        { category: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
        { category: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
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

    const salesMap = new Map<string, number>();
    if (bookIds.length > 0) {
      const salesGroup = await this.prisma.orderItem.groupBy({
        by: ['bookId'],
        _sum: { quantity: true },
        where: {
          bookId: { in: bookIds },
          sellerOrder: {
            status: { not: 'CANCELLED' },
            order: { status: { not: 'CANCELLED' } },
          },
        },
      });
      for (const item of salesGroup) {
        salesMap.set(item.bookId, item._sum.quantity || 0);
      }
    }

    return paginate(books.map(b => this.serializeBook(b, false, discountsMap.get(b.id), salesMap.get(b.id) || 0)), total, query.page, query.limit);
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

    if (query.status && query.status !== 'ALL') conditions.push({ status: query.status });
    if (query.format) conditions.push({ format: query.format });
    if (query.category) conditions.push({ categoryId: query.category });
    if (query.search) {
      const rawSearch = query.search.trim();
      const search = normalizeCatalogText(query.search);
      conditions.push({
        OR: [
          { title: { contains: rawSearch, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { normalizedTitle: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: rawSearch, mode: 'insensitive' } },
          { author: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
          { author: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
          { publisher: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
          { publisher: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
          { category: { is: { name: { contains: rawSearch, mode: 'insensitive' } } } },
          { category: { is: { normalizedName: { contains: search, mode: 'insensitive' } } } },
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
          affiliateSetting: true,
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
    const sales = await this.prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        bookId: book!.id,
        sellerOrder: {
          status: { not: 'CANCELLED' },
          order: { status: { not: 'CANCELLED' } },
        },
      },
    });
    const soldCount = sales._sum.quantity || 0;
    return this.serializeBook(book!, canAccess, discountsMap.get(book!.id), soldCount);
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

      if (dto.enableAffiliate !== undefined) {
        await tx.bookAffiliateSetting.upsert({
          where: { bookId: id },
          create: {
            bookId: id,
            storeId: existing!.storeId,
            isEligible: Boolean(dto.enableAffiliate),
            updatedBy: actor.sub,
          },
          update: {
            isEligible: Boolean(dto.enableAffiliate),
            updatedBy: actor.sub,
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

  private serializeBook(book: any, isPrivate: boolean, discount?: any, soldCount: number = 0) {
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
      soldCount: Number(soldCount || 0),
      sales: Number(soldCount || 0),
      rating: 0,
      category: book.category,
      author: book.author,
      publisher: book.publisher,
      stock,
      reserved,
      available,
      weight: physical?.weight ?? null,
      physicalEnabled: physical?.physicalEnabled ?? true,
      isAffiliateEligible: Boolean(book.affiliateSetting?.isEligible),
      affiliateSetting: book.affiliateSetting
        ? {
            isEligible: book.affiliateSetting.isEligible,
            customRate: book.affiliateSetting.customRate
              ? Number(book.affiliateSetting.customRate)
              : null,
          }
        : null,
      ...(isPrivate && {
        physicalDetails: book.physicalDetails,
        digitalDetails: book.digitalDetails,
      }),
    };
  }

  async streamPdf(idOrSlug: string, req: any, res: any) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const book = await this.prisma.book.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: { digitalDetails: true },
    });

    if (!book) {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'BOOK_NOT_FOUND',
        message: 'Không tìm thấy tác phẩm trong hệ thống',
      });
      return;
    }

    let pdfKey = book.digitalDetails?.pdfKey;
    if (!pdfKey && REAL_EBOOK_MAPPINGS[book.slug]) {
      pdfKey = REAL_EBOOK_MAPPINGS[book.slug];
      if (!book.digitalDetails) {
        await this.prisma.digitalBookDetails.create({
          data: {
            bookId: book.id,
            pdfKey,
            digitalEnabled: true,
            accessType: 'FREE',
          },
        }).catch(() => null);
      } else {
        await this.prisma.digitalBookDetails.update({
          where: { bookId: book.id },
          data: { pdfKey, digitalEnabled: true },
        }).catch(() => null);
      }
    }

    if (!pdfKey) {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NO_PDF_AVAILABLE',
        message: 'Tác phẩm này hiện chưa có bản đọc số điện tử.',
      });
      return;
    }

    try {
      if (!this.ebookStorage?.getStream) {
        throw new Error('Hệ thống lưu trữ sách điện tử chưa được cấu hình bộ đọc trực tuyến');
      }

      const rangeHeader = req.headers?.range;
      const fileData = await this.ebookStorage.getStream(pdfKey, rangeHeader);

      res.setHeader('Content-Type', fileData.contentType || 'application/pdf');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(book.slug || book.id)}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (rangeHeader && fileData.contentRange) {
        res.status(HttpStatus.PARTIAL_CONTENT);
        res.setHeader('Content-Range', fileData.contentRange);
        if (fileData.contentLength !== undefined) {
          res.setHeader('Content-Length', fileData.contentLength.toString());
        }
      } else if (fileData.contentLength !== undefined) {
        res.setHeader('Content-Length', fileData.contentLength.toString());
      }

      fileData.stream.pipe(res);
    } catch (err: any) {
      console.error(`[BooksService] Error streaming PDF for key ${pdfKey}:`, err?.message || err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'PDF_STREAM_ERROR',
        message: 'Lỗi nạp tệp PDF từ hệ thống lưu trữ đám mây.',
      });
    }
  }
}
