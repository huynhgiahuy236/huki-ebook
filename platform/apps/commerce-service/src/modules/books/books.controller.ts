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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated published books list' })
  findAll(@Query() query: BookListQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('owned')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'List books manageable by the signed-in seller, including private inventory' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Owned books list' })
  @ApiStandardErrors(401)
  findOwned(
    @Query() query: BookListQueryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.booksService.findOwned(query, actor);
  }

  @Get('library/my-books')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get books in personal library from real DB' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'User library books' })
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
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Remove a book from personal library' })
  @ApiSuccessResponse(undefined, { description: 'Book removed from library' })
  @ApiStandardErrors(401, 404)
  async removeBookFromLibrary(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.bookAccessService.removeBookFromLibrary(actor.sub, bookId);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get a book by slug' })
  @ApiSuccessResponse(undefined, { description: 'Book detail' })
  @ApiStandardErrors(404)
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    return { data: await this.booksService.findBySlug(slug, actor) };
  }

  @Get(':id/access')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Check reader/ebook access authorization for current user' })
  @ApiSuccessResponse(undefined, { description: 'Book access check result' })
  @ApiStandardErrors(401, 404)
  async checkAccess(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const access = await this.bookAccessService.checkAccess(actor.sub, id);
    return { data: access };
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related books by category, author/publisher, or format' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Related books' })
  @ApiStandardErrors(404)
  async findRelated(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    const data = await this.booksService.findRelated(id, Number.isFinite(parsedLimit) ? parsedLimit : 6);
    return { data };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream public preview / full ebook PDF from R2 storage' })
  @ApiSuccessResponse(undefined, { description: 'PDF binary stream' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiQuery({ name: 'light', required: false, type: Boolean })
  @ApiSuccessResponse(undefined, { description: 'Book detail' })
  @ApiStandardErrors(404)
  async findOne(
    @Param('id') id: string,
    @Query('light') light?: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    const isLight = light === '1' || light === 'true';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        return { data: await this.booksService.findOne(id, actor, { light: isLight }) };
      } catch (err: any) {
        if (err?.status !== 404 && err?.response?.statusCode !== 404) throw err;
      }
    }
    return { data: await this.booksService.findBySlug(id, actor, { light: isLight }) };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Create a draft book' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Draft book created' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(@Body() dto: CreateBookDto, @CurrentBookActor() actor: BookActor) {
    return { message: 'Book created', data: await this.booksService.create(dto, actor) };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Update a book owned by the current business' })
  @ApiSuccessResponse(undefined, { description: 'Book updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book updated', data: await this.booksService.update(id, dto, actor) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'Soft-delete a book' })
  @ApiSuccessResponse(undefined, { status: 204, description: 'Book deleted' })
  @ApiStandardErrors(401, 403, 404)
  async remove(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    await this.booksService.remove(id, actor);
  }
}
