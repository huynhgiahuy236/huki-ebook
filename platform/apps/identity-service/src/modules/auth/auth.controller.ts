import { Throttle } from '@nestjs/throttler';
/**
 * HUKI EBOOK - Auth Controller
 *
 * Handles user authentication, registration, and token management
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  GoogleLoginDto,
} from './dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account. Requires email verification.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Registration successful' })
  @ApiStandardErrors(400, 409, 429)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { data: result };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies user email using token from verification email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'verification-token' },
        email: { type: 'string', example: 'user@huki.com' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Email verified successfully' })
  @ApiStandardErrors(400, 404)
  async verifyEmail(@Body('token') token: string, @Body('email') email?: string) {
    const result = await this.authService.verifyEmail(token, email);
    return { data: result };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Sends a new verification email to the user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@huki.com' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Verification email sent if account exists' })
  @ApiStandardErrors(400)
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendVerification(email);
    return { message: 'Verification email sent' };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const clearOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };
    res.clearCookie('refreshToken', clearOpts);
    res.clearCookie('huki_refresh_token', clearOpts);
  }

  private extractRefreshToken(req: Request, dto?: RefreshTokenDto): string | undefined {
    if (dto?.refreshToken) return dto.refreshToken;
    const cookies = (req as any).cookies;
    if (cookies?.refreshToken) return cookies.refreshToken;
    if (cookies?.huki_refresh_token) return cookies.huki_refresh_token;

    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return undefined;
    const match = cookieHeader.match(/(?:^|;\s*)(?:refreshToken|huki_refresh_token)=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with credentials',
    description: 'Authenticates user with email and password. Requires verified email.',
  })
  @ApiSuccessResponse(undefined, { description: 'Login successful', messageExample: 'Đăng nhập thành công' })
  @ApiStandardErrors(400, 401, 429)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip;
    const result = await this.authService.login(dto, userAgent, ipAddress);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }
    return {
      message: 'Đăng nhập thành công',
      data: result,
    };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with Google OAuth ID Token',
    description: 'Authenticates or creates a user account via verified Google OAuth credential.',
  })
  @ApiSuccessResponse(undefined, { description: 'Google login successful' })
  @ApiStandardErrors(400, 401)
  async loginWithGoogle(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip;
    const result = await this.authService.loginWithGoogle(dto, userAgent, ipAddress);
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }
    return {
      message: 'Đăng nhập Google thành công',
      data: result,
    };
  }

  @Get('google/client-id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Google OAuth Client ID for frontend integration',
    description: 'Returns the public Google Client ID configured on the backend.',
  })
  @ApiSuccessResponse(undefined, { description: 'Google Client ID returned' })
  getGoogleClientId() {
    return {
      data: {
        clientId: this.authService.getGoogleClientId(),
      },
    };
  }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth2 Callback URL (Server-side redirect flow)',
    description: 'Handles OAuth2 redirect from Google and sets session tokens.',
  })
  @ApiQuery({ name: 'code', required: true, description: 'OAuth authorization code from Google' })
  @ApiSuccessResponse(undefined, { status: 302, description: 'Redirects to frontend login page with token or error' })
  async googleCallback(
    @Query('code') code: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const frontendBase =
      process.env.FRONTEND_URL ||
      process.env.WEB_URL ||
      req.get('origin') ||
      'http://localhost:3100';

    if (!code) {
      return res.redirect(`${frontendBase}/auth/login?error=missing_code`);
    }
    try {
      const clientId =
        process.env.GOOGLE_CLIENT_ID || this.authService.getGoogleClientId();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const callbackUrl =
        process.env.GOOGLE_CALLBACK_URL ||
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/google/callback`;

      const client = new OAuth2Client(clientId, clientSecret, callbackUrl);
      const { tokens } = await client.getToken(code);

      if (tokens.access_token) {
        const userAgent = req.get('user-agent');
        const ipAddress = req.ip;
        const result = await this.authService.loginWithGoogle(
          { accessToken: tokens.access_token },
          userAgent,
          ipAddress,
        );

        if (result?.refreshToken) {
          this.setRefreshTokenCookie(res, result.refreshToken);
        }

        return res.redirect(
          `${frontendBase}/auth/login?token=${result.accessToken}`,
        );
      }
      return res.redirect(`${frontendBase}/auth/login?error=auth_failed`);
    } catch (err: any) {
      return res.redirect(
        `${frontendBase}/auth/login?error=${encodeURIComponent(
          err?.message || 'google_auth_failed',
        )}`,
      );
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from current device',
    description: 'Revokes the refresh token and logs out from current device.',
  })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOi...' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Logout successful', messageExample: 'Đăng xuất thành công' })
  @ApiStandardErrors(401)
  async logout(
    @Body('refreshToken') bodyRefreshToken: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = bodyRefreshToken || this.extractRefreshToken(req);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearRefreshTokenCookie(res);
    return { message: 'Đăng xuất thành công' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout from all devices',
    description: 'Revokes all refresh tokens and logs out from all devices.',
  })
  @ApiSuccessResponse(undefined, { description: 'Logged out from all devices', messageExample: 'Đăng xuất khỏi tất cả thiết bị' })
  @ApiStandardErrors(401)
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId);
    return { message: 'Đăng xuất khỏi tất cả thiết bị' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Issues a new access token using a valid refresh token.',
  })
  @ApiSuccessResponse(undefined, { description: 'Token refreshed' })
  @ApiStandardErrors(400, 401)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(req, dto);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }
    const result = await this.authService.refreshToken({ refreshToken });
    if (result?.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }
    return { data: result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user.',
  })
  @ApiSuccessResponse(undefined, { description: 'Current user profile' })
  @ApiStandardErrors(401)
  async getProfile(@CurrentUser() user: any) {
    return { data: user };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user if the email exists.',
  })
  @ApiSuccessResponse(undefined, { description: 'Reset email sent if account exists' })
  @ApiStandardErrors(400)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Resets the user password using a valid reset token.',
  })
  @ApiSuccessResponse(undefined, { description: 'Password reset successful', messageExample: 'Đặt lại mật khẩu thành công' })
  @ApiStandardErrors(400, 404)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password while logged in',
    description: 'Changes the user password after verifying the current password.',
  })
  @ApiSuccessResponse(undefined, { description: 'Password changed successfully', messageExample: 'Đổi mật khẩu thành công' })
  @ApiStandardErrors(400, 401)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Đổi mật khẩu thành công' };
  }
}
