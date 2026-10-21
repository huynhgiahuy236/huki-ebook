import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { BookRequest, BookWriteGuard } from '../../../common/book-auth.guard';
import { AffiliateApplicationService } from '../services/affiliate-application.service';
import {
  AdminReviewApplicationDto,
  AdminSuspendPartnerDto,
} from '../dto/affiliate-application.dto';
import { AffiliatePartnerStatus } from '../../../../prisma/generated/client';

@Controller('admin/affiliates')
@UseGuards(BookWriteGuard)
export class AffiliateAdminController {
  constructor(private readonly applicationService: AffiliateApplicationService) {}

  /**
   * Admin: List applications in review queue or partner pool
   */
  @Get()
  async listApplications(
    @Query('status') status?: AffiliatePartnerStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.applicationService.adminListApplications({
      status,
      search,
      page,
      limit,
    });
  }

  /**
   * Admin: View application detail and audit history
   */
  @Get(':id')
  async getApplicationDetail(@Param('id') id: string) {
    return this.applicationService.adminGetApplicationDetail(id);
  }

  /**
   * Admin: Approve application
   */
  @Post(':id/approve')
  async approveApplication(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminApprove(id, reviewerId, reviewerRole, {
      requestId,
    });
  }

  /**
   * Admin: Request changes
   */
  @Post(':id/request-changes')
  async requestChanges(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: { reason: string; requestedChanges?: Record<string, string> },
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminRequestChanges(
      id,
      reviewerId,
      reviewerRole,
      dto,
      { requestId },
    );
  }

  /**
   * Admin: Reject application
   */
  @Post(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: { reason: string },
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminReject(id, reviewerId, reviewerRole, dto.reason, {
      requestId,
    });
  }

  /**
   * Admin: Suspend active partner
   */
  @Post(':id/suspend')
  async suspendPartner(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: AdminSuspendPartnerDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminSuspend(id, reviewerId, reviewerRole, dto.reason, {
      requestId,
    });
  }

  /**
   * Admin: Re-activate suspended partner
   */
  @Post(':id/activate')
  async activatePartner(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminActivate(id, reviewerId, reviewerRole, {
      requestId,
    });
  }
}
