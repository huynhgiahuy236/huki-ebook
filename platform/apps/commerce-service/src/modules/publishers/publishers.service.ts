import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import {
  MAJOR_VN_ISSUING_COMPANIES,
  OFFICIAL_VN_PUBLISHERS,
} from './publishing-master-data';
import { throwConflict, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const PUBLISHER_CACHE_PREFIX = 'publishers:';
const ISSUING_COMPANY_CACHE_PREFIX = 'issuing_companies:';
const TRANSLATOR_CACHE_PREFIX = 'translators:';
const PUBLISHER_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class PublishersService implements OnModuleInit {
  private readonly logger = new Logger(PublishersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedPublishingMasterData();
    } catch (err) {
      this.logger.warn(
        `Skipping publishing master data seed on init: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async seedPublishingMasterData() {
    const prismaAny = this.prisma as any;
    if (prismaAny?.publisher?.createMany) {
      const pubRows = OFFICIAL_VN_PUBLISHERS.map((item) => ({
        name: item.name,
        normalizedName: normalizeCatalogText(item.name),
        slug: toCatalogSlug(item.name),
        description: item.description,
        isActive: true,
      }));
      await prismaAny.publisher.createMany({
        data: pubRows,
        skipDuplicates: true,
      });
    }

    if (prismaAny?.issuingCompany?.createMany) {
      const companyRows = MAJOR_VN_ISSUING_COMPANIES.map((item) => ({
        name: item.name,
        normalizedName: normalizeCatalogText(item.name),
        slug: toCatalogSlug(item.name),
        description: item.description,
        isActive: true,
      }));
      await prismaAny.issuingCompany.createMany({
        data: companyRows,
        skipDuplicates: true,
      });
    }
  }

  async create(dto: CreatePublisherDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    const publisher = await this.prisma.publisher.create({
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description?.trim() || null,
        logo: dto.logoUrl ?? null,
      },
    });

    await this.invalidateCache();
    return publisher;
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<any>> {
    // Try to get from cache for first page of active publishers (most common query)
    const cacheKey = this.getCacheKey(query);
    if (!query.includeInactive && query.page === 1) {
      const cached = await this.redis.get<PaginatedResult<any>>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for publishers list: ${cacheKey}`);
        return cached;
      }
    }

    const where = query.includeInactive ? {} : { isActive: true };

    // Select only needed fields for list view
    const listSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      isActive: true,
      createdAt: true,
    };

    const [publishers, total] = await this.prisma.$transaction([
      this.prisma.publisher.findMany({
        where,
        select: listSelect,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.publisher.count({ where }),
    ]);
    const result = paginate(publishers, total, query.page, query.limit);

    // Cache first page of active publishers
    if (!query.includeInactive && query.page === 1) {
      await this.redis.set(cacheKey, result, PUBLISHER_CACHE_TTL);
    }

    return result;
  }

  private getCacheKey(query: PageQueryDto): string {
    return `${PUBLISHER_CACHE_PREFIX}page:${query.page}:limit:${query.limit}`;
  }

  async findOne(id: string) {
    const publisher = await this.prisma.publisher.findUnique({ where: { id } });
    if (!publisher) throwNotFound(ErrorCode.PUBLISHER_NOT_FOUND);
    return publisher;
  }

  async update(id: string, dto: UpdatePublisherDto) {
    const existing = await this.findOne(id);
    const name = dto.name?.trim() ?? existing!.name;
    const slug = dto.slug ?? existing!.slug;
    const normalizedName = normalizeCatalogText(name);

    if (slug !== existing!.slug || normalizedName !== existing!.normalizedName) {
      await this.ensureUnique(slug, normalizedName, id);
    }

    const publisher = await this.prisma.publisher.update({
      where: { id },
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description === undefined ? existing!.description : dto.description?.trim() || null,
        logo: dto.logoUrl === undefined ? existing!.logo : dto.logoUrl,
        isActive: dto.isActive ?? existing!.isActive,
      },
    });

    await this.invalidateCache();
    return publisher;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.publisher.delete({ where: { id } });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.delPattern(`${PUBLISHER_CACHE_PREFIX}*`);
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const existing = await this.prisma.publisher.findFirst({
      where: {
        OR: [{ slug }, { normalizedName }],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (existing) {
      throwConflict(ErrorCode.PUBLISHER_SLUG_EXISTS);
    }
  }

  // ============================================
  // ISSUING COMPANIES (Đơn vị phát hành / Công ty sách)
  // ============================================

  async findAllIssuingCompanies(query: PageQueryDto): Promise<PaginatedResult<any>> {
    const cacheKey = `${ISSUING_COMPANY_CACHE_PREFIX}page:${query.page}:limit:${query.limit}`;
    if (!query.includeInactive && query.page === 1) {
      const cached = await this.redis.get<PaginatedResult<any>>(cacheKey);
      if (cached) return cached;
    }

    const where = query.includeInactive ? {} : { isActive: true };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.issuingCompany.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.issuingCompany.count({ where }),
    ]);

    const result = paginate(items, total, query.page, query.limit);
    if (!query.includeInactive && query.page === 1) {
      await this.redis.set(cacheKey, result, PUBLISHER_CACHE_TTL);
    }
    return result;
  }

  async findOneIssuingCompany(id: string) {
    const company = await this.prisma.issuingCompany.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Issuing company not found');
    return company;
  }

  async createIssuingCompany(dto: CreatePublisherDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);

    const existing = await this.prisma.issuingCompany.findFirst({
      where: { OR: [{ slug }, { normalizedName }] },
    });
    if (existing) {
      throw new ConflictException('Issuing company already exists');
    }

    const created = await this.prisma.issuingCompany.create({
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description?.trim() || null,
        logo: dto.logoUrl ?? null,
      },
    });
    await this.redis.delPattern(`${ISSUING_COMPANY_CACHE_PREFIX}*`);
    return created;
  }

  // ============================================
  // TRANSLATORS (Dịch giả)
  // ============================================

  async findAllTranslators(query: PageQueryDto): Promise<PaginatedResult<any>> {
    const cacheKey = `${TRANSLATOR_CACHE_PREFIX}page:${query.page}:limit:${query.limit}`;
    if (!query.includeInactive && query.page === 1) {
      const cached = await this.redis.get<PaginatedResult<any>>(cacheKey);
      if (cached) return cached;
    }

    const where = query.includeInactive ? {} : { isActive: true };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.translator.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.translator.count({ where }),
    ]);

    const result = paginate(items, total, query.page, query.limit);
    if (!query.includeInactive && query.page === 1) {
      await this.redis.set(cacheKey, result, PUBLISHER_CACHE_TTL);
    }
    return result;
  }

  async findOrCreateTranslator(nameInput: string, bio?: string) {
    const name = nameInput.trim();
    const normalizedName = normalizeCatalogText(name);
    const existing = await this.prisma.translator.findFirst({
      where: { normalizedName },
    });
    if (existing) return existing;

    const baseSlug = toCatalogSlug(name) || `translator-${Date.now()}`;
    const slugExists = await this.prisma.translator.findUnique({ where: { slug: baseSlug } });
    const slug = slugExists ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const created = await this.prisma.translator.create({
      data: {
        name,
        normalizedName,
        slug,
        bio: bio?.trim() || null,
      },
    });
    await this.redis.delPattern(`${TRANSLATOR_CACHE_PREFIX}*`);
    return created;
  }
}
