import { IsString, IsEmail, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole, MemberStatus } from '../../../../prisma/generated/client';

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

export class ProvisionMemberDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn Nhân Viên' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Staff123!' })
  @IsOptional()
  @IsString()
  initialPassword?: string;

  @ApiPropertyOptional({ enum: MemberRole, example: MemberRole.ORDER_STAFF })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @ApiProperty({ example: ['ORDER_VIEW', 'ORDER_PROCESS'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateMemberPermissionsDto {
  @ApiProperty({ example: ['ORDER_VIEW', 'ORDER_PROCESS'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: MemberStatus, example: MemberStatus.ACTIVE })
  @IsEnum(MemberStatus)
  status: MemberStatus;
}

export class ResetMemberPasswordDto {
  @ApiPropertyOptional({ example: 'Staff123!' })
  @IsOptional()
  @IsString()
  newPassword?: string;
}

