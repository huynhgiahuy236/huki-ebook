import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  AuthenticatedGuard,
  BookRequest,
  OptionalBookAuthGuard,
} from '../../../common/book-auth.guard';
import { AffiliateApplicationService } from '../services/affiliate-application.service';
import { AffiliateWalletService } from '../services/affiliate-wallet.service';
import { AffiliateDashboardService } from '../services/affiliate-dashboard.service';
import {
  SubmitAffiliateApplicationDto,
  ResubmitAffiliateApplicationDto,
} from '../dto/affiliate-application.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('affiliate')
export class AffiliateController {
  constructor(
    private readonly applicationService: AffiliateApplicationService,
    private readonly walletService: AffiliateWalletService,
    private readonly dashboardService: AffiliateDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Public: Program Overview & Active Terms
   */
  @Get('program')
  @UseGuards(OptionalBookAuthGuard)
  async getProgramInfo() {
    const activePolicy = await this.prisma.affiliatePolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      name: activePolicy?.name || 'Chương Trình Tiếp Thị Liên Kết HuKi',
      termsVersion: '1.4.1',
      privacyVersion: '1.4.1',
      rates: {
        physical: activePolicy ? Number(activePolicy.defaultPhysicalRate) : 5.0,
        ebook: activePolicy ? Number(activePolicy.defaultEbookRate) : 10.0,
        audio: activePolicy ? Number(activePolicy.defaultAudioRate) : 10.0,
      },
      holdingDays: {
        physical: activePolicy?.physicalHoldingDays || 7,
        digitalHours: activePolicy?.digitalHoldingHours || 24,
      },
      minPayoutAmount: activePolicy ? Number(activePolicy.minPayoutAmount) : 100000,
      cookieDurationDays: activePolicy?.cookieDurationDays || 30,
    };
  }

  /**
   * Public: Check affiliateCode availability
   */
  @Get('code-availability')
  async checkCodeAvailability(@Query('code') code: string) {
    return this.applicationService.checkCodeAvailability(code);
  }

  /**
   * Authenticated: Get my affiliate profile & current status
   */
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  async getMyProfile(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.applicationService.getMyProfile(userId);
  }

  /**
   * Authenticated: Submit application
   */
  @Post('applications')
  @UseGuards(AuthenticatedGuard)
  async submitApplication(
    @Req() req: BookRequest,
    @Body() dto: SubmitAffiliateApplicationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const userId = req.user!.sub;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.applicationService.submitApplication(userId, dto, {
      ipAddress,
      userAgent,
      requestId,
    });
  }

  /**
   * Authenticated: Resubmit application when in REQUEST_CHANGES
   */
  @Post('me/resubmit')
  @UseGuards(AuthenticatedGuard)
  async resubmitApplication(
    @Req() req: BookRequest,
    @Body() dto: ResubmitAffiliateApplicationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const userId = req.user!.sub;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.applicationService.resubmitApplication(userId, dto, {
      ipAddress,
      userAgent,
      requestId,
    });
  }

  /**
   * Authenticated: Get my affiliate wallet balance
   * Returns available, netAvailable, debt, holding, pending, frozen, and lifetime metrics
   */
  @Get('wallet')
  @UseGuards(AuthenticatedGuard)
  async getMyWallet(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.walletService.getWalletByUserId(userId);
  }

  /**
   * Authenticated: Get my wallet transaction history
   */
  @Get('wallet/transactions')
  @UseGuards(AuthenticatedGuard)
  async getMyWalletTransactions(
    @Req() req: BookRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const userId = req.user!.sub;
    return this.walletService.getTransactions(userId, {
      page,
      limit,
      type,
      fromDate,
      toDate,
    });
  }

  /**
   * Authenticated: Get CTV dashboard stats (live metrics, conversion rates, recent commissions)
   */
  @Get('dashboard')
  @UseGuards(AuthenticatedGuard)
  async getMyDashboard(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.dashboardService.getCtvDashboardStats(userId);
  }

  /**
   * Authenticated: Export CTV commissions & clicks report (CSV / Excel format)
   */
  @Get('reports/export')
  @UseGuards(AuthenticatedGuard)
  async exportMyReport(
    @Req() req: BookRequest,
    @Query('format') format?: 'csv' | 'xlsx',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const userId = req.user!.sub;
    const result = await this.dashboardService.exportReport(
      'CTV',
      userId,
      format || 'csv',
      fromDate,
      toDate,
    );

    if (res) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      });
    }

    return result.content;
  }
}
