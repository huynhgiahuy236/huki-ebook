import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '../../../../prisma/generated/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: MemberRole, example: MemberRole.CONTENT_STAFF })
  @IsEnum(MemberRole)
  role: MemberRole;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: MemberRole })
  @IsEnum(MemberRole)
  role: MemberRole;
}
