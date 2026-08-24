import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePublisherDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    return this.prisma.publisher.create({
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description?.trim() || null,
        logo: dto.logoUrl ?? null,
      },
    });
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<any>> {
    const where = query.includeInactive ? {} : { isActive: true };
    const [publishers, total] = await this.prisma.$transaction([
      this.prisma.publisher.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.publisher.count({ where }),
    ]);
    return paginate(publishers, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const publisher = await this.prisma.publisher.findUnique({ where: { id } });
    if (!publisher) throw new NotFoundException('Publisher not found');
    return publisher;
  }

  async update(id: string, dto: UpdatePublisherDto) {
    const existing = await this.findOne(id);
    const name = dto.name?.trim() ?? existing.name;
    const slug = dto.slug ?? existing.slug;
    const normalizedName = normalizeCatalogText(name);

    if (slug !== existing.slug || normalizedName !== existing.normalizedName) {
      await this.ensureUnique(slug, normalizedName, id);
    }

    return this.prisma.publisher.update({
      where: { id },
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description === undefined ? existing.description : dto.description?.trim() || null,
        logo: dto.logoUrl === undefined ? existing.logo : dto.logoUrl,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.publisher.delete({ where: { id } });
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const existing = await this.prisma.publisher.findFirst({
      where: {
        OR: [{ slug }, { normalizedName }],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (existing) {
      throw new ConflictException('Publisher name or slug already exists');
    }
  }
}
