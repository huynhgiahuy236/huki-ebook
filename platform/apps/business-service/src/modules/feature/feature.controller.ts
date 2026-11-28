import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { UpdateFeatureDto } from './feature.dto';
import { Public } from '@huki/shared/decorators';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Seller Features')
@Controller(['seller/feature-flags', 'seller-features'])
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all seller feature flags' })
  @ApiQuery({ name: 'businessId', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Seller feature flags list' })
  async getFeatures(@Query('businessId') businessId?: string) {
    const list = await this.featureService.findAll(businessId);
    return { success: true, data: list };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single feature by ID' })
  @ApiSuccessResponse(undefined, { description: 'Feature flag detail' })
  @ApiStandardErrors(404)
  async getFeature(@Param('id') id: string) {
    const feature = await this.featureService.findOne(id);
    return { success: true, data: feature };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle or update seller feature flag (Admin only)' })
  @ApiSuccessResponse(undefined, { description: 'Feature flag updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async updateFeature(@Body() dto: UpdateFeatureDto, @Req() req: any) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên sàn mới có quyền thay đổi cấu hình tính năng');
    }
    const operator = req.user?.fullName || 'Admin System';
    const result = await this.featureService.updateFeature(dto, operator);
    return { success: true, data: result.updatedFeature, list: result.list };
  }
}

