import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StaffStatus } from '../../../../prisma/generated/client';
export class CreateDeliveryStaffDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty() @IsPhoneNumber('VN') phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  currentArea?: string;
}
export class UpdateDeliveryStaffDto extends PartialType(
  CreateDeliveryStaffDto,
) {
  @ApiPropertyOptional({ enum: StaffStatus })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}
export class AssignDeliveryStaffDto {
  @ApiProperty() @IsUUID() staffId!: string;
}
