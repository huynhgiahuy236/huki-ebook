/**
 * HUKI EBOOK - Business Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Business profile response
 */
export class BusinessDto {
  @ApiProperty({ description: 'Business ID' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  name: string;

  @ApiPropertyOptional({ description: 'Business description' })
  description?: string;

  @ApiProperty({ description: 'Business status', example: 'APPROVED' })
  status: string;

  @ApiPropertyOptional({ description: 'Tax code' })
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  address?: string;

  @ApiPropertyOptional({ description: 'Business phone' })
  phone?: string;

  @ApiProperty({ description: 'Owner user ID' })
  ownerId: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Store response
 */
export class StoreDto {
  @ApiProperty({ description: 'Store ID' })
  id: string;

  @ApiProperty({ description: 'Store name' })
  name: string;

  @ApiProperty({ description: 'Store slug for URL' })
  slug: string;

  @ApiPropertyOptional({ description: 'Store description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Store logo URL' })
  logo?: string;

  @ApiProperty({ description: 'Store status', example: 'APPROVED' })
  status: string;

  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Is store active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Store address' })
  address?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Business member response
 */
export class BusinessMemberDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Member role', example: 'ADMIN' })
  role: string;

  @ApiProperty({ description: 'Invitation status', example: 'ACCEPTED' })
  status: string;

  @ApiPropertyOptional({ description: 'User email' })
  email?: string;

  @ApiProperty({ description: 'Joined timestamp' })
  joinedAt: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Invitation response
 */
export class InvitationDto {
  @ApiProperty({ description: 'Invitation ID' })
  id: string;

  @ApiProperty({ description: 'Business ID' })
  businessId: string;

  @ApiProperty({ description: 'Invited email' })
  email: string;

  @ApiProperty({ description: 'Invited role', example: 'EDITOR' })
  role: string;

  @ApiProperty({ description: 'Invitation status', example: 'PENDING' })
  status: string;

  @ApiProperty({ description: 'Invitation token' })
  token: string;

  @ApiPropertyOptional({ description: 'Expires at timestamp' })
  expiresAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Business list item (lighter than full DTO)
 */
export class BusinessListItemDto {
  @ApiProperty({ description: 'Business ID' })
  id: string;

  @ApiProperty({ description: 'Business name' })
  name: string;

  @ApiProperty({ description: 'Business status' })
  status: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Store list item
 */
export class StoreListItemDto {
  @ApiProperty({ description: 'Store ID' })
  id: string;

  @ApiProperty({ description: 'Store name' })
  name: string;

  @ApiProperty({ description: 'Store slug' })
  slug: string;

  @ApiProperty({ description: 'Store status' })
  status: string;

  @ApiPropertyOptional({ description: 'Store logo' })
  logo?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}
