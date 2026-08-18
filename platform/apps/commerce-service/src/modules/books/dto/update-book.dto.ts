import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateBookDto } from './create-book.dto';
import { DigitalBookDetailsDto, PhysicalBookDetailsDto } from './book-details.dto';

class MutableBookDto extends OmitType(CreateBookDto, ['storeId'] as const) {}

export class UpdateBookDto extends PartialType(MutableBookDto) {
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
