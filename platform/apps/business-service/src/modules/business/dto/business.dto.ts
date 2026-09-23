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

  @ApiPropertyOptional({ example: 'Nhà Sách FAHASA Official' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  store_name?: string;

  @ApiPropertyOptional({ example: 'Nhà Sách FAHASA Official' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ example: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ example: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1029384756' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiPropertyOptional({ example: '1029384756' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'CÔNG TY TNHH ABC' })
  @IsOptional()
  @IsString()
  account_holder_name?: string;

  @ApiPropertyOptional({ example: 'CÔNG TY TNHH ABC' })
  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Ba Đình' })
  @IsOptional()
  @IsString()
  bank_branch?: string;

  @ApiPropertyOptional({ example: 'Chi nhánh Ba Đình' })
  @IsOptional()
  @IsString()
  bankBranch?: string;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;
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
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
  bankBranch: string | null;
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
