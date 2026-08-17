import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../libs/shared/src/decorators/current-user.decorator';
import { SessionService } from './session.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions' })
  async getSessions(@CurrentUser('id') userId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);
    return { data: sessions };
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const result = await this.sessionService.revokeSession(userId, sessionId);
    return result;
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  async revokeAllSessions(
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.sessionService.revokeAllSessions(userId);
    return result;
  }
}
