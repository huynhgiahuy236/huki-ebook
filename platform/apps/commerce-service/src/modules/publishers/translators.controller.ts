import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { PublishersService } from './publishers.service';

export class CreateTranslatorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

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
  findAll(@Query() query: PageQueryDto) {
    return this.publishersService.findAllTranslators(query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Find or create a translator by name' })
  async create(@Body() dto: CreateTranslatorDto) {
    const translator = await this.publishersService.findOrCreateTranslator(dto.name, dto.bio);
    return { message: 'Translator ready', data: translator };
  }
}
