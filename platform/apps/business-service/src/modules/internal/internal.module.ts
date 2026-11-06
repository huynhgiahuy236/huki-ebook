import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InternalSellerScopeController } from './internal-seller-scope.controller';
import { InternalAuthGuard } from './guards/internal-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [InternalSellerScopeController],
  providers: [InternalAuthGuard],
  exports: [InternalAuthGuard],
})
export class InternalModule {}
