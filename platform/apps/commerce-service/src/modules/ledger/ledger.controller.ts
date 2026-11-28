import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import {
  BookActor,
  AuthenticatedGuard,
} from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { LedgerService } from './ledger.service';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('transactions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List double-entry ledger transactions with entries',
    description: 'Enforces tenant isolation and immutable audit trail. Accessible by Platform Admin or Store Owner.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'referenceType', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Ledger transactions list' })
  @ApiStandardErrors(401, 403)
  async listTransactions(
    @CurrentBookActor() actor: BookActor,
    @Query('storeId') storeId?: string,
    @Query('referenceType') referenceType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.listTransactions(actor, {
      storeId,
      referenceType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('transactions/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get double-entry ledger transaction by ID with full entry lines',
    description: 'Enforces tenant isolation and immutable audit trail. Accessible by Store Owner or Platform Admin.',
  })
  @ApiSuccessResponse(undefined, { description: 'Ledger transaction detail' })
  @ApiStandardErrors(401, 403, 404)
  async getTransaction(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.ledgerService.getTransactionById(id, actor);
  }

  @Get('summaries')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List accounting running balance summaries',
    description: 'Platform Admin can list all accounts; merchants view store-scoped account summaries.',
  })
  @ApiQuery({ name: 'storeId', required: false, description: 'Optional store filter (Admin only)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Ledger account summaries' })
  @ApiStandardErrors(401, 403)
  async getAccountSummaries(
    @CurrentBookActor() actor: BookActor,
    @Query('storeId') storeId?: string,
  ) {
    return this.ledgerService.listAccountSummaries(actor, storeId);
  }
}
