import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { Category } from '../../entities';
import {
  CategoryListQueryDto,
  CategorySortBy,
} from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const MAX_CATEGORY_DEPTH = 4;

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    const parent = dto.parentId ? await this.findOne(dto.parentId) : null;

    await this.ensureUnique(slug, normalizedName, parent?.id ?? null);

    const category = this.categoryRepository.create({
      name,
      normalizedName,
      slug,
      description: dto.description?.trim() || null,
      parentId: parent?.id ?? null,
      depth: parent ? parent.depth + 1 : 0,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    if (category.depth > MAX_CATEGORY_DEPTH) {
      throw new ConflictException(`Category depth cannot exceed ${MAX_CATEGORY_DEPTH}`);
    }

    return this.categoryRepository.save(category);
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findAll(query: CategoryListQueryDto): Promise<PaginatedResult<Category>> {
    if (query.parentId && query.rootOnly) {
      throw new BadRequestException('parentId and rootOnly cannot be used together');
    }

    const builder = this.categoryRepository.createQueryBuilder('category');
    if (!query.includeInactive) {
      builder.andWhere('category.isActive = true');
    }
    if (query.parentId) {
      builder.andWhere('category.parentId = :parentId', { parentId: query.parentId });
    } else if (query.rootOnly) {
      builder.andWhere('category.parentId IS NULL');
    }
    if (query.search) {
      const normalizedSearch = normalizeCatalogText(query.search);
      builder.andWhere('category.normalizedName ILIKE :search', {
        search: `%${normalizedSearch}%`,
      });
    }

    const sortColumns: Record<CategorySortBy, string> = {
      [CategorySortBy.NAME]: 'category.name',
      [CategorySortBy.SORT_ORDER]: 'category.sortOrder',
      [CategorySortBy.CREATED_AT]: 'category.createdAt',
    };
    builder
      .orderBy(sortColumns[query.sortBy], query.order)
      .addOrderBy('category.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [categories, total] = await builder.getManyAndCount();
    return paginate(categories, total, query.page, query.limit);
  }

  async findTree(includeInactive = false): Promise<CategoryTreeNode[]> {
    const categories = await this.categoryRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { depth: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
    const nodes = new Map<string, CategoryTreeNode>();
    categories.forEach((category) => nodes.set(category.id, { ...category, children: [] }));

    const roots: CategoryTreeNode[] = [];
    nodes.forEach((node) => {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    const nextParentId = dto.parentId === undefined ? category.parentId : dto.parentId;
    const parent = nextParentId ? await this.findOne(nextParentId) : null;

    if (parent?.id === id) {
      throw new ConflictException('Category cannot be its own parent');
    }
    if (parent) {
      await this.ensureNotDescendant(id, parent);
    }

    const nextName = dto.name?.trim() ?? category.name;
    const normalizedName = normalizeCatalogText(nextName);
    const slug = dto.slug ?? category.slug;
    const nextDepth = parent ? parent.depth + 1 : 0;
    const subtreeHeight = await this.getSubtreeHeight(id, category.depth);

    if (nextDepth + subtreeHeight > MAX_CATEGORY_DEPTH) {
      throw new ConflictException(`Category depth cannot exceed ${MAX_CATEGORY_DEPTH}`);
    }

    await this.ensureUnique(slug, normalizedName, parent?.id ?? null, id);
    const depthDelta = nextDepth - category.depth;

    Object.assign(category, {
      name: nextName,
      normalizedName,
      slug,
      description: dto.description === undefined ? category.description : dto.description?.trim() || null,
      parentId: parent?.id ?? null,
      depth: nextDepth,
      sortOrder: dto.sortOrder ?? category.sortOrder,
      isActive: dto.isActive ?? category.isActive,
    });

    return this.categoryRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Category);
      await repository.save(category);
      if (depthDelta !== 0) {
        await repository.query(
          `WITH RECURSIVE descendants AS (
             SELECT id FROM categories WHERE parent_id = $1 AND deleted_at IS NULL
             UNION ALL
             SELECT child.id FROM categories child
             JOIN descendants parent ON child.parent_id = parent.id
             WHERE child.deleted_at IS NULL
           )
           UPDATE categories SET depth = depth + $2, updated_at = now()
           WHERE id IN (SELECT id FROM descendants)`,
          [id, depthDelta],
        );
      }
      return repository.findOneOrFail({ where: { id }, relations: { parent: true } });
    });
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const children = await this.categoryRepository.count({ where: { parentId: id } });
    if (children > 0) {
      throw new ConflictException('Category with children cannot be deleted');
    }
    await this.categoryRepository.softRemove(category);
  }

  private async ensureUnique(
    slug: string,
    normalizedName: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('(category.slug = :slug OR (category.normalizedName = :normalizedName AND category.parentId IS NOT DISTINCT FROM :parentId))', {
        slug,
        normalizedName,
        parentId,
      });
    if (excludeId) query.andWhere('category.id <> :excludeId', { excludeId });
    if (await query.getExists()) {
      throw new ConflictException('Category name or slug already exists');
    }
  }

  private async ensureNotDescendant(categoryId: string, proposedParent: Category): Promise<void> {
    let current: Category | null = proposedParent;
    while (current) {
      if (current.id === categoryId) {
        throw new ConflictException('Category tree cannot contain a cycle');
      }
      current = current.parentId
        ? await this.categoryRepository.findOne({ where: { id: current.parentId } })
        : null;
    }
  }

  private async getSubtreeHeight(id: string, currentDepth: number): Promise<number> {
    const rows: Array<{ max_depth: string | number | null }> = await this.categoryRepository.query(
      `WITH RECURSIVE descendants AS (
         SELECT id, depth FROM categories WHERE id = $1 AND deleted_at IS NULL
         UNION ALL
         SELECT child.id, child.depth FROM categories child
         JOIN descendants parent ON child.parent_id = parent.id
         WHERE child.deleted_at IS NULL
       ) SELECT MAX(depth) AS max_depth FROM descendants`,
      [id],
    );
    return Number(rows[0]?.max_depth ?? currentDepth) - currentDepth;
  }
}
