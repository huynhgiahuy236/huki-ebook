import { IsString, IsOptional, IsEnum, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType, BusinessStatus } from '../../../../prisma/generated/client';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Nhà sách ABC' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'contact@nhuasachabc.vn' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.INDIVIDUAL })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  taxCode?: string;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class RegisterBusinessResponseDto {
  id: string;
  name: string;
  email: string;
  businessType: BusinessType;
  status: BusinessStatus;
  createdAt: Date;
}

export class BusinessDetailDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  businessType: BusinessType;
  status: BusinessStatus;
  registryVerifiedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  stores: {
    id: string;
    name: string;
    slug: string;
    status: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
