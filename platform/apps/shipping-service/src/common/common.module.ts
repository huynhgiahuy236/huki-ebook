import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AuthenticatedGuard,
  InternalApiGuard,
  PlatformAdminGuard,
} from './shipping-auth.guard';

@Global()
@Module({
  imports: [JwtModule],
  providers: [AuthenticatedGuard, PlatformAdminGuard, InternalApiGuard],
  exports: [AuthenticatedGuard, PlatformAdminGuard, InternalApiGuard, JwtModule],
})
export class CommonModule {}
