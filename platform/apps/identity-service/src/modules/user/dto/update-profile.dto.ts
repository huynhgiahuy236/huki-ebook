import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên đầy đủ' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên lạc' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện hoặc chuỗi Base64 ảnh' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Mục tiêu trải nghiệm đọc sách' })
  @IsOptional()
  primaryGoals?: string[];

  @ApiPropertyOptional({ description: 'Thể loại sách yêu thích chi tiết' })
  @IsOptional()
  favoriteGenres?: string[];

  @ApiPropertyOptional({ description: 'Thể loại yêu thích' })
  @IsOptional()
  preferredCategories?: string[];

  @ApiPropertyOptional({ description: 'Định dạng yêu thích' })
  @IsOptional()
  preferredFormats?: string[];

  @ApiPropertyOptional({ description: 'Giao diện đọc sách ưa thích' })
  @IsOptional()
  @IsString()
  preferredTheme?: string;

  @ApiPropertyOptional({ description: 'Mục tiêu đọc mỗi ngày (phút)' })
  @IsOptional()
  dailyMinutesGoal?: number;

  @ApiPropertyOptional({ description: 'Mục tiêu đọc mỗi năm (cuốn)' })
  @IsOptional()
  yearlyBooksTarget?: number;

  @ApiPropertyOptional({ description: 'Thời gian đọc ưa thích' })
  @IsOptional()
  preferredReadingTime?: string;

  @ApiPropertyOptional({ description: 'Thói quen đọc sách' })
  @IsOptional()
  readingHabits?: {
    dailyMinutes?: number;
    yearlyBooksTarget?: number;
    preferredTime?: string;
  };

  @ApiPropertyOptional({ description: 'Danh sách ID sách yêu thích' })
  @IsOptional()
  wishlist?: string[];

  @ApiPropertyOptional({ description: 'Đã hoàn thành onboarding' })
  @IsOptional()
  hasCompletedOnboarding?: boolean;
}
