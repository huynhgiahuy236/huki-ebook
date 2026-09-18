import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return this.metricsService.getRegister().metrics();
  }

  @Get('json')
  @ApiOperation({ summary: 'Prometheus metrics in JSON format' })
  async getMetricsJson() {
    const metrics = await this.metricsService.getRegister().metrics();
    const contentType = this.metricsService.getRegister().contentType;

    return {
      metrics,
      contentType,
      timestamp: new Date().toISOString(),
    };
  }
}
