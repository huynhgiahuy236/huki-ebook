import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthenticatedGuard,
  BookWriteGuard,
  OptionalBookAuthGuard,
} from './book-auth.guard';
import { CatalogAdminGuard } from './catalog-admin.guard';

@Global()
@Module({
  imports: [JwtModule],
  providers: [
    AuthenticatedGuard,
    BookWriteGuard,
    OptionalBookAuthGuard,
    CatalogAdminGuard,
  ],
  exports: [
    AuthenticatedGuard,
    BookWriteGuard,
    OptionalBookAuthGuard,
    CatalogAdminGuard,
    JwtModule,
  ],
})
export class CommonModule {}
