import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
} from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import {
  NotificationIdParamDto,
  NotificationListQueryDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferenceDto,
} from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(AuthenticatedCommunityGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List user's notifications" })
  list(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notifications.list(actor, query);
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  readAll(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.markAllRead(actor);
  }

  @Delete("clear-all")
  @ApiOperation({ summary: "Clear all notifications" })
  clear(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.clear(actor);
  }

  @Get("settings")
  @ApiOperation({ summary: "Get notification settings" })
  settings(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.settings(actor);
  }

  @Patch("settings")
  @ApiOperation({ summary: "Update notification settings" })
  updateSettings(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notifications.updateSettings(actor, dto);
  }

  @Post("device")
  @ApiOperation({ summary: "Register notification device" })
  registerDevice(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: RegisterNotificationDeviceDto,
  ) {
    return this.notifications.registerDevice(actor, dto);
  }

  @Delete("device/:token")
  @ApiOperation({ summary: "Unregister notification device" })
  unregisterDevice(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param("token") token: string,
  ) {
    return this.notifications.unregisterDevice(actor, token);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get notification details" })
  detail(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.detail(actor, id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  read(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.markRead(actor, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification" })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.remove(actor, id);
  }
}
