import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated issuing companies list' })
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAllIssuingCompanies(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get issuing company by id' })
  @ApiSuccessResponse(undefined, { description: 'Issuing company detail' })
  @ApiStandardErrors(400, 404)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.publishersService.findOneIssuingCompany(id) };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create an issuing company' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Issuing company created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(@Body() dto: CreatePublisherDto) {
    return {
      message: 'Issuing company created',
      data: await this.publishersService.createIssuingCompany(dto),
    };
  }
}
