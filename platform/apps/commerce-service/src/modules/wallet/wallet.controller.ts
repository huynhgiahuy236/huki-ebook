import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import {
  BookActor,
  OptionalBookAuthGuard,
  AuthenticatedGuard,
} from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { WalletService } from './wallet.service';
import { WalletSecurityService } from './wallet-security.service';
import {
  PaginatedWalletTransactionsDto,
  WalletResponseDto,
  WalletTransactionQueryDto,
} from './dto/wallet.dto';
import {
  ChangePinDto,
  PinVerificationResultDto,
  SetupPinDto,
  TwoFactorChallengeDto,
  TwoFactorChallengeResultDto,
  TwoFactorVerifyDto,
  TwoFactorVerifyResultDto,
  VerifyPinDto,
  WalletSecurityStatusDto,
} from './dto/wallet-security.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletSecurityService: WalletSecurityService,
  ) {}

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get buyer personal wallet balance' })
  @ApiSuccessResponse(undefined, { description: 'Personal wallet balance' })
  @ApiStandardErrors(401)
  async getMyWallet(@CurrentBookActor() actor: BookActor) {
    const data = await this.walletService.getMyWallet(actor.sub);
    return { success: true, data };
  }

  @Post('me/topup')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Top up coins to buyer personal wallet' })
  @ApiBody({ schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', example: 50000 } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Topup successful' })
  @ApiStandardErrors(400, 401)
  async topupMyWallet(
    @CurrentBookActor() actor: BookActor,
    @Body() body: { amount: number },
  ) {
    const data = await this.walletService.topupMyWallet(actor.sub, body.amount);
    return { success: true, message: 'Nạp Xu thành công', data };
  }

  @Get('me/transactions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get buyer personal wallet transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Personal wallet transactions' })
  @ApiStandardErrors(401)
  async getMyTransactions(
    @CurrentBookActor() actor: BookActor,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getMyTransactions(
      actor.sub,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
    return { success: true, ...result };
  }

  @Get('admin/transactions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get global wallet transaction history across all stores (Platform Admin)',
    description: 'Enforces Admin privileges and returns paginated operational balance changes with atomic before/after balances.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Global wallet transactions' })
  @ApiStandardErrors(401, 403)
  async getAdminTransactions(
    @CurrentBookActor() actor: BookActor,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('storeId') storeId?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required');
    }
    const result = await this.walletService.getAdminTransactions({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      storeId,
      type: type as any,
      dateFrom,
      dateTo,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Get('store/:storeId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({
    summary: 'Get 3-Tier Wallet Balance for a store (Available, Pending, Frozen)',
    description: 'Enforces WAL-001 invariant and tenant isolation. Accessible only by Store Owner or Admin.',
  })
  @ApiSuccessResponse(WalletResponseDto, { description: 'Returns 3-tier wallet balance details' })
  @ApiStandardErrors(401, 403, 404)
  async getWallet(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    return this.walletService.getWallet(storeId, actor);
  }

  @Get('store/:storeId/transactions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(OptionalBookAuthGuard)
  @ApiOperation({
    summary: 'Get operational wallet transaction history for a store',
    description: 'Returns paginated operational mutation history. Accessible only by Store Owner or Admin.',
  })
  @ApiSuccessResponse(PaginatedWalletTransactionsDto, { description: 'Returns paginated wallet transactions' })
  @ApiStandardErrors(401, 403, 404)
  async getTransactions(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor?: BookActor,
    @Query() query: WalletTransactionQueryDto = {},
  ) {
    return this.walletService.getTransactions(storeId, actor, query);
  }

  // ============================================
  // WALLET SECURITY & 2FA ENDPOINTS (Task 75 / POL-15 SEC-002)
  // ============================================

  @Get('store/:storeId/security/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get wallet security and withdrawal PIN status',
    description: 'Returns whether PIN is set, lock status, and remaining attempts. Tenant-isolated.',
  })
  @ApiSuccessResponse(WalletSecurityStatusDto, { description: 'Returns security status details' })
  @ApiStandardErrors(401, 403)
  async getSecurityStatus(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.walletSecurityService.getSecurityStatus(storeId, actor);
  }

  @Post('store/:storeId/security/pin/setup')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Setup initial 6-digit withdrawal PIN for store wallet',
    description: 'Stores bcrypt-hashed PIN. Accessible only once by authorized store owner.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'PIN setup successful' })
  @ApiStandardErrors(400, 401, 403, 409)
  async setupPin(
    @Param('storeId') storeId: string,
    @Body() dto: SetupPinDto,
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    dto.storeId = storeId;
    return this.walletSecurityService.setupPin(dto, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('store/:storeId/security/pin/verify')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Verify 6-digit withdrawal PIN',
    description: 'Checks PIN against bcrypt hash with 5-attempt 24-hour lockout. Returns step-1 token.',
  })
  @ApiSuccessResponse(PinVerificationResultDto, { status: 201, description: 'PIN verification result' })
  @ApiStandardErrors(400, 401, 403, 429)
  async verifyPin(
    @Param('storeId') storeId: string,
    @Body() dto: VerifyPinDto,
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    dto.storeId = storeId;
    return this.walletSecurityService.verifyPin(dto, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('store/:storeId/security/pin/change')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Change withdrawal PIN (Requires current PIN + 2FA token)',
    description: 'Replaces PIN hash with 2FA token authorization.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'PIN changed successfully' })
  @ApiStandardErrors(400, 401, 403)
  async changePin(
    @Param('storeId') storeId: string,
    @Body() dto: ChangePinDto,
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    dto.storeId = storeId;
    return this.walletSecurityService.changePin(dto, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('store/:storeId/security/2fa/challenge')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Issue step-up 2FA OTP challenge for financial operations',
    description: 'Dispatches 6-digit OTP to user email with 5-minute TTL.',
  })
  @ApiSuccessResponse(TwoFactorChallengeResultDto, { status: 201, description: 'Challenge issued successfully' })
  @ApiStandardErrors(400, 401, 403, 429)
  async issueTwoFactorChallenge(
    @Param('storeId') storeId: string,
    @Body() dto: TwoFactorChallengeDto,
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    dto.storeId = storeId;
    return this.walletSecurityService.issueTwoFactorChallenge(dto, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('store/:storeId/security/2fa/verify')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Verify 2FA OTP and obtain short-lived Finance Authorization Token',
    description: 'Consumes OTP once and generates replay-protected finance authorization token (5-min TTL).',
  })
  @ApiSuccessResponse(TwoFactorVerifyResultDto, { status: 201, description: '2FA verified successfully' })
  @ApiStandardErrors(400, 401, 403)
  async verifyTwoFactorChallenge(
    @Param('storeId') storeId: string,
    @Body() dto: TwoFactorVerifyDto,
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    dto.storeId = storeId;
    return this.walletSecurityService.verifyTwoFactorChallenge(dto, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('store/:storeId/withdraw-all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Withdraw entire available balance using 6-digit PIN',
    description: 'Verifies 6-digit PIN with 5-attempt limit and 3-minute lock, zeroes out available balance upon success.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pin'],
      properties: {
        pin: { type: 'string', example: '123456' },
        bankSnapshot: { type: 'object' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Withdrawal completed successfully' })
  @ApiStandardErrors(400, 401, 403, 409)
  async withdrawAll(
    @Param('storeId') storeId: string,
    @Body() dto: { pin: string; bankSnapshot?: any },
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    return this.walletSecurityService.withdrawAllDirectly(
      storeId,
      dto.pin,
      actor,
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
      dto.bankSnapshot,
    );
  }
}

