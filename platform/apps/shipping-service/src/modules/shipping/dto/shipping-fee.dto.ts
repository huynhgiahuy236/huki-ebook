import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, Max, Min } from 'class-validator';

export class ShippingFeeQueryDto {
  @ApiProperty({ example: 'Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty()
  province!: string;
  @ApiProperty({ example: 'Quận 1' })
  @IsString()
  @IsNotEmpty()
  district!: string;
  @ApiProperty({ example: 750, description: 'Total package weight in grams' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50_000)
  weight!: number;
}

export class ShippingFeeBodyDto {
  @ApiProperty({ example: 'Hồ Chí Minh', description: 'Province name' })
  @IsString()
  @IsNotEmpty()
  province!: string;

  @ApiProperty({ example: 'Quận 1', description: 'District name' })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiProperty({ example: 750, description: 'Total package weight in grams' })
  @IsInt()
  @Min(1)
  @Max(50_000)
  weight!: number;

  @ApiPropertyOptional({ example: 200000, description: 'COD amount for COD fee calculation' })
  @IsOptional()
  @IsNumber()
  codAmount?: number;
}
