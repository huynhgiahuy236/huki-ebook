import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

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
