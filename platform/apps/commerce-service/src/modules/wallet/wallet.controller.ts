import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import {
  BookActor,
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

  @Get('store/:storeId')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get 3-Tier Wallet Balance for a store (Available, Pending, Frozen)',
    description: 'Enforces WAL-001 invariant and tenant isolation. Accessible only by Store Owner or Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns 3-tier wallet balance details',
    type: WalletResponseDto,
  })
  async getWallet(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.walletService.getWallet(storeId, actor);
  }

  @Get('store/:storeId/transactions')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get operational wallet transaction history for a store',
    description: 'Returns paginated operational mutation history. Accessible only by Store Owner or Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated wallet transactions',
    type: PaginatedWalletTransactionsDto,
  })
  async getTransactions(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor: BookActor,
    @Query() query: WalletTransactionQueryDto,
  ) {
    return this.walletService.getTransactions(storeId, actor, query);
  }

  // ============================================
  // WALLET SECURITY & 2FA ENDPOINTS (Task 75 / POL-15 SEC-002)
  // ============================================

  @Get('store/:storeId/security/status')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get wallet security and withdrawal PIN status',
    description: 'Returns whether PIN is set, lock status, and remaining attempts. Tenant-isolated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns security status details',
    type: WalletSecurityStatusDto,
  })
  async getSecurityStatus(
    @Param('storeId') storeId: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.walletSecurityService.getSecurityStatus(storeId, actor);
  }

  @Post('store/:storeId/security/pin/setup')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Setup initial 6-digit withdrawal PIN for store wallet',
    description: 'Stores bcrypt-hashed PIN. Accessible only once by authorized store owner.',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN setup successful',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Verify 6-digit withdrawal PIN',
    description: 'Checks PIN against bcrypt hash with 5-attempt 24-hour lockout. Returns step-1 token.',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN verification result',
    type: PinVerificationResultDto,
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Change withdrawal PIN (Requires current PIN + 2FA token)',
    description: 'Replaces PIN hash with 2FA token authorization.',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN changed successfully',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Issue step-up 2FA OTP challenge for financial operations',
    description: 'Dispatches 6-digit OTP to user email with 5-minute TTL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge issued successfully',
    type: TwoFactorChallengeResultDto,
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Verify 2FA OTP and obtain short-lived Finance Authorization Token',
    description: 'Consumes OTP once and generates replay-protected finance authorization token (5-min TTL).',
  })
  @ApiResponse({
    status: 200,
    description: '2FA verified successfully',
    type: TwoFactorVerifyResultDto,
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Withdraw entire available balance using 6-digit PIN',
    description: 'Verifies 6-digit PIN with 5-attempt limit and 3-minute lock, zeroes out available balance upon success.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal completed successfully',
  })
  async withdrawAll(
    @Param('storeId') storeId: string,
    @Body() dto: { pin: string },
    @CurrentBookActor() actor: BookActor,
    @Req() req: any,
  ) {
    return this.walletSecurityService.withdrawAllDirectly(storeId, dto.pin, actor, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }
}

