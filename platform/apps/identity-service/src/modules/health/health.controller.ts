import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT } from '../rabbitmq/rabbitmq.module';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  dependencies?: {
    database?: { status: string; latency?: number; error?: string };
    redis?: { status: string; latency?: number; error?: string };
    rabbitmq?: { status: string; latency?: number; error?: string };
  };
}

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(RABBITMQ_CLIENT) private readonly rabbitmq: ClientProxy,
  ) {}

  @Get('health')
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

    // Check RabbitMQ
    try {
      const start = Date.now();
      // Establishing the client connection verifies the broker without
      // requiring a separate service to implement a health.check responder.
      await this.rabbitmq.connect();
      dependencies.rabbitmq = {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      // RabbitMQ errors are common in dev - mark as degraded
      dependencies.rabbitmq = {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'identity-service',
      dependencies,
    };
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'identity-service',
    };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
