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
  @Allow()
  orderCode: number;

  @Allow()
  amount: number;

  @Allow()
  description?: string;

  @Allow()
  accountNumber?: string;

  @Allow()
  reference?: string;

  @Allow()
  transactionDateTime?: string;

  @Allow()
  currency?: string;

  @Allow()
  paymentLinkId?: string;

  @Allow()
  code?: string;

  @Allow()
  desc?: string;

  @Allow()
  counterAccountBankId?: string;

  @Allow()
  counterAccountBankName?: string;

  @Allow()
  counterAccountName?: string;

  @Allow()
  counterAccountNumber?: string;

  @Allow()
  virtualAccountName?: string;

  @Allow()
  virtualAccountNumber?: string;
}

export class PayOSWebhookDto {
  @Allow()
  code: string;

  @Allow()
  desc: string;

  @Allow()
  success: boolean;

  @Allow()
  data: PayOSWebhookDataDto;

  @Allow()
  signature: string;
}
