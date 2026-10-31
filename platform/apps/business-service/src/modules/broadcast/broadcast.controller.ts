import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto, UpdateBroadcastActionDto } from './broadcast.dto';
import { Public } from '@huki/shared/decorators';

@ApiTags('Broadcast Notifications')
@Controller(['broadcast-notifications', 'admin/broadcast-notifications'])
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all broadcast notifications' })
  async getNotifications(@Query('businessId') businessId?: string) {
    const list = await this.broadcastService.findAll(businessId);
    return { success: true, data: list };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single broadcast notification by ID' })
  async getNotification(@Param('id') id: string) {
    const notif = await this.broadcastService.findOne(id);
    return { success: true, data: notif };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new broadcast notification' })
  async createNotification(
    @Body() dto: CreateBroadcastDto,
    @Req() req: any,
  ) {
    const authorName = req.user?.fullName || 'Ban Quản Trị HUKI';
    const result = await this.broadcastService.create(dto, authorName);
    return { success: true, data: result.notif, list: result.list };
  }

  @Public()
  @Put()
  @ApiOperation({ summary: 'Perform an action on a notification (MARK_READ, etc.)' })
  async handleAction(@Body() dto: UpdateBroadcastActionDto) {
    const result = await this.broadcastService.handleAction(dto);
    return { success: true, list: result.list };
  }

  @Public()
  @Delete(':id?')
  @ApiOperation({ summary: 'Delete a notification by ID (via path param or query string)' })
  async deleteNotification(
    @Param('id') pathId?: string,
    @Query('id') queryId?: string,
  ) {
    const id = pathId || queryId;
    if (!id) {
      return { success: false, message: 'Missing notification id' };
    }
    const result = await this.broadcastService.delete(id);
    return { success: true, list: result.list };
  }
}

