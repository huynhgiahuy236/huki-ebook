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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
export class ForensicTrackingController {
  constructor(
    private readonly forensicService: ForensicTrackingService,
  ) {}

  @Post('decode')
  @ApiOperation({ summary: 'Decode raw forensic watermark text into structured metadata' })
  decodeWatermark(@Body() dto: DecodeWatermarkDto) {
    const data = this.forensicService.decodeWatermark(dto);
    return { data };
  }

  @Post('investigate')
  @ApiOperation({ summary: 'Submit reported piracy incident, correlate watermark with database and create evidence record' })
  async investigatePiracy(
    @Body() dto: InvestigatePiracyDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const data = await this.forensicService.investigatePiracy(actor.sub, dto);
    return { message: 'Forensic investigation created successfully', data };
  }

  @Get('evidence')
  @ApiOperation({ summary: 'List all forensic piracy evidence records' })
  async listEvidence(
    @Query('status') status?: ForensicStatus,
    @Query('bookId') bookId?: string,
  ) {
    const data = await this.forensicService.listEvidence(status, bookId);
    return { data };
  }

  @Get('evidence/:id')
  @ApiOperation({ summary: 'Get details of a specific forensic evidence record' })
  async getEvidence(@Param('id') id: string) {
    const data = await this.forensicService.getEvidence(id);
    return { data };
  }

  @Patch('evidence/:id/status')
  @ApiOperation({ summary: 'Update status of forensic evidence and optionally sanction/revoke access' })
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
