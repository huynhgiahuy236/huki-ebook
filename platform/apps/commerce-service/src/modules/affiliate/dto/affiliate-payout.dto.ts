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
  @IsString()
  @Length(3, 100)
  legalName: string;

  @IsString()
  @Matches(/^[0-9]{9,12}$/, { message: 'ID card number must be 9 or 12 digits' })
  idCardNumber: string;

  @IsString()
  @IsNotEmpty()
  idCardIssueDate: string;

  @IsString()
  @IsNotEmpty()
  idCardIssuePlace: string;

  @IsString()
  @IsNotEmpty()
  frontImageUrl: string;

  @IsString()
  @IsNotEmpty()
  backImageUrl: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @Matches(/^[0-9A-Za-z]{6,25}$/, { message: 'Invalid bank account number' })
  accountNumber: string;

  @IsString()
  @Length(3, 100)
  accountHolderName: string;
}

export class ReviewKycDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreatePayoutRequestDto {
  @IsNumber()
  @Min(100000, { message: 'Minimum payout amount is 100,000 VND' })
  @Max(50000000, { message: 'Maximum payout amount is 50,000,000 VND per transaction' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class ReviewPayoutDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class CreateFraudCaseDto {
  @IsString()
  @IsNotEmpty()
  profileId: string;

  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @IsNotEmpty()
  evidenceDetails: Record<string, any>;
}

export class ResolveFraudCaseDto {
  @IsEnum(['CONFIRMED', 'DISMISSED'])
  resolution: 'CONFIRMED' | 'DISMISSED';

  @IsString()
  @IsNotEmpty()
  note: string;
}
