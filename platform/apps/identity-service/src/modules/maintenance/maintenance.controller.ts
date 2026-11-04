import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { UpdateMaintenanceDto } from './maintenance.dto';
import { Public } from '@huki/shared/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@huki/shared';

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

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update system maintenance mode & settings (Admin only)' })
  async updateConfig(@Body() dto: UpdateMaintenanceDto, @Req() req: any) {
    const operator = req.user?.fullName || 'Quản Trị Viên HuKi';
    const config = await this.maintenanceService.updateConfig(dto, operator);
    return { success: true, data: config };
  }
}
