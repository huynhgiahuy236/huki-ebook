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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { BookUploadsService, PdfFileKind } from './book-uploads.service';

@ApiTags('Book Uploads')
@ApiBearerAuth('JWT-auth')
@UseGuards(BookWriteGuard)
@Controller('books/:bookId')
export class BookUploadsController {
  constructor(private readonly uploadsService: BookUploadsService) {}

  @Post('cover')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { cover: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('cover', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a cover image to Cloudinary' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Cover uploaded' })
  @ApiStandardErrors(400, 401, 403, 404)
  async cover(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Cover uploaded', data: await this.uploadsService.uploadCover(bookId, file, actor) };
  }

  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload the private source PDF to Cloudflare R2' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Source PDF uploaded' })
  @ApiStandardErrors(400, 401, 403, 404)
  async source(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Source PDF uploaded', data: await this.uploadsService.uploadPdf(bookId, PdfFileKind.SOURCE, file, actor) };
  }

  @Post('preview')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a private preview PDF to Cloudflare R2' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Preview PDF uploaded' })
  @ApiStandardErrors(400, 401, 403, 404)
  async preview(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    return { message: 'Preview PDF uploaded', data: await this.uploadsService.uploadPdf(bookId, PdfFileKind.PREVIEW, file, actor) };
  }
}
