import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Prisma } from '../../../prisma/generated/client';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuthorDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    return this.prisma.author.create({
      data: {
        name,
        normalizedName,
        slug,
        bio: dto.bio?.trim() || null,
        avatar: dto.avatarUrl ?? null,
      },
    });
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<any>> {
    const where = query.includeInactive ? {} : { isActive: true };
    const [authors, total] = await this.prisma.$transaction([
      this.prisma.author.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.author.count({ where }),
    ]);
    return paginate(authors, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }

  async update(id: string, dto: UpdateAuthorDto) {
    const existing = await this.findOne(id);
    const name = dto.name?.trim() ?? existing.name;
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? existing.slug;

    if (slug !== existing.slug || normalizedName !== existing.normalizedName) {
      await this.ensureUnique(slug, normalizedName, id);
    }

    return this.prisma.author.update({
      where: { id },
      data: {
        name,
        slug,
        normalizedName,
        bio: dto.bio === undefined ? existing.bio : dto.bio?.trim() || null,
        avatar: dto.avatarUrl === undefined ? existing.avatar : dto.avatarUrl,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.author.delete({ where: { id } });
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const existing = await this.prisma.author.findFirst({
      where: {
        OR: [{ slug }, { normalizedName }],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (existing) {
      throw new ConflictException('Author name or slug already exists');
    }
  }
}
