import { Global, Module } from '@nestjs/common';
import {
  AuthenticatedGuard,
  InternalApiGuard,
  PlatformAdminGuard,
} from './shipping-auth.guard';

@Global()
@Module({
  providers: [AuthenticatedGuard, PlatformAdminGuard, InternalApiGuard],
  exports: [AuthenticatedGuard, PlatformAdminGuard, InternalApiGuard],
})
export class CommonModule {}
