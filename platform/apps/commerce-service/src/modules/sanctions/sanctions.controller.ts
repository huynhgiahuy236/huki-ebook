import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { SanctionsService } from './sanctions.service';
import { AppealsService } from './appeals.service';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { LiftSanctionDto } from './dto/lift-sanction.dto';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { ReviewAppealDto } from './dto/review-appeal.dto';
import { QueryAppealsDto } from './dto/query-appeals.dto';

@ApiTags('Sanctions & Compliance (Task 83 & 84 / Phase 09)')
@Controller('sanctions')
@UseGuards(AuthenticatedGuard)
@ApiBearerAuth()
export class SanctionsController {
  constructor(
    private readonly sanctionsService: SanctionsService,
    private readonly appealsService: AppealsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Admin issues a sanction to a store' })
  @ApiResponse({ status: 201, description: 'Sanction created successfully.' })
  @ApiResponse({ status: 409, description: 'Active sanction already exists for this store.' })
  async createSanction(
    @Body() dto: CreateSanctionDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only platform administrators can issue sanctions',
      });
    }
    return this.sanctionsService.createSanction(actor.sub, dto);
  }

  @Get('appeals')
  @ApiOperation({ summary: 'Admin gets paginated list of appeals (queue)' })
  @ApiResponse({ status: 200, description: 'Paginated appeal records.' })
  async getAppeals(
    @Query() query: QueryAppealsDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only platform administrators can view appeal queues',
      });
    }
    return this.appealsService.getAppeals(query);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get all sanctions for a store' })
  @ApiResponse({ status: 200, description: 'List of sanctions for the store.' })
  async getSanctionsByStore(@Param('storeId') storeId: string) {
    return this.sanctionsService.getSanctionsByStore(storeId);
  }

  @Get('store/:storeId/active')
  @ApiOperation({ summary: 'Get current effectively active sanction for a store' })
  @ApiResponse({ status: 200, description: 'Active sanction or null.' })
  async getActiveSanctionByStore(@Param('storeId') storeId: string) {
    return this.sanctionsService.findActiveSanction(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sanction by ID' })
  @ApiResponse({ status: 200, description: 'Sanction details.' })
  @ApiResponse({ status: 404, description: 'Sanction not found.' })
  async getSanctionById(@Param('id') id: string) {
    return this.sanctionsService.getSanctionById(id);
  }

  @Post(':id/lift')
  @ApiOperation({ summary: 'Admin manually lifts an active sanction' })
  @ApiResponse({ status: 200, description: 'Sanction lifted successfully.' })
  async liftSanction(
    @Param('id') id: string,
    @Body() dto: LiftSanctionDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only platform administrators can lift sanctions',
      });
    }
    return this.sanctionsService.liftSanction(id, actor.sub, dto);
  }

  @Post(':id/appeal/evidence')
  @ApiOperation({ summary: 'Store owner uploads persistent evidence file for sanction appeal' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Evidence uploaded successfully.' })
  @ApiResponse({ status: 403, description: 'Caller is not the store owner.' })
  async uploadEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.appealsService.uploadAppealEvidence(actor.sub, id, file);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Store owner submits an appeal for a sanction (within 7 days)' })
  @ApiResponse({ status: 201, description: 'Appeal submitted successfully.' })
  @ApiResponse({ status: 403, description: 'Caller is not the authoritative store owner.' })
  @ApiResponse({ status: 409, description: 'Appeal already exists.' })
  async submitAppeal(
    @Param('id') id: string,
    @Body() dto: CreateAppealDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.appealsService.submitAppeal(id, actor.sub, dto);
  }

  @Get(':id/appeal')
  @ApiOperation({ summary: 'Get appeal details for a sanction' })
  @ApiResponse({ status: 200, description: 'Appeal details.' })
  async getAppealBySanctionId(@Param('id') id: string) {
    return this.appealsService.getAppealBySanctionId(id);
  }

  @Post('appeals/:appealId/review')
  @ApiOperation({ summary: 'Admin reviews an appeal (APPROVED or REJECTED)' })
  @ApiResponse({ status: 200, description: 'Appeal reviewed successfully.' })
  async reviewAppeal(
    @Param('appealId') appealId: string,
    @Body() dto: ReviewAppealDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only platform administrators can review appeals',
      });
    }
    return this.appealsService.reviewAppeal(appealId, actor.sub, dto);
  }
}
