import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BookPublishingService } from './book-publishing.service';

@ApiTags('Book Publishing')
@ApiBearerAuth()
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class BookPublishingController {
  constructor(private readonly publishingService: BookPublishingService) {}

  @Post('publish')
  @ApiOperation({ summary: 'Validate and publish a draft or hidden book' })
  async publish(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book published', data: await this.publishingService.publish(bookId, actor) };
  }

  @Post('hide')
  @ApiOperation({ summary: 'Hide a published book' })
  async hide(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book hidden', data: await this.publishingService.hide(bookId, actor) };
  }

  @Post('archive')
  @ApiOperation({ summary: 'Archive a book' })
  async archive(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book archived', data: await this.publishingService.archive(bookId, actor) };
  }

  @Post('suspend')
  @ApiOperation({ summary: 'Suspend a book (platform administrator only)' })
  async suspend(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Book suspended', data: await this.publishingService.suspend(bookId, actor) };
  }
}
