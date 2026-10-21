import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  AuthenticatedGuard,
  BookRequest,
  OptionalBookAuthGuard,
} from '../../../common/book-auth.guard';
import { AffiliateApplicationService } from '../services/affiliate-application.service';
import {
  SubmitAffiliateApplicationDto,
  ResubmitAffiliateApplicationDto,
} from '../dto/affiliate-application.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('affiliate')
export class AffiliateController {
  constructor(
    private readonly applicationService: AffiliateApplicationService,
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
}
