import { BadRequestException, Injectable } from '@nestjs/common';
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

  private validateDateWindow(startDate?: Date | null, endDate?: Date | null) {
    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('Thời gian kết thúc banner phải sau thời gian bắt đầu');
    }
  }

  async create(dto: CreateBannerDto) {
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    this.validateDateWindow(startDate, endDate);

    return this.prisma.banner.create({
      data: {
        title: dto.title,
        image: dto.image,
        link: dto.link,
        position: dto.position ?? 0,
        isActive: true,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
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

    const nextStartDate =
      dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : banner!.startDate;
    const nextEndDate =
      dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : banner!.endDate;
    this.validateDateWindow(nextStartDate, nextEndDate);

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.link !== undefined && { link: dto.link }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      // Idempotent delete: if already removed or not found, return success cleanly
      return { success: true };
    }

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
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
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
