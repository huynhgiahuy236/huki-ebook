/**
 * HUKI EBOOK - Commerce Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Category response
 */
export class CategoryDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Category icon' })
  icon?: string;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Is category active' })
  isActive: boolean;

  @ApiPropertyOptional({ type: [CategoryDto], description: 'Child categories' })
  children?: CategoryDto[];
}

/**
 * Author response
 */
export class AuthorDto {
  @ApiProperty({ description: 'Author ID' })
  id: string;

  @ApiProperty({ description: 'Author name' })
  name: string;

  @ApiPropertyOptional({ description: 'Author slug' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Author bio' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Author avatar URL' })
  avatar?: string;
}

/**
 * Publisher response
 */
export class PublisherDto {
  @ApiProperty({ description: 'Publisher ID' })
  id: string;

  @ApiProperty({ description: 'Publisher name' })
  name: string;

  @ApiPropertyOptional({ description: 'Publisher slug' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Publisher description' })
  description?: string;
}

/**
 * Book response
 */
export class BookDto {
  @ApiProperty({ description: 'Book ID' })
  id: string;

  @ApiProperty({ description: 'Book title' })
  title: string;

  @ApiProperty({ description: 'Book slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Book description' })
  description?: string;

  @ApiProperty({ description: 'Book status', example: 'PUBLISHED' })
  status: string;

  @ApiProperty({ description: 'Store ID' })
  storeId: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'Author details' })
  author?: AuthorDto;

  @ApiPropertyOptional({ description: 'Publisher details' })
  publisher?: PublisherDto;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  coverUrl?: string;

  @ApiProperty({ description: 'Base price in VND' })
  price: number;

  @ApiPropertyOptional({ description: 'Discount price in VND' })
  discountPrice?: number;

  @ApiProperty({ description: 'Has physical format' })
  hasPhysical: boolean;

  @ApiProperty({ description: 'Has digital format' })
  hasDigital: boolean;

  @ApiProperty({ description: 'Average rating' })
  avgRating?: number;

  @ApiProperty({ description: 'Total reviews count' })
  reviewCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Cart item response
 */
export class CartItemDto {
  @ApiProperty({ description: 'Cart item ID' })
  id: string;

  @ApiProperty({ description: 'Book details' })
  book: BookDto;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Format type (PHYSICAL/DIGITAL)' })
  format?: string;

  @ApiProperty({ description: 'Price per item' })
  price: number;

  @ApiProperty({ description: 'Total price' })
  totalPrice: number;
}

/**
 * Cart response
 */
export class CartDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ type: [CartItemDto], description: 'Cart items' })
  items: CartItemDto[];

  @ApiProperty({ description: 'Total items count' })
  totalItems: number;

  @ApiProperty({ description: 'Total price' })
  totalPrice: number;

  @ApiPropertyOptional({ description: 'Applied voucher' })
  voucher?: object;
}

/**
 * Checkout preview response
 */
export class CheckoutPreviewDto {
  @ApiProperty({ description: 'Order items' })
  items: CartItemDto[];

  @ApiPropertyOptional({ description: 'Shipping address' })
  address?: object;

  @ApiProperty({ description: 'Subtotal' })
  subtotal: number;

  @ApiPropertyOptional({ description: 'Shipping fee' })
  shippingFee?: number;

  @ApiPropertyOptional({ description: 'Voucher discount' })
  discount?: number;

  @ApiProperty({ description: 'Total amount' })
  total: number;

  @ApiPropertyOptional({ description: 'Available payment methods' })
  paymentMethods?: string[];
}

/**
 * Order response
 */
export class OrderDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  orderNumber: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Order status' })
  status: string;

  @ApiProperty({ description: 'Payment status' })
  paymentStatus: string;

  @ApiProperty({ description: 'Total amount in VND' })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Shipping address' })
  shippingAddress?: object;

  @ApiPropertyOptional({ description: 'Payment method' })
  paymentMethod?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Seller order response
 */
export class SellerOrderDto {
  @ApiProperty({ description: 'Seller order ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Store ID' })
  storeId: string;

  @ApiProperty({ description: 'Seller order status' })
  status: string;

  @ApiPropertyOptional({ description: 'Shipment ID' })
  shipmentId?: string;

  @ApiProperty({ description: 'Items' })
  items: object[];

  @ApiProperty({ description: 'Total amount' })
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Shipping fee' })
  shippingFee?: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Payment response
 */
export class PaymentDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({ description: 'Payment method' })
  method: string;

  @ApiProperty({ description: 'Amount in VND' })
  amount: number;

  @ApiPropertyOptional({ description: 'Payment URL for redirect' })
  paymentUrl?: string;

  @ApiPropertyOptional({ description: 'Payment deadline' })
  expiresAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Refund response
 */
export class RefundDto {
  @ApiProperty({ description: 'Refund ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Refund status' })
  status: string;

  @ApiProperty({ description: 'Refund amount in VND' })
  amount: number;

  @ApiPropertyOptional({ description: 'Refund reason' })
  reason?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}
