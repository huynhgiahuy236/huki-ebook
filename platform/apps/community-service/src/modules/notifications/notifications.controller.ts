/**
 * HUKI EBOOK - Notifications Controller
 *
 * Handles user notifications and settings
 */

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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
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
  @ApiOperation({
    summary: "List user's notifications",
    description: "Returns a paginated list of user notifications.",
  })
  @ApiResponse({ status: 200, description: "Paginated notifications" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  list(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notifications.list(actor, query);
  }

  @Post("read-all")
  @ApiOperation({
    summary: "Mark all notifications as read",
    description: "Marks all notifications as read for the current user.",
  })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  readAll(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.markAllRead(actor);
  }

  @Delete("clear-all")
  @ApiOperation({
    summary: "Clear all notifications",
    description: "Deletes all notifications for the current user.",
  })
  @ApiResponse({ status: 200, description: "All notifications cleared" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  clear(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.clear(actor);
  }

  @Get("settings")
  @ApiOperation({
    summary: "Get notification settings",
    description: "Returns the user's notification preferences.",
  })
  @ApiResponse({ status: 200, description: "Notification settings" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  settings(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.settings(actor);
  }

  @Patch("settings")
  @ApiOperation({
    summary: "Update notification settings",
    description: "Updates the user's notification preferences.",
  })
  @ApiResponse({ status: 200, description: "Settings updated" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  updateSettings(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notifications.updateSettings(actor, dto);
  }

  @Post("device")
  @ApiOperation({
    summary: "Register notification device",
    description: "Registers a device for push notifications.",
  })
  @ApiResponse({ status: 201, description: "Device registered" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  registerDevice(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: RegisterNotificationDeviceDto,
  ) {
    return this.notifications.registerDevice(actor, dto);
  }

  @Delete("device/:token")
  @ApiOperation({
    summary: "Unregister notification device",
    description: "Removes a device from push notifications.",
  })
  @ApiParam({ name: "token", description: "Device FCM token" })
  @ApiResponse({ status: 200, description: "Device unregistered" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  unregisterDevice(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param("token") token: string,
  ) {
    return this.notifications.unregisterDevice(actor, token);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get notification details",
    description: "Returns details of a specific notification.",
  })
  @ApiParam({ name: "id", description: "Notification ID" })
  @ApiResponse({ status: 200, description: "Notification details" })
  @ApiNotFoundResponse({ description: "Notification not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  detail(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.detail(actor, id);
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Mark notification as read",
    description: "Marks a specific notification as read.",
  })
  @ApiParam({ name: "id", description: "Notification ID" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiNotFoundResponse({ description: "Notification not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  read(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.markRead(actor, id);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a notification",
    description: "Deletes a specific notification.",
  })
  @ApiParam({ name: "id", description: "Notification ID" })
  @ApiResponse({ status: 200, description: "Notification deleted" })
  @ApiNotFoundResponse({ description: "Notification not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.remove(actor, id);
  }
}
