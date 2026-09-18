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
