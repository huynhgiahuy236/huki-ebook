import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { StoreModule } from '../store/store.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [PrismaModule, StoreModule, MemberModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
