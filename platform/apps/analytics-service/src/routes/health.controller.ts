import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { PrismaService } from '../prisma/prisma.service';

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
  @ApiSuccessResponse(undefined, { description: 'Analytics service health status' })
  @ApiStandardErrors(503)
  async check(): Promise<HealthStatus> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'analytics-service',
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
        service: 'analytics-service',
        dependencies: {
          database: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  @Get(['health/live', 'health/liveness'])
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  @ApiSuccessResponse(undefined, { description: 'Analytics service liveness status' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'analytics-service',
    };
  }

  @Get(['health/ready', 'health/readiness'])
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  @ApiSuccessResponse(undefined, { description: 'Analytics service readiness status' })
  @ApiStandardErrors(503)
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
