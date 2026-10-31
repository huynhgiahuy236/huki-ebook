import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PenaltyService } from './penalty.service';
import { PenaltyActionDto } from './penalty.dto';
import { Public } from '@huki/shared/decorators';

@ApiTags('Seller Penalties')
@Controller(['seller/penalties', 'seller-penalties'])
export class PenaltyController {
  constructor(private readonly penaltyService: PenaltyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get seller penalty profile by storeId' })
  async getProfile(@Query('storeId') storeId?: string) {
    const profile = await this.penaltyService.getProfile(storeId);
    return { success: true, data: profile };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Perform an action on seller penalties (appeal, review, add points)' })
  async handleAction(@Body() dto: PenaltyActionDto) {
    const profile = await this.penaltyService.handleAction(dto);
    return { success: true, data: profile };
  }
}

