import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum DisputeType {
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  DAMAGED = 'DAMAGED',
  WRONG_PRODUCT = 'WRONG_PRODUCT',
  NOT_RECEIVED = 'NOT_RECEIVED',
  COUNTERFEIT = 'COUNTERFEIT',
  OTHER = 'OTHER',
}

export enum DisputeResolution {
  REFUND = 'REFUND',
  REPLACE = 'REPLACE',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

export enum ArbitrationRuling {
  BUYER_WINS = 'BUYER_WINS',
  SELLER_WINS = 'SELLER_WINS',
  PARTIAL_SETTLEMENT = 'PARTIAL_SETTLEMENT',
  CARRIER_AT_FAULT = 'CARRIER_AT_FAULT',
  REQUEST_MORE_INFO = 'REQUEST_MORE_INFO',
}

export class CreateDisputeDto {
  @ApiProperty({
    enum: DisputeType,
    description: 'Loại tranh chấp/khiếu nại (Task 62)',
    example: DisputeType.DAMAGED,
  })
  @IsEnum(DisputeType, {
    message:
      'Loại khiếu nại không hợp lệ (NOT_AS_DESCRIBED, DAMAGED, WRONG_PRODUCT, NOT_RECEIVED, COUNTERFEIT, OTHER)',
  })
  type: DisputeType;

  @ApiProperty({
    description: 'Mô tả chi tiết vấn đề khiếu nại (tối thiểu 50 ký tự)',
    minLength: 50,
    maxLength: 2000,
    example:
      'Sách nhận được bị rách bìa trước và ướt các trang đầu. Kiện hàng có dấu hiệu bị cấn móp trong lúc vận chuyển.',
  })
  @IsString()
  @MinLength(50, { message: 'Mô tả phải có ít nhất 50 ký tự' })
  @MaxLength(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' })
  description: string;

  @ApiProperty({
    enum: DisputeResolution,
    description: 'Giải pháp mong muốn của người mua',
    example: DisputeResolution.REFUND,
  })
  @IsEnum(DisputeResolution, {
    message: 'Giải pháp không hợp lệ (REFUND, REPLACE, PARTIAL_REFUND)',
  })
  resolution: DisputeResolution;

  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách liên kết/tập tin hình ảnh bằng chứng (tối đa 5)',
    example: ['https://storage.huki.vn/evidence/img1.jpg'],
  })
  @IsOptional()
  @IsArray({ message: 'Bằng chứng phải là một danh sách đường dẫn' })
  @ArrayMaxSize(5, { message: 'Tối đa 5 tài liệu/hình ảnh bằng chứng' })
  evidence?: string[];

  @ApiPropertyOptional({
    description: 'ID gói hàng (SellerOrder ID) nếu khiếu nại cho gian hàng cụ thể',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'SellerOrder ID phải là UUID hợp lệ' })
  sellerOrderId?: string;
}

export class ArbitrateDisputeDto {
  @ApiProperty({
    enum: ArbitrationRuling,
    description: 'Phán quyết trọng tài của Admin Sàn (POL-12)',
    example: ArbitrationRuling.BUYER_WINS,
  })
  @IsEnum(ArbitrationRuling, {
    message:
      'Phán quyết không hợp lệ (BUYER_WINS, SELLER_WINS, PARTIAL_SETTLEMENT, CARRIER_AT_FAULT, REQUEST_MORE_INFO)',
  })
  ruling: ArbitrationRuling;

  @ApiProperty({
    description: 'Ghi chú thẩm định và căn cứ phán quyết (tối thiểu 10 ký tự)',
    minLength: 10,
    maxLength: 2000,
    example:
      'Đã đối soát video mở hộp của người mua: kiện hàng còn nguyên niêm phong nhưng sản phẩm bị rách bìa. Chấp thuận yêu cầu hoàn tiền.',
  })
  @IsString()
  @MinLength(10, { message: 'Căn cứ phán quyết phải có ít nhất 10 ký tự' })
  @MaxLength(2000, { message: 'Căn cứ phán quyết không được vượt quá 2000 ký tự' })
  notes: string;

  @ApiPropertyOptional({
    description: 'Tỷ lệ hoàn tiền cho người mua (1 - 99%) nếu phán quyết PARTIAL_SETTLEMENT',
    example: 50,
  })
  @IsOptional()
  refundPercentage?: number;

  @ApiPropertyOptional({
    description: 'ID gói hàng áp dụng phán quyết nếu là đơn nhiều gian hàng',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'SellerOrder ID phải là UUID hợp lệ' })
  targetSellerOrderId?: string;
}

export class AdminDisputeQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái tranh chấp (DISPUTE_OPENED, RULING_BUYER_WINS, etc.)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: DisputeType,
    description: 'Lọc theo loại tranh chấp',
  })
  @IsOptional()
  @IsEnum(DisputeType)
  type?: DisputeType;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo mã đơn, ID tranh chấp, hoặc từ khóa mô tả',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
