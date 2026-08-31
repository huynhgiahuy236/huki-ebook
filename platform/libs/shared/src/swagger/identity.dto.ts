/**
 * HUKI EBOOK - Identity Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User profile response
 */
export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiPropertyOptional({ description: 'User full name' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'User phone' })
  phone?: string;

  @ApiProperty({ description: 'User role', example: 'USER' })
  role: string;

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'Account status' })
  status: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Auth tokens response
 */
export class AuthTokensDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access token expires in seconds', example: 900 })
  expiresIn: number;
}

/**
 * Login response
 */
export class LoginResponseDto {
  @ApiProperty({ type: UserProfileDto, description: 'User profile' })
  user: UserProfileDto;

  @ApiProperty({ type: AuthTokensDto, description: 'Authentication tokens' })
  tokens: AuthTokensDto;
}

/**
 * Session info
 */
export class SessionDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Device info' })
  device: string;

  @ApiProperty({ description: 'IP address' })
  ip: string;

  @ApiPropertyOptional({ description: 'Last active timestamp' })
  lastActive?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Is current session' })
  isCurrent: boolean;
}
