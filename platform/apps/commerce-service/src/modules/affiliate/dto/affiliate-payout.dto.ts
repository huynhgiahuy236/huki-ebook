import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Length,
  Matches,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @Length(3, 100)
  legalName: string;

  @ApiProperty({ example: '079099001234' })
  @IsString()
  @Matches(/^[0-9]{9,12}$/, { message: 'ID card number must be 9 or 12 digits' })
  idCardNumber: string;

  @ApiProperty({ example: '2021-05-01' })
  @IsString()
  @IsNotEmpty()
  idCardIssueDate: string;

  @ApiProperty({ example: 'Cục Cảnh sát QLHC về TTXH' })
  @IsString()
  @IsNotEmpty()
  idCardIssuePlace: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  frontImageUrl: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  backImageUrl: string;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: 'VCB' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: '1029384756' })
  @IsString()
  @Matches(/^[0-9A-Za-z]{6,25}$/, { message: 'Invalid bank account number' })
  accountNumber: string;

  @ApiProperty({ example: 'NGUYEN VAN A' })
  @IsString()
  @Length(3, 100)
  accountHolderName: string;
}

export class ReviewKycDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreatePayoutRequestDto {
  @ApiProperty({ example: 200000, minimum: 100000, maximum: 50000000 })
  @IsNumber()
  @Min(100000, { message: 'Minimum payout amount is 100,000 VND' })
  @Max(50000000, { message: 'Maximum payout amount is 50,000,000 VND per transaction' })
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class ReviewPayoutDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class CreateFraudCaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  profileId: string;

  @ApiProperty({ example: 'SELF_REFERRAL' })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ type: 'object' })
  @IsNotEmpty()
  evidenceDetails: Record<string, any>;
}

export class ResolveFraudCaseDto {
  @ApiProperty({ enum: ['CONFIRMED', 'DISMISSED'] })
  @IsEnum(['CONFIRMED', 'DISMISSED'])
  resolution: 'CONFIRMED' | 'DISMISSED';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  note: string;
}
