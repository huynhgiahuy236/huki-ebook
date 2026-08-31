/**
 * HUKI EBOOK - Shipping Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Address response
 */
export class AddressDto {
  @ApiProperty({ description: 'Address ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Recipient name' })
  recipientName: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @ApiProperty({ description: 'Province/City' })
  province: string;

  @ApiProperty({ description: 'District' })
  district: string;

  @ApiProperty({ description: 'Ward/Commune' })
  ward: string;

  @ApiProperty({ description: 'Street address' })
  street: string;

  @ApiProperty({ description: 'Full address string' })
  fullAddress: string;

  @ApiProperty({ description: 'Is default address' })
  isDefault: boolean;

  @ApiProperty({ description: 'Address type (HOME/OFFICE/OTHER)' })
  addressType: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Shipping fee response
 */
export class ShippingFeeDto {
  @ApiProperty({ description: 'Estimated fee in VND' })
  fee: number;

  @ApiProperty({ description: 'Estimated delivery days' })
  estimatedDays: number;

  @ApiPropertyOptional({ description: 'Carrier name' })
  carrier?: string;

  @ApiPropertyOptional({ description: 'Service type' })
  serviceType?: string;
}

/**
 * Shipment response
 */
export class ShipmentDto {
  @ApiProperty({ description: 'Shipment ID' })
  id: string;

  @ApiProperty({ description: 'Seller order ID' })
  sellerOrderId: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  trackingNumber?: string;

  @ApiProperty({ description: 'Shipment status' })
  status: string;

  @ApiPropertyOptional({ description: 'Shipping address' })
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Assigned delivery staff' })
  assignedStaff?: object;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  estimatedDelivery?: string;

  @ApiPropertyOptional({ description: 'Actual delivery date' })
  deliveredAt?: string;

  @ApiProperty({ description: 'Shipping fee' })
  fee: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Shipment tracking event
 */
export class TrackingEventDto {
  @ApiProperty({ description: 'Event timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Event status' })
  status: string;

  @ApiProperty({ description: 'Event location' })
  location: string;

  @ApiPropertyOptional({ description: 'Event description' })
  description?: string;
}

/**
 * Shipment tracking response
 */
export class ShipmentTrackingDto {
  @ApiProperty({ description: 'Tracking number' })
  trackingNumber: string;

  @ApiProperty({ description: 'Current status' })
  status: string;

  @ApiProperty({ type: [TrackingEventDto], description: 'Tracking events' })
  events: TrackingEventDto[];

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  estimatedDelivery?: string;
}

/**
 * Delivery staff response
 */
export class DeliveryStaffDto {
  @ApiProperty({ description: 'Staff ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Staff name' })
  name: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @ApiPropertyOptional({ description: 'Staff avatar' })
  avatar?: string;

  @ApiProperty({ description: 'Staff status', example: 'ACTIVE' })
  status: string;

  @ApiPropertyOptional({ description: 'Working area' })
  area?: string;

  @ApiProperty({ description: 'Is staff active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}
