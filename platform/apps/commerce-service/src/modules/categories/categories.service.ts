import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { CategoryListQueryDto, CategorySortBy } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const MAX_CATEGORY_DEPTH = 4;

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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    const parent = dto.parentId ? await this.findOne(dto.parentId) : null;

    await this.ensureUnique(slug, normalizedName, parent?.id ?? null);

    const depth = parent ? 1 : 0;
    if (depth > MAX_CATEGORY_DEPTH) {
      throw new ConflictException(`Category depth cannot exceed ${MAX_CATEGORY_DEPTH}`);
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description: dto.description?.trim() || null,
        parentId: parent?.id ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findAll(query: CategoryListQueryDto): Promise<PaginatedResult<any>> {
    if (query.parentId && query.rootOnly) {
      throw new BadRequestException('parentId and rootOnly cannot be used together');
    }

    const where: any = {};
    if (!query.includeInactive) where.isActive = true;
    if (query.parentId) where.parentId = query.parentId;
    else if (query.rootOnly) where.parentId = null;
    if (query.search) {
      where.normalizedName = { contains: normalizeCatalogText(query.search), mode: 'insensitive' };
    }

    const orderBy: any = {};
    const sortMap: Record<CategorySortBy, string> = {
      [CategorySortBy.NAME]: 'name',
      [CategorySortBy.SORT_ORDER]: 'sortOrder',
      [CategorySortBy.CREATED_AT]: 'createdAt',
    };
    orderBy[sortMap[query.sortBy]] = query.order;
    orderBy.name = 'asc';

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return paginate(categories, total, query.page, query.limit);
  }

  async findTree(includeInactive = false): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return this.buildTree(categories);
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
    const nextParentId = dto.parentId === undefined ? existing.parentId : dto.parentId;
    const parent = nextParentId ? await this.prisma.category.findUnique({ where: { id: nextParentId } }) : null;

    if (parent?.id === id) {
      throw new ConflictException('Category cannot be its own parent');
    }

    const name = dto.name?.trim() ?? existing.name;
    const slug = dto.slug ?? existing.slug;
    const normalizedName = normalizeCatalogText(name);

    if (slug !== existing.slug || normalizedName !== existing.normalizedName) {
      await this.ensureUnique(slug, normalizedName, parent?.id ?? null, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: dto.description === undefined ? existing.description : dto.description?.trim() || null,
        parentId: parent?.id ?? null,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const children = await this.prisma.category.count({ where: { parentId: id } });
    if (children > 0) {
      throw new ConflictException('Category with children cannot be deleted');
    }
    await this.prisma.category.delete({ where: { id } });
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
      throw new ConflictException('Category name or slug already exists');
    }
  }
}
