import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
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
  Min,
} from "class-validator";
import { REVIEW_FORMATS, ReviewFormat } from "../../../entities/review.schema";

export class ReviewListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class ReviewContentDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString()
  @Length(3, 200)
  title!: string;

  @ApiProperty({ minLength: 10, maxLength: 5_000 })
  @IsString()
  @Length(10, 5_000)
  content!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ require_protocol: true }, { each: true })
  images?: string[];
}

export class CreateBookReviewDto extends ReviewContentDto {
  @ApiProperty({ enum: REVIEW_FORMATS })
  @IsIn(REVIEW_FORMATS)
  format!: ReviewFormat;
}

export class CreateStoreReviewDto extends ReviewContentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;
}

export class UpdateReviewDto extends PartialType(ReviewContentDto) {}

export class CreateReviewReplyDto {
  @ApiProperty({ minLength: 2, maxLength: 2_000 })
  @IsString()
  @Length(2, 2_000)
  content!: string;
}

export class ReviewIdParamDto {
  @IsMongoId()
  id!: string;
}

export class ReviewTargetParamDto {
  @IsUUID()
  id!: string;
}
