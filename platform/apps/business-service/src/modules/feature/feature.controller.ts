import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { UpdateFeatureDto } from './feature.dto';
import { Public } from '@huki/shared/decorators';

@ApiTags('Seller Features')
@Controller(['seller/feature-flags', 'seller-features'])
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all seller feature flags' })
  async getFeatures(@Query('businessId') businessId?: string) {
    const list = await this.featureService.findAll(businessId);
    return { success: true, data: list };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single feature by ID' })
  async getFeature(@Param('id') id: string) {
    const feature = await this.featureService.findOne(id);
    return { success: true, data: feature };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Toggle or update seller feature flag' })
  async updateFeature(@Body() dto: UpdateFeatureDto, @Req() req: any) {
    const operator = req.user?.fullName || 'Admin System';
    const result = await this.featureService.updateFeature(dto, operator);
    return { success: true, data: result.updatedFeature, list: result.list };
  }
}

