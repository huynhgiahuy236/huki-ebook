import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeCatalogText } from '../../common/catalog-text.util';
import { paginate } from '../../common/pagination.util';
import { CatalogSearchQueryDto, CatalogSearchType } from './dto/catalog-search-query.dto';

@Injectable()
export class CatalogSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: CatalogSearchQueryDto) {
    const normalizedQuery = normalizeCatalogText(query.q);
    if (normalizedQuery.length < 2) {
      throw new BadRequestException('Search query must contain at least 2 searchable characters');
    }

    const types = query.types?.length ? query.types : Object.values(CatalogSearchType);
    const skip = (query.page - 1) * query.limit;

    const results: any[] = [];

    if (types.includes(CatalogSearchType.CATEGORY)) {
      const categories = await this.prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        take: query.limit,
        orderBy: { name: 'asc' },
      });
      results.push(...categories.map(c => ({ type: CatalogSearchType.CATEGORY, ...c })));
    }

    if (types.includes(CatalogSearchType.AUTHOR)) {
      const authors = await this.prisma.author.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        take: query.limit,
        orderBy: { name: 'asc' },
      });
      results.push(...authors.map(a => ({ type: CatalogSearchType.AUTHOR, ...a })));
    }

    if (types.includes(CatalogSearchType.PUBLISHER)) {
      const publishers = await this.prisma.publisher.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        take: query.limit,
        orderBy: { name: 'asc' },
      });
      results.push(...publishers.map(p => ({ type: CatalogSearchType.PUBLISHER, ...p })));
    }

    return paginate(results, results.length, query.page, query.limit);
  }
}
