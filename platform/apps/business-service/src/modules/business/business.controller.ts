import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public, CurrentUser } from '@huki/shared/decorators';

@ApiTags('Business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new business' })
  async registerBusiness(
    @Body() dto: CreateBusinessDto,
    @CurrentUser('id') userId: string,
  ) {
    const business = await this.businessService.registerBusiness(userId, dto);
    return {
      message: 'Đăng ký doanh nghiệp thành công',
      data: business,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user business' })
  async getMyBusiness(@CurrentUser('id') userId: string) {
    const business = await this.businessService.getBusinessByOwner(userId);
    return { data: business };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get business by ID' })
  async getBusiness(@Param('id') id: string) {
    const business = await this.businessService.getBusinessById(id);
    return { data: business };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all businesses (public)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllBusinesses(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.businessService.getAllBusinesses({
      status: status as any,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business' })
  async updateBusiness(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const business = await this.businessService.updateBusiness(id, userId, dto);
    return {
      message: 'Cập nhật doanh nghiệp thành công',
      data: business,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Approve business' })
  async approveBusiness(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const business = await this.businessService.approveBusiness(id, adminId);
    return {
      message: business.status === 'APPROVED'
        ? 'Duyệt doanh nghiệp thành công'
        : 'Từ chối doanh nghiệp',
      data: business,
    };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Reject business' })
  async rejectBusiness(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    const business = await this.businessService.rejectBusiness(id, adminId, reason);
    return {
      message: 'Từ chối doanh nghiệp',
      data: business,
    };
  }
}
