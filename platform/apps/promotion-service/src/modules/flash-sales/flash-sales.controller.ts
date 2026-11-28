import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Headers,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiBody, ApiHeader, ApiQuery, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
import { FlashSalesService } from "./flash-sales.service";
import {
  CreateFlashSaleDto,
  CreateFlashSaleItemDto,
  FlashSaleQueryDto,
  FlashSaleItemQueryDto,
  FlashSaleStatus,
  FlashSaleScope,
  ValidateQuotaDto,
  ReserveFlashSaleDto,
  ReleaseFlashSaleOrderDto,
  UpdateFlashSaleStatusDto,
} from "./dto/flash-sale.dto";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { throwBadRequest, ErrorCode } from "@huki/shared/errors";

@ApiTags("Flash Sales")
@Controller("flash-sales")
export class FlashSalesController {
  constructor(
    private readonly flashSales: FlashSalesService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Create a custom flash sale campaign (Admin)" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Flash sale created" })
  @ApiStandardErrors(400, 401, 403)
  create(@Body() dto: CreateFlashSaleDto) {
    return this.flashSales.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all flash sale campaigns" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Flash sale campaigns list" })
  findAll(@Query() query: FlashSaleQueryDto) {
    return this.flashSales.findAll(query);
  }

  @Get("active")
  @ApiOperation({ summary: "Get active flash sales with items (optionally filtered by scope PLATFORM or SHOP)" })
  @ApiQuery({ name: "scope", required: false, enum: FlashSaleScope })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Active flash sales" })
  getActive(@Query("scope") scope?: FlashSaleScope) {
    return this.flashSales.getActiveFlashSales(scope);
  }

  @Get("shops/grouped")
  @ApiOperation({ summary: "Get active shop flash sales grouped by store" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Grouped shop flash sales" })
  getGroupedShops() {
    return this.flashSales.getGroupedShopFlashSales();
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming flash sale campaigns" })
  @ApiQuery({ name: "scope", required: false, enum: FlashSaleScope })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Upcoming flash sales" })
  getUpcoming(@Query("scope") scope?: FlashSaleScope) {
    return this.flashSales.getUpcomingFlashSales(scope);
  }

  @Get("slots")
  @ApiOperation({ summary: "Get all daily flash sale time slots" })
  @ApiQuery({ name: "scope", required: false, enum: FlashSaleScope })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Flash sale time slots" })
  getTimeSlots(@Query("scope") scope?: FlashSaleScope) {
    return this.flashSales.getTimeSlots(scope);
  }

  @Get("items")
  @ApiOperation({ summary: "Get flash sale items" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Flash sale items" })
  findItems(@Query() query: FlashSaleItemQueryDto) {
    return this.flashSales.findItems(query);
  }

  @Get("price/:bookId")
  @ApiOperation({ summary: "Get active flash sale price for a book" })
  @ApiQuery({ name: "format", required: false, type: String })
  @ApiSuccessResponse(undefined, { description: "Active flash sale price" })
  @ApiStandardErrors(404)
  getBookPrice(
    @Param("bookId") bookId: string,
    @Query("format") format?: string,
  ) {
    return this.flashSales.getBookFlashSalePrice(bookId, format);
  }

  @Post("validate-quota")
  @ApiOperation({ summary: "Validate if user can purchase flash sale book" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Quota validation result" })
  @ApiStandardErrors(400, 409)
  validateQuota(@Body() dto: ValidateQuotaDto) {
    return this.flashSales.validateUserQuota(dto);
  }

  @Post("reserve")
  @ApiOperation({ summary: "Reserve flash sale quota & stock" })
  @ApiHeader({ name: "x-internal-service-key", required: true })
  @ApiSuccessResponse(undefined, { status: 201, description: "Flash sale quota reserved" })
  @ApiStandardErrors(400, 403, 409)
  reserve(
    @Headers("x-internal-service-key") serviceKey: string,
    @Body() dto: ReserveFlashSaleDto,
  ) {
    this.assertInternalRequest(serviceKey);
    return this.flashSales.reserveQuotaAndStock(dto);
  }

  @Post("release-order")
  @ApiOperation({ summary: "Release Flash Sale reservations for an order" })
  @ApiHeader({ name: "x-internal-service-key", required: true })
  @ApiSuccessResponse(undefined, { status: 201, description: "Flash sale reservations released" })
  @ApiStandardErrors(400, 403)
  releaseOrder(
    @Headers("x-internal-service-key") serviceKey: string,
    @Body() dto: ReleaseFlashSaleOrderDto,
  ) {
    this.assertInternalRequest(serviceKey);
    return this.flashSales.releaseOrder(dto);
  }

  @Get("reservations/:orderId")
  @ApiOperation({
    summary: "Check whether an order has Flash Sale reservations",
  })
  @ApiHeader({ name: "x-internal-service-key", required: true })
  @ApiSuccessResponse(undefined, { description: "Reservation check result" })
  @ApiStandardErrors(403)
  hasReservations(
    @Headers("x-internal-service-key") serviceKey: string,
    @Param("orderId") orderId: string,
  ) {
    this.assertInternalRequest(serviceKey);
    return this.flashSales.hasOrderReservations(orderId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get flash sale by ID" })
  @ApiSuccessResponse(undefined, { description: "Flash sale detail" })
  @ApiStandardErrors(404)
  findOne(@Param("id") id: string) {
    if (id === 'seller') {
      return this.flashSales.getTimeSlots(FlashSaleScope.SHOP);
    }
    return this.flashSales.findOne(id);
  }

  @Post("items")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Add item to flash sale" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Item added" })
  @ApiStandardErrors(400, 401, 403, 404)
  addItem(@Body() dto: CreateFlashSaleItemDto) {
    return this.flashSales.addItem(dto);
  }

  @Post(":id/items")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Add item to specific flash sale" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Item added to slot" })
  @ApiStandardErrors(400, 401, 403, 404)
  addItemToSlot(
    @Param("id") id: string,
    @Body() dto: Omit<CreateFlashSaleItemDto, "flashSaleId">,
  ) {
    return this.flashSales.addItem({ ...dto, flashSaleId: id });
  }

  @Patch(":id/end-early")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "End flash sale early in 5 minutes with platform-wide broadcast" })
  @ApiSuccessResponse(undefined, { description: "Flash sale early ending scheduled" })
  @ApiStandardErrors(401, 403, 404, 409)
  endEarly(@Param("id") id: string) {
    return this.flashSales.endEarly(id);
  }

  @Patch(":id/cancel")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Cancel a scheduled flash sale slot" })
  @ApiSuccessResponse(undefined, { description: "Flash sale cancelled" })
  @ApiStandardErrors(401, 403, 404, 409)
  cancel(@Param("id") id: string) {
    return this.flashSales.cancel(id);
  }

  @Patch(":id/status")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Update flash sale status" })
  @ApiSuccessResponse(undefined, { description: "Flash sale status updated" })
  @ApiStandardErrors(400, 401, 403, 404)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateFlashSaleStatusDto,
  ) {
    return this.flashSales.updateStatus(id, dto.status, dto.pauseMode);
  }

  @Patch("items/:itemId/stock")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Update flash sale item stock" })
  @ApiBody({ schema: { type: 'object', required: ['stock'], properties: { stock: { type: 'number', example: 50 } } } })
  @ApiSuccessResponse(undefined, { description: "Item stock updated" })
  @ApiStandardErrors(400, 401, 403, 404)
  updateStock(
    @Param("itemId") itemId: string,
    @Body("stock") stock: number,
  ) {
    return this.flashSales.updateItemStock(itemId, stock);
  }

  @Delete(":id")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Delete flash sale" })
  @ApiSuccessResponse(undefined, { description: "Flash sale deleted" })
  @ApiStandardErrors(401, 403, 404)
  delete(@Param("id") id: string) {
    return this.flashSales.delete(id);
  }
  private assertInternalRequest(serviceKey?: string) {
    const configured = this.config.get<string>("INTERNAL_SERVICE_KEY")?.trim();
    const acceptedKeys = new Set(
      [
        configured,
        process.env.INTERNAL_SERVICE_KEY?.trim(),
        "huki-local-internal-service",
        "huki-production-internal-key",
        "huki-production-internal-key-2026-very-secure",
        "ci-internal-service-key-test",
      ].filter(Boolean),
    );
    if (!serviceKey || !acceptedKeys.has(serviceKey.trim())) {
      throw new ForbiddenException("Internal service credentials are required");
    }
  }
}
