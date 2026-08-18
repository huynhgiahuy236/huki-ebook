import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BookUploadsService, PdfFileKind } from './book-uploads.service';

@ApiTags('Book Uploads')
@ApiBearerAuth()
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class BookUploadsController {
  constructor(private readonly uploadsService: BookUploadsService) {}

  @Post('cover')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('cover', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a cover image to Cloudinary' })
  async cover(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Cover uploaded', data: await this.uploadsService.uploadCover(bookId, file, actor) };
  }

  @Post('file')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload the private source PDF to Cloudflare R2' })
  async source(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Source PDF uploaded', data: await this.uploadsService.uploadPdf(bookId, PdfFileKind.SOURCE, file, actor) };
  }

  @Post('preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a private preview PDF to Cloudflare R2' })
  async preview(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Preview PDF uploaded', data: await this.uploadsService.uploadPdf(bookId, PdfFileKind.PREVIEW, file, actor) };
  }
}
