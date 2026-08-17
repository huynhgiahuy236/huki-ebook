import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BookActor } from '../../common/book-auth.guard';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import {
  Author,
  Book,
  BookFormat,
  BookStatus,
  Category,
  DigitalBookDetails,
  PhysicalBookDetails,
  Publisher,
} from '../../entities';
import { serializeBook } from './book-response.util';
import { CreateBookDto } from './dto/create-book.dto';
import { DigitalBookDetailsDto, PhysicalBookDetailsDto } from './dto/book-details.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import {
  BookListQueryDto,
  BookSortBy,
} from './dto/book-list-query.dto';
import { paginate } from '../../common/pagination.util';

const BOOK_RELATIONS = {
  category: true,
  author: true,
  publisher: true,
  physicalDetails: true,
  digitalDetails: true,
} as const;

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Author) private readonly authorRepository: Repository<Author>,
    @InjectRepository(Publisher) private readonly publisherRepository: Repository<Publisher>,
  ) {}

  async create(dto: CreateBookDto, actor: BookActor) {
    await this.validateCatalog(dto.categoryId, dto.authorId, dto.publisherId);
    this.validateFormatPayload(dto.format, dto.physicalDetails, dto.digitalDetails);

    const title = dto.title.trim();
    const slug = dto.slug ?? toCatalogSlug(title);
    await this.ensureSlugAvailable(dto.storeId, slug);

    const id = await this.bookRepository.manager.transaction(async (manager) => {
      const book = await manager.getRepository(Book).save(
        manager.getRepository(Book).create({
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
          coverUrl: null,
          coverPublicId: null,
          status: BookStatus.DRAFT,
          publishedAt: null,
          viewCount: 0,
        }),
      );
      await this.syncDetails(manager, book.id, dto.format, dto.physicalDetails, dto.digitalDetails);
      return book.id;
    });
    return serializeBook(await this.findEntity(id), true);
  }

  async findOne(id: string, actor?: BookActor) {
    const book = await this.findEntity(id);
    const privateAccess = this.canManage(book, actor);
    if (book.status !== BookStatus.PUBLISHED && !privateAccess) {
      throw new NotFoundException('Book not found');
    }
    return serializeBook(book, privateAccess);
  }

  async findAll(query: BookListQueryDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const builder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.physicalDetails', 'physicalDetails')
      .leftJoinAndSelect('book.digitalDetails', 'digitalDetails')
      .where('book.status = :status', { status: BookStatus.PUBLISHED });

    let hasSearch = false;
    if (query.search) {
      const normalizedSearch = normalizeCatalogText(query.search);
      if (normalizedSearch.length < 2) {
        throw new BadRequestException(
          'Search query must contain at least 2 searchable characters',
        );
      }
      hasSearch = true;
      const isbnSearch = query.search.replace(/[^0-9Xx]/g, '').toUpperCase();
      const searchParams = {
        search: normalizedSearch,
        searchPrefix: `${normalizedSearch}%`,
        isbnSearch,
      };
      builder.andWhere(
        `(book.search_vector @@ websearch_to_tsquery('simple', :search)
          OR book.normalizedTitle % :search
          OR book.normalizedTitle LIKE :searchPrefix
          OR author.normalizedName % :search
          OR publisher.normalizedName % :search
          OR (:isbnSearch <> '' AND
            regexp_replace(COALESCE(book.isbn, ''), '[^0-9Xx]', '', 'g') = :isbnSearch))`,
        searchParams,
      );
      builder.addSelect(
        `(CASE
            WHEN regexp_replace(COALESCE(book.isbn, ''), '[^0-9Xx]', '', 'g') = :isbnSearch
              AND :isbnSearch <> '' THEN 5.0
            WHEN book.normalizedTitle = :search THEN 4.0
            WHEN book.normalizedTitle LIKE :searchPrefix THEN 3.0
            ELSE 1.0
          END
          + ts_rank(book.search_vector, websearch_to_tsquery('simple', :search))
          + GREATEST(
              similarity(book.normalizedTitle, :search),
              similarity(author.normalizedName, :search),
              similarity(publisher.normalizedName, :search)
            ))`,
        'search_rank',
      );
      builder.setParameters(searchParams);
    }

    if (query.category) {
      if (query.includeChildren) {
        builder.andWhere(
          `book.categoryId IN (
             WITH RECURSIVE descendants AS (
               SELECT id FROM categories
               WHERE (id::text = :category OR slug = :category)
                 AND is_active = true AND deleted_at IS NULL
               UNION ALL
               SELECT child.id FROM categories child
               JOIN descendants parent ON child.parent_id = parent.id
               WHERE child.is_active = true AND child.deleted_at IS NULL
             ) SELECT id FROM descendants
           )`,
          { category: query.category },
        );
      } else {
        builder.andWhere('(category.id::text = :category OR category.slug = :category)', {
          category: query.category,
        });
      }
    }
    if (query.author) {
      builder.andWhere('(author.id::text = :author OR author.slug = :author)', {
        author: query.author,
      });
    }
    if (query.publisher) {
      builder.andWhere('(publisher.id::text = :publisher OR publisher.slug = :publisher)', {
        publisher: query.publisher,
      });
    }
    if (query.store) builder.andWhere('book.storeId = :store', { store: query.store });
    if (query.format === BookFormat.PHYSICAL) {
      builder.andWhere('book.format IN (:...formats)', {
        formats: [BookFormat.PHYSICAL, BookFormat.BOTH],
      });
    } else if (query.format === BookFormat.DIGITAL) {
      builder.andWhere('book.format IN (:...formats)', {
        formats: [BookFormat.DIGITAL, BookFormat.BOTH],
      });
    } else if (query.format === BookFormat.BOTH) {
      builder.andWhere('book.format = :format', { format: BookFormat.BOTH });
    }
    if (query.minPrice !== undefined) {
      builder.andWhere('book.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      builder.andWhere('book.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const sortColumns: Record<BookSortBy, string> = {
      [BookSortBy.CREATED_AT]: 'book.createdAt',
      [BookSortBy.PUBLISHED_AT]: 'book.publishedAt',
      [BookSortBy.PRICE]: 'book.price',
      [BookSortBy.TITLE]: 'book.title',
    };
    if (hasSearch) {
      builder.orderBy('search_rank', 'DESC').addOrderBy(sortColumns[query.sortBy], query.order);
    } else {
      builder.orderBy(sortColumns[query.sortBy], query.order);
    }
    builder
      .addOrderBy('book.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [books, total] = await builder.getManyAndCount();
    return paginate(
      books.map((book) => serializeBook(book, false)),
      total,
      query.page,
      query.limit,
    );
  }

  async findBySlug(slug: string, actor?: BookActor) {
    const book = await this.bookRepository.findOne({ where: { slug }, relations: BOOK_RELATIONS });
    if (!book) throw new NotFoundException('Book not found');
    const privateAccess = this.canManage(book, actor);
    if (book.status !== BookStatus.PUBLISHED && !privateAccess) {
      throw new NotFoundException('Book not found');
    }
    return serializeBook(book, privateAccess);
  }

  async update(id: string, dto: UpdateBookDto, actor: BookActor) {
    const book = await this.findForWrite(id, actor);
    if (book.status === BookStatus.PUBLISHED) {
      throw new ConflictException('Hide the book before changing catalog details');
    }
    if (book.status === BookStatus.SUSPENDED && actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Suspended books cannot be modified');
    }
    const categoryId = dto.categoryId ?? book.categoryId;
    const authorId = dto.authorId ?? book.authorId;
    const publisherId = dto.publisherId ?? book.publisherId;
    await this.validateCatalog(categoryId, authorId, publisherId);

    const format = dto.format ?? book.format;
    const physical = dto.physicalDetails ?? this.physicalDto(book.physicalDetails);
    const digital = dto.digitalDetails ?? this.digitalDto(book.digitalDetails);
    this.validateFormatPayload(format, physical, digital);

    const title = dto.title?.trim() ?? book.title;
    const slug = dto.slug ?? book.slug;
    await this.ensureSlugAvailable(book.storeId, slug, id);

    await this.bookRepository.manager.transaction(async (manager) => {
      Object.assign(book, {
        title,
        normalizedTitle: normalizeCatalogText(title),
        slug,
        isbn: dto.isbn === undefined ? book.isbn : dto.isbn ?? null,
        description: dto.description?.trim() ?? book.description,
        price: dto.price ?? book.price,
        categoryId,
        authorId,
        publisherId,
        format,
      });
      await manager.getRepository(Book).save(book);
      await this.syncDetails(manager, id, format, physical, digital);
    });
    return serializeBook(await this.findEntity(id), true);
  }

  async remove(id: string, actor: BookActor): Promise<void> {
    const book = await this.findForWrite(id, actor);
    await this.bookRepository.softRemove(book);
  }

  async findForWrite(id: string, actor: BookActor): Promise<Book> {
    const book = await this.findEntity(id);
    if (!this.canManage(book, actor)) {
      throw new ForbiddenException('You do not own this book');
    }
    return book;
  }

  private canManage(book: Book, actor?: BookActor): boolean {
    return !!actor && (actor.role === 'PLATFORM_ADMIN' || book.ownerUserId === actor.sub);
  }

  private async findEntity(id: string): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id }, relations: BOOK_RELATIONS });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  private async validateCatalog(categoryId: string, authorId: string, publisherId: string) {
    const [category, author, publisher] = await Promise.all([
      this.categoryRepository.findOne({ where: { id: categoryId, isActive: true } }),
      this.authorRepository.findOne({ where: { id: authorId, isActive: true } }),
      this.publisherRepository.findOne({ where: { id: publisherId, isActive: true } }),
    ]);
    if (!category) throw new NotFoundException('Active category not found');
    if (!author) throw new NotFoundException('Active author not found');
    if (!publisher) throw new NotFoundException('Active publisher not found');
  }

  private validateFormatPayload(
    format: BookFormat,
    physical?: object | null,
    digital?: object | null,
  ) {
    if ([BookFormat.PHYSICAL, BookFormat.BOTH].includes(format) && !physical) {
      throw new ConflictException('Physical details are required for this format');
    }
    if ([BookFormat.DIGITAL, BookFormat.BOTH].includes(format) && !digital) {
      throw new ConflictException('Digital details are required for this format');
    }
  }

  private async ensureSlugAvailable(storeId: string, slug: string, excludeId?: string) {
    const query = this.bookRepository
      .createQueryBuilder('book')
      .where('book.storeId = :storeId AND book.slug = :slug', { storeId, slug });
    if (excludeId) query.andWhere('book.id <> :excludeId', { excludeId });
    if (await query.getExists()) throw new ConflictException('Book slug already exists in this store');
  }

  private async syncDetails(
    manager: EntityManager,
    bookId: string,
    format: BookFormat,
    physical?: PhysicalBookDetailsDto | null,
    digital?: DigitalBookDetailsDto | null,
  ) {
    const physicalRepo = manager.getRepository(PhysicalBookDetails);
    const digitalRepo = manager.getRepository(DigitalBookDetails);
    if ([BookFormat.PHYSICAL, BookFormat.BOTH].includes(format) && physical) {
      const current = await physicalRepo.findOne({ where: { bookId } });
      await physicalRepo.save(
        physicalRepo.create({
          ...current,
          bookId,
          stock: physical.stock,
          reserved: current?.reserved ?? 0,
          weight: physical.weight,
          length: physical.length,
          width: physical.width,
          height: physical.height,
          physicalEnabled: physical.physicalEnabled ?? false,
          lowStockThreshold: physical.lowStockThreshold ?? 10,
        }),
      );
    } else {
      await physicalRepo.delete({ bookId });
    }

    if ([BookFormat.DIGITAL, BookFormat.BOTH].includes(format) && digital) {
      const current = await digitalRepo.findOne({ where: { bookId } });
      await digitalRepo.save(
        digitalRepo.create({
          ...current,
          bookId,
          sourcePdfKey: current?.sourcePdfKey ?? null,
          previewPdfKey: current?.previewPdfKey ?? null,
          epubKey: current?.epubKey ?? null,
          digitalEnabled: digital.digitalEnabled ?? false,
          allowOnlineRead: digital.allowOnlineRead ?? true,
          allowDownload: digital.allowDownload ?? false,
          fileSize: current?.fileSize ?? null,
          mimeType: current?.mimeType ?? null,
          checksum: current?.checksum ?? null,
        }),
      );
    } else {
      await digitalRepo.delete({ bookId });
    }
  }

  private physicalDto(details: PhysicalBookDetails | null): PhysicalBookDetailsDto | null {
    return details
      ? {
          stock: details.stock,
          weight: details.weight,
          length: details.length,
          width: details.width,
          height: details.height,
          physicalEnabled: details.physicalEnabled,
          lowStockThreshold: details.lowStockThreshold,
        }
      : null;
  }

  private digitalDto(details: DigitalBookDetails | null): DigitalBookDetailsDto | null {
    return details
      ? {
          digitalEnabled: details.digitalEnabled,
          allowOnlineRead: details.allowOnlineRead,
          allowDownload: details.allowDownload,
        }
      : null;
  }
}
