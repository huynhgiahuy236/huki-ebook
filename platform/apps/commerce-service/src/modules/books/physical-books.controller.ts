import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdatePhysicalDetailsDto } from './dto/update-physical-details.dto';
import { PhysicalBooksService } from './physical-books.service';

@ApiTags('Book Physical Details')
@ApiBearerAuth('JWT-auth')
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class PhysicalBooksController {
  constructor(private readonly physicalBooksService: PhysicalBooksService) {}

  @Get('physical')
  @ApiOperation({ summary: 'Get private physical details for an owned book' })
  @ApiSuccessResponse(undefined, { description: 'Physical book details' })
  @ApiStandardErrors(401, 403, 404)
  async get(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { data: await this.physicalBooksService.get(bookId, actor) };
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get 3-tier inventory levels for an owned book' })
  @ApiSuccessResponse(undefined, { description: '3-tier inventory levels' })
  @ApiStandardErrors(401, 403, 404)
  async getInventory(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { data: await this.physicalBooksService.get(bookId, actor) };
  }

  @Patch('physical')
  @ApiOperation({ summary: 'Update physical dimensions and settings' })
  @ApiSuccessResponse(undefined, { description: 'Physical details updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdatePhysicalDetailsDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Physical details updated', data: await this.physicalBooksService.update(bookId, dto, actor) };
  }

  @Patch('inventory')
  @ApiOperation({ summary: 'Adjust stock with row locking and an audit log' })
  @ApiSuccessResponse(undefined, { description: 'Inventory updated' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async inventory(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Inventory updated', data: await this.physicalBooksService.updateInventory(bookId, dto, actor) };
  }

  @Get('inventory-logs')
  @ApiOperation({ summary: 'Get inventory mutation audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Inventory audit logs' })
  @ApiStandardErrors(401, 403, 404)
  async getInventoryLogs(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentBookActor() actor: BookActor = {} as any,
  ) {
    return await this.physicalBooksService.getInventoryLogs(bookId, actor, { page, limit });
  }
}

