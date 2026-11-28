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
  HttpCode,
  HttpStatus,
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
} from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
} from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import {
  DispatchNotificationDto,
  NotificationIdParamDto,
  NotificationListQueryDto,
  NotificationUnreadCountQueryDto,
  NotificationReadAllDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferenceDto,
} from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";
import {
  NotificationWatchdogService,
  WatchdogScanInput,
} from "./notification-watchdog.service";
import { throwForbidden, ErrorCode } from "@huki/shared/errors";

@ApiTags("Notifications")
@ApiBearerAuth("JWT-auth")
@UseGuards(AuthenticatedCommunityGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly watchdog: NotificationWatchdogService,
  ) {}

  @Post("watchdog/scan")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Trigger Auto Watchdog anomaly scan",
    description: "Scans for Order SLA violations, shipping delays, low stock, payment risks, and microservice downtime.",
  })
  @ApiSuccessResponse(undefined, { description: "Watchdog scan completed" })
  @ApiStandardErrors(401, 403)
  async scanWatchdog(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() body?: WatchdogScanInput,
  ) {
    const role = (actor.role ?? "").toUpperCase();
    if (role !== "PLATFORM_ADMIN" && role !== "ADMIN") {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Chỉ Quản trị viên hệ thống (ADMIN) mới có quyền kích hoạt quét Watchdog!",
      );
    }
    const result = await this.watchdog.scanAll(body);
    return {
      success: true,
      message: "Watchdog scan completed successfully",
      data: result,
    };
  }

  @Get()
  @ApiOperation({
    summary: "List user's notifications",
    description: "Returns a paginated list of user notifications.",
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Paginated notifications" })
  @ApiStandardErrors(401)
  list(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notifications.list(actor, query);
  }

  @Get("unread-count")
  @ApiOperation({
    summary: "Get unread notifications count",
    description: "Returns unread notifications count for the authenticated actor.",
  })
  @ApiSuccessResponse(undefined, { description: "Unread count" })
  @ApiStandardErrors(401)
  unreadCount(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: NotificationUnreadCountQueryDto,
  ) {
    return this.notifications.unreadCount(actor, query.recipientType);
  }

  @Post("dispatch")
  @ApiOperation({
    summary: "Dispatch a notification across roles (Any-to-Any or Broadcast)",
    description: "Allows users, sellers, shippers, and admins to dispatch notifications with role-based checks.",
  })
  @ApiSuccessResponse(undefined, { status: 201, description: "Notification dispatched successfully" })
  @ApiStandardErrors(400, 401, 403)
  dispatch(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: DispatchNotificationDto,
  ) {
    return this.notifications.dispatch(actor, dto);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark all notifications as read",
    description: "Marks all notifications as read for the current user.",
  })
  @ApiSuccessResponse(undefined, { description: "All notifications marked as read" })
  @ApiStandardErrors(401)
  readAll(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() body?: NotificationReadAllDto,
    @Query() query?: NotificationReadAllDto,
  ) {
    const recipientType = body?.recipientType || query?.recipientType;
    return this.notifications.markAllRead(actor, recipientType);
  }

  @Delete("clear-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Clear all notifications",
    description: "Deletes all notifications for the current user.",
  })
  @ApiSuccessResponse(undefined, { description: "All notifications cleared" })
  @ApiStandardErrors(401)
  clear(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.clear(actor);
  }

  @Get("settings")
  @ApiOperation({
    summary: "Get notification settings",
    description: "Returns the user's notification preferences.",
  })
  @ApiSuccessResponse(undefined, { description: "Notification settings" })
  @ApiStandardErrors(401)
  settings(@CurrentCommunityActor() actor: CommunityActor) {
    return this.notifications.settings(actor);
  }

  @Patch("settings")
  @ApiOperation({
    summary: "Update notification settings",
    description: "Updates the user's notification preferences.",
  })
  @ApiSuccessResponse(undefined, { description: "Settings updated" })
  @ApiStandardErrors(400, 401)
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
  @ApiSuccessResponse(undefined, { status: 201, description: "Device registered" })
  @ApiStandardErrors(400, 401)
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
  @ApiSuccessResponse(undefined, { description: "Device unregistered" })
  @ApiStandardErrors(401, 404)
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
  @ApiSuccessResponse(undefined, { description: "Notification details" })
  @ApiStandardErrors(401, 404)
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
  @ApiSuccessResponse(undefined, { description: "Notification marked as read" })
  @ApiStandardErrors(401, 404)
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
  @ApiSuccessResponse(undefined, { description: "Notification deleted" })
  @ApiStandardErrors(401, 404)
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: NotificationIdParamDto,
  ) {
    return this.notifications.remove(actor, id);
  }
}
