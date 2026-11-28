import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'https://huki-ebook.com/payment/success' })
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @ApiProperty({ example: 'https://huki-ebook.com/payment/cancelled' })
  @IsUrl({ require_tld: false })
  cancelUrl: string;
}

export class CreateRefundDto {
  @ApiProperty({ example: 100000, description: 'VND; omit to refund the remaining paid amount' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  amount?: number;

  @ApiProperty({ example: 'Buyer cancelled before shipment' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class SettleRefundDto {
  @ApiProperty({ description: 'Result recorded after refund reconciliation in PayOS' })
  @IsBoolean()
  succeeded: boolean;

  @ApiPropertyOptional({ description: 'PayOS/dashboard reconciliation reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  providerReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  failureReason?: string;
}

export class PayOSWebhookDataDto {
  @ApiProperty({ example: 123456 })
  @Allow()
  orderCode: number;

  @ApiProperty({ example: 150000 })
  @Allow()
  amount: number;

  @ApiPropertyOptional({ example: 'Thanh toán đơn hàng' })
  @Allow()
  description?: string;

  @ApiPropertyOptional()
  @Allow()
  accountNumber?: string;

  @ApiPropertyOptional()
  @Allow()
  reference?: string;

  @ApiPropertyOptional()
  @Allow()
  transactionDateTime?: string;

  @ApiPropertyOptional({ example: 'VND' })
  @Allow()
  currency?: string;

  @ApiPropertyOptional()
  @Allow()
  paymentLinkId?: string;

  @ApiPropertyOptional()
  @Allow()
  code?: string;

  @ApiPropertyOptional()
  @Allow()
  desc?: string;

  @ApiPropertyOptional()
  @Allow()
  counterAccountBankId?: string;

  @ApiPropertyOptional()
  @Allow()
  counterAccountBankName?: string;

  @ApiPropertyOptional()
  @Allow()
  counterAccountName?: string;

  @ApiPropertyOptional()
  @Allow()
  counterAccountNumber?: string;

  @ApiPropertyOptional()
  @Allow()
  virtualAccountName?: string;

  @ApiPropertyOptional()
  @Allow()
  virtualAccountNumber?: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ example: '00' })
  @Allow()
  code: string;

  @ApiProperty({ example: 'success' })
  @Allow()
  desc: string;

  @ApiProperty({ example: true })
  @Allow()
  success: boolean;

  @ApiProperty({ type: () => PayOSWebhookDataDto })
  @Allow()
  data: PayOSWebhookDataDto;

  @ApiProperty({ example: 'hmac-sha256-signature' })
  @Allow()
  signature: string;
}
