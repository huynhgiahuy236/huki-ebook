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
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BookActor,
  BookWriteGuard,
  OptionalBookAuthGuard,
} from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookListQueryDto } from './dto/book-list-query.dto';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List published books with filters and pagination' })
  findAll(@Query() query: BookListQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get a book by slug' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    return { data: await this.booksService.findBySlug(slug, actor) };
  }

  @Get(':id')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get a book by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    return { data: await this.booksService.findOne(id, actor) };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Create a draft book' })
  async create(@Body() dto: CreateBookDto, @CurrentBookActor() actor: BookActor) {
    return { message: 'Book created', data: await this.booksService.create(dto, actor) };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Update a book owned by the current business' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book updated', data: await this.booksService.update(id, dto, actor) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Soft-delete a book' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    await this.booksService.remove(id, actor);
  }
}
