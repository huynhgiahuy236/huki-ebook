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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor, PlatformAdminGuard } from '../../common/book-auth.guard';
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
@ApiBearerAuth('JWT-auth')
export class SanctionsController {
  constructor(
    private readonly sanctionsService: SanctionsService,
    private readonly appealsService: AppealsService,
  ) {}

  @Post()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Admin issues a sanction to a store' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Sanction created successfully.' })
  @ApiStandardErrors(400, 401, 403, 409)
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
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Admin gets paginated list of appeals (queue)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated appeal records.' })
  @ApiStandardErrors(401, 403)
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
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of sanctions for the store.' })
  @ApiStandardErrors(401, 404)
  async getSanctionsByStore(@Param('storeId') storeId: string) {
    return this.sanctionsService.getSanctionsByStore(storeId);
  }

  @Get('store/:storeId/active')
  @ApiOperation({ summary: 'Get current effectively active sanction for a store' })
  @ApiSuccessResponse(undefined, { description: 'Active sanction or null.' })
  @ApiStandardErrors(401, 404)
  async getActiveSanctionByStore(@Param('storeId') storeId: string) {
    return this.sanctionsService.findActiveSanction(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sanction by ID' })
  @ApiSuccessResponse(undefined, { description: 'Sanction details.' })
  @ApiStandardErrors(401, 404)
  async getSanctionById(@Param('id') id: string) {
    return this.sanctionsService.getSanctionById(id);
  }

  @Post(':id/lift')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Admin manually lifts an active sanction' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Sanction lifted successfully.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
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
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiSuccessResponse(undefined, { status: 201, description: 'Evidence uploaded successfully.' })
  @ApiStandardErrors(400, 401, 403, 404)
  async uploadEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.appealsService.uploadAppealEvidence(actor.sub, id, file);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Store owner submits an appeal for a sanction (within 7 days)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Appeal submitted successfully.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  async submitAppeal(
    @Param('id') id: string,
    @Body() dto: CreateAppealDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.appealsService.submitAppeal(id, actor.sub, dto);
  }

  @Get(':id/appeal')
  @ApiOperation({ summary: 'Get appeal details for a sanction' })
  @ApiSuccessResponse(undefined, { description: 'Appeal details.' })
  @ApiStandardErrors(401, 404)
  async getAppealBySanctionId(@Param('id') id: string) {
    return this.appealsService.getAppealBySanctionId(id);
  }

  @Post('appeals/:appealId/review')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Admin reviews an appeal (APPROVED or REJECTED)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Appeal reviewed successfully.' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
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
