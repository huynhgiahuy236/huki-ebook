import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateMaintenanceDto } from './maintenance.dto';

const CACHE_KEY = 'system:maintenance:config';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getConfig() {
    // 1. Try reading from Redis cache first
    try {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err: any) {
      this.logger.warn(`Redis get failed: ${err.message}`);
    }

    // 2. Fallback to PostgreSQL
    let config = await this.prisma.systemMaintenanceConfig.findUnique({
      where: { id: 'SYSTEM_DEFAULT' },
    });

    if (!config) {
      config = await this.prisma.systemMaintenanceConfig.create({
        data: {
          id: 'SYSTEM_DEFAULT',
          isActive: false,
          mode: 'GRACEFUL',
          drainDurationMinutes: 5,
          reason: 'Hệ thống HUKI EBOOK đang thực hiện bảo trì nâng cấp định kỳ. Chúng tôi sẽ sớm quay trở lại!',
          affectedRoles: ['ALL'],
          allowOfflineDrm: true,
          allowShipperOfflineCod: true,
          supportHotline: '1900 6868',
          supportEmail: 'hotro@huki.vn',
          whitelistIps: ['127.0.0.1', '::1'],
          updatedBy: 'Hệ Thống HuKi',
        },
      });
    }

    // Write back to Redis (10 minutes TTL)
    try {
      await this.redis.set(CACHE_KEY, JSON.stringify(config), 600);
    } catch (err: any) {
      this.logger.warn(`Redis set failed: ${err.message}`);
    }

    return config;
  }

  async updateConfig(dto: UpdateMaintenanceDto, operatorName?: string) {
    const existing = await this.getConfig();
    const updatedBy = dto.updatedBy || operatorName || 'Admin System';

    let drainStartedAt = existing.drainStartedAt;
    if (dto.isActive && !existing.isActive && dto.mode === 'GRACEFUL') {
      drainStartedAt = new Date();
    } else if (!dto.isActive) {
      drainStartedAt = null;
    }

    const updated = await this.prisma.systemMaintenanceConfig.upsert({
      where: { id: 'SYSTEM_DEFAULT' },
      update: {
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        mode: dto.mode || existing.mode,
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : existing.scheduledStartTime,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : existing.scheduledEndTime,
        drainDurationMinutes: dto.drainDurationMinutes !== undefined ? dto.drainDurationMinutes : existing.drainDurationMinutes,
        drainStartedAt,
        reason: dto.reason || existing.reason,
        affectedRoles: dto.affectedRoles || existing.affectedRoles,
        allowOfflineDrm: dto.allowOfflineDrm !== undefined ? dto.allowOfflineDrm : existing.allowOfflineDrm,
        allowShipperOfflineCod: dto.allowShipperOfflineCod !== undefined ? dto.allowShipperOfflineCod : existing.allowShipperOfflineCod,
        supportHotline: dto.supportHotline || existing.supportHotline,
        supportEmail: dto.supportEmail || existing.supportEmail,
        whitelistIps: dto.whitelistIps || existing.whitelistIps,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        id: 'SYSTEM_DEFAULT',
        isActive: dto.isActive !== undefined ? dto.isActive : false,
        mode: dto.mode || 'GRACEFUL',
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
        drainDurationMinutes: dto.drainDurationMinutes || 5,
        drainStartedAt,
        reason: dto.reason || 'Hệ thống bảo trì định kỳ',
        affectedRoles: dto.affectedRoles || ['ALL'],
        allowOfflineDrm: dto.allowOfflineDrm !== undefined ? dto.allowOfflineDrm : true,
        allowShipperOfflineCod: dto.allowShipperOfflineCod !== undefined ? dto.allowShipperOfflineCod : true,
        supportHotline: dto.supportHotline || '1900 6868',
        supportEmail: dto.supportEmail || 'hotro@huki.vn',
        whitelistIps: dto.whitelistIps || ['127.0.0.1', '::1'],
        updatedBy,
      },
    });

    // Update Redis cache immediately
    try {
      await this.redis.set(CACHE_KEY, JSON.stringify(updated), 600);
    } catch (err: any) {
      this.logger.warn(`Redis set failed: ${err.message}`);
    }

    return updated;
  }
}

