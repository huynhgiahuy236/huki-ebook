import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFlashSaleDto,
  CreateFlashSaleItemDto,
  FlashSaleQueryDto,
  FlashSaleItemQueryDto,
  FlashSaleStatus,
} from './dto/flash-sale.dto';

@Injectable()
export class FlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFlashSaleDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('End date must be after start date');
    }

    const status = this.calculateStatus(startsAt, endsAt);

    return this.prisma.flashSale.create({
      data: {
        name: dto.name,
        description: dto.description,
        startsAt,
        endsAt,
        status,
      },
    });
  }

  async findAll(query: FlashSaleQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.flashSale.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        take: query.limit ?? 20,
      }),
      this.prisma.flashSale.count({ where }),
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
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!flashSale) throw new NotFoundException('Flash sale not found');
    return flashSale;
  }

  async addItem(dto: CreateFlashSaleItemDto) {
    // Verify flash sale exists
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id: dto.flashSaleId },
    });
    if (!flashSale) throw new NotFoundException('Flash sale not found');

    if (dto.salePrice >= dto.originalPrice) {
      throw new BadRequestException('Sale price must be less than original price');
    }

    // Check if book already in flash sale
    const existing = await this.prisma.flashSaleItem.findFirst({
      where: { flashSaleId: dto.flashSaleId, bookId: dto.bookId },
    });
    if (existing) {
      throw new BadRequestException('Book already in this flash sale');
    }

    return this.prisma.flashSaleItem.create({
      data: {
        flashSaleId: dto.flashSaleId,
        bookId: dto.bookId,
        originalPrice: dto.originalPrice,
        salePrice: dto.salePrice,
        stock: dto.stock,
        maxPerUser: dto.maxPerUser ?? 1,
        sold: 0,
      },
    });
  }

  async findItems(query: FlashSaleItemQueryDto) {
    const where: any = {};
    if (query.flashSaleId) where.flashSaleId = query.flashSaleId;
    if (query.bookId) where.bookId = query.bookId;

    return this.prisma.flashSaleItem.findMany({
      where,
      include: { flashSale: true },
    });
  }

  async getActiveFlashSales() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: {
        status: FlashSaleStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        items: {
          where: { stock: { gt: 0 } },
        },
      },
    });
  }

  async getBookFlashSalePrice(bookId: string) {
    const now = new Date();
    const item = await this.prisma.flashSaleItem.findFirst({
      where: {
        bookId,
        flashSale: {
          status: FlashSaleStatus.ACTIVE,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        stock: { gt: 0 },
      },
      include: { flashSale: true },
    });

    if (!item) return null;

    return {
      flashSaleId: item.flashSaleId,
      flashSaleName: item.flashSale.name,
      originalPrice: item.originalPrice,
      salePrice: item.salePrice,
      discount: item.originalPrice - item.salePrice,
      discountPercent: Math.round(
        ((item.originalPrice - item.salePrice) / item.originalPrice) * 100,
      ),
      remainingStock: item.stock,
      endsAt: item.flashSale.endsAt,
    };
  }

  async reserveStock(itemId: string, quantity: number) {
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Flash sale item not found');

    if (item.stock < quantity) {
      throw new BadRequestException('Insufficient flash sale stock');
    }

    return this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: { stock: { decrement: quantity } },
    });
  }

  async releaseStock(itemId: string, quantity: number) {
    return this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: { stock: { increment: quantity } },
    });
  }

  async confirmPurchase(itemId: string, quantity: number) {
    return this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: { sold: { increment: quantity } },
    });
  }

  async updateStatus(id: string, status: FlashSaleStatus) {
    return this.prisma.flashSale.update({
      where: { id },
      data: { status },
    });
  }

  async updateItemStock(id: string, stock: number) {
    return this.prisma.flashSaleItem.update({
      where: { id },
      data: { stock },
    });
  }

  async delete(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
    });
    if (!flashSale) throw new NotFoundException('Flash sale not found');

    await this.prisma.flashSaleItem.deleteMany({
      where: { flashSaleId: id },
    });

    await this.prisma.flashSale.delete({ where: { id } });
    return { success: true };
  }

  private calculateStatus(startsAt: Date, endsAt: Date): FlashSaleStatus {
    const now = new Date();
    if (now < startsAt) return FlashSaleStatus.SCHEDULED;
    if (now > endsAt) return FlashSaleStatus.ENDED;
    return FlashSaleStatus.ACTIVE;
  }
}
