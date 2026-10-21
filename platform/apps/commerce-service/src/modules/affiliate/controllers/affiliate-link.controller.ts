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
  UnauthorizedException,
} from '@nestjs/common';
import { AffiliateLinkService } from '../services/affiliate-link.service';
import {
  CreateAffiliateLinkDto,
  QueryAffiliateLinksDto,
} from '../dto/affiliate-link.dto';

@Controller('affiliate')
export class AffiliateLinkController {
  constructor(private readonly linkService: AffiliateLinkService) {}

  private requireUserId(req: any): string {
    const userId =
      req.headers?.['x-user-id'] || req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication token is required');
    }
    return userId;
  }

  /**
   * 1. Create a new affiliate link (Authenticated CTV)
   */
  @Post('links')
  async createLink(@Req() req: any, @Body() dto: CreateAffiliateLinkDto) {
    const userId = this.requireUserId(req);

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
    const userId = this.requireUserId(req);

    const data = await this.linkService.listMyLinks(userId, query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 3. List books eligible for affiliate marketplace
   */
  @Get('catalog')
  async listAffiliateMarketplaceBooks(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const userId =
      req.headers?.['x-user-id'] || req.user?.id || req.user?.userId || null;

    const data = await this.linkService.listAffiliateMarketplaceBooks(userId, {
      search,
      format,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      sortBy,
    });

    return {
      success: true,
      data,
    };
  }

  /**
   * 4. Get book commission & quick affiliate card for /book/:id
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
