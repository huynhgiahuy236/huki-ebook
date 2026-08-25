import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
    };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  ping() {
    return { message: 'pong' };
  }

  @Get('health/services')
  @ApiOperation({ summary: 'Check all local backend services' })
  async services() {
    const names = ['identity', 'business', 'commerce', 'shipping', 'community', 'promotion'] as const;
    const checks = await Promise.all(names.map(async (name) => {
      const host = this.config.get<string>(`services.${name}.host`);
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

    if (checks.some((check) => check.status !== 'ok')) {
      throw new ServiceUnavailableException({ code: 'SYSTEM_UNAVAILABLE', message: 'One or more services are unavailable', details: checks });
    }
    return { status: 'ok', services: checks };
  }
}
