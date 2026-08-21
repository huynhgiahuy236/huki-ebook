import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';
export class CreateAddressDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty() @IsPhoneNumber('VN') phone!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(250) address!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) province!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) district!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) ward!: string;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
