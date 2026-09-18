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
  AuthenticatedGuard,
  BookWriteGuard,
  OptionalBookAuthGuard,
} from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookListQueryDto } from './dto/book-list-query.dto';
import { BookAccessService } from './book-access.service';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published books with filters and pagination' })
  findAll(@Query() query: BookListQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('owned')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'List books manageable by the signed-in seller, including private inventory' })
  findOwned(
    @Query() query: BookListQueryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.booksService.findOwned(query, actor);
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

  @Get(':id/access')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Check reader/ebook access authorization for current user' })
  async checkAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const access = await this.bookAccessService.checkAccess(actor.sub, id);
    return { data: access };
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
