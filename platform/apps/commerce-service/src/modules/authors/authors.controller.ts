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
  findAll(@Query() query: PageQueryDto) {
    return this.authorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an author by id' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.authorsService.findOne(id) };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Create an author' })
  async create(@Body() dto: CreateAuthorDto) {
    return { message: 'Author created', data: await this.authorsService.create(dto) };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Update an author' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAuthorDto) {
    return { message: 'Author updated', data: await this.authorsService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(CatalogAdminGuard)
  @ApiOperation({ summary: 'Soft-delete an author' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.authorsService.remove(id);
  }
}
