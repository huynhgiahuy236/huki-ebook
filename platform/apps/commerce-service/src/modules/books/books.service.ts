import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { paginate } from '../../common/pagination.util';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookListQueryDto, BookSortBy } from './dto/book-list-query.dto';
import { BookFormat, BookStatus } from '../../../prisma/generated/client';
import { throwConflict, throwNotFound, throwForbidden, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto, actor: BookActor) {
    await this.validateCatalog(dto.categoryId, dto.authorId, dto.publisherId);
    this.validateFormatPayload(dto.format, dto.physicalDetails, dto.digitalDetails);

    const title = dto.title.trim();
    const slug = dto.slug ?? toCatalogSlug(title);
    await this.ensureSlugAvailable(dto.storeId, slug);

    const book = await this.prisma.$transaction(async (tx) => {
      const created = await tx.book.create({
        data: {
          storeId: dto.storeId,
          ownerUserId: actor.sub,
          title,
          normalizedTitle: normalizeCatalogText(title),
          slug,
          isbn: dto.isbn ?? null,
          description: dto.description.trim(),
          price: dto.price,
          categoryId: dto.categoryId,
          authorId: dto.authorId,
          publisherId: dto.publisherId,
          format: dto.format,
          status: BookStatus.DRAFT,
        },
      });

      // Create physical details
      if (dto.physicalDetails) {
        await tx.physicalBookDetails.create({
          data: {
            bookId: created.id,
            stock: dto.physicalDetails.stock ?? 0,
            reserved: 0,
            weight: dto.physicalDetails.weight,
            physicalEnabled: dto.physicalDetails.physicalEnabled ?? true,
          },
        });
      }

      // Create digital details
      if (dto.digitalDetails) {
        await tx.digitalBookDetails.create({
          data: {
            bookId: created.id,
            digitalEnabled: dto.digitalDetails.digitalEnabled ?? true,
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

    const canAccess = this.canManage(book, actor);
    if (book!.status !== BookStatus.PUBLISHED && !canAccess) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    return this.serializeBook(book!, canAccess);
  }

  async findAll(query: BookListQueryDto) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throwBadRequest(ErrorCode.VALIDATION_ERROR);
    }

    const where: any = { status: BookStatus.PUBLISHED };

    if (query.search) {
      const search = normalizeCatalogText(query.search);
      if (search.length < 2) {
        throwBadRequest(ErrorCode.VALIDATION_MIN_LENGTH);
      }
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { normalizedTitle: { contains: search, mode: 'insensitive' } },
        { author: { name: { contains: search, mode: 'insensitive' } } },
        { publisher: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (query.category) where.categoryId = query.category;
    if (query.author) where.authorId = query.author;
    if (query.publisher) where.publisherId = query.publisher;
    if (query.store) where.storeId = query.store;
    if (query.format) where.format = query.format;
    if (query.minPrice !== undefined) where.price = { ...where.price, gte: query.minPrice };
    if (query.maxPrice !== undefined) where.price = { ...where.price, lte: query.maxPrice };

    const orderBy: any = {};
    if (query.sortBy === BookSortBy.CREATED_AT) orderBy.createdAt = query.order;
    else if (query.sortBy === BookSortBy.PUBLISHED_AT) orderBy.publishedAt = query.order;
    else if (query.sortBy === BookSortBy.PRICE) orderBy.price = query.order;
    else orderBy.title = query.order;

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

    return paginate(books.map(b => this.serializeBook(b, false)), total, query.page, query.limit);
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

    const canAccess = this.canManage(book, actor);
    if (book!.status !== BookStatus.PUBLISHED && !canAccess) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    return this.serializeBook(book!, canAccess);
  }

  async update(id: string, dto: UpdateBookDto, actor: BookActor) {
    const existing = await this.prisma.book.findUnique({ where: { id } });
    if (!existing) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    if (!this.canManage(existing, actor)) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

    if (existing!.status === BookStatus.PUBLISHED) {
      throwConflict(ErrorCode.BOOK_ARCHIVED);
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

    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        title,
        normalizedTitle: normalizeCatalogText(title),
        slug,
        isbn: dto.isbn === undefined ? existing!.isbn : dto.isbn ?? null,
        description: dto.description?.trim() ?? existing!.description,
        price: dto.price ?? existing!.price,
        categoryId,
        authorId,
        publisherId,
        format: dto.format ?? existing!.format,
      },
    });

    return this.findOne(updated.id, actor);
  }

  async findForWrite(id: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    if (!this.canManage(book, actor)) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);
    return book;
  }

  async publish(id: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    if (!this.canManage(book, actor)) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

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
    if (!this.canManage(book, actor)) throwForbidden(ErrorCode.BOOK_UNAUTHORIZED);

    await this.prisma.book.delete({ where: { id } });
  }

  private canManage(book: any, actor?: BookActor): boolean {
    return !!actor && (actor.role === 'PLATFORM_ADMIN' || book.ownerUserId === actor.sub);
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

  private serializeBook(book: any, isPrivate: boolean) {
    return {
      id: book.id,
      storeId: book.storeId,
      title: book.title,
      slug: book.slug,
      isbn: book.isbn,
      description: book.description,
      price: Number(book.price),
      format: book.format,
      status: book.status,
      coverUrl: book.coverUrl,
      publishedAt: book.publishedAt,
      viewCount: book.viewCount,
      category: book.category,
      author: book.author,
      publisher: book.publisher,
      ...(isPrivate && {
        physicalDetails: book.physicalDetails,
        digitalDetails: book.digitalDetails,
      }),
    };
  }
}
