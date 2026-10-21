import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { AffiliateLinkService } from '../services/affiliate-link.service';
import {
  CreateAffiliateLinkDto,
  QueryAffiliateLinksDto,
} from '../dto/affiliate-link.dto';

@Controller('affiliate')
export class AffiliateLinkController {
  constructor(private readonly linkService: AffiliateLinkService) {}

  /**
   * 1. Create a new affiliate link (Authenticated CTV)
   */
  @Post('links')
  async createLink(@Req() req: any, @Body() dto: CreateAffiliateLinkDto) {
    const userId =
      req.headers?.['x-user-id'] ||
      req.user?.id ||
      req.user?.userId ||
      'mock-affiliate-user-1';

    const data = await this.linkService.createLink(userId, dto);
    return {
      success: true,
      message: 'Tạo liên kết tiếp thị thành công',
      data,
    };
  }

  /**
   * 2. List current partner's links (Authenticated CTV)
   */
  @Get('links')
  async listMyLinks(@Req() req: any, @Query() query: QueryAffiliateLinksDto) {
    const userId =
      req.headers?.['x-user-id'] ||
      req.user?.id ||
      req.user?.userId ||
      'mock-affiliate-user-1';

    const data = await this.linkService.listMyLinks(userId, query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 3. Get book commission & quick affiliate card for /book/:id
   */
  @Get('books/:bookId/commission-card')
  async getBookCommissionCard(
    @Req() req: any,
    @Param('bookId') bookId: string,
  ) {
    const userId =
      req.headers?.['x-user-id'] || req.user?.id || req.user?.userId || null;

    const data = await this.linkService.getBookCommissionForAffiliate(
      userId,
      bookId,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * 4. Public Resolution for /r/:shortCode
   */
  @Get('resolve/:shortCode')
  async resolveLink(
    @Param('shortCode') shortCode: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    const data = await this.linkService.resolveShortCode(shortCode, {
      ip,
      userAgent,
      referer,
    });

    return {
      success: true,
      data,
    };
  }
}
