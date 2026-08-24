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
} from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Create a new banner' })
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all banners' })
  findAll(@Query() query: BannerQueryDto) {
    return this.banners.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active banners' })
  getActive(
    @Query('scope') scope?: BannerScope,
    @Query('storeId') storeId?: string,
  ) {
    return this.banners.getActiveBanners(scope, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.banners.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Update banner' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.banners.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN', 'BUSINESS')
  @ApiOperation({ summary: 'Delete banner' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.banners.delete(id);
  }
}
