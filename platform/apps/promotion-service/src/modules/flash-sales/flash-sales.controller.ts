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
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { FlashSalesService } from "./flash-sales.service";
import {
  CreateFlashSaleDto,
  CreateFlashSaleItemDto,
  FlashSaleQueryDto,
  FlashSaleItemQueryDto,
  FlashSaleStatus,
  ValidateQuotaDto,
  ReserveFlashSaleDto,
  ReleaseFlashSaleOrderDto,
  UpdateFlashSaleStatusDto,
} from "./dto/flash-sale.dto";
import { RolesGuard, Roles } from "../../common/roles.guard";

@ApiTags("Flash Sales")
@Controller("flash-sales")
export class FlashSalesController {
  constructor(
    private readonly flashSales: FlashSalesService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Create a custom flash sale campaign (Admin)" })
  create(@Body() dto: CreateFlashSaleDto) {
    return this.flashSales.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all flash sale campaigns" })
  findAll(@Query() query: FlashSaleQueryDto) {
    return this.flashSales.findAll(query);
  }

  @Get("active")
  @ApiOperation({ summary: "Get active flash sales with items" })
  getActive() {
    return this.flashSales.getActiveFlashSales();
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming flash sale campaigns" })
  getUpcoming() {
    return this.flashSales.getUpcomingFlashSales();
  }

  @Get("slots")
  @ApiOperation({ summary: "Get all daily flash sale time slots" })
  getTimeSlots() {
    return this.flashSales.getTimeSlots();
  }

  @Get("items")
  @ApiOperation({ summary: "Get flash sale items" })
  findItems(@Query() query: FlashSaleItemQueryDto) {
    return this.flashSales.findItems(query);
  }

  @Get("price/:bookId")
  @ApiOperation({ summary: "Get active flash sale price for a book" })
  getBookPrice(@Param("bookId", ParseUUIDPipe) bookId: string) {
    return this.flashSales.getBookFlashSalePrice(bookId);
  }

  @Post("validate-quota")
  @ApiOperation({ summary: "Validate if user can purchase flash sale book" })
  validateQuota(@Body() dto: ValidateQuotaDto) {
    return this.flashSales.validateUserQuota(dto);
  }

  @Post("reserve")
  @ApiOperation({ summary: "Reserve flash sale quota & stock" })
  reserve(
    @Headers("x-internal-service-key") serviceKey: string,
    @Body() dto: ReserveFlashSaleDto,
  ) {
    this.assertInternalRequest(serviceKey);
    return this.flashSales.reserveQuotaAndStock(dto);
  }

  @Post("release-order")
  @ApiOperation({ summary: "Release Flash Sale reservations for an order" })
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
  hasReservations(
    @Headers("x-internal-service-key") serviceKey: string,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    this.assertInternalRequest(serviceKey);
    return this.flashSales.hasOrderReservations(orderId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get flash sale by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.flashSales.findOne(id);
  }

  @Post("items")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Add item to flash sale" })
  addItem(@Body() dto: CreateFlashSaleItemDto) {
    return this.flashSales.addItem(dto);
  }

  @Post(":id/items")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Add item to specific flash sale" })
  addItemToSlot(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateFlashSaleItemDto, "flashSaleId">,
  ) {
    return this.flashSales.addItem({ ...dto, flashSaleId: id });
  }

  @Patch(":id/status")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Update flash sale status" })
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlashSaleStatusDto,
  ) {
    return this.flashSales.updateStatus(id, dto.status);
  }

  @Patch("items/:itemId/stock")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Update flash sale item stock" })
  updateStock(
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body("stock") stock: number,
  ) {
    return this.flashSales.updateItemStock(itemId, stock);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("PLATFORM_ADMIN")
  @ApiOperation({ summary: "Delete flash sale" })
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.flashSales.delete(id);
  }

  private assertInternalRequest(serviceKey?: string) {
    const expected =
      this.config.get<string>("INTERNAL_SERVICE_KEY") ||
      "huki-local-internal-service";
    if (!serviceKey || serviceKey !== expected) {
      throw new ForbiddenException("Internal service credentials are required");
    }
  }
}
