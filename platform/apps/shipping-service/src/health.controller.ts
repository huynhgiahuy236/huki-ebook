import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  dependencies?: {
    database?: { status: string; latency?: number; error?: string };
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check with dependency status' })
  async check(): Promise<HealthStatus> {
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

    // Check Database (Prisma/PostgreSQL)
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'shipping-service',
        dependencies: {
          database: {
            status: 'ok',
            latency: Date.now() - start,
          },
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'shipping-service',
        dependencies: {
          database: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  liveness() {
    return { service: 'shipping-service', status: 'ok' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
