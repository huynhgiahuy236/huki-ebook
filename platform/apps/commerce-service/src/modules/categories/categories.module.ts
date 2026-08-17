import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { Category } from '../../entities';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CatalogAdminGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
