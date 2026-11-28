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
  ApiBody,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { DiscountsService } from './discounts.service';
import { CreateBookDiscountDto } from './dto/discount.dto';
import { BusinessRolesGuard } from '../../common/business-roles.guard';

@ApiTags('Seller - Book Discounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(BusinessRolesGuard)
@Controller(['seller/discounts', 'discounts/seller'])
export class SellerDiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update book discount',
    description: 'Sets custom percentage or fixed amount discount for a book',
  })
  @ApiSuccessResponse(undefined, { description: 'Discount saved successfully' })
  @ApiStandardErrors(400, 401, 403)
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
  @ApiSuccessResponse(undefined, { description: 'Book discount detail' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiBody({ schema: { type: 'object', required: ['bookIds'], properties: { bookIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Batch book discounts' })
  @ApiStandardErrors(400, 401, 403)
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
  @ApiSuccessResponse(undefined, { description: 'Book discount cancelled' })
  @ApiStandardErrors(401, 403, 404)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.discounts.cancelDiscount(id);
    return {
      success: true,
      message: 'Đã hủy chương trình giảm giá của sách',
      data,
    };
  }
}
