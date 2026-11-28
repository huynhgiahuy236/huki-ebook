import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthenticatedCommunityGuard, CommunityActor } from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import { QuickReplyService } from "./quick-reply.service";
import { CreateQuickReplyDto, UpdateQuickReplyDto } from "./dto/quick-reply.dto";

@ApiTags("Chat Quick Replies")
@ApiBearerAuth("JWT-auth")
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
@Controller("chat/quick-replies")
export class QuickReplyController {
  constructor(private readonly quickReplies: QuickReplyService) {}

  @Get()
  @ApiOperation({ summary: "Get list of quick replies for a store (cached via Redis)" })
  @ApiQuery({ name: "storeId", required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Quick replies list" })
  @ApiStandardErrors(401)
  async list(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query("storeId") storeId?: string,
  ) {
    const effectiveStoreId = storeId?.trim() || actor.sub;
    const items = await this.quickReplies.list(effectiveStoreId);
    return { data: items };
  }

  @Post()
  @ApiOperation({ summary: "Create a new quick reply template" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Quick reply created" })
  @ApiStandardErrors(400, 401)
  async create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateQuickReplyDto,
  ) {
    const created = await this.quickReplies.create(dto);
    return { message: "Tạo tin nhắn nhanh thành công", data: created };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an existing quick reply template" })
  @ApiQuery({ name: "storeId", required: true, type: String })
  @ApiSuccessResponse(undefined, { description: "Quick reply updated" })
  @ApiStandardErrors(400, 401, 404)
  async update(
    @Param("id") id: string,
    @Query("storeId") storeId: string,
    @Body() dto: UpdateQuickReplyDto,
  ) {
    const updated = await this.quickReplies.update(id, storeId, dto);
    return { message: "Cập nhật tin nhắn nhanh thành công", data: updated };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a quick reply template" })
  @ApiQuery({ name: "storeId", required: true, type: String })
  @ApiSuccessResponse(undefined, { description: "Quick reply deleted" })
  @ApiStandardErrors(401, 404)
  async delete(
    @Param("id") id: string,
    @Query("storeId") storeId: string,
  ) {
    await this.quickReplies.delete(id, storeId);
    return { message: "Xóa tin nhắn nhanh thành công" };
  }

  @Patch(":id/use")
  @ApiOperation({ summary: "Increment usage count for a quick reply template" })
  @ApiQuery({ name: "storeId", required: true, type: String })
  @ApiSuccessResponse(undefined, { description: "Usage count incremented" })
  @ApiStandardErrors(401, 404)
  async incrementUsage(
    @Param("id") id: string,
    @Query("storeId") storeId: string,
  ) {
    await this.quickReplies.incrementUsage(id, storeId);
    return { success: true };
  }
}
