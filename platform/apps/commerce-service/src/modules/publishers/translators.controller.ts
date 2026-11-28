import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { PublishersService } from './publishers.service';

export class CreateTranslatorDto {
  @ApiProperty({ example: 'Nguyễn Bích Lan', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Dịch giả văn học', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;
}

@ApiTags('Translators')
@Controller('translators')
export class TranslatorsController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'List translators (Dịch giả)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated translators list' })
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAllTranslators(query);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Find or create a translator by name' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Translator ready' })
  @ApiStandardErrors(400, 401)
  async create(@Body() dto: CreateTranslatorDto) {
    const translator = await this.publishersService.findOrCreateTranslator(dto.name, dto.bio);
    return { message: 'Translator ready', data: translator };
  }
}
