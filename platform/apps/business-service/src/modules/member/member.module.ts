import { Module } from "@nestjs/common";
import { MemberService } from "./member.service";
import { MemberController } from "./member.controller";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "@huki/shared";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [AuthModule, EmailModule, IdentityModule],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
