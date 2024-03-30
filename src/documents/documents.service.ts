import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Document, DocumentVisibility } from './entities/documents.entity';
import { Repository } from 'typeorm';
import { DocumentAccess } from './entities/document-access.entity';
import {
  DocumentPermission,
  DocumentPermissionsEnum,
} from './entities/document-permissions';
import { v4 as uuid } from 'uuid';
import { UsersService } from 'src/users/users.service';
import { FilesAzureService } from 'src/files/files.azure.service';

/*
export enum DocumentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  fileUrl: string;

  @Column({ default: '' })
  shareCode: string;

  @OneToMany(
    () => DocumentPermission,
    (permission) => permission.sharedDocument,
  )
  shareCodePermissions: DocumentPermission[];

  @UpdateDateColumn()
  lastUpdateTime: Date;

  @Column()
  visibility: DocumentVisibility;

  @OneToMany(() => DocumentAccess, (documentAccess) => documentAccess.document)
  documentAccesses: DocumentAccess[];
}

export enum DocumentPermissionsEnum {
  READ = 'read',
  EDIT = 'edit',
}

@Entity()
export class DocumentPermission {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'simple-enum', enum: DocumentPermissionsEnum })
  permission: DocumentPermissionsEnum;

  @ManyToOne(
    () => DocumentAccess,
    (documentAccess) => documentAccess.permissions,
  )
  documentAccess: DocumentAccess;

  @ManyToOne(() => Document, (document) => document.shareCodePermissions)
  sharedDocument: Document;
}

@Entity()
export class DocumentAccess {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  documentId: string;

  @Column()
  userId: string;

  @OneToMany(
    () => DocumentPermission,
    (permission) => permission.documentAccess,
  )
  permissions: DocumentPermission[];

  @ManyToOne(() => Document, (document) => document.documentAccesses)
  document: Document;

  @ManyToOne(() => User, (user) => user.documentAccesses)
  user: User;
}
*/

interface NewDocumentDto {
  title: string;
  fileUrl: string;
  visibility: DocumentVisibility;
}

