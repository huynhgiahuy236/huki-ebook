import { Module } from '@nestjs/common';
import { EmailModule } from '@huki/shared';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { StoreModule } from '../store/store.module';
import { MemberModule } from '../member/member.module';
import { AuthModule } from '../auth/auth.module';
import { IdentityModule } from '../identity/identity.module';
import { BusinessOutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, StoreModule, MemberModule, AuthModule, IdentityModule, EmailModule, BusinessOutboxModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
