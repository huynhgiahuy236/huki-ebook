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
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'huki-dev-jwt-secret-change-in-production-2026',
      signOptions: { expiresIn: '15m' },
    }),
  ],
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
