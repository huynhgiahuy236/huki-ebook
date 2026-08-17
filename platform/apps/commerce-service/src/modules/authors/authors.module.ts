import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { Author } from '../../entities';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  controllers: [AuthorsController],
  providers: [AuthorsService, CatalogAdminGuard],
  exports: [AuthorsService],
})
export class AuthorsModule {}
