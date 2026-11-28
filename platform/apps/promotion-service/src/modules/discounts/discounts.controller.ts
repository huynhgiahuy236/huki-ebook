import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { DiscountsService } from './discounts.service';

@ApiTags('Discounts - Public / Internal')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get('active/:bookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active discount for a book (Internal/Public)' })
  @ApiSuccessResponse(undefined, { description: 'Active book discount' })
  @ApiStandardErrors(400, 404)
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
  @ApiBody({ schema: { type: 'object', required: ['bookIds'], properties: { bookIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Batch active book discounts' })
  @ApiStandardErrors(400)
  async getBatchActiveDiscounts(@Body() body: { bookIds: string[] }) {
    const data = await this.discounts.getDiscountsForBooks(body.bookIds || []);
    return {
      success: true,
      data,
    };
  }
}
