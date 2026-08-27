import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MongooseHealthIndicator, HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

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
  constructor(
    private readonly health: HealthCheckService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check with dependency status' })
  async check(): Promise<HealthStatus> {
    // Check Database (MongoDB)
    try {
      const start = Date.now();
      const db = this.connection.db;
      if (!db) throw new Error('Database connection not established');
      await db.admin().ping();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'community-service',
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
        service: 'community-service',
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
    return { service: 'community-service', status: 'ok' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe - checks all dependencies' })
  async readiness(): Promise<HealthStatus> {
    return this.check();
  }
}
