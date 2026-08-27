import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { throwConflict, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const PUBLISHER_CACHE_PREFIX = 'publishers:';
const PUBLISHER_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class PublishersService {
  private readonly logger = new Logger(PublishersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

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
}
