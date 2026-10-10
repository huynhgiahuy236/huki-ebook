import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiAudioService } from './ai-audio.service';
import { CreateAiAudioPlanDto, UpdateAiAudioPlanDto } from './dto/ai-audio-plan.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';

@ApiTags('AI Audio')
@Controller('ai-audio')
export class AiAudioController {
  constructor(private readonly aiAudioService: AiAudioService) {}

  // ==========================================
  // PLANS
  // ==========================================
  @Get('plans')
  @ApiOperation({ summary: 'Lấy danh sách các gói cước AI Voice từ Database' })
  async getPlans() {
    return { data: await this.aiAudioService.getPlans() };
  }

  @Post('plans')
  @ApiOperation({ summary: 'Tạo gói cước AI Voice mới' })
  async createPlan(@Body() dto: CreateAiAudioPlanDto) {
    return { message: 'Đã tạo gói cước mới thành công', data: await this.aiAudioService.createPlan(dto) };
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin gói cước AI Voice' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdateAiAudioPlanDto) {
    return { message: 'Đã cập nhật gói cước thành công', data: await this.aiAudioService.updatePlan(id, dto) };
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Xóa gói cước AI Voice' })
  async deletePlan(@Param('id') id: string) {
    return await this.aiAudioService.deletePlan(id);
  }

  @Patch('plans/:id/toggle')
  @ApiOperation({ summary: 'Bật/tắt trạng thái hoạt động của gói cước' })
  async togglePlan(@Param('id') id: string) {
    return { message: 'Đã thay đổi trạng thái gói cước', data: await this.aiAudioService.togglePlanStatus(id) };
  }

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================
  @Get('subscriptions')
  @ApiOperation({ summary: 'Lấy danh sách sách đã kích hoạt AI Voice từ Database' })
  async getSubscriptions() {
    return { data: await this.aiAudioService.getSubscriptions() };
  }

  @Get('subscriptions/check/:bookId')
  @ApiOperation({ summary: 'Kiểm tra sách có quyền AI Voice còn hạn không' })
  async checkBookActive(@Param('bookId') bookId: string) {
    return { data: await this.aiAudioService.isBookAiAudioActive(bookId) };
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Seller đăng ký gói giọng đọc AI cho cuốn Ebook' })
  async registerSubscription(@Body() dto: RegisterSubscriptionDto) {
    const result = await this.aiAudioService.registerBookSubscription(dto);
    return { message: 'Đăng ký gói AI Voice cho Ebook thành công', data: result };
  }

  // ==========================================
  // TRANSACTIONS & SUMMARY
  // ==========================================
  @Get('transactions')
  @ApiOperation({ summary: 'Lấy lịch sử dòng tiền đăng ký AI chảy về Admin' })
  async getTransactions() {
    return { data: await this.aiAudioService.getTransactions() };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Thống kê tổng quan tài chính và hoạt động AI' })
  async getSummary() {
    return { data: await this.aiAudioService.getFinancialSummary() };
  }
}
