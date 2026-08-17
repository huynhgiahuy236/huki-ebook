import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { DigitalBooksService } from './digital-books.service';
import { UpdateDigitalDetailsDto } from './dto/update-digital-details.dto';

@ApiTags('Book Digital Details')
@ApiBearerAuth()
@UseGuards(BookWriteGuard)
@Controller('books/:bookId/digital')
export class DigitalBooksController {
  constructor(private readonly digitalBooksService: DigitalBooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get safe digital metadata without private object keys' })
  async get(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { data: await this.digitalBooksService.get(bookId, actor) };
  }

  @Patch()
  @ApiOperation({ summary: 'Update digital reading and download settings' })
  async update(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdateDigitalDetailsDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Digital details updated', data: await this.digitalBooksService.update(bookId, dto, actor) };
  }
}
