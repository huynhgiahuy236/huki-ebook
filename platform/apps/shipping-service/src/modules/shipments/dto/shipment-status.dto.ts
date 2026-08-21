import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ShipmentStatus } from '../../../../prisma/generated/client';
export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;
}
export class GhtkCallbackDto extends UpdateShipmentStatusDto {
  @ApiProperty() @IsString() @IsNotEmpty() eventId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() trackingNumber!: string;
  @ApiProperty() @IsDateString() occurredAt!: string;
  @ApiProperty() @IsString() @IsNotEmpty() signature!: string;
}
export class CancelShipmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
