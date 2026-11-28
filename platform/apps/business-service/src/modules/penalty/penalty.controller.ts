import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PenaltyService } from './penalty.service';
import { PenaltyActionDto } from './penalty.dto';
import { Public } from '@huki/shared/decorators';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Seller Penalties')
@Controller(['seller/penalties', 'seller-penalties'])
export class PenaltyController {
  constructor(private readonly penaltyService: PenaltyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get seller penalty profile by storeId or all profiles for Admin' })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'Seller penalty profile(s)' })
  async getProfile(@Query('storeId') storeId?: string) {
    if (!storeId) {
      const profiles = await this.penaltyService.getAllProfiles();
      return { success: true, data: profiles };
    }
    const profile = await this.penaltyService.getProfile(storeId);
    return { success: true, data: profile };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Perform an action on seller penalties (appeal, review, add points)' })
  @ApiSuccessResponse(undefined, { description: 'Penalty action processed' })
  @ApiStandardErrors(400, 404)
  async handleAction(@Body() dto: PenaltyActionDto) {
    const profile = await this.penaltyService.handleAction(dto);
    return { success: true, data: profile };
  }
}

