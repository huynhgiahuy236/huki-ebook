import { throwUnauthorized, ErrorCode } from '@huki/shared/errors';
/**
 * HUKI EBOOK - Orders Controller
 *
 * Handles buyer order management
 */

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor, BookWriteGuard, OptionalBookAuthGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto, AddOrderNoteDto } from './dto/checkout.dto';
import {
  CreateDisputeDto,
  ArbitrateDisputeDto,
  AdminDisputeQueryDto,
} from './dto/dispute.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(OptionalBookAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('admin/disputes')
  @ApiOperation({
    summary: 'List all disputes for Platform Admin (Task 64)',
    description:
      'Platform Admin reviews submitted buyer/seller disputes across all orders.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of disputes' })
  @ApiStandardErrors(401, 403)
  adminListDisputes(
    @CurrentBookActor() actor: BookActor,
    @Query() query: AdminDisputeQueryDto,
  ) {
    return this.orders.adminListDisputes(actor, query);
  }

  @Get('admin/disputes/:disputeId')
  @ApiOperation({
    summary: 'Get dispute details for Platform Admin (Task 64)',
    description:
      'Platform Admin retrieves full dispute context, claims, order info, and evidence gallery.',
  })
  @ApiParam({ name: 'disputeId', description: 'Dispute ID' })
  @ApiSuccessResponse(undefined, { description: 'Dispute detail' })
  @ApiStandardErrors(401, 403, 404)
  adminGetDisputeDetail(
    @CurrentBookActor() actor: BookActor,
    @Param('disputeId') disputeId: string,
  ) {
    return this.orders.adminGetDisputeDetail(actor, disputeId);
  }

  @Post('admin/disputes/:disputeId/arbitrate')
  @ApiOperation({
    summary: 'Record Platform Admin Arbitration Ruling (Task 64 / POL-12)',
    description:
      'Platform Admin executes binding arbitration ruling (BUYER_WINS, SELLER_WINS, PARTIAL_SETTLEMENT, CARRIER_AT_FAULT, REQUEST_MORE_INFO).',
  })
  @ApiParam({ name: 'disputeId', description: 'Dispute ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Arbitration ruling recorded' })
  @ApiStandardErrors(400, 401, 403, 404)
  adminArbitrateDispute(
    @CurrentBookActor() actor: BookActor,
    @Param('disputeId') disputeId: string,
    @Body() dto: ArbitrateDisputeDto,
  ) {
    return this.orders.adminArbitrateDispute(actor, disputeId, dto);
  }

  @Get('admin/escrow/frozen')
  @ApiOperation({
    summary: 'List all frozen escrow holdings (Task 65 / POL-14)',
    description:
      'Platform Admin audits all active escrow holding funds currently frozen due to disputes.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of frozen escrow pools' })
  @ApiStandardErrors(401, 403)
  adminListFrozenEscrows(@CurrentBookActor() actor: BookActor) {
    return this.orders.listFrozenEscrows(actor);
  }

  @Get('admin/escrow/items')
  @ApiOperation({
    summary: 'List all escrow holding items for Platform Admin (Task fix_checkout_v1)',
    description: 'Platform Admin reviews all item-level payments in intermediate escrow holding.',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of escrow items' })
  @ApiStandardErrors(401, 403)
  adminListEscrowItems(
    @CurrentBookActor() actor: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.adminListEscrowItems(actor, { status, search });
  }

  @Patch('admin/escrow/items/:orderItemId/status')
  @ApiOperation({
    summary: 'Update item-level escrow status (Task fix_checkout_v1)',
    description: 'Platform Admin changes escrow status (HOLDING, FROZEN, RELEASED) for a single order item.',
  })
  @ApiParam({ name: 'orderItemId', description: 'Order Item UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['HOLDING', 'FROZEN', 'RELEASED', 'REFUNDED'] },
        reason: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Escrow status updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  adminUpdateEscrowItemStatus(
    @CurrentBookActor() actor: BookActor,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: { status: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED'; reason?: string },
  ) {
    return this.orders.adminUpdateEscrowItemStatus(actor, orderItemId, dto);
  }

  @Get('seller/escrow/items')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({
    summary: 'List all escrow holding items for Seller (Task update_proceed_money_flow_v1)',
    description: 'Seller reviews all item-level payments in intermediate escrow holding with 4 statuses, 5% fee and 95% net revenue.',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of seller escrow items' })
  @ApiStandardErrors(401, 403)
  sellerListEscrowItems(
    @CurrentBookActor() actor?: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.sellerListEscrowItems(actor, { status, search });
  }

  // ============================================
  // RETURN & REFUND REQUESTS (Flow Return v1)
  // ============================================

  @Get(['admin/return-requests', 'admin/returns'])
  @ApiOperation({ summary: 'List all return requests for Platform Admin' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Admin return requests list' })
  @ApiStandardErrors(401, 403)
  adminListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.adminListReturnRequests(actor, { status, search });
  }

  @Post(['admin/return-requests/:id/forward', 'admin/returns/:id/forward'])
  @ApiOperation({ summary: 'Platform Admin forwards return request to Seller' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return request forwarded' })
  @ApiStandardErrors(401, 403, 404, 409)
  adminForwardReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.adminForwardReturnRequest(actor, id);
  }

  @Post(['admin/return-requests/:id/arbitrate', 'admin/returns/:id/arbitrate'])
  @ApiOperation({ summary: 'Platform Admin arbitrates return dispute' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ruling'],
      properties: {
        ruling: { type: 'string', enum: ['BUYER_WINS', 'SELLER_WINS'] },
        notes: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return dispute arbitrated' })
  @ApiStandardErrors(400, 401, 403, 404)
  adminArbitrateReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { ruling: 'BUYER_WINS' | 'SELLER_WINS'; notes?: string; reason?: string },
  ) {
    return this.orders.adminArbitrateReturnRequest(actor, id, dto);
  }

  @Get(['seller/return-requests', 'seller/returns'])
  @UseGuards(BookWriteGuard)
  @ApiOperation({ summary: 'List return requests for Seller' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Seller return requests list' })
  @ApiStandardErrors(401, 403)
  sellerListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.sellerListReturnRequests(actor, { status, search });
  }

  @Get(['seller/return-requests/:id', 'seller/returns/:id'])
  @ApiOperation({ summary: 'Get return request detail for Seller' })
  @ApiSuccessResponse(undefined, { description: 'Return request detail' })
  @ApiStandardErrors(401, 403, 404)
  sellerGetReturnRequestDetail(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.sellerGetReturnRequestDetail(actor, id);
  }

  @Post(['seller/return-requests/:id/accept', 'seller/returns/:id/accept'])
  @ApiOperation({ summary: 'Seller accepts return request' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return request accepted' })
  @ApiStandardErrors(401, 403, 404, 409)
  sellerAcceptReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.sellerAcceptReturnRequest(actor, id);
  }

  @Post(['seller/return-requests/:id/dispatch-shipper', 'seller/returns/:id/dispatch-shipper'])
  @ApiOperation({ summary: 'Seller dispatches shipper to pick up return book from customer' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { note: { type: 'string' }, scheduledTime: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Shipper dispatched for return pickup' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  sellerDispatchShipper(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: { note?: string; scheduledTime?: string },
  ) {
    return this.orders.sellerDispatchShipper(actor, id, dto);
  }

  @Post(['seller/return-requests/:id/confirm-receipt', 'seller/returns/:id/confirm-receipt'])
  @ApiOperation({ summary: 'Seller confirms returned item received at warehouse' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return receipt confirmed' })
  @ApiStandardErrors(401, 403, 404, 409)
  sellerConfirmReturnReceipt(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.sellerConfirmReturnReceipt(actor, id);
  }

  @Post(['seller/return-requests/:id/dispute', 'seller/returns/:id/dispute'])
  @ApiOperation({ summary: 'Seller disputes return request' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        evidence: { type: 'object' },
        evidenceImages: { type: 'array', items: { type: 'string' } },
        evidenceVideos: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return dispute submitted' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  sellerDisputeReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason?: string; evidence?: { images?: string[]; videos?: string[]; note?: string }; evidenceImages?: string[]; evidenceVideos?: string[] },
  ) {
    return this.orders.sellerDisputeReturnRequest(actor, id, dto);
  }

  @Post(['seller/return-requests/:id/ship-replacement', 'seller/returns/:id/ship-replacement'])
  @ApiOperation({ summary: 'Seller ships replacement order' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['carrier', 'trackingCode'],
      properties: { carrier: { type: 'string' }, trackingCode: { type: 'string' } },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Replacement shipped' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  sellerShipReplacement(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { carrier: string; trackingCode: string },
  ) {
    return this.orders.sellerShipReplacement(actor, id, dto);
  }

  @Get('seller/replacements')
  @ApiOperation({ summary: 'Seller lists replacement orders' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Seller replacement orders' })
  @ApiStandardErrors(401, 403)
  sellerListReplacements(@CurrentBookActor() actor: BookActor) {
    return this.orders.sellerListReplacements(actor);
  }

  @Get('buyer/replacements')
  @ApiOperation({ summary: 'Buyer lists replacement orders' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Buyer replacement orders' })
  @ApiStandardErrors(401)
  buyerListReplacements(@CurrentBookActor() actor: BookActor) {
    if (!actor?.sub) return [];
    return this.orders.buyerListReplacements(actor.sub);
  }

  @Get(['buyer/return-requests', 'buyer/returns'])
  @ApiOperation({ summary: 'Buyer lists their return and refund requests' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Buyer return requests' })
  @ApiStandardErrors(401)
  buyerListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
  ) {
    if (!actor?.sub) return [];
    return this.orders.buyerListReturnRequests(actor.sub, { type, status, orderId });
  }

  @Post([':id/items/:orderItemId/return-request', ':id/items/:orderItemId/returns'])
  @ApiOperation({ summary: 'Buyer creates a return request for an item' })
  @ApiBody({ schema: { type: 'object', description: 'Return request payload' } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Return request created' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  createReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: any,
  ) {
    return this.orders.createReturnRequest(actor.sub, id, orderItemId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user orders',
    description: 'Returns a paginated list of orders for the authenticated user.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated list of orders' })
  @ApiStandardErrors(401)
  list(
    @CurrentBookActor() actor: BookActor,
    @Query() query: OrderQueryDto,
  ) {
    return this.orders.buyerList(actor.sub, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order details',
    description: 'Returns detailed information about a specific order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Code' })
  @ApiSuccessResponse(undefined, { description: 'Order details' })
  @ApiStandardErrors(401, 403, 404)
  detail(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
  ) {
    if (!actor?.sub) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Vui lòng đăng nhập để xem thông tin đơn hàng');
    }
    return this.orders.buyerDetail(actor.sub, id);
  }

  @Get(':id/tracking')
  @ApiOperation({
    summary: 'Track order status',
    description: 'Returns real-time tracking information for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiSuccessResponse(undefined, { description: 'Order tracking information' })
  @ApiStandardErrors(401, 403, 404)
  tracking(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
  ) {
    return this.orders.tracking(actor?.sub, id, actor);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get order status history',
    description: 'Returns the complete status change history for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Code' })
  @ApiSuccessResponse(undefined, { description: 'Order status history' })
  @ApiStandardErrors(401, 403, 404)
  history(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
  ) {
    return this.orders.tracking(actor?.sub, id, actor);
  }

  @Patch([':id/notes', ':id/note'])
  @ApiOperation({
    summary: 'Add note or dispatch message to an order',
    description: 'Buyer attaches packaging note or instructions directly to the order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID or Order Code' })
  @ApiSuccessResponse(undefined, { description: 'Note added to order successfully' })
  @ApiStandardErrors(400, 401, 404)
  addNote(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
    @Body() dto: AddOrderNoteDto,
  ) {
    if (!actor?.sub) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Vui lòng đăng nhập để đính kèm ghi chú đơn hàng');
    }
    return this.orders.addNoteBuyer(actor.sub, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order. Only possible before payment or shipment.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Order cancelled successfully' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  cancel(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelBuyer(actor.sub, id, dto);
  }

  @Post(':id/seller-orders/:sellerOrderId/cancel')
  @ApiOperation({
    summary: 'Cancel a single seller sub-order',
    description: 'Cancels a specific package/seller order without cancelling the entire order.',
  })
  @ApiParam({ name: 'id', description: 'Master Order ID' })
  @ApiParam({ name: 'sellerOrderId', description: 'Seller Order ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Seller order cancelled successfully' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  cancelSubOrder(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sellerOrderId', ParseUUIDPipe) sellerOrderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelBuyerSubOrder(actor.sub, id, sellerOrderId, dto);
  }

  @Post(':id/seller-orders/:sellerOrderId/cancel-request')
  @ApiOperation({
    summary: 'Request cancellation during packing phase',
    description: 'Buyer submits a cancellation request during packing phase requiring seller approval (Task 59).',
  })
  @ApiParam({ name: 'id', description: 'Master Order ID' })
  @ApiParam({ name: 'sellerOrderId', description: 'Seller Order ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Cancellation request submitted' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  requestCancelSubOrder(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sellerOrderId', ParseUUIDPipe) sellerOrderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.requestCancellation(actor.sub, id, sellerOrderId, dto);
  }

  @Post(':id/disputes')
  @ApiOperation({
    summary: 'Submit a dispute / complaint',
    description: 'Buyer submits a dispute or complaint for an order or specific package (Task 62 / POL-12).',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Dispute submitted successfully' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  dispute(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.orders.createDispute(actor.sub, id, dto);
  }

  @Post(':id/disputes/evidence')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload dispute / RMA evidence file',
    description: 'Upload an image or document as evidence for an order dispute (Task 63 / POL-12).',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Evidence uploaded successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
  uploadEvidence(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.orders.uploadDisputeEvidence(actor.sub, id, file);
  }

  @Get(':id/disputes/evidence')
  @ApiOperation({
    summary: 'Get authorized dispute evidence access',
    description: 'Returns secure access URL for authorized dispute evidence (Task 63).',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiQuery({ name: 'key', required: true, type: String })
  @ApiSuccessResponse(undefined, { description: 'Authorized evidence access' })
  @ApiStandardErrors(401, 403, 404)
  getEvidenceAccess(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('key') key: string,
  ) {
    return this.orders.getDisputeEvidenceAccess(actor, id, key);
  }

  @Get(':id/escrow')
  @ApiOperation({
    summary: 'Get order Escrow holding and freeze status (Task 65 / POL-14)',
    description:
      'Returns runtime escrow holding status, 85/15 revenue split, and frozen dispute status.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiSuccessResponse(undefined, { description: 'Escrow holding status' })
  @ApiStandardErrors(401, 403, 404)
  getOrderEscrow(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getEscrowStatus(actor, id);
  }

  @Get(':id/seller-orders/:sellerOrderId/escrow')
  @ApiOperation({
    summary: 'Get SellerOrder Escrow status (Task 65 / POL-14)',
    description:
      'Returns sub-order specific escrow holding and freeze status.',
  })
  @ApiParam({ name: 'id', description: 'Master Order ID' })
  @ApiParam({ name: 'sellerOrderId', description: 'Seller Order ID' })
  @ApiSuccessResponse(undefined, { description: 'Sub-order escrow status' })
  @ApiStandardErrors(401, 403, 404)
  getSubOrderEscrow(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sellerOrderId', ParseUUIDPipe) sellerOrderId: string,
  ) {
    return this.orders.getEscrowStatus(actor, id, sellerOrderId);
  }

  @Post([':id/confirm-delivered', ':id/release-escrow', 'buyer/confirm-delivered'])
  @ApiOperation({
    summary: 'Buyer confirms delivery and releases escrow immediately',
    description: 'Marks sub-order or master order as completed and unfreezes/releases escrow funds to seller.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { subOrderId: { type: 'string' }, orderId: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Order completed and escrow released' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  confirmDelivered(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
    @Body() body?: { subOrderId?: string; orderId?: string },
  ) {
    const targetOrderId = id && id !== 'buyer' ? id : body?.orderId || id;
    return this.orders.buyerConfirmDelivered(actor.sub, targetOrderId, body?.subOrderId);
  }
}


