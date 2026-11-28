import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
  ownerUserIds: string[];
}

export interface UserStoreMappingsResponse {
  storeMapByOwner: Record<string, string>;
  storeMapByMember: Record<string, { storeName: string; role: string }>;
}

@ApiTags('Internal - Business')
@ApiHeader({ name: 'x-internal-service-key', required: true, description: 'Internal service authentication key' })
@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalSellerScopeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('seller-scope/:userId')
  @ApiOperation({ summary: 'Internal API: Get authorized seller scope for a user' })
  @ApiSuccessResponse(undefined, { description: 'Seller scope IDs' })
  @ApiStandardErrors(401)
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
  @ApiOperation({ summary: 'Internal API: Resolve business, store, and owner user IDs for a target' })
  @ApiSuccessResponse(undefined, { description: 'Resolved business/store/owner IDs' })
  @ApiStandardErrors(401)
  async resolveTarget(@Param('targetId') targetId: string): Promise<ResolveTargetResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (!isUuid) {
      return { businessIds: [], storeIds: [], ownerUserIds: [] };
    }

    const [biz, store] = await Promise.all([
      this.prisma.business.findFirst({
        where: { id: targetId, deletedAt: null },
        include: {
          stores: {
            where: { deletedAt: null },
            select: { id: true },
          },
          members: {
            where: { status: 'ACTIVE', deletedAt: null },
            select: { userId: true },
          },
        },
      }),
      this.prisma.store.findFirst({
        where: { id: targetId, deletedAt: null },
        select: {
          id: true,
          businessId: true,
          business: {
            select: {
              ownerId: true,
              members: {
                where: { status: 'ACTIVE', deletedAt: null },
                select: { userId: true },
              },
            },
          },
        },
      }),
    ]);

    const businessIds = new Set<string>();
    const storeIds = new Set<string>();
    const ownerUserIds = new Set<string>();

    if (biz) {
      businessIds.add(biz.id);
      storeIds.add(biz.id);
      if (biz.ownerId) ownerUserIds.add(biz.ownerId);
      biz.stores.forEach((s) => storeIds.add(s.id));
      biz.members.forEach((m) => ownerUserIds.add(m.userId));
    }
    if (store) {
      storeIds.add(store.id);
      businessIds.add(store.businessId);
      if (store.business?.ownerId) ownerUserIds.add(store.business.ownerId);
      store.business?.members?.forEach((m) => ownerUserIds.add(m.userId));
    }

    return {
      businessIds: Array.from(businessIds),
      storeIds: Array.from(storeIds),
      ownerUserIds: Array.from(ownerUserIds),
    };
  }

  @Post('user-store-mappings')
  @ApiOperation({ summary: 'Internal API: Get store/business mappings for a list of user IDs' })
  @ApiBody({ schema: { type: 'object', required: ['userIds'], properties: { userIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { description: 'User store mappings' })
  @ApiStandardErrors(401)
  async getUserStoreMappings(
    @Body() body: { userIds: string[] },
  ): Promise<UserStoreMappingsResponse> {
    const userIds = Array.isArray(body?.userIds) ? body.userIds.filter(Boolean) : [];
    const storeMapByOwner: Record<string, string> = {};
    const storeMapByMember: Record<string, { storeName: string; role: string }> = {};

    if (!userIds.length) {
      return { storeMapByOwner, storeMapByMember };
    }

    const businesses = await this.prisma.business.findMany({
      where: { ownerId: { in: userIds }, deletedAt: null },
      include: {
        stores: {
          where: { deletedAt: null },
          select: { name: true },
        },
      },
    });

    for (const b of businesses) {
      storeMapByOwner[b.ownerId] = b.stores[0]?.name || b.name || 'Gian hàng';
    }

    const members = await this.prisma.member.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      include: {
        business: {
          select: {
            name: true,
            stores: {
              where: { deletedAt: null },
              select: { name: true },
            },
          },
        },
      },
    });

    for (const m of members) {
      if (m.business) {
        storeMapByMember[m.userId] = {
          storeName: m.business.stores[0]?.name || m.business.name || 'Gian hàng',
          role: m.role,
        };
      }
    }

    return { storeMapByOwner, storeMapByMember };
  }
}

