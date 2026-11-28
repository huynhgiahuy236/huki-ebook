import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { CatalogSearchService } from './catalog-search.service';
import { CatalogSearchQueryDto } from './dto/catalog-search-query.dto';

@ApiTags('Catalog Search')
@Controller('catalog')
export class CatalogSearchController {
  constructor(private readonly catalogSearchService: CatalogSearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Full-text search categories, authors and publishers' })
  @ApiSuccessResponse(undefined, { description: 'Search results across categories, authors and publishers' })
  @ApiStandardErrors(400)
  search(@Query() query: CatalogSearchQueryDto) {
    return this.catalogSearchService.search(query);
  }
}
