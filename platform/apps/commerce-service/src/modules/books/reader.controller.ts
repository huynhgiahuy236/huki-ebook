import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { ReaderService } from './reader.service';
import { CreateBookmarkDto, SaveProgressDto } from './dto/reader.dto';

@ApiTags('Reader')
@Controller('reader')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard)
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Post('bookmarks')
  @ApiOperation({ summary: 'Add a bookmark at current page position' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Bookmark created' })
  @ApiStandardErrors(400, 401, 404)
  async addBookmark(
    @Body() dto: CreateBookmarkDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.addBookmark(actor.sub, dto);
    return { message: 'Bookmark created successfully', data };
  }

  @Get('bookmarks/:bookId')
  @ApiOperation({ summary: 'Get all bookmarks for a specific book' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Bookmarks list' })
  @ApiStandardErrors(401, 404)
  async getBookmarks(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.getBookmarks(actor.sub, bookId);
    return { data };
  }

  @Delete('bookmarks/:id')
  @ApiOperation({ summary: 'Delete a bookmark by ID' })
  @ApiSuccessResponse(undefined, { description: 'Bookmark deleted' })
  @ApiStandardErrors(401, 404)
  async deleteBookmark(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.readerService.deleteBookmark(actor.sub, id);
  }

  @Put('progress')
  @ApiOperation({ summary: 'Save reading progress / current position' })
  @ApiSuccessResponse(undefined, { description: 'Progress saved' })
  @ApiStandardErrors(400, 401, 404)
  async saveProgress(
    @Body() dto: SaveProgressDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.saveProgress(actor.sub, dto);
    return { message: 'Progress saved successfully', data };
  }

  @Get('progress/:bookId')
  @ApiOperation({ summary: 'Get reading progress for a book' })
  @ApiSuccessResponse(undefined, { description: 'Reading progress' })
  @ApiStandardErrors(401, 404)
  async getProgress(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.getProgress(actor.sub, bookId);
    return { data };
  }
}
