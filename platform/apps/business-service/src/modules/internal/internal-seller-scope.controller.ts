import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InternalAuthGuard } from './guards/internal-auth.guard';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SellerScopeResponse {
  isPlatformAdmin: boolean;
  businessIds: string[];
  storeIds: string[];
  ownerUserIds: string[];
}

export interface ResolveTargetResponse {
  businessIds: string[];
  storeIds: string[];
}

@ApiTags('Internal')
@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalSellerScopeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('seller-scope/:userId')
  @ApiOperation({ summary: 'Internal API: Get authorized seller scope for a user' })
  async getSellerScope(@Param('userId') userId: string): Promise<SellerScopeResponse> {
    const businesses = await this.prisma.business.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, status: 'ACTIVE', deletedAt: null } } },
        ],
      },
      include: {
        stores: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    const businessIds = businesses.map((b) => b.id);
    const storeIds = businesses.flatMap((b) => b.stores.map((s) => s.id));
    const ownerUserIds = Array.from(new Set([userId, ...businesses.map((b) => b.ownerId)]));

    return {
      isPlatformAdmin: false,
      businessIds: Array.from(new Set(businessIds)),
      storeIds: Array.from(new Set([...storeIds, ...businessIds])),
      ownerUserIds,
    };
  }

  @Get('resolve-target/:targetId')
  @ApiOperation({ summary: 'Internal API: Resolve business and store IDs for a target' })
  async resolveTarget(@Param('targetId') targetId: string): Promise<ResolveTargetResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (!isUuid) {
      return { businessIds: [], storeIds: [] };
    }

    const [biz, store] = await Promise.all([
      this.prisma.business.findFirst({
        where: { id: targetId, deletedAt: null },
        include: {
          stores: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      }),
      this.prisma.store.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true, businessId: true },
      }),
    ]);

    const businessIds = new Set<string>();
    const storeIds = new Set<string>();

    if (biz) {
      businessIds.add(biz.id);
      storeIds.add(biz.id);
      biz.stores.forEach((s) => storeIds.add(s.id));
    }
    if (store) {
      storeIds.add(store.id);
      businessIds.add(store.businessId);
    }

    return {
      businessIds: Array.from(businessIds),
      storeIds: Array.from(storeIds),
    };
  }
}

