import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventCollector } from '../services/EventCollector';
import { CreateEventDto, CreateBatchEventsDto } from '../dto/events.dto';
import { CurrentUser, Public, ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventCollector: EventCollector) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Collect client telemetry event' })
  @ApiSuccessResponse(undefined, { description: 'Event accepted' })
  @ApiStandardErrors(400)
  async collectEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser('id') authUserId?: string,
  ) {
    const result = await this.eventCollector.collectEvent(dto, authUserId);
    return {
      message: 'Event processed',
      data: result,
    };
  }

  @Post('batch')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Collect batch of client telemetry events (max 50)' })
  @ApiSuccessResponse(undefined, { description: 'Batch events accepted' })
  @ApiStandardErrors(400)
  async collectBatch(
    @Body() dto: CreateBatchEventsDto,
    @CurrentUser('id') authUserId?: string,
  ) {
    const result = await this.eventCollector.collectBatch(dto.events, authUserId);
    return {
      message: 'Batch events processed',
      data: result,
    };
  }
}
