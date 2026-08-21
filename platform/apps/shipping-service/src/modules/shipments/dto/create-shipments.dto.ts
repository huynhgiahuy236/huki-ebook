import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShipmentAddressDto {
  @ApiProperty() @IsString() @IsNotEmpty() receiverName!: string;
  @ApiProperty() @IsPhoneNumber('VN') receiverPhone!: string;
  @ApiProperty() @IsString() @IsNotEmpty() address!: string;
  @ApiProperty() @IsString() @IsNotEmpty() province!: string;
  @ApiProperty() @IsString() @IsNotEmpty() district!: string;
  @ApiProperty() @IsString() @IsNotEmpty() ward!: string;
}
export class SellerOrderShipmentDto {
  @ApiProperty() @IsUUID() sellerOrderId!: string;
  @ApiProperty() @IsUUID() storeId!: string;
  @ApiProperty() @IsUUID() ownerUserId!: string;
  @ApiProperty() @IsBoolean() requiresShipping!: boolean;
  @ApiProperty({ description: 'Physical package weight in grams' })
  @IsInt()
  @Min(1)
  @Max(50_000)
  weight!: number;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;
}
export class CreateShipmentsFromOrderDto {
  @ApiProperty() @IsUUID() orderId!: string;
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty({ enum: ['COD', 'ONLINE_PAYMENT'] })
  @IsIn(['COD', 'ONLINE_PAYMENT'])
  paymentMethod!: 'COD' | 'ONLINE_PAYMENT';
  @ApiProperty({ enum: ['PENDING', 'SUCCEEDED'] })
  @IsIn(['PENDING', 'SUCCEEDED'])
  paymentStatus!: 'PENDING' | 'SUCCEEDED';
  @ApiProperty({ type: ShipmentAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipmentAddressDto)
  shippingAddress?: ShipmentAddressDto;
  @ApiProperty({ type: [SellerOrderShipmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SellerOrderShipmentDto)
  sellerOrders!: SellerOrderShipmentDto[];
}
