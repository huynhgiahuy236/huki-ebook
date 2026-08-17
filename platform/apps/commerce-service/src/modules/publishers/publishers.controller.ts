import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { PublishersService } from './publishers.service';

@ApiTags('Publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'List publishers' })
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publisher by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.publishersService.findOne(id) };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create a publisher' })
  async create(@Body() dto: CreatePublisherDto) {
    return { message: 'Publisher created', data: await this.publishersService.create(dto) };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Update a publisher' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePublisherDto) {
    return {
      message: 'Publisher updated',
      data: await this.publishersService.update(id, dto),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Soft-delete a publisher' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.publishersService.remove(id);
  }
}
