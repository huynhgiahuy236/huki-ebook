import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ForensicStatus } from '../../../../prisma/generated/client';

export class DecodeWatermarkDto {
  @ApiProperty({
    description: 'Raw watermark text extracted from screenshot / OCR',
    example: 'HUKI • r***r@gmail.com • P.42 • 2026-09-18 23:50 UTC',
  })
  @IsString()
  @MaxLength(1000)
  watermarkText: string;
}

export class InvestigatePiracyDto {
  @ApiProperty({
    description: 'Extracted forensic watermark string',
    example: 'HUKI • UID: 94b8...e21a • P.42 • 2026-09-18 23:50 UTC',
  })
  @IsString()
  @MaxLength(1000)
  watermarkText: string;

  @ApiPropertyOptional({ description: 'Book ID or UUID if known' })
  @IsOptional()
  @IsString()
  bookId?: string;

  @ApiPropertyOptional({ description: 'Page number where watermark was captured', example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'Reported piracy URL / source', example: 'https://piracysite.com/leak/book.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reportedUrl?: string;

  @ApiPropertyOptional({ description: 'Screenshot image URL', example: 'https://cdn.huki.vn/evidence/leak_page42.png' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Investigation notes', example: 'Leaked chapter 2 found on public telegram channel' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Automatically revoke access for matched user if piracy confirmed', default: false })
  @IsOptional()
  @IsBoolean()
  autoRevokeAccess?: boolean;
}

export class UpdateEvidenceStatusDto {
  @ApiProperty({ enum: ForensicStatus, example: ForensicStatus.CONFIRMED_PIRACY })
  @IsEnum(ForensicStatus)
  status: ForensicStatus;

  @ApiPropertyOptional({ description: 'Updated investigation notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Revoke access for the associated user', default: false })
  @IsOptional()
  @IsBoolean()
  revokeAccess?: boolean;
}
