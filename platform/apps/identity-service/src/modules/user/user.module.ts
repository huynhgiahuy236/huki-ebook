import { Module } from '@nestjs/common';
import { EmailModule } from '@huki/shared';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [EmailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
