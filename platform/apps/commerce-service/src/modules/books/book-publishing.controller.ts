import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BookPublishingService } from './book-publishing.service';

@ApiTags('Book Publishing')
@ApiBearerAuth('JWT-auth')
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class BookPublishingController {
  constructor(private readonly publishingService: BookPublishingService) {}

  @Post('publish')
  @ApiOperation({ summary: 'Validate and publish a draft or hidden book' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book published' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async publish(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
    @Body() dto?: { reason?: string },
  ) {
    return { message: 'Book published', data: await this.publishingService.publish(bookId, actor) };
  }

  @Post('hide')
  @ApiOperation({ summary: 'Hide a published book' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book hidden' })
  @ApiStandardErrors(401, 403, 404)
  async hide(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
    @Body() dto?: { reason?: string },
  ) {
    return { message: 'Book hidden', data: await this.publishingService.hide(bookId, actor) };
  }

  @Post('archive')
  @ApiOperation({ summary: 'Archive a book' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book archived' })
  @ApiStandardErrors(401, 403, 404)
  async archive(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
    @Body() dto?: { reason?: string },
  ) {
    return { message: 'Book archived', data: await this.publishingService.archive(bookId, actor) };
  }

  @Post('suspend')
  @ApiOperation({ summary: 'Suspend a book (platform administrator only)' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Book suspended' })
  @ApiStandardErrors(401, 403, 404)
  async suspend(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
    @Body() dto?: { reason?: string },
  ) {
    return { message: 'Book suspended', data: await this.publishingService.suspend(bookId, actor, (dto as any)?.reason) };
  }
}
