import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { DrmVaultService, GetDrmLicensesQuery } from './drm-vault.service';

@ApiTags('Admin DRM Vault')
@Controller('admin/drm')
export class DrmVaultController {
  constructor(private readonly drmVaultService: DrmVaultService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Lấy số liệu thống kê tổng quan của kho khóa bảo mật DRM Vault' })
  async getOverview() {
    const data = await this.drmVaultService.getOverview();
    return { success: true, data };
  }

  @Get('licenses')
  @ApiOperation({ summary: 'Lấy danh sách các giấy phép DRM có tìm kiếm, phân trang và bộ lọc' })
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
  async rotateKey(
    @Param('id') id: string,
  ) {
    const data = await this.drmVaultService.rotateKey(id);
    return { success: true, message: 'Luân chuyển khóa bảo mật thành công', data };
  }

  @Post('integrity-scan')
  @ApiOperation({ summary: 'Kích hoạt quét toàn vẹn bản quyền (Integrity Scan) trên toàn bộ kho' })
  async scanIntegrity() {
    const data = await this.drmVaultService.scanIntegrity();
    return { success: true, message: 'Quét toàn vẹn hoàn tất', data };
  }

  @Post('licenses/:id/session')
  @ApiOperation({ summary: 'Bắt đầu phiên đọc sách và ghi nhận thiết bị độc giả' })
  async startSession(
    @Param('id') id: string,
    @Body() payload: { userId?: string; deviceId?: string; deviceName?: string; ipAddress?: string },
  ) {
    const data = await this.drmVaultService.startSession(id, payload);
    return { success: true, data };
  }

  @Post('licenses/:id/session-leave')
  @ApiOperation({ summary: 'Kết thúc phiên đọc sách và giải phóng session DRM' })
  async endSession(@Param('id') id: string) {
    const data = await this.drmVaultService.endSession(id);
    return { success: true, data };
  }
}
