import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetForYouDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class GetSimilarBooksDto {
  @IsString()
  bookId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class GetFootprintSummaryDto {
  @IsString()
  userId!: string;
}

export class DeleteFootprintDto {
  @IsString()
  userId!: string;
}

export class RecommendedBookResponseDto {
  id!: string;
  title!: string;
  coverImage!: string | null;
  price!: number;
  authorName!: string | null;
  categoryName!: string | null;
  score!: number;
}

export class SimilarBookResponseDto {
  id!: string;
  title!: string;
  coverImage!: string | null;
  price!: number;
  authorName!: string | null;
  similarityScore!: number;
}

export class FootprintSummaryResponseDto {
  totalEvents!: number;
  categoryAffinities!: number;
  authorAffinities!: number;
  topCategories!: { categoryId: string; score: number }[];
  topAuthors!: { authorId: string; score: number }[];
}

export class FootprintDeletionResponseDto {
  deletedEvents!: number;
  deletedCategoryAffinities!: number;
  deletedAuthorAffinities!: number;
  deletedAt!: Date;
}
