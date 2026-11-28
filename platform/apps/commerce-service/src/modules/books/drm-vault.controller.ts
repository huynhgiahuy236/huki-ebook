import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { DrmVaultService, GetDrmLicensesQuery } from './drm-vault.service';

@ApiTags('Admin DRM Vault')
@Controller('admin/drm')
export class DrmVaultController {
  constructor(private readonly drmVaultService: DrmVaultService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Lấy số liệu thống kê tổng quan của kho khóa bảo mật DRM Vault' })
  @ApiSuccessResponse(undefined, { description: 'DRM Vault overview stats' })
  async getOverview() {
    const data = await this.drmVaultService.getOverview();
    return { success: true, data };
  }

  @Get('licenses')
  @ApiOperation({ summary: 'Lấy danh sách các giấy phép DRM có tìm kiếm, phân trang và bộ lọc' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated DRM licenses' })
  async getLicenses(@Query() query: GetDrmLicensesQuery) {
    const result = await this.drmVaultService.getLicenses(query);
    return {
      success: true,
      items: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Post('licenses/:id/rotate')
  @ApiOperation({ summary: 'Thực hiện luân chuyển khóa mã hóa (Rotate Key) cho một cuốn sách' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Key rotated' })
  @ApiStandardErrors(404)
  async rotateKey(
    @Param('id') id: string,
  ) {
    const data = await this.drmVaultService.rotateKey(id);
    return { success: true, message: 'Luân chuyển khóa bảo mật thành công', data };
  }

  @Post('integrity-scan')
  @ApiOperation({ summary: 'Kích hoạt quét toàn vẹn bản quyền (Integrity Scan) trên toàn bộ kho' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Integrity scan completed' })
  async scanIntegrity() {
    const data = await this.drmVaultService.scanIntegrity();
    return { success: true, message: 'Quét toàn vẹn hoàn tất', data };
  }

  @Post('licenses/:id/session')
  @ApiOperation({ summary: 'Bắt đầu phiên đọc sách và ghi nhận thiết bị độc giả' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        deviceId: { type: 'string' },
        deviceName: { type: 'string' },
        ipAddress: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'DRM session started' })
  @ApiStandardErrors(400, 404)
  async startSession(
    @Param('id') id: string,
    @Body() payload: { userId?: string; deviceId?: string; deviceName?: string; ipAddress?: string },
  ) {
    const data = await this.drmVaultService.startSession(id, payload);
    return { success: true, data };
  }

  @Post('licenses/:id/session-leave')
  @ApiOperation({ summary: 'Kết thúc phiên đọc sách và giải phóng session DRM' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'DRM session ended' })
  @ApiStandardErrors(404)
  async endSession(@Param('id') id: string) {
    const data = await this.drmVaultService.endSession(id);
    return { success: true, data };
  }

  @Post('licenses/:id/revoke')
  @ApiOperation({ summary: 'Thu hồi giấy phép DRM từ xa chống đọc lậu (Kill-Switch)' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'License revoked' })
  @ApiStandardErrors(404)
  async revokeLicense(
    @Param('id') id: string,
    @Body() payload: { reason?: string },
  ) {
    const data = await this.drmVaultService.revokeLicense(id, payload?.reason);
    return { success: true, message: 'Đã thu hồi giấy phép DRM thành công', data };
  }

  @Post('licenses/:id/restore')
  @ApiOperation({ summary: 'Khôi phục giấy phép DRM hợp lệ' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'License restored' })
  @ApiStandardErrors(404)
  async restoreLicense(@Param('id') id: string) {
    const data = await this.drmVaultService.restoreLicense(id);
    return { success: true, message: 'Đã khôi phục giấy phép DRM thành công', data };
  }

  @Get('my-devices')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Lấy danh sách thiết bị đọc DRM của độc giả' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'User DRM devices' })
  @ApiStandardErrors(401)
  async getMyDevices(@CurrentBookActor() actor: BookActor) {
    const data = await this.drmVaultService.getUserDevices(actor.sub);
    return { success: true, data };
  }

  @Post('my-devices/:deviceId/revoke')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Thu hồi quyền truy cập DRM của một thiết bị' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Device DRM access revoked' })
  @ApiStandardErrors(401, 404)
  async revokeMyDevice(
    @CurrentBookActor() actor: BookActor,
    @Param('deviceId') deviceId: string,
  ) {
    await this.drmVaultService.revokeUserDevice(actor.sub, deviceId);
    return { success: true, message: 'Đã thu hồi bản quyền DRM trên thiết bị thành công' };
  }
}
