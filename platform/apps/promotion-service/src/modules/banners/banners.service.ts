import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerQueryDto,
  BannerScope,
} from './dto/banner.dto';
import { throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        title: dto.title,
        image: dto.image,
        link: dto.link,
        position: dto.position ?? 0,
        isActive: true,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        scope: dto.scope ?? BannerScope.HOMEPAGE,
        storeId: dto.storeId,
      },
    });
  }

  async findAll(query: BannerQueryDto) {
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.scope) where.scope = query.scope;
    if (query.storeId) where.storeId = query.storeId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        take: query.limit ?? 20,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throwNotFound(ErrorCode.BANNER_NOT_FOUND);
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throwNotFound(ErrorCode.BANNER_NOT_FOUND);

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.link !== undefined && { link: dto.link }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throwNotFound(ErrorCode.BANNER_NOT_FOUND);

    await this.prisma.banner.delete({ where: { id } });
    return { success: true };
  }

  async getActiveBanners(scope?: BannerScope, storeId?: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        ],
        ...(scope && { scope }),
        ...(storeId && { storeId }),
      },
      orderBy: { position: 'asc' },
    });
  }
}
