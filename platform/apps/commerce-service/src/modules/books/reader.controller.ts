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
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { ReaderService } from './reader.service';
import { CreateBookmarkDto, SaveProgressDto } from './dto/reader.dto';

@ApiTags('Reader')
@Controller('reader')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Post('bookmarks')
  @ApiOperation({ summary: 'Add a bookmark at current page position' })
  async addBookmark(
    @Body() dto: CreateBookmarkDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.addBookmark(actor.sub, dto);
    return { message: 'Bookmark created successfully', data };
  }

  @Get('bookmarks/:bookId')
  @ApiOperation({ summary: 'Get all bookmarks for a specific book' })
  async getBookmarks(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.getBookmarks(actor.sub, bookId);
    return { data };
  }

  @Delete('bookmarks/:id')
  @ApiOperation({ summary: 'Delete a bookmark by ID' })
  async deleteBookmark(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.readerService.deleteBookmark(actor.sub, id);
  }

  @Put('progress')
  @ApiOperation({ summary: 'Save reading progress / current position' })
  async saveProgress(
    @Body() dto: SaveProgressDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.saveProgress(actor.sub, dto);
    return { message: 'Progress saved successfully', data };
  }

  @Get('progress/:bookId')
  @ApiOperation({ summary: 'Get reading progress for a book' })
  async getProgress(
    @Param('bookId') bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.readerService.getProgress(actor.sub, bookId);
    return { data };
  }
}
