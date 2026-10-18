import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateQuickReplyDto {
  @ApiProperty({ description: "Mã gian hàng sở hữu phím tắt" })
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @ApiProperty({ description: "Mã phím tắt (không dấu, vd: chao, ship, voucher)" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "Mã phím tắt chỉ được chứa chữ cái, số, gạch dưới hoặc gạch nối (không dấu)",
  })
  shortcut!: string;

  @ApiProperty({ description: "Tiêu đề ngắn của mẫu câu" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title!: string;

  @ApiProperty({ description: "Nội dung tin nhắn mẫu đầy đủ" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  content!: string;
}

export class UpdateQuickReplyDto {
  @ApiPropertyOptional({ description: "Mã phím tắt" })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "Mã phím tắt chỉ được chứa chữ cái, số, gạch dưới hoặc gạch nối (không dấu)",
  })
  shortcut?: string;

  @ApiPropertyOptional({ description: "Tiêu đề ngắn" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({ description: "Nội dung tin nhắn mẫu đầy đủ" })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  content?: string;
}
