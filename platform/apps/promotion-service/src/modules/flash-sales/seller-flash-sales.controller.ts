/**
 * HUKI EBOOK - Seller Flash Sales Controller
 *
 * Handles Flash Sale registration and management for Sellers
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { FlashSalesService } from "./flash-sales.service";
import {
  SellerRegisterFlashSaleItemDto,
  SellerBatchRegisterFlashSaleItemsDto,
  SellerUpdateFlashSaleItemDto,
} from "./dto/flash-sale.dto";
import { BusinessRolesGuard } from "../../common/business-roles.guard";
import { CurrentBusiness } from "../../common/current-business.decorator";

@ApiTags("Seller - Flash Sales")
@ApiBearerAuth()
@UseGuards(BusinessRolesGuard)
@Controller("flash-sales/seller")
export class SellerFlashSalesController {
  constructor(private readonly flashSales: FlashSalesService) {}

  @Get("slots")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get available Flash Sale slots for registration",
    description: "Returns open and upcoming flash sale time slots",
  })
  @ApiResponse({ status: 200, description: "List of available flash sale slots" })
  async getAvailableSlots() {
    const slots = await this.flashSales.getSellerAvailableSlots();
    return { data: slots };
  }

  @Post("slots")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a custom Flash Sale slot for Seller",
    description: "Allows seller to create their own custom Flash Sale time window",
  })
  @ApiResponse({ status: 201, description: "Custom Flash Sale slot created successfully" })
  async createSlot(
    @CurrentBusiness() business: any,
    @Body() dto: any,
  ) {
    const created = await this.flashSales.create(dto);
    return { data: created, success: true, message: "Tạo khung giờ Flash Sale thành công" };
  }

  @Get("my-items")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get seller's registered flash sale items",
    description: "Returns all flash sale items belonging to the seller's business",
  })
  @ApiResponse({ status: 200, description: "List of seller's registered flash sale items" })
  async getMyItems(@CurrentBusiness() business: any) {
    const items = await this.flashSales.getSellerFlashSaleItems(business.id);
    return { data: items };
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a book for a flash sale slot",
    description: "Registers a shop's book for an upcoming flash sale session with discount price and stock quota",
  })
  @ApiResponse({ status: 201, description: "Book successfully registered for flash sale" })
  async registerItem(
    @CurrentBusiness() business: any,
    @Body() dto: SellerRegisterFlashSaleItemDto,
  ) {
    const result = await this.flashSales.sellerRegisterItem(business.id, dto);
    return { data: result, success: true, message: "Đăng ký tham gia Flash Sale thành công" };
  }

  @Post("register-batch")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register multiple books in batch for a flash sale slot",
    description: "Registers multiple books in a single batch request",
  })
  @ApiResponse({ status: 201, description: "Batch registration result" })
  async registerBatch(
    @CurrentBusiness() business: any,
    @Body() dto: SellerBatchRegisterFlashSaleItemsDto,
  ) {
    const result = await this.flashSales.sellerRegisterBatch(business.id, dto);
    return { data: result, success: true, message: `Đã đăng ký thành công ${result.registeredCount} sản phẩm vào Flash Sale` };
  }

  @Put("items/:itemId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update a registered flash sale item (price, stock quota, max per user)",
    description: "Updates details of a flash sale item before or during scheduled sessions",
  })
  @ApiParam({ name: "itemId", description: "Flash Sale Item ID" })
  @ApiResponse({ status: 200, description: "Flash sale item updated successfully" })
  async updateItem(
    @CurrentBusiness() business: any,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: SellerUpdateFlashSaleItemDto,
  ) {
    return this.flashSales.sellerUpdateItem(business.id, itemId, dto);
  }

  @Delete("items/:itemId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel/remove a book registration from a scheduled flash sale",
    description: "Removes a book from a scheduled flash sale before the sale begins",
  })
  @ApiParam({ name: "itemId", description: "Flash Sale Item ID" })
  @ApiResponse({ status: 200, description: "Flash sale item cancelled successfully" })
  async cancelItem(
    @CurrentBusiness() business: any,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.flashSales.sellerCancelItem(business.id, itemId);
  }

  @Delete("slots/:slotId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete a flash sale slot",
    description: "Removes a flash sale slot and all registered items",
  })
  @ApiParam({ name: "slotId", description: "Flash Sale Slot ID" })
  @ApiResponse({ status: 200, description: "Flash sale slot deleted successfully" })
  async deleteSlot(
    @Param("slotId", ParseUUIDPipe) slotId: string,
  ) {
    return this.flashSales.delete(slotId);
  }
}
