import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import {
  CreateFlashSaleDto,
  CreateFlashSaleItemDto,
  FlashSaleQueryDto,
  FlashSaleItemQueryDto,
  FlashSaleStatus,
} from './dto/flash-sale.dto';
import { RolesGuard, Roles } from '../../common/roles.guard';

@ApiTags('Flash Sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSales: FlashSalesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a flash sale' })
  create(@Body() dto: CreateFlashSaleDto) {
    return this.flashSales.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all flash sales' })
  findAll(@Query() query: FlashSaleQueryDto) {
    return this.flashSales.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active flash sales' })
  getActive() {
    return this.flashSales.getActiveFlashSales();
  }

  @Get('items')
  @ApiOperation({ summary: 'Get flash sale items' })
  findItems(@Query() query: FlashSaleItemQueryDto) {
    return this.flashSales.findItems(query);
  }

  @Get('price/:bookId')
  @ApiOperation({ summary: 'Get flash sale price for a book' })
  getBookPrice(@Param('bookId', ParseUUIDPipe) bookId: string) {
    return this.flashSales.getBookFlashSalePrice(bookId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flash sale by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.flashSales.findOne(id);
  }

  @Post('items')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Add item to flash sale' })
  addItem(@Body() dto: CreateFlashSaleItemDto) {
    return this.flashSales.addItem(dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update flash sale status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: FlashSaleStatus,
  ) {
    return this.flashSales.updateStatus(id, status);
  }

  @Patch('items/:itemId/stock')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update flash sale item stock' })
  updateStock(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('stock') stock: number,
  ) {
    return this.flashSales.updateItemStock(itemId, stock);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Delete flash sale' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.flashSales.delete(id);
  }
}
