import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiSuccessResponse(undefined, { description: 'Service is healthy' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
    };
  }

  @Get(['health/live', 'health/liveness'])
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  @ApiSuccessResponse(undefined, { description: 'Gateway process is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  @Get(['health/ready', 'health/readiness'])
  @ApiOperation({ summary: 'Readiness probe - checks all downstream dependencies' })
  @ApiSuccessResponse(undefined, { description: 'Gateway readiness status' })
  @ApiStandardErrors(503)
  async readiness() {
    return this.services();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  @ApiSuccessResponse(undefined, { description: 'Pong response' })
  ping() {
    return { message: 'pong' };
  }

  @Get('health/services')
  @ApiOperation({ summary: 'Check all local backend services' })
  @ApiSuccessResponse(undefined, { description: 'Aggregated downstream health status' })
  async services() {
    const names = ['identity', 'business', 'commerce', 'shipping', 'community', 'promotion', 'analytics'] as const;
    const checks = await Promise.all(names.map(async (name) => {
      const host = this.config.get<string>(`services.${name}.host`) || 'localhost';
      const port = this.config.get<number>(`services.${name}.port`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3_000);
      try {
        const response = await fetch(`http://${host}:${port}/api/v1/health`, { signal: controller.signal });
        return { service: name, status: response.ok ? 'ok' : 'unhealthy', statusCode: response.status };
      } catch {
        return { service: name, status: 'unavailable', statusCode: 503 };
      } finally {
        clearTimeout(timer);
      }
    }));

    const isAllOk = checks.every((check) => check.status === 'ok');
    return { status: isAllOk ? 'ok' : 'degraded', services: checks };
  }
}
