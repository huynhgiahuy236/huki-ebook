import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';

@ApiTags('Discounts - Public / Internal')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get('active/:bookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active discount for a book (Internal/Public)' })
  async getActiveDiscount(@Param('bookId', ParseUUIDPipe) bookId: string) {
    const data = await this.discounts.getActiveDiscount(bookId);
    return {
      success: true,
      data,
    };
  }

  @Post('batch-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active discounts for multiple books (Internal/Public)' })
  async getBatchActiveDiscounts(@Body() body: { bookIds: string[] }) {
    const data = await this.discounts.getDiscountsForBooks(body.bookIds || []);
    return {
      success: true,
      data,
    };
  }
}
