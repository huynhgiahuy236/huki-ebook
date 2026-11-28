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
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated publishers list' })
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publisher by id' })
  @ApiSuccessResponse(undefined, { description: 'Publisher detail' })
  @ApiStandardErrors(400, 404)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.publishersService.findOne(id) };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create a publisher' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Publisher created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(@Body() dto: CreatePublisherDto) {
    return { message: 'Publisher created', data: await this.publishersService.create(dto) };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Update a publisher' })
  @ApiSuccessResponse(undefined, { description: 'Publisher updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePublisherDto) {
    return {
      message: 'Publisher updated',
      data: await this.publishersService.update(id, dto),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Soft-delete a publisher' })
  @ApiSuccessResponse(undefined, { status: 204, description: 'Publisher deleted' })
  @ApiStandardErrors(400, 401, 403, 404)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.publishersService.remove(id);
  }
}
