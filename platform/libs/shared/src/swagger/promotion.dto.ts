/**
 * HUKI EBOOK - Promotion Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Voucher response
 */
export class VoucherDto {
  @ApiProperty({ description: 'Voucher ID' })
  id: string;

  @ApiProperty({ description: 'Voucher code' })
  code: string;

  @ApiProperty({ description: 'Voucher name' })
  name: string;

  @ApiPropertyOptional({ description: 'Voucher description' })
  description?: string;

  @ApiProperty({ description: 'Discount type (PERCENTAGE/FIXED_AMOUNT)' })
  discountType: string;

  @ApiProperty({ description: 'Discount value' })
  discountValue: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  minOrderAmount?: number;

  @ApiProperty({ description: 'Usage limit' })
  usageLimit: number;

  @ApiProperty({ description: 'Used count' })
  usedCount: number;

  @ApiPropertyOptional({ description: 'Per-user limit' })
  perUserLimit?: number;

  @ApiProperty({ description: 'Start date' })
  startDate: string;

  @ApiProperty({ description: 'End date' })
  endDate: string;

  @ApiProperty({ description: 'Voucher status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Voucher validation result
 */
export class VoucherValidationDto {
  @ApiProperty({ description: 'Voucher is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Voucher details if valid' })
  voucher?: VoucherDto;

  @ApiPropertyOptional({ description: 'Discount amount if valid' })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Error code if invalid', example: 'VOUCHER_EXPIRED' })
  errorCode?: string;

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  errorMessage?: string;
}

/**
 * Banner response
 */
export class BannerDto {
  @ApiProperty({ description: 'Banner ID' })
  id: string;

  @ApiProperty({ description: 'Banner title' })
  title: string;

  @ApiPropertyOptional({ description: 'Banner subtitle' })
  subtitle?: string;

  @ApiProperty({ description: 'Image URL' })
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Click URL' })
  clickUrl?: string;

  @ApiProperty({ description: 'Display order' })
  sortOrder: number;

  @ApiProperty({ description: 'Banner status', example: 'ACTIVE' })
  status: string;

  @ApiPropertyOptional({ description: 'Start date' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  endDate?: string;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Flash sale response
 */
export class FlashSaleDto {
  @ApiProperty({ description: 'Flash sale ID' })
  id: string;

  @ApiProperty({ description: 'Flash sale name' })
  name: string;

  @ApiPropertyOptional({ description: 'Flash sale description' })
  description?: string;

  @ApiProperty({ description: 'Flash sale status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Start date' })
  startDate: string;

  @ApiProperty({ description: 'End date' })
  endDate: string;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  bannerUrl?: string;

  @ApiProperty({ description: 'Item count' })
  itemCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Flash sale item response
 */
export class FlashSaleItemDto {
  @ApiProperty({ description: 'Item ID' })
  id: string;

  @ApiProperty({ description: 'Flash sale ID' })
  flashSaleId: string;

  @ApiProperty({ description: 'Book ID' })
  bookId: string;

  @ApiPropertyOptional({ description: 'Book title' })
  bookTitle?: string;

  @ApiPropertyOptional({ description: 'Book cover' })
  bookCover?: string;

  @ApiProperty({ description: 'Original price' })
  originalPrice: number;

  @ApiProperty({ description: 'Flash sale price' })
  flashPrice: number;

  @ApiProperty({ description: 'Discount percentage' })
  discountPercent: number;

  @ApiProperty({ description: 'Total stock' })
  stock: number;

  @ApiProperty({ description: 'Available stock' })
  availableStock: number;

  @ApiPropertyOptional({ description: 'Per-user limit' })
  perUserLimit?: number;

  @ApiProperty({ description: 'Sold count' })
  soldCount: number;
}
