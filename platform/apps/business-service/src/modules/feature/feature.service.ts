import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateFeatureDto } from './feature.dto';

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId?: string) {
    const features = await this.prisma.sellerFeature.findMany({
      include: {
        overrides: true,
      },
      orderBy: { id: 'asc' },
    });

    return features.map((f) => {
      let isEnabled = f.isEnabledGlobally;
      if (businessId) {
        const override = f.overrides.find((o) => o.businessId === businessId);
        if (override) {
          isEnabled = override.isEnabled;
        } else if (f.disabledBusinesses.includes(businessId)) {
          isEnabled = false;
        }
      }

      return {
        ...f,
        isEnabled,
      };
    });
  }

  async findOne(id: string) {
    const feature = await this.prisma.sellerFeature.findUnique({
      where: { id },
      include: { overrides: true },
    });
    if (!feature) {
      throw new NotFoundException(`Feature ${id} not found`);
    }
    return feature;
  }

  async updateFeature(dto: UpdateFeatureDto, operatorName?: string) {
    const targetIds = dto.featureIds && dto.featureIds.length > 0
      ? dto.featureIds
      : [dto.id || dto.featureId].filter((x): x is string => Boolean(x));

    if (targetIds.length === 0) {
      throw new NotFoundException('Feature ID is required');
    }

    const updatedBy = dto.updatedBy || operatorName || 'Admin System';
    let lastUpdated: any = null;

    for (const fid of targetIds) {
      let existing = await this.prisma.sellerFeature.findUnique({ where: { id: fid } });
      if (!existing) {
        existing = await this.prisma.sellerFeature.create({
          data: {
            id: fid,
            name: dto.name || fid,
            category: (dto.category || 'operations') as any,
            description: dto.description || `Tính năng ${fid}`,
            isEnabledGlobally: true,
            disabledBusinesses: [],
            enabledBusinesses: [],
            updatedBy,
          },
        });
      }

      if (dto.action === 'TOGGLE_BUSINESS' && dto.businessId) {
        const nextBlocked = dto.isBlocked ?? (dto.isBusinessEnabled !== undefined ? !dto.isBusinessEnabled : false);
        const curDisabled = new Set(existing.disabledBusinesses || []);
        if (nextBlocked) curDisabled.add(dto.businessId);
        else curDisabled.delete(dto.businessId);

        await this.prisma.sellerFeatureOverride.upsert({
          where: { featureId_businessId: { featureId: fid, businessId: dto.businessId } },
          update: { isEnabled: !nextBlocked, reason: dto.maintenanceReason || null, updatedBy },
          create: { featureId: fid, businessId: dto.businessId, isEnabled: !nextBlocked, reason: dto.maintenanceReason || null, updatedBy },
        });
        lastUpdated = await this.prisma.sellerFeature.update({
          where: { id: fid },
          data: { disabledBusinesses: Array.from(curDisabled), updatedBy },
        });
        continue;
      }

      if (dto.action === 'BULK_TOGGLE_BUSINESS' && Array.isArray(dto.businessIds)) {
        const curDisabled = new Set(existing.disabledBusinesses || []);
        for (const bizId of dto.businessIds) {
          if (dto.isBlocked) curDisabled.add(bizId);
          else curDisabled.delete(bizId);
          await this.prisma.sellerFeatureOverride.upsert({
            where: { featureId_businessId: { featureId: fid, businessId: bizId } },
            update: { isEnabled: !dto.isBlocked, updatedBy },
            create: { featureId: fid, businessId: bizId, isEnabled: !dto.isBlocked, updatedBy },
          });
        }
        lastUpdated = await this.prisma.sellerFeature.update({
          where: { id: fid },
          data: { disabledBusinesses: Array.from(curDisabled), updatedBy },
        });
        continue;
      }

      const nextEnabled =
        dto.isEnabledGlobally !== undefined
          ? dto.isEnabledGlobally
          : dto.isEnabled !== undefined
          ? dto.isEnabled
          : existing.isEnabledGlobally;

      if (dto.businessId && dto.isBusinessEnabled !== undefined) {
        await this.prisma.sellerFeatureOverride.upsert({
          where: { featureId_businessId: { featureId: fid, businessId: dto.businessId } },
          update: { isEnabled: dto.isBusinessEnabled, reason: dto.maintenanceReason || null, updatedBy },
          create: { featureId: fid, businessId: dto.businessId, isEnabled: dto.isBusinessEnabled, reason: dto.maintenanceReason || null, updatedBy },
        });
      }

      lastUpdated = await this.prisma.sellerFeature.update({
        where: { id: fid },
        data: {
          name: dto.name !== undefined ? dto.name : existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          category: (dto.category !== undefined ? dto.category : existing.category) as any,
          isEnabledGlobally: nextEnabled,
          maintenanceReason:
            dto.maintenanceReason !== undefined ? dto.maintenanceReason : existing.maintenanceReason,
          disabledBusinesses: dto.disabledBusinesses || existing.disabledBusinesses,
          enabledBusinesses: dto.enabledBusinesses || existing.enabledBusinesses,
          updatedBy,
        },
      });
    }

    const allFeatures = await this.findAll();
    return { updatedFeature: lastUpdated, list: allFeatures };
  }
}

