import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { Author } from '../../entities';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async create(dto: CreateAuthorDto): Promise<Author> {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    return this.authorRepository.save(
      this.authorRepository.create({
        name,
        normalizedName,
        slug,
        bio: dto.bio?.trim() || null,
        avatarUrl: dto.avatarUrl ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<Author>> {
    const [authors, total] = await this.authorRepository.findAndCount({
      where: query.includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(authors, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Author> {
    const author = await this.authorRepository.findOne({ where: { id } });
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }

  async update(id: string, dto: UpdateAuthorDto): Promise<Author> {
    const author = await this.findOne(id);
    const name = dto.name?.trim() ?? author.name;
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? author.slug;
    await this.ensureUnique(slug, normalizedName, id);

    Object.assign(author, {
      name,
      normalizedName,
      slug,
      bio: dto.bio === undefined ? author.bio : dto.bio?.trim() || null,
      avatarUrl: dto.avatarUrl === undefined ? author.avatarUrl : dto.avatarUrl,
      isActive: dto.isActive ?? author.isActive,
    });
    return this.authorRepository.save(author);
  }

  async remove(id: string): Promise<void> {
    await this.authorRepository.softRemove(await this.findOne(id));
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const query = this.authorRepository
      .createQueryBuilder('author')
      .where('(author.slug = :slug OR author.normalizedName = :normalizedName)', {
        slug,
        normalizedName,
      });
    if (excludeId) query.andWhere('author.id <> :excludeId', { excludeId });
    if (await query.getExists()) {
      throw new ConflictException('Author name or slug already exists');
    }
  }
}
