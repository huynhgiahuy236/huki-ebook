import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, AuthenticatedGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { PayoutService } from './payout.service';
import { PayoutProcessorService } from './services/payout-processor.service';
import {
  CancelFailedPayoutDto,
  CreatePayoutRequestDto,
  DisburseBatchDto,
  PayoutQueryDto,
  PayoutReviewAction,
  ReviewPayoutDto,
} from './dto/payout.dto';

@ApiTags('Payout (Task 76-77 / POL-15)')
@Controller('payout')
@UseGuards(AuthenticatedGuard)
@ApiBearerAuth('JWT-auth')
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly payoutProcessorService: PayoutProcessorService,
  ) {}

  @Post('store/:storeId/request')
  @ApiOperation({
    summary: 'Tạo yêu cầu rút tiền từ số dư khả dụng (Yêu cầu mã xác thực 2FA Finance Auth)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Yêu cầu rút tiền được tạo thành công ở trạng thái PENDING.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async createPayoutRequest(
    @Param('storeId') storeId: string,
    @Body() dto: CreatePayoutRequestDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    dto.storeId = storeId;
    return this.payoutService.createPayoutRequest(dto, actor);
  }

  @Get('store/:storeId/requests')
  @ApiOperation({
    summary: 'Xem lịch sử các yêu cầu rút tiền của gian hàng',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Danh sách yêu cầu rút tiền của gian hàng.' })
  @ApiStandardErrors(401, 403, 404)
  async getStorePayoutRequests(
    @Param('storeId') storeId: string,
    @Query() query: PayoutQueryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutService.getStorePayoutRequests(storeId, query, actor);
  }

  @Post('admin/requests/:id/review')
  @ApiOperation({
    summary: 'Platform Admin phê duyệt hoặc từ chối yêu cầu rút tiền',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Cập nhật trạng thái yêu cầu rút tiền.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async reviewPayoutRequest(
    @Param('id') id: string,
    @Body() dto: ReviewPayoutDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    if (dto.action === PayoutReviewAction.APPROVE) {
      return this.payoutService.approvePayoutRequest(id, actor);
    } else {
      return this.payoutService.rejectPayoutRequest(id, dto, actor);
    }
  }

  @Get('admin/requests')
  @ApiOperation({
    summary: 'Platform Admin xem danh sách tất cả yêu cầu rút tiền trên sàn',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Danh sách yêu cầu rút tiền toàn sàn.' })
  @ApiStandardErrors(401, 403)
  async getAllPayoutRequests(
    @Query() query: PayoutQueryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutService.getAllPayoutRequests(query, actor);
  }

  @Post('admin/requests/:id/disburse')
  @ApiOperation({
    summary: 'Platform Admin thực hiện giải ngân chuyển khoản ngân hàng cho lệnh đã duyệt (Task 77)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Kết quả giải ngân chuyển khoản ngân hàng.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async disbursePayout(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutProcessorService.disbursePayout(id, actor);
  }

  @Post('admin/disburse-batch')
  @ApiOperation({
    summary: 'Platform Admin thực hiện giải ngân hàng loạt cho nhiều lệnh đã duyệt (Task 77)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Kết quả giải ngân hàng loạt.' })
  @ApiStandardErrors(400, 401, 403)
  async disburseBatch(
    @Body() dto: DisburseBatchDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutProcessorService.disburseBatch(dto.payoutIds, actor);
  }

  @Post('admin/requests/:id/retry')
  @ApiOperation({
    summary: 'Platform Admin thử lại chuyển khoản cho lệnh rút tiền thất bại (Task 77)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Kết quả thử lại giải ngân.' })
  @ApiStandardErrors(401, 403, 404, 409)
  async retryPayout(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutProcessorService.retryPayout(id, actor);
  }

  @Post('admin/requests/:id/cancel-refund')
  @ApiOperation({
    summary: 'Platform Admin hủy lệnh rút tiền thất bại và hoàn trả số dư khả dụng cho người bán (Task 77)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Hủy lệnh và hoàn trả số dư thành công.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async cancelFailedAndRefund(
    @Param('id') id: string,
    @Body() dto: CancelFailedPayoutDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutProcessorService.cancelFailedAndRefund(id, dto, actor);
  }

  @Post('admin/requests/:id/reconcile-provider')
  @ApiOperation({
    summary: 'Platform Admin đối soát trạng thái giao dịch trực tiếp từ cổng ngân hàng (Task 77)',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Kết quả đối soát trạng thái từ ngân hàng.' })
  @ApiStandardErrors(401, 403, 404)
  async reconcilePayoutWithProvider(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payoutProcessorService.reconcilePayoutWithProvider(id, actor);
  }
}
