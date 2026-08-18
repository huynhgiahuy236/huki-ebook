import { Module } from '@nestjs/common';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';

@Module({
  controllers: [AuthorsController],
  providers: [AuthorsService, CatalogAdminGuard],
  exports: [AuthorsService],
})
export class AuthorsModule {}
