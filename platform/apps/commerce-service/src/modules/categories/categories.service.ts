import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { CategoryListQueryDto, CategorySortBy, SortDirection } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { throwConflict, throwNotFound, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const MAX_CATEGORY_DEPTH = 4;
const CATEGORY_TREE_CACHE_KEY = 'categories:tree';
const CATEGORY_TREE_CACHE_TTL = 300; // 5 minutes

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    const parent = dto.parentId ? await this.findOne(dto.parentId) : null;

    await this.ensureUnique(slug, normalizedName, parent?.id ?? null);

    const depth = parent ? 1 : 0;
    if (depth > MAX_CATEGORY_DEPTH) {
      throwConflict(ErrorCode.CATEGORY_HAS_CHILDREN);
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description?.trim() || null,
        parentId: parent?.id ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidateCache();
    return category;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!category) throwNotFound(ErrorCode.CATEGORY_NOT_FOUND);
    return category;
  }

  async findAll(query: CategoryListQueryDto): Promise<PaginatedResult<any>> {
    if (query.parentId && query.rootOnly) {
      throwBadRequest(ErrorCode.VALIDATION_ERROR);
    }

    const where: any = {};
    if (!query.includeInactive) where.isActive = true;
    if (query.parentId) where.parentId = query.parentId;
    else if (query.rootOnly) where.parentId = null;
    if (query.search) {
      where.normalizedName = { contains: normalizeCatalogText(query.search) };
    }

    // Map sort field to Prisma snake_case
    const sortFieldMap: Record<CategorySortBy, string> = {
      [CategorySortBy.NAME]: 'name',
      [CategorySortBy.SORT_ORDER]: 'sortOrder',
      [CategorySortBy.CREATED_AT]: 'createdAt',
    };

    const orderBy: any[] = [];
    const sortField = sortFieldMap[query.sortBy] || 'sortOrder';
    const sortDirection = query.order === SortDirection.DESC ? 'desc' : 'asc';
    orderBy.push({ [sortField]: sortDirection });
    orderBy.push({ name: 'asc' }); // Secondary sort by name

    // Select only needed fields for list view
    const listSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
    };

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        select: listSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return paginate(categories, total, query.page, query.limit);
  }

  async findTree(includeInactive = false): Promise<CategoryTreeNode[]> {
    const cacheKey = includeInactive ? `${CATEGORY_TREE_CACHE_KEY}:all` : CATEGORY_TREE_CACHE_KEY;

    // Try cache first
    const cached = await this.redis.get<CategoryTreeNode[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for category tree: ${cacheKey}`);
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const tree = this.buildTree(categories);

    // Cache the result
    await this.redis.set(cacheKey, tree, CATEGORY_TREE_CACHE_TTL);
    this.logger.debug(`Cached category tree: ${cacheKey}`);

    return tree;
  }

  private buildTree(categories: any[]): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));

    const roots: CategoryTreeNode[] = [];
    map.forEach(node => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findOne(id);
    const nextParentId = dto.parentId === undefined ? existing!.parentId : dto.parentId;
    const parent = nextParentId ? await this.prisma.category.findUnique({ where: { id: nextParentId } }) : null;

    if (parent?.id === id) {
      throwConflict(ErrorCode.CATEGORY_HAS_CHILDREN);
    }

    const name = dto.name?.trim() ?? existing!.name;
    const slug = dto.slug ?? existing!.slug;
    const normalizedName = normalizeCatalogText(name);

    if (slug !== existing!.slug || normalizedName !== existing!.normalizedName) {
      await this.ensureUnique(slug, normalizedName, parent?.id ?? null, id);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name,
        normalizedName,
        slug,
        description: dto.description === undefined ? existing!.description : dto.description?.trim() || null,
        parentId: parent?.id ?? null,
        sortOrder: dto.sortOrder ?? existing!.sortOrder,
        isActive: dto.isActive ?? existing!.isActive,
      },
    });

    await this.invalidateCache();
    return category;
  }

  async remove(id: string) {
    await this.findOne(id);
    const children = await this.prisma.category.count({ where: { parentId: id } });
    if (children > 0) {
      throwConflict(ErrorCode.CATEGORY_HAS_CHILDREN);
    }
    await this.prisma.category.delete({ where: { id } });
    await this.invalidateCache();
  }

  async getCategoryPerformance() {
    // 1. Query category metrics directly from PostgreSQL
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        COUNT(DISTINCT b.id)::int as book_count, 
        COALESCE(SUM(b.view_count), 0)::bigint as view_count, 
        COUNT(DISTINCT oi.id)::int as item_sold_count, 
        COALESCE(SUM(oi.quantity), 0)::int as total_units, 
        COALESCE(SUM(oi.subtotal), 0)::numeric as total_revenue, 
        COUNT(DISTINCT so.id)::int as order_count 
      FROM categories c 
      LEFT JOIN books b ON b.category_id = c.id 
      LEFT JOIN order_items oi ON oi.book_id = b.id 
      LEFT JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status IN ('COMPLETED', 'DELIVERED') 
      GROUP BY c.id, c.name, c.slug 
      ORDER BY total_revenue DESC, book_count DESC
    `;

    // 2. Query top books per category
    const bookRows: any[] = await this.prisma.$queryRaw`
      SELECT 
        b.id, 
        b.title, 
        b.cover_url, 
        b.category_id, 
        COALESCE(a.name, 'Nhiều tác giả') as author, 
        b.price::numeric, 
        b.view_count::int, 
        COALESCE(SUM(oi.quantity), 0)::int as units_sold, 
        COALESCE(SUM(oi.subtotal), 0)::numeric as revenue 
      FROM books b 
      LEFT JOIN authors a ON a.id = b.author_id 
      LEFT JOIN order_items oi ON oi.book_id = b.id 
      LEFT JOIN seller_orders so ON so.id = oi.seller_order_id AND so.status IN ('COMPLETED', 'DELIVERED') 
      WHERE b.category_id IS NOT NULL 
      GROUP BY b.id, b.title, b.cover_url, b.category_id, a.name, b.price, b.view_count 
      ORDER BY units_sold DESC, revenue DESC
    `;

    const booksByCat = new Map<string, any[]>();
    for (const b of bookRows) {
      const list = booksByCat.get(b.category_id) || [];
      if (list.length < 8) {
        list.push({
          id: b.id,
          title: b.title,
          coverUrl: b.cover_url,
          author: b.author,
          price: Number(b.price || 0),
          viewCount: Number(b.view_count || 0),
          unitsSold: Number(b.units_sold || 0),
          revenue: Number(b.revenue || 0),
        });
        booksByCat.set(b.category_id, list);
      }
    }

    let grandRevenue = 0;
    for (const r of rows) {
      grandRevenue += Number(r.total_revenue || 0);
    }

    return rows.map((r) => {
      const rev = Number(r.total_revenue || 0);
      const share = grandRevenue > 0 ? (rev / grandRevenue) * 100 : 0;
      const views = Number(r.view_count || 0);
      const units = Number(r.total_units || 0);
      const cvr = views > 0 ? (units / views) * 100 : 0;

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        bookCount: Number(r.book_count || 0),
        viewCount: views,
        itemSoldCount: Number(r.item_sold_count || 0),
        totalUnits: units,
        totalRevenue: rev,
        orderCount: Number(r.order_count || 0),
        sharePercent: Number(share.toFixed(1)),
        cvrPercent: Number(cvr.toFixed(2)),
        topBooks: booksByCat.get(r.id) || [],
      };
    });
  }

  private async invalidateCache(): Promise<void> {
    await this.redis.del(CATEGORY_TREE_CACHE_KEY);
    await this.redis.del(`${CATEGORY_TREE_CACHE_KEY}:all`);
  }

  private async ensureUnique(slug: string, normalizedName: string, parentId: string | null, excludeId?: string) {
    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { normalizedName, parentId: parentId || null },
        ],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
    if (existing) {
      throwConflict(ErrorCode.CATEGORY_NOT_FOUND);
    }
  }
}
