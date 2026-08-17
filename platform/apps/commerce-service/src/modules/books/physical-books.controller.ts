import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdatePhysicalDetailsDto } from './dto/update-physical-details.dto';
import { PhysicalBooksService } from './physical-books.service';

@ApiTags('Book Physical Details')
@ApiBearerAuth()
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class PhysicalBooksController {
  constructor(private readonly physicalBooksService: PhysicalBooksService) {}

  @Get('physical')
  @ApiOperation({ summary: 'Get private physical details for an owned book' })
  async get(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { data: await this.physicalBooksService.get(bookId, actor) };
  }

  @Patch('physical')
  @ApiOperation({ summary: 'Update physical dimensions and settings' })
  async update(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdatePhysicalDetailsDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Physical details updated', data: await this.physicalBooksService.update(bookId, dto, actor) };
  }

  @Patch('inventory')
  @ApiOperation({ summary: 'Adjust stock with row locking and an audit log' })
  async inventory(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Inventory updated', data: await this.physicalBooksService.updateInventory(bookId, dto, actor) };
  }
}
