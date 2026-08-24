import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISBN,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BookFormat } from '../../../../prisma/generated/client';
import { DigitalBookDetailsDto, PhysicalBookDetailsDto } from './book-details.dto';

export class CreateBookDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ example: 'Mắt biếc' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'mat-biec' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(500)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISBN()
  @MaxLength(20)
  isbn?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  description: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  authorId: string;

  @IsUUID()
  publisherId: string;

  @ApiProperty({ enum: BookFormat })
  @IsEnum(BookFormat)
  format: BookFormat;

  @ApiPropertyOptional({ type: PhysicalBookDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhysicalBookDetailsDto)
  physicalDetails?: PhysicalBookDetailsDto;

  @ApiPropertyOptional({ type: DigitalBookDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigitalBookDetailsDto)
  digitalDetails?: DigitalBookDetailsDto;
}
