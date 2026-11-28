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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AffiliateLinkService } from '../services/affiliate-link.service';
import {
  CreateAffiliateLinkDto,
  QueryAffiliateLinksDto,
} from '../dto/affiliate-link.dto';

@ApiTags('Affiliate Links')
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new affiliate link' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Affiliate link created' })
  @ApiStandardErrors(400, 401, 403, 404)
  async createLink(@Req() req: any, @Body() dto: CreateAffiliateLinkDto) {
    const userId = this.requireUserId(req);
    const userRole = req.user?.role || req.headers?.['x-user-role'];

    const data = await this.linkService.createLink(userId, dto, userRole);
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List current partner affiliate links' })
  @ApiSuccessResponse(undefined, { description: 'Affiliate links retrieved' })
  @ApiStandardErrors(401)
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
  @ApiOperation({ summary: 'List books eligible for affiliate marketplace' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'format', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'Affiliate marketplace books retrieved' })
  @ApiStandardErrors(400)
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
  @ApiOperation({ summary: 'Get book commission & quick affiliate card' })
  @ApiSuccessResponse(undefined, { description: 'Book commission card retrieved' })
  @ApiStandardErrors(404)
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
  @ApiOperation({ summary: 'Resolve affiliate short code and record click' })
  @ApiSuccessResponse(undefined, { description: 'Short code resolved' })
  @ApiStandardErrors(404)
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
