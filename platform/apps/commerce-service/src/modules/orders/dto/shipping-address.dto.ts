import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Full name', example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Phone number', example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9]{10,11}$/, { message: 'Phone must be 10-11 digits' })
  phone: string;

  @ApiProperty({ description: 'Province/City', example: 'Ho Chi Minh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province: string;

  @ApiProperty({ description: 'District', example: 'District 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiProperty({ description: 'Ward/Commune', example: 'Ben Nghe Ward' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ward: string;

  @ApiProperty({ description: 'Street address', example: '123 Nguyen Hue St, Floor 5' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  street: string;

  @ApiPropertyOptional({ description: 'Delivery note', example: 'Leave at door' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
