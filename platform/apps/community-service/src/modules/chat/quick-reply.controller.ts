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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthenticatedCommunityGuard, CommunityActor } from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import { QuickReplyService } from "./quick-reply.service";
import { CreateQuickReplyDto, UpdateQuickReplyDto } from "./dto/quick-reply.dto";

@ApiTags("Chat Quick Replies")
@ApiBearerAuth()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
@Controller("chat/quick-replies")
export class QuickReplyController {
  constructor(private readonly quickReplies: QuickReplyService) {}

  @Get()
  @ApiOperation({ summary: "Get list of quick replies for a store (cached via Redis)" })
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
  async create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateQuickReplyDto,
  ) {
    const created = await this.quickReplies.create(dto);
    return { message: "Tạo tin nhắn nhanh thành công", data: created };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an existing quick reply template" })
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
  async delete(
    @Param("id") id: string,
    @Query("storeId") storeId: string,
  ) {
    await this.quickReplies.delete(id, storeId);
    return { message: "Xóa tin nhắn nhanh thành công" };
  }

  @Patch(":id/use")
  @ApiOperation({ summary: "Increment usage count for a quick reply template" })
  async incrementUsage(
    @Param("id") id: string,
    @Query("storeId") storeId: string,
  ) {
    await this.quickReplies.incrementUsage(id, storeId);
    return { success: true };
  }
}
