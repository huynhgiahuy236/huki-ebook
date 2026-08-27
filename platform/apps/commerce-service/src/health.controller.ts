import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './modules/redis/redis.service';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  dependencies?: {
    database?: { status: string; latency?: number; error?: string };
    redis?: { status: string; latency?: number; error?: string };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check with dependency status' })
  async check(): Promise<HealthStatus> {
    const dependencies: HealthStatus['dependencies'] = {};
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

    // Check Database (Prisma/PostgreSQL)
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dependencies.database = {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      dependencies.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = 'error';
    }

    // Check Redis
    try {
      const start = Date.now();
      await this.redis.ping();
      dependencies.redis = {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      dependencies.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'commerce-service',
      dependencies,
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  liveness() {
    return { service: 'commerce-service', status: 'ok' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
