import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, IsEnum } from 'class-validator';

export enum Security2FAPurpose {
  WALLET_WITHDRAWAL = 'WALLET_WITHDRAWAL',
  PIN_CHANGE = 'PIN_CHANGE',
  PIN_SETUP = 'PIN_SETUP',
}

export class SetupPinDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: '6-digit numeric withdrawal PIN',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Mã PIN phải bao gồm chính xác 6 chữ số' })
  pin: string;
}

export class VerifyPinDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: '6-digit numeric withdrawal PIN',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Mã PIN phải bao gồm chính xác 6 chữ số' })
  pin: string;

  @ApiPropertyOptional({
    description: 'Purpose of PIN verification',
    enum: Security2FAPurpose,
    default: Security2FAPurpose.WALLET_WITHDRAWAL,
  })
  @IsOptional()
  @IsEnum(Security2FAPurpose)
  purpose?: Security2FAPurpose;
}

export class ChangePinDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Current 6-digit numeric withdrawal PIN',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Mã PIN hiện tại phải bao gồm chính xác 6 chữ số' })
  currentPin: string;

  @ApiProperty({
    description: 'New 6-digit numeric withdrawal PIN',
    example: '654321',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Mã PIN mới phải bao gồm chính xác 6 chữ số' })
  newPin: string;

  @ApiProperty({
    description: 'Verified 2FA token authorizing the PIN change',
    example: 'sec_auth_tok_abc123',
  })
  @IsString()
  @IsNotEmpty()
  twoFactorToken: string;
}

export class TwoFactorChallengeDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Purpose of the 2FA challenge',
    enum: Security2FAPurpose,
    example: Security2FAPurpose.WALLET_WITHDRAWAL,
  })
  @IsEnum(Security2FAPurpose)
  purpose: Security2FAPurpose;

  @ApiProperty({
    description: 'Short-lived PIN Step-1 verification proof token',
    example: 'pin_step1_abc123',
  })
  @IsString()
  @IsNotEmpty()
  step1Token: string;
}

export class TwoFactorVerifyDto {
  @ApiProperty({
    description: 'Target Store ID',
    example: 'store-123',
  })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'Challenge ID received when issuing 2FA challenge',
    example: 'chal_abc123',
  })
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description: '6-digit OTP code received via Email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Mã OTP xác thực phải gồm chính xác 6 chữ số' })
  code: string;
}

export class WalletSecurityStatusDto {
  @ApiProperty({ description: 'Whether a withdrawal PIN has been established', example: true })
  hasPin: boolean;

  @ApiProperty({ description: 'Whether the wallet security is temporarily locked', example: false })
  isLocked: boolean;

  @ApiPropertyOptional({ description: 'Timestamp until which security operations are locked', example: null })
  lockedUntil: Date | null;

  @ApiProperty({ description: 'Remaining failed attempts before 24-hour lockout', example: 5 })
  remainingAttempts: number;

  @ApiPropertyOptional({ description: 'Timestamp when the PIN was set', example: '2026-09-19T00:00:00.000Z' })
  pinSetAt: Date | null;
}

export class PinVerificationResultDto {
  @ApiProperty({ description: 'Whether the PIN matches', example: true })
  verified: boolean;

  @ApiPropertyOptional({
    description: 'Short-lived step-1 PIN verification token (does NOT authorize final payout)',
    example: 'pin_step1_token_xyz789',
  })
  step1Token?: string;

  @ApiPropertyOptional({ description: 'Remaining attempts before lockout', example: 4 })
  remainingAttempts?: number;

  @ApiProperty({ description: 'Informational message in Vietnamese', example: 'Xác thực mã PIN thành công' })
  message: string;
}

export class TwoFactorChallengeResultDto {
  @ApiProperty({ description: 'Challenge ID for verifying the OTP', example: 'chal_xyz123' })
  challengeId: string;

  @ApiProperty({ description: 'Validity duration in seconds', example: 300 })
  expiresInSeconds: number;

  @ApiProperty({ description: 'Informational message', example: 'Mã xác thực OTP đã được gửi đến email của bạn.' })
  message: string;
}

export class TwoFactorVerifyResultDto {
  @ApiProperty({ description: 'Whether 2FA verification succeeded', example: true })
  verified: boolean;

  @ApiProperty({
    description: 'Short-lived single-use Finance Authorization Token (5-min TTL)',
    example: 'fin_auth_token_abc999',
  })
  financeAuthToken: string;

  @ApiProperty({ description: 'Expiration date of the authorization token', example: '2026-09-19T03:55:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ description: 'Informational message', example: 'Xác thực 2FA thành công' })
  message: string;
}
