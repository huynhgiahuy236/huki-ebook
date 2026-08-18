import { Module } from '@nestjs/common';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';

@Module({
  controllers: [PublishersController],
  providers: [PublishersService, CatalogAdminGuard],
  exports: [PublishersService],
})
export class PublishersModule {}
