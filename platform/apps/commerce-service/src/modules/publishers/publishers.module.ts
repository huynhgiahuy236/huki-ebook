import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { Publisher } from '../../entities';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Publisher])],
  controllers: [PublishersController],
  providers: [PublishersService, CatalogAdminGuard],
  exports: [PublishersService],
})
export class PublishersModule {}
