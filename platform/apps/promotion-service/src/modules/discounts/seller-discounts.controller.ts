/**
 * HUKI EBOOK - Seller Book Discounts Controller
 *
 * Handles custom book discounts (Giảm giá tự do) for Sellers
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateBookDiscountDto } from './dto/discount.dto';
import { BusinessRolesGuard } from '../../common/business-roles.guard';

@ApiTags('Seller - Book Discounts')
@ApiBearerAuth()
@UseGuards(BusinessRolesGuard)
@Controller('seller/discounts')
export class SellerDiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update book discount',
    description: 'Sets custom percentage or fixed amount discount for a book',
  })
  @ApiResponse({ status: 200, description: 'Discount saved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Not a business owner' })
  async createOrUpdate(@Body() dto: CreateBookDiscountDto) {
    const data = await this.discounts.createOrUpdateDiscount(dto);
    return {
      success: true,
      message: 'Thiết lập giảm giá sách thành công',
      data,
    };
  }

  @Get('books/:bookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discount info for a book' })
  async getByBookId(@Param('bookId', ParseUUIDPipe) bookId: string) {
    const data = await this.discounts.getDiscountByBookId(bookId);
    return {
      success: true,
      data,
    };
  }

  @Post('batch-books')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discounts for multiple books' })
  async getForBooks(@Body() body: { bookIds: string[] }) {
    const data = await this.discounts.getDiscountsForBooks(body.bookIds || []);
    return {
      success: true,
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a book discount' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.discounts.cancelDiscount(id);
    return {
      success: true,
      message: 'Đã hủy chương trình giảm giá của sách',
      data,
    };
  }
}
