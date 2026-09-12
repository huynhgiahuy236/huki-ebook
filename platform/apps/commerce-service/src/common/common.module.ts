import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.secret') ||
          configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
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
