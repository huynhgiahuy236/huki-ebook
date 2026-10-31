import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { UpdateMaintenanceDto } from './maintenance.dto';
import { Public } from '@huki/shared/decorators';

@ApiTags('System Maintenance')
@Controller(['system/maintenance', 'system-maintenance', 'maintenance'])
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current system maintenance status & configuration' })
  async getStatus() {
    const config = await this.maintenanceService.getConfig();
    return { success: true, data: config };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Update system maintenance mode & settings' })
  async updateConfig(@Body() dto: UpdateMaintenanceDto, @Req() req: any) {
    const operator = req.user?.fullName || 'Hệ Thống HuKi';
    const config = await this.maintenanceService.updateConfig(dto, operator);
    return { success: true, data: config };
  }
}

