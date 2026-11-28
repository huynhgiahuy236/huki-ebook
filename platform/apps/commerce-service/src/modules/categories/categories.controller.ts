import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListQueryDto } from './dto/category-list-query.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories with pagination and filters' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated categories list' })
  findAll(@Query() query: CategoryListQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get the active category tree' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Category tree' })
  async tree(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return { data: await this.categoriesService.findTree(includeInactive) };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get category sales and performance analytics' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Category performance metrics' })
  async getPerformance() {
    return { data: await this.categoriesService.getCategoryPerformance() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiSuccessResponse(undefined, { description: 'Category detail' })
  @ApiStandardErrors(400, 404)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.categoriesService.findOne(id) };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create a category' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Category created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(@Body() dto: CreateCategoryDto) {
    return { message: 'Category created', data: await this.categoriesService.create(dto) };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Update a category' })
  @ApiSuccessResponse(undefined, { description: 'Category updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return { message: 'Category updated', data: await this.categoriesService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Soft-delete an empty category' })
  @ApiSuccessResponse(undefined, { status: 204, description: 'Category deleted' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
  }
}
