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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  AuthenticatedGuard,
  BookRequest,
  OptionalBookAuthGuard,
} from '../../../common/book-auth.guard';
import { AffiliateApplicationService } from '../services/affiliate-application.service';
import { AffiliateWalletService } from '../services/affiliate-wallet.service';
import { AffiliateDashboardService } from '../services/affiliate-dashboard.service';
import { AffiliatePayoutService } from '../services/affiliate-payout.service';
import {
  SubmitAffiliateApplicationDto,
  ResubmitAffiliateApplicationDto,
} from '../dto/affiliate-application.dto';
import { SubmitKycDto, CreatePayoutRequestDto } from '../dto/affiliate-payout.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { getConfiguredEscrowHoldSeconds, ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Affiliate')
@Controller('affiliate')
export class AffiliateController {
  constructor(
    private readonly applicationService: AffiliateApplicationService,
    private readonly walletService: AffiliateWalletService,
    private readonly dashboardService: AffiliateDashboardService,
    private readonly payoutService: AffiliatePayoutService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Public: Program Overview & Active Terms
   */
  @Get('program')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({ summary: 'Get affiliate program overview and active terms' })
  @ApiSuccessResponse(undefined, { description: 'Program overview retrieved' })
  @ApiStandardErrors(500)
  async getProgramInfo() {
    const activePolicy = await this.prisma.affiliatePolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    const configuredHoldSeconds = getConfiguredEscrowHoldSeconds();
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
      holdingDurationSeconds: configuredHoldSeconds,
      minPayoutAmount: activePolicy ? Number(activePolicy.minPayoutAmount) : 100000,
      cookieDurationDays: activePolicy?.cookieDurationDays || 30,
    };
  }

  /**
   * Public: Check affiliateCode availability
   */
  @Get('code-availability')
  @ApiOperation({ summary: 'Check affiliate code availability' })
  @ApiQuery({ name: 'code', required: true, type: String })
  @ApiSuccessResponse(undefined, { description: 'Code availability checked' })
  @ApiStandardErrors(400)
  async checkCodeAvailability(@Query('code') code: string) {
    return this.applicationService.checkCodeAvailability(code);
  }

  /**
   * Authenticated: Get my affiliate profile & current status
   */
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my affiliate profile & current status' })
  @ApiSuccessResponse(undefined, { description: 'Affiliate profile retrieved' })
  @ApiStandardErrors(401, 404)
  async getMyProfile(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    const userRole = req.user?.role;
    return this.applicationService.getMyProfile(userId, userRole);
  }

  /**
   * Authenticated: Submit application
   */
  @Post('applications')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit affiliate partner application' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Application submitted' })
  @ApiStandardErrors(400, 401, 409)
  async submitApplication(
    @Req() req: BookRequest,
    @Body() dto: SubmitAffiliateApplicationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const userId = req.user!.sub;
    const userRole = req.user?.role;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.applicationService.submitApplication(userId, dto, {
      ipAddress,
      userAgent,
      requestId,
      userRole,
    });
  }

  /**
   * Authenticated: Resubmit application when in REQUEST_CHANGES
   */
  @Post('me/resubmit')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resubmit affiliate application after requested changes' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Application resubmitted' })
  @ApiStandardErrors(400, 401, 404, 409)
  async resubmitApplication(
    @Req() req: BookRequest,
    @Body() dto: ResubmitAffiliateApplicationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const userId = req.user!.sub;
    const userRole = req.user?.role;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    return this.applicationService.resubmitApplication(userId, dto, {
      ipAddress,
      userAgent,
      requestId,
      userRole,
    });
  }

  /**
   * Authenticated: Get my affiliate wallet balance
   * Returns available, netAvailable, debt, holding, pending, frozen, and lifetime metrics
   */
  @Get('wallet')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my affiliate wallet balance' })
  @ApiSuccessResponse(undefined, { description: 'Affiliate wallet balance retrieved' })
  @ApiStandardErrors(401, 404)
  async getMyWallet(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.walletService.getWalletByUserId(userId);
  }

  /**
   * Authenticated: Get my wallet transaction history
   */
  @Get('wallet/transactions')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my affiliate wallet transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'Wallet transactions retrieved' })
  @ApiStandardErrors(401)
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get CTV dashboard stats' })
  @ApiSuccessResponse(undefined, { description: 'CTV dashboard stats retrieved' })
  @ApiStandardErrors(401)
  async getMyDashboard(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.dashboardService.getCtvDashboardStats(userId);
  }

  /**
   * Authenticated: Export CTV commissions & clicks report (CSV / Excel format)
   */
  @Get('reports/export')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Export CTV commissions & clicks report' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'CTV report exported' })
  @ApiStandardErrors(401)
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

  /**
   * Authenticated CTV: Submit KYC identity documents & bank account
   */
  @Post('kyc')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit CTV KYC identity documents & bank account' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'KYC submitted' })
  @ApiStandardErrors(400, 401)
  async submitKyc(@Req() req: BookRequest, @Body() dto: SubmitKycDto) {
    const userId = req.user!.sub;
    return this.payoutService.submitKyc(userId, dto);
  }

  /**
   * Authenticated CTV: Check KYC verification status
   */
  @Get('kyc')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check CTV KYC verification status' })
  @ApiSuccessResponse(undefined, { description: 'KYC status retrieved' })
  @ApiStandardErrors(401, 404)
  async getMyKycStatus(@Req() req: BookRequest) {
    const userId = req.user!.sub;
    return this.payoutService.getKycStatus(userId);
  }

  /**
   * Authenticated CTV: Create payout request (subject to KYC, fraud gating, 24h limit, and tax withholding)
   */
  @Post('payouts')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create affiliate payout request' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Payout request created' })
  @ApiStandardErrors(400, 401, 403, 422)
  async requestPayout(@Req() req: BookRequest, @Body() dto: CreatePayoutRequestDto) {
    const userId = req.user!.sub;
    return this.payoutService.createPayoutRequest(userId, dto);
  }

  /**
   * Authenticated CTV: List my payout requests
   */
  @Get('payouts')
  @UseGuards(AuthenticatedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List my affiliate payout requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { description: 'Payout requests retrieved' })
  @ApiStandardErrors(401)
  async getMyPayouts(
    @Req() req: BookRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user!.sub;
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });
    if (!profile) return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    return this.payoutService.listPayoutRequests({
      profileId: profile.id,
      page,
      limit,
    });
  }
}
