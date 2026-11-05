import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  Res,
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

  @Get('library/my-books')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get books in personal library from real DB' })
  async getMyLibrary(
    @Query('userId') queryUserId?: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    const effectiveUserId = actor?.sub || queryUserId;
    if (!effectiveUserId) {
      return { data: [] };
    }
    const books = await this.bookAccessService.getUserLibrary(effectiveUserId);
    return { data: books };
  }

  @Delete('library/:bookId')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Remove a book from personal library' })
  async removeBookFromLibrary(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.bookAccessService.removeBookFromLibrary(actor.sub, bookId);
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
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const access = await this.bookAccessService.checkAccess(actor.sub, id);
    return { data: access };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream public preview / full ebook PDF from R2 storage' })
  async streamPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    await this.booksService.streamPdf(id, req, res);
  }

  @Get(':id')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get a book by id or slug' })
  async findOne(
    @Param('id') id: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        return { data: await this.booksService.findOne(id, actor) };
      } catch (err: any) {
        if (err?.status !== 404 && err?.response?.statusCode !== 404) throw err;
      }
    }
    return { data: await this.booksService.findBySlug(id, actor) };
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
    @Param('id') id: string,
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
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    await this.booksService.remove(id, actor);
  }
}
