import { Module } from "@nestjs/common";
import { MemberService } from "./member.service";
import { MemberController } from "./member.controller";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "@huki/shared";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
