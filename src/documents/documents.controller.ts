import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesAzureService } from 'src/files/files.azure.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { DocumentVisibility } from './entities/documents.entity';
import { User } from 'src/users/users.entity';
import { z } from 'zod';
import { DocumentPermissionsEnum } from './entities/document-permissions';

const uploadDocumentBodySchema = z.object({
  title: z.string().optional(),
  visibility: z.enum([DocumentVisibility.PUBLIC, DocumentVisibility.PRIVATE]),
});

interface DocumentResponse {
  id: string;
  title: string;
  fileUrl: string;
  visibility: DocumentVisibility;
  permissions: DocumentPermissionsEnum[];
}

const generateShareCodeBodySchema = z.object({
  permissions: z.array(
    z.enum([DocumentPermissionsEnum.EDIT, DocumentPermissionsEnum.READ]),
  ),
});

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesAzureService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
    @Body()
    body: z.infer<typeof uploadDocumentBodySchema>,
  ): Promise<DocumentResponse> {
    if (file === undefined) {
      throw new BadRequestException('No file uploaded');
    }
    const validatedBody = uploadDocumentBodySchema.parse(body);

    const url = await this.filesService.uploadFile(file);
    const document = await this.documentsService.saveDocument(
      {
        title: validatedBody.title ?? file.originalname,
        fileUrl: url,
        visibility: validatedBody.visibility,
      },
      user.id,
    );

    return {
      id: document.document.id,
      title: document.document.title,
      fileUrl: document.document.fileUrl,
      visibility: document.document.visibility,
      permissions: document.permissions,
    };
  }

  @Post(':documentId/generate-share-code')
  async generateShareCode(
    @Param('documentId') documentId: string,
    @GetUser() user: User,
    @Body()
    body: z.infer<typeof generateShareCodeBodySchema>,
  ): Promise<{ shareCode: string }> {
    const validatedBody = generateShareCodeBodySchema.parse(body);

    const shareCode = await this.documentsService.generateShareCode({
      documentId,
      sharerUserId: user.id,
      permissions: validatedBody.permissions,
    });

    return shareCode;
  }

  @Post(':documentId/use-share-code')
  async useShareCode(
    @Param('documentId') documentId: string,
    @Body('shareCode') shareCode: string,
    @GetUser() user: User,
  ): Promise<DocumentResponse> {
    const { document, permissions } = await this.documentsService.useShareCode({
      documentId,
      shareCode,
      userId: user.id,
    });

    return {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      visibility: document.visibility,
      permissions,
    };
  }

  @Get('me')
  async getMyDocuments(@GetUser() user: User): Promise<DocumentResponse[]> {
    const documents = await this.documentsService.getAllDocumentsForUser(
      user.id,
    );

    return documents.map((document) => ({
      id: document.document.id,
      title: document.document.title,
      fileUrl: document.document.fileUrl,
      visibility: document.document.visibility,
      permissions: document.permissions,
    }));
  }

  @Get(':documentId')
  async getDocumentById(
    @Param('documentId') documentId: string,
    @GetUser() user: User,
  ): Promise<DocumentResponse> {
    const { document, permissions } =
      await this.documentsService.getDocumentById(documentId, user.id);

    return {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      visibility: document.visibility,
      permissions,
    };
  }

  @Delete(':documentId')
  async deleteDocument(
    @Param('documentId') documentId: string,
    @GetUser() user: User,
  ): Promise<DocumentResponse> {
    const document = await this.documentsService.deleteDocument(
      user.id,
      documentId,
    );

    return {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      visibility: document.visibility,
      permissions: [],
    };
  }
}
