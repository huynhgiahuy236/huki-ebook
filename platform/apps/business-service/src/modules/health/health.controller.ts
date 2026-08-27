import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  dependencies?: {
    database?: { status: string; latency?: number; error?: string };
  };
}

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check with dependency status' })
  async check(): Promise<HealthStatus> {
    // Check Database (Prisma/PostgreSQL)
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'business-service',
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
        service: 'business-service',
        dependencies: {
          database: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'business-service',
    };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
