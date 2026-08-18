import { Module } from '@nestjs/common';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CatalogAdminGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
