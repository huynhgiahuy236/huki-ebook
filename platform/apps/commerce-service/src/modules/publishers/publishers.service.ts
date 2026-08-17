import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeCatalogText, toCatalogSlug } from '../../common/catalog-text.util';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate, PaginatedResult } from '../../common/pagination.util';
import { Publisher } from '../../entities';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
  ) {}

  async create(dto: CreatePublisherDto): Promise<Publisher> {
    const name = dto.name.trim();
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? toCatalogSlug(name);
    await this.ensureUnique(slug, normalizedName);

    return this.publisherRepository.save(
      this.publisherRepository.create({
        name,
        normalizedName,
        slug,
        description: dto.description?.trim() || null,
        logoUrl: dto.logoUrl ?? null,
        website: dto.website ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async findAll(query: PageQueryDto): Promise<PaginatedResult<Publisher>> {
    const [publishers, total] = await this.publisherRepository.findAndCount({
      where: query.includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(publishers, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Publisher> {
    const publisher = await this.publisherRepository.findOne({ where: { id } });
    if (!publisher) throw new NotFoundException('Publisher not found');
    return publisher;
  }

  async update(id: string, dto: UpdatePublisherDto): Promise<Publisher> {
    const publisher = await this.findOne(id);
    const name = dto.name?.trim() ?? publisher.name;
    const normalizedName = normalizeCatalogText(name);
    const slug = dto.slug ?? publisher.slug;
    await this.ensureUnique(slug, normalizedName, id);

    Object.assign(publisher, {
      name,
      normalizedName,
      slug,
      description:
        dto.description === undefined
          ? publisher.description
          : dto.description?.trim() || null,
      logoUrl: dto.logoUrl === undefined ? publisher.logoUrl : dto.logoUrl,
      website: dto.website === undefined ? publisher.website : dto.website,
      isActive: dto.isActive ?? publisher.isActive,
    });
    return this.publisherRepository.save(publisher);
  }

  async remove(id: string): Promise<void> {
    await this.publisherRepository.softRemove(await this.findOne(id));
  }

  private async ensureUnique(slug: string, normalizedName: string, excludeId?: string) {
    const query = this.publisherRepository
      .createQueryBuilder('publisher')
      .where('(publisher.slug = :slug OR publisher.normalizedName = :normalizedName)', {
        slug,
        normalizedName,
      });
    if (excludeId) query.andWhere('publisher.id <> :excludeId', { excludeId });
    if (await query.getExists()) {
      throw new ConflictException('Publisher name or slug already exists');
    }
  }
}
