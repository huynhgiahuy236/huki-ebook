import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { ForensicTrackingService } from './forensic-tracking.service';
import {
  DecodeWatermarkDto,
  InvestigatePiracyDto,
  UpdateEvidenceStatusDto,
} from './dto/forensic.dto';
import { ForensicStatus } from '../../../prisma/generated/client';

@ApiTags('Forensic DRM Tracking')
@Controller('forensics')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard)
export class ForensicTrackingController {
  constructor(
    private readonly forensicService: ForensicTrackingService,
  ) {}

  @Post('decode')
  @ApiOperation({ summary: 'Decode raw forensic watermark text into structured metadata' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Watermark decoded' })
  @ApiStandardErrors(400, 401)
  decodeWatermark(@Body() dto: DecodeWatermarkDto) {
    const data = this.forensicService.decodeWatermark(dto);
    return { data };
  }

  @Post('investigate')
  @ApiOperation({ summary: 'Submit reported piracy incident, correlate watermark with database and create evidence record' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Forensic investigation created' })
  @ApiStandardErrors(400, 401, 404)
  async investigatePiracy(
    @Body() dto: InvestigatePiracyDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.forensicService.investigatePiracy(actor.sub, dto);
    return { message: 'Forensic investigation created successfully', data };
  }

  @Get('evidence')
  @ApiOperation({ summary: 'List all forensic piracy evidence records' })
  @ApiQuery({ name: 'status', required: false, enum: ForensicStatus })
  @ApiQuery({ name: 'bookId', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Forensic evidence records' })
  @ApiStandardErrors(401)
  async listEvidence(
    @Query('status') status?: ForensicStatus,
    @Query('bookId') bookId?: string,
  ) {
    const data = await this.forensicService.listEvidence(status, bookId);
    return { data };
  }

  @Get('evidence/:id')
  @ApiOperation({ summary: 'Get details of a specific forensic evidence record' })
  @ApiSuccessResponse(undefined, { description: 'Forensic evidence detail' })
  @ApiStandardErrors(401, 404)
  async getEvidence(@Param('id') id: string) {
    const data = await this.forensicService.getEvidence(id);
    return { data };
  }

  @Patch('evidence/:id/status')
  @ApiOperation({ summary: 'Update status of forensic evidence and optionally sanction/revoke access' })
  @ApiSuccessResponse(undefined, { description: 'Evidence status updated' })
  @ApiStandardErrors(400, 401, 404)
  async updateEvidenceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEvidenceStatusDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.forensicService.updateEvidenceStatus(
      actor.sub,
      id,
      dto,
    );
    return { message: 'Evidence status updated successfully', data };
  }
}