interface GenerateShareCodeDto {
  sharerUserId: string;
  documentId: string;
  permissions: DocumentPermissionsEnum[];
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentAccess)
    private readonly documentAccessRepository: Repository<DocumentAccess>,
    @InjectRepository(DocumentPermission)
    private readonly documentPermissionRepository: Repository<DocumentPermission>,
    private readonly usersService: UsersService,
    private readonly filesService: FilesAzureService,
  ) {}
  async saveDocument(
    newDocument: NewDocumentDto,
    creatorId: string,
  ): Promise<{ document: Document; permissions: DocumentPermissionsEnum[] }> {
    const CREATOR_PERMISSIONS = [
      DocumentPermissionsEnum.READ,
      DocumentPermissionsEnum.EDIT,
    ];
    const documentAccess = new DocumentAccess();
    documentAccess.userId = creatorId;

    const document = new Document();
    document.title = newDocument.title;
    document.fileUrl = newDocument.fileUrl;
    document.visibility = newDocument.visibility;

    const savedDocument = await this.documentRepository.save(document);

    await this.assignDocumentToUser(
      savedDocument.id,
      creatorId,
      CREATOR_PERMISSIONS,
    );

    return {
      document: savedDocument,
      permissions: CREATOR_PERMISSIONS,
    };
  }

  async assignDocumentToUser(
    documentId: string,
    userId: string,
    permissions: DocumentPermissionsEnum[],
  ): Promise<void> {
    const documentAccess = new DocumentAccess();
    documentAccess.documentId = documentId;
    documentAccess.userId = userId;

    const documentPermissions = permissions.map((permission) => {
      const documentPermission = new DocumentPermission();
      documentPermission.permission = permission;
      documentPermission.documentAccess = documentAccess;
      return documentPermission;
    });

    documentAccess.permissions = documentPermissions;

    await this.documentAccessRepository.save(documentAccess);
  }

  async generateShareCode(
    dto: GenerateShareCodeDto,
  ): Promise<{ shareCode: string }> {
    // check owner exists and has access to document
    const sharer = await this.usersService.findOneById(dto.sharerUserId);
    const documentAccess = await this.documentAccessRepository.findOne({
      where: { userId: sharer?.id, documentId: dto.documentId },
      relations: ['permissions'],
    });
    if (!documentAccess) {
      throw new UnauthorizedException(
        'You do not have access to this document',
      );
    }

    // check that sharer isn't giving permissions they don't have
    const sharerPermissions = documentAccess.permissions.map(
      (permission) => permission.permission,
    );
    const invalidPermissions = dto.permissions.filter(
      (permission) => !sharerPermissions.includes(permission),
    );
    if (invalidPermissions.length > 0) {
      throw new UnauthorizedException(
        "You cannot give permissions you don't have",
      );
    }

    // check document exists
    const sharedDocument = await this.documentRepository.findOne({
      where: { id: dto.documentId },
    });
    if (!sharedDocument) {
      throw new NotFoundException('Document not found');
    }

    const shareCode = uuid();
    sharedDocument.shareCode = shareCode;
    sharedDocument.shareCodePermissions = dto.permissions.map((permission) => {
      const documentPermission = new DocumentPermission();
      documentPermission.permission = permission;
      documentPermission.sharedDocument = sharedDocument;
      return documentPermission;
    });

    await this.documentRepository.save(sharedDocument);

    return { shareCode };
  }

  // use share code
  async useShareCode({
    shareCode,
    userId,
  }): Promise<{ document: Document; permissions: DocumentPermissionsEnum[] }> {
    const sharedDocument = await this.documentRepository.findOne({
      where: { shareCode },
      relations: ['shareCodePermissions'],
    });
    if (!sharedDocument) {
      throw new NotFoundException('Document not found');
    }

    const existingDocumentAccess = await this.documentAccessRepository.findOne({
      where: { userId, documentId: sharedDocument.id },
      relations: ['permissions'],
    });
    const fallbackDocumentAccess = new DocumentAccess();
    fallbackDocumentAccess.documentId = sharedDocument.id;
    fallbackDocumentAccess.userId = userId;
    fallbackDocumentAccess.permissions = [];

    const documentAccess = existingDocumentAccess ?? fallbackDocumentAccess;

    const newDocumentPermissions = sharedDocument.shareCodePermissions.map(
      (permission) => {
        const documentPermission = new DocumentPermission();
        documentPermission.permission = permission.permission;
        documentPermission.documentAccess = documentAccess;
        return documentPermission;
      },
    );

    documentAccess.permissions = [
      ...documentAccess.permissions,
      ...newDocumentPermissions.filter(
        // remove duplicates
        (permission) =>
          !documentAccess.permissions
            .map((permission) => permission.permission)
            .includes(permission.permission),
      ),
    ];

    await this.documentAccessRepository.save(documentAccess);

    return {
      document: sharedDocument,
      permissions: documentAccess.permissions.map(
        (permission) => permission.permission,
      ),
    };
  }

  // get a document by id (checking user has access)
  async getDocumentById(
    documentId: string,
    userId: string,
  ): Promise<{ document: Document; permissions: DocumentPermissionsEnum[] }> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.visibility === DocumentVisibility.PUBLIC) {
      return { document, permissions: [] };
    }

    const permissions = await this.getUserPermissionsForDocument(
      documentId,
      userId,
    );

    if (!permissions.includes(DocumentPermissionsEnum.READ)) {
      throw new UnauthorizedException(
        "You don't have permission to read this document",
      );
    }

    return { document, permissions };
  }

  async getAllDocumentsForUser(
    userId: string,
  ): Promise<{ document: Document; permissions: DocumentPermissionsEnum[] }[]> {
    const documentAccesses = await this.documentAccessRepository.find({
      where: { userId },
      relations: ['document', 'permissions'],
    });

    const userDocuments = documentAccesses.map((documentAccess) => ({
      document: documentAccess.document,
      permissions: documentAccess.permissions.map(
        (permission) => permission.permission,
      ),
    }));

    const publicDocuments = await this.documentRepository.find({
      where: { visibility: DocumentVisibility.PUBLIC },
    });

    const publicDocumentsWithoutUserDocuments = publicDocuments.filter(
      (publicDocument) =>
        !userDocuments
          .map((document) => document.document.id)
          .includes(publicDocument.id),
    );

    const publicDocumentsWithPermissions =
      publicDocumentsWithoutUserDocuments.map((document) => ({
        document,
        permissions: [],
      }));

    return [...userDocuments, ...publicDocumentsWithPermissions];
  }

  async deleteDocument(userId: string, documentId: string): Promise<Document> {
    await this.usersService.findOneById(userId);
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // check user has permission to delete
    const permissions = await this.getUserPermissionsForDocument(
      documentId,
      userId,
    );
    if (!permissions.includes(DocumentPermissionsEnum.EDIT)) {
      throw new UnauthorizedException(
        'You do not have permission to edit this document',
      );
    }

    // remove file from azure
    const fileName = document.fileUrl.split('/').pop();
    if (!fileName) {
      throw new NotFoundException('File not found');
    }
    await this.filesService.deleteFile(fileName);

    // remove document from db
    await this.documentRepository.remove(document);

    return document;
  }

  private async getUserPermissionsForDocument(
    documentId: string,
    userId: string,
  ): Promise<DocumentPermissionsEnum[]> {
    const documentAccess = await this.documentAccessRepository.findOne({
      where: { userId, documentId },
      relations: ['permissions'],
    });
    if (!documentAccess) {
      throw new UnauthorizedException(
        'You do not have access to this document',
      );
    }

    return documentAccess.permissions.map(
      (permission) => permission.permission,
    );
  }
}
