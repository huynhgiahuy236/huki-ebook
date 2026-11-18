import { Module } from '@nestjs/common';
import { EmailModule } from '@huki/shared';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { InternalUserController } from './internal-user.controller';
import { UserPurgeCron } from './user-purge.cron';

@Module({
  imports: [EmailModule],
  controllers: [UserController, InternalUserController],
  providers: [UserService, UserPurgeCron],
  exports: [UserService],
})
export class UserModule {}
