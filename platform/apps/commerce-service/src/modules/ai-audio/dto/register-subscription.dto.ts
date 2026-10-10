import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterSubscriptionDto {
  @ApiProperty({ example: 'ba1117f1-cded-4dfd-9933-f7eb755f752b' })
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ example: 'plan-basic-100k' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({ example: 'WALLET' })
  @IsString()
  @IsOptional()
  paymentMethod?: string; // WALLET | PAYOS | QR_TRANSFER
}
