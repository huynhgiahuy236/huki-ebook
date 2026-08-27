import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Prisma } from '../../../prisma/generated/client';
import { throwConflict, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const AUTHOR_CACHE_PREFIX = 'authors:';
const AUTHOR_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AuthorsService {
  private readonly logger = new Logger(AuthorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateAuthorDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    const author = await this.prisma.author.create({
      data: {
        name,
        normalizedName,
        slug,
        bio: dto.bio?.trim() || null,
        avatar: dto.avatarUrl ?? null,
      },
    });

    await this.invalidateCache();
    return author;
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<any>> {
    // Try to get from cache for first page of active authors (most common query)
    const cacheKey = this.getCacheKey(query);
    if (!query.includeInactive && query.page === 1) {
      const cached = await this.redis.get<PaginatedResult<any>>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for authors list: ${cacheKey}`);
        return cached;
      }
    }

    const where = query.includeInactive ? {} : { isActive: true };

    // Select only needed fields for list view
    const listSelect = {
      id: true,
      name: true,
      slug: true,
      bio: true,
      avatar: true,
      isActive: true,
      createdAt: true,
    };

    const [authors, total] = await this.prisma.$transaction([
      this.prisma.author.findMany({
        where,
        select: listSelect,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.author.count({ where }),
    ]);
    const result = paginate(authors, total, query.page, query.limit);

    // Cache first page of active authors
    if (!query.includeInactive && query.page === 1) {
      await this.redis.set(cacheKey, result, AUTHOR_CACHE_TTL);
    }

    return result;
  }

  private getCacheKey(query: PageQueryDto): string {
    return `${AUTHOR_CACHE_PREFIX}page:${query.page}:limit:${query.limit}`;
  }

  async findOne(id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) throwNotFound(ErrorCode.AUTHOR_NOT_FOUND);
    return author;
  }

  async update(id: string, dto: UpdateAuthorDto) {
    const existing = await this.findOne(id);
    const name = dto.name?.trim() ?? existing!.name;
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? existing!.slug;

    if (slug !== existing!.slug || normalizedName !== existing!.normalizedName) {
      await this.ensureUnique(slug, normalizedName, id);
    }

    const author = await this.prisma.author.update({
      where: { id },
      data: {
        name,
        slug,
        normalizedName,
        bio: dto.bio === undefined ? existing!.bio : dto.bio?.trim() || null,
        avatar: dto.avatarUrl === undefined ? existing!.avatar : dto.avatarUrl,
        isActive: dto.isActive ?? existing!.isActive,
      },
    });

    await this.invalidateCache();
    return author;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.author.delete({ where: { id } });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.delPattern(`${AUTHOR_CACHE_PREFIX}*`);
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const existing = await this.prisma.author.findFirst({
      where: {
        OR: [{ slug }, { normalizedName }],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (existing) {
      throwConflict(ErrorCode.AUTHOR_SLUG_EXISTS);
    }
  }
}
