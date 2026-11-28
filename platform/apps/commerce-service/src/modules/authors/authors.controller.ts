import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { CatalogAdminGuard } from '../../common/catalog-admin.guard';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@ApiTags('Authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  @ApiOperation({ summary: 'List authors' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated authors list' })
  findAll(@Query() query: PageQueryDto) {
    return this.authorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an author by id' })
  @ApiSuccessResponse(undefined, { description: 'Author detail' })
  @ApiStandardErrors(400, 404)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.authorsService.findOne(id) };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create an author' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Author created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(@Body() dto: CreateAuthorDto) {
    return { message: 'Author created', data: await this.authorsService.create(dto) };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Update an author' })
  @ApiSuccessResponse(undefined, { description: 'Author updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAuthorDto) {
    return { message: 'Author updated', data: await this.authorsService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Soft-delete an author' })
  @ApiSuccessResponse(undefined, { status: 204, description: 'Author deleted' })
  @ApiStandardErrors(400, 401, 403, 404)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.authorsService.remove(id);
  }
}
