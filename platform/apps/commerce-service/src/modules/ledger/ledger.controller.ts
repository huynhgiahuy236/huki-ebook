import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List double-entry ledger transactions with entries',
    description: 'Enforces tenant isolation and immutable audit trail. Accessible by Platform Admin or Store Owner.',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get double-entry ledger transaction by ID with full entry lines',
    description: 'Enforces tenant isolation and immutable audit trail. Accessible by Store Owner or Platform Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns double-entry ledger transaction details and entries',
  })
  async getTransaction(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.ledgerService.getTransactionById(id, actor);
  }

  @Get('summaries')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List accounting running balance summaries',
    description: 'Platform Admin can list all accounts; merchants view store-scoped account summaries.',
  })
  @ApiQuery({ name: 'storeId', required: false, description: 'Optional store filter (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of account summaries with total debits, credits, and net balance',
  })
  async getAccountSummaries(
    @CurrentBookActor() actor: BookActor,
    @Query('storeId') storeId?: string,
  ) {
    return this.ledgerService.listAccountSummaries(actor, storeId);
  }
}
