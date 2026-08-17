import { Module } from '@nestjs/common';
import { CatalogSearchController } from './catalog-search.controller';
import { CatalogSearchService } from './catalog-search.service';

@Module({
  controllers: [CatalogSearchController],
  providers: [CatalogSearchService],
})
export class CatalogSearchModule {}
