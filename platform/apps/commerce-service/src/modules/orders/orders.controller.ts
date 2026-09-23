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
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto } from './dto/checkout.dto';
import {
  CreateDisputeDto,
  ArbitrateDisputeDto,
  AdminDisputeQueryDto,
} from './dto/dispute.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('admin/disputes')
  @ApiOperation({
    summary: 'List all disputes for Platform Admin (Task 64)',
    description:
      'Platform Admin reviews submitted buyer/seller disputes across all orders.',
  })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can access dispute arbitration list',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Dispute detail' })
  @ApiNotFoundResponse({ description: 'Dispute not found' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can access dispute details',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Arbitration ruling recorded' })
  @ApiNotFoundResponse({ description: 'Dispute not found' })
  @ApiBadRequestResponse({ description: 'Invalid ruling parameters' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can execute arbitration rulings',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'List of frozen escrow pools' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can audit frozen escrow pools',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  adminListFrozenEscrows(@CurrentBookActor() actor: BookActor) {
    return this.orders.listFrozenEscrows(actor);
  }

  @Get('admin/escrow/items')
  @ApiOperation({
    summary: 'List all escrow holding items for Platform Admin (Task fix_checkout_v1)',
    description: 'Platform Admin reviews all item-level payments in intermediate escrow holding.',
  })
  @ApiResponse({ status: 200, description: 'List of escrow items' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can access intermediate escrow account items',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Escrow status updated' })
  @ApiNotFoundResponse({ description: 'Order item not found' })
  @ApiForbiddenResponse({
    description: 'Only Platform Admin can update item escrow status',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  adminUpdateEscrowItemStatus(
    @CurrentBookActor() actor: BookActor,
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: { status: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED'; reason?: string },
  ) {
    return this.orders.adminUpdateEscrowItemStatus(actor, orderItemId, dto);
  }

  @Get('seller/escrow/items')
  @ApiOperation({
    summary: 'List all escrow holding items for Seller (Task update_proceed_money_flow_v1)',
    description: 'Seller reviews all item-level payments in intermediate escrow holding with 4 statuses, 5% fee and 95% net revenue.',
  })
  @ApiResponse({ status: 200, description: 'List of seller escrow items' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  sellerListEscrowItems(
    @CurrentBookActor() actor: BookActor,
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
  adminListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.adminListReturnRequests(actor, { status, search });
  }

  @Post(['admin/return-requests/:id/forward', 'admin/returns/:id/forward'])
  @ApiOperation({ summary: 'Platform Admin forwards return request to Seller' })
  adminForwardReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.adminForwardReturnRequest(actor, id);
  }

  @Post(['admin/return-requests/:id/arbitrate', 'admin/returns/:id/arbitrate'])
  @ApiOperation({ summary: 'Platform Admin arbitrates return dispute' })
  adminArbitrateReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { ruling: 'BUYER_WINS' | 'SELLER_WINS'; notes?: string; reason?: string },
  ) {
    return this.orders.adminArbitrateReturnRequest(actor, id, dto);
  }

  @Get(['seller/return-requests', 'seller/returns'])
  @ApiOperation({ summary: 'List return requests for Seller' })
  sellerListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.sellerListReturnRequests(actor, { status, search });
  }

  @Get(['seller/return-requests/:id', 'seller/returns/:id'])
  @ApiOperation({ summary: 'Get return request detail for Seller' })
  sellerGetReturnRequestDetail(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.sellerGetReturnRequestDetail(actor, id);
  }

  @Post(['seller/return-requests/:id/accept', 'seller/returns/:id/accept'])
  @ApiOperation({ summary: 'Seller accepts return request' })
  sellerAcceptReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.sellerAcceptReturnRequest(actor, id);
  }

  @Post(['seller/return-requests/:id/dispute', 'seller/returns/:id/dispute'])
  @ApiOperation({ summary: 'Seller disputes return request' })
  sellerDisputeReturnRequest(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason?: string; evidence?: { images?: string[]; videos?: string[]; note?: string }; evidenceImages?: string[]; evidenceVideos?: string[] },
  ) {
    return this.orders.sellerDisputeReturnRequest(actor, id, dto);
  }

  @Post(['seller/return-requests/:id/ship-replacement', 'seller/returns/:id/ship-replacement'])
  @ApiOperation({ summary: 'Seller ships replacement order' })
  sellerShipReplacement(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { carrier: string; trackingCode: string },
  ) {
    return this.orders.sellerShipReplacement(actor, id, dto);
  }

  @Get('seller/replacements')
  @ApiOperation({ summary: 'Seller lists replacement orders' })
  sellerListReplacements(@CurrentBookActor() actor: BookActor) {
    return this.orders.sellerListReplacements(actor);
  }

  @Get('buyer/replacements')
  @ApiOperation({ summary: 'Buyer lists replacement orders' })
  buyerListReplacements(@CurrentBookActor() actor: BookActor) {
    return this.orders.buyerListReplacements(actor.sub);
  }

  @Get(['buyer/return-requests', 'buyer/returns'])
  @ApiOperation({ summary: 'Buyer lists their return and refund requests' })
  buyerListReturnRequests(
    @CurrentBookActor() actor: BookActor,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.orders.buyerListReturnRequests(actor.sub, { type, status });
  }

  @Post([':id/items/:orderItemId/return-request', ':id/items/:orderItemId/returns'])
  @ApiOperation({ summary: 'Buyer creates a return request for an item' })
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
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  detail(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.buyerDetail(actor.sub, id);
  }

  @Get(':id/tracking')
  @ApiOperation({
    summary: 'Track order status',
    description: 'Returns real-time tracking information for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order tracking information' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  tracking(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get order status history',
    description: 'Returns the complete status change history for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status history' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  history(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order. Only possible before payment or shipment.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Order cannot be cancelled (already shipped/paid)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Seller order cancelled successfully' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Seller order cannot be cancelled (already shipped)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Cancellation request submitted' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Order cannot be cancelled in current state' })
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
  @ApiResponse({ status: 201, description: 'Dispute submitted successfully' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Order not eligible for dispute or invalid input' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  dispute(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.orders.createDispute(actor.sub, id, dto);
  }

  @Post(':id/disputes/evidence')
  @ApiConsumes('multipart/form-data')
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
  @ApiResponse({ status: 201, description: 'Evidence uploaded successfully' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Invalid file or file too large' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Authorized evidence access' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'User not authorized to access evidence' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Escrow holding status' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Actor not authorized to view order escrow' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Sub-order escrow status' })
  @ApiNotFoundResponse({ description: 'Order or Sub-order not found' })
  @ApiForbiddenResponse({ description: 'Actor not authorized to view sub-order escrow' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiResponse({ status: 200, description: 'Order completed and escrow released' })
  confirmDelivered(
    @CurrentBookActor() actor: BookActor,
    @Param('id') id: string,
    @Body() body?: { subOrderId?: string; orderId?: string },
  ) {
    const targetOrderId = id && id !== 'buyer' ? id : body?.orderId || id;
    return this.orders.buyerConfirmDelivered(actor.sub, targetOrderId, body?.subOrderId);
  }
}


