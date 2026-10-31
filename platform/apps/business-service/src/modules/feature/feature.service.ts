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
    const existing = await this.prisma.sellerFeature.findUnique({
      where: { id: dto.id },
    });

    if (!existing) {
      throw new NotFoundException(`Feature ${dto.id} not found`);
    }

    const updatedBy = dto.updatedBy || operatorName || 'Admin System';

    // Check if updating specific business override
    if (dto.businessId && dto.isBusinessEnabled !== undefined) {
      await this.prisma.sellerFeatureOverride.upsert({
        where: {
          featureId_businessId: {
            featureId: dto.id,
            businessId: dto.businessId,
          },
        },
        update: {
          isEnabled: dto.isBusinessEnabled,
          reason: dto.maintenanceReason || null,
          updatedBy,
        },
        create: {
          featureId: dto.id,
          businessId: dto.businessId,
          isEnabled: dto.isBusinessEnabled,
          reason: dto.maintenanceReason || null,
          updatedBy,
        },
      });
    }

    // Update global properties
    const updated = await this.prisma.sellerFeature.update({
      where: { id: dto.id },
      data: {
        isEnabledGlobally:
          dto.isEnabledGlobally !== undefined ? dto.isEnabledGlobally : existing.isEnabledGlobally,
        maintenanceReason:
          dto.maintenanceReason !== undefined ? dto.maintenanceReason : existing.maintenanceReason,
        disabledBusinesses: dto.disabledBusinesses || existing.disabledBusinesses,
        enabledBusinesses: dto.enabledBusinesses || existing.enabledBusinesses,
        updatedBy,
      },
    });

    const allFeatures = await this.findAll();
    return { updatedFeature: updated, list: allFeatures };
  }
}

