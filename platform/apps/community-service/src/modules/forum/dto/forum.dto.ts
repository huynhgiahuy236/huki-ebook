import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PopularPostQueryDto {
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class ForumPostQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Category slug or MongoDB id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 200)
  search?: string;

  @ApiPropertyOptional({
    enum: ['created_at', 'view_count', 'like_count'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at', 'view_count', 'like_count'])
  sort: 'created_at' | 'view_count' | 'like_count' = 'created_at';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class CreateForumPostDto {
  @ApiProperty({ minLength: 10, maxLength: 200 })
  @IsString()
  @Length(10, 200)
  title!: string;

  @ApiProperty({ minLength: 50, maxLength: 50_000 })
  @IsString()
  @Length(50, 50_000)
  content!: string;

  @ApiProperty()
  @IsMongoId()
  categoryId!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

export class UpdateForumPostDto extends PartialType(CreateForumPostDto) {}

export class CreateCommentDto {
  @ApiProperty({ minLength: 2, maxLength: 5_000 })
  @IsString()
  @Length(2, 5_000)
  content!: string;
}

export class MongoIdParamDto {
  @IsMongoId()
  id!: string;
}
