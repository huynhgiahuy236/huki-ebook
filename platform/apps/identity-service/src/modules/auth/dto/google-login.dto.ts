import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiPropertyOptional({ description: 'Google ID Token (credential) từ Google Identity Services SDK' })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({ description: 'Google OAuth2 Access Token từ Google OAuth Popup' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Email của người dùng' })
  @IsOptional()
  @IsEmail({}, { message: 'Email phải có định dạng hợp lệ' })
  email?: string;

  @ApiPropertyOptional({ description: 'Họ tên hiển thị' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện Google' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
