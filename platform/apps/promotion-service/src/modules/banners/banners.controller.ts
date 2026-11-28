import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BannersService } from './banners.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerQueryDto,
  BannerScope,
} from './dto/banner.dto';
import { RolesGuard, Roles } from '../../common/roles.guard';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Banner created' })
  @ApiStandardErrors(400, 401, 403)
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all banners' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Banners list' })
  findAll(@Query() query: BannerQueryDto) {
    return this.banners.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active banners' })
  @ApiQuery({ name: 'scope', required: false, enum: BannerScope })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Active banners' })
  getActive(
    @Query('scope') scope?: BannerScope,
    @Query('storeId') storeId?: string,
  ) {
    return this.banners.getActiveBanners(scope, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  @ApiSuccessResponse(undefined, { description: 'Banner detail' })
  @ApiStandardErrors(404)
  findOne(@Param('id') id: string) {
    return this.banners.findOne(id);
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Track real user click on banner' })
  @ApiSuccessResponse(undefined, { description: 'Banner click recorded' })
  @ApiStandardErrors(404)
  trackClick(@Param('id') id: string) {
    return this.banners.incrementClick(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Update banner' })
  @ApiSuccessResponse(undefined, { description: 'Banner updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.banners.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Delete banner' })
  @ApiSuccessResponse(undefined, { description: 'Banner deleted' })
  @ApiStandardErrors(401, 403, 404)
  delete(@Param('id') id: string) {
    return this.banners.delete(id);
  }
}
