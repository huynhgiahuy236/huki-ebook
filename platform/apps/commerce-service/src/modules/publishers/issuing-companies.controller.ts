import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { PublishersService } from './publishers.service';

@ApiTags('Issuing Companies')
@Controller('issuing-companies')
export class IssuingCompaniesController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'List book issuing companies (Đơn vị phát hành)' })
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAllIssuingCompanies(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get issuing company by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.publishersService.findOneIssuingCompany(id) };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create an issuing company' })
  async create(@Body() dto: CreatePublisherDto) {
    return {
      message: 'Issuing company created',
      data: await this.publishersService.createIssuingCompany(dto),
    };
  }
}
