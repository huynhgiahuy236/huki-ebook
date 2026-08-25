import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { StoreModule } from '../store/store.module';
import { MemberModule } from '../member/member.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, StoreModule, MemberModule, AuthModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
