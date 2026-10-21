import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AffiliateApplicantType,
  AffiliateChannelType,
  AffiliateFollowersRange,
} from '../../../../prisma/generated/client';

export class AffiliateChannelDto {
  @IsEnum(AffiliateChannelType, { message: 'Loại kênh không hợp lệ' })
  type: AffiliateChannelType;

  @IsString({ message: 'URL kênh là bắt buộc' })
  @Matches(/^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/, {
    message: 'URL kênh phải bắt đầu bằng https:// và có tên miền hợp lệ',
  })
  @MaxLength(2048, { message: 'URL không được vượt quá 2048 ký tự' })
  url: string;

  @IsString({ message: 'URL chuẩn hóa là bắt buộc' })
  canonicalUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  handle?: string;

  @IsEnum(AffiliateFollowersRange, { message: 'Khoảng người theo dõi không hợp lệ' })
  followersRange: AffiliateFollowersRange;

  @IsBoolean()
  isPrimary: boolean;
}

export class SubmitAffiliateApplicationDto {
  @IsString({ message: 'Tên hiển thị là bắt buộc' })
  @MinLength(2, { message: 'Tên hiển thị tối thiểu 2 ký tự' })
  @MaxLength(80, { message: 'Tên hiển thị tối đa 80 ký tự' })
  displayName: string;

  @IsString({ message: 'Mã tiếp thị là bắt buộc' })
  @Matches(/^[A-Z0-9_]{4,24}$/, {
    message: 'Mã tiếp thị gồm 4-24 ký tự chữ in hoa, số và dấu gạch dưới',
  })
  affiliateCode: string;

  @IsString({ message: 'Giới thiệu bản thân là bắt buộc' })
  @MinLength(30, { message: 'Giới thiệu bản thân tối thiểu 30 ký tự' })
  @MaxLength(500, { message: 'Giới thiệu bản thân tối đa 500 ký tự' })
  bio: string;

  @IsEmail({}, { message: 'Email liên hệ không hợp lệ' })
  @MaxLength(254)
  contactEmail: string;

  @IsString({ message: 'Số điện thoại là bắt buộc' })
  @Matches(/^(\+84|0)[35789][0-9]{8}$/, {
    message: 'Số điện thoại Việt Nam không hợp lệ',
  })
  contactPhone: string;

  @IsEnum(AffiliateApplicantType, { message: 'Loại hình đối tác không hợp lệ' })
  applicantType: AffiliateApplicantType;

  @IsString({ message: 'Kế hoạch quảng bá là bắt buộc' })
  @MinLength(50, { message: 'Kế hoạch quảng bá tối thiểu 50 ký tự' })
  @MaxLength(1000, { message: 'Kế hoạch quảng bá tối đa 1000 ký tự' })
  promotionDescription: string;

  @IsBoolean()
  hasPaidTraffic: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paidTrafficSources?: string[];

  @IsArray({ message: 'Vui lòng chọn danh mục nội dung' })
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 danh mục nội dung' })
  @ArrayMaxSize(8, { message: 'Chọn tối đa 8 danh mục nội dung' })
  @IsString({ each: true })
  contentCategories: string[];

  @IsArray({ message: 'Vui lòng chọn phương thức quảng bá' })
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 phương thức quảng bá' })
  @IsString({ each: true })
  promotionMethods: string[];

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}(-[0-9]{3})?$/, {
    message: 'Mã số thuế gồm 10 số hoặc 10 số kèm 3 số chi nhánh',
  })
  taxId?: string;

  @IsBoolean()
  payoutSetupLater: boolean;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsArray({ message: 'Danh sách kênh quảng bá là bắt buộc' })
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 kênh quảng bá' })
  @ArrayMaxSize(10, { message: 'Tối đa 10 kênh quảng bá' })
  @ValidateNested({ each: true })
  @Type(() => AffiliateChannelDto)
  channels: AffiliateChannelDto[];

  @IsString({ message: 'Phiên bản điều khoản là bắt buộc' })
  termsVersion: string;

  @IsString({ message: 'Phiên bản chính sách bảo mật là bắt buộc' })
  privacyVersion: string;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

export class ResubmitAffiliateApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(30)
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+84|0)[35789][0-9]{8}$/)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(1000)
  promotionDescription?: string;

  @IsOptional()
  @IsBoolean()
  hasPaidTraffic?: boolean;

  @IsOptional()
  @IsArray()
  paidTrafficSources?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  contentCategories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  promotionMethods?: string[];

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AffiliateChannelDto)
  channels?: AffiliateChannelDto[];
}

export class AdminReviewApplicationDto {
  @IsEnum(['APPROVE', 'REQUEST_CHANGES', 'REJECT'], {
    message: 'Quyết định phải là APPROVE, REQUEST_CHANGES hoặc REJECT',
  })
  decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

  @IsString({ message: 'Lý do/ghi chú là bắt buộc' })
  @MinLength(5, { message: 'Lý do tối thiểu 5 ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason: string;

  @IsOptional()
  requestedChanges?: Record<string, string>;
}

export class AdminSuspendPartnerDto {
  @IsString({ message: 'Lý do tạm ngưng là bắt buộc' })
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
