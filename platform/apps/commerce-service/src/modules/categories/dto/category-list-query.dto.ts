import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export enum CategorySortBy {
  NAME = 'name',
  SORT_ORDER = 'sortOrder',
  CREATED_AT = 'createdAt',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class CategoryListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  rootOnly = false;

  @ApiPropertyOptional({ enum: CategorySortBy, default: CategorySortBy.SORT_ORDER })
  @IsOptional()
  @IsEnum(CategorySortBy)
  sortBy = CategorySortBy.SORT_ORDER;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.ASC })
  @IsOptional()
  @IsEnum(SortDirection)
  order = SortDirection.ASC;
}
