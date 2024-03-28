import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesAzureService } from 'src/files/files.azure.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesAzureService,
  ) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: Express.Multer.File) {
    if (file === undefined) {
      throw new BadRequestException('No file uploaded');
    }
    const upload = await this.filesService.uploadFile(file);
    this.documentsService.saveUrl(upload);
    return { upload, message: 'uploaded successfully' };
  }
}
