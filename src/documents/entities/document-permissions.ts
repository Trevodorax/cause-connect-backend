import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentAccess } from './document-access.entity';
import { Document } from './documents.entity';

export enum DocumentPermissionsEnum {
  READ = 'read',
  EDIT = 'edit',
}

@Entity()
export class DocumentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: DocumentPermissionsEnum })
  permission: DocumentPermissionsEnum;

  @ManyToOne(
    () => DocumentAccess,
    (documentAccess) => documentAccess.permissions,
    { onDelete: 'CASCADE' },
  )
  documentAccess: DocumentAccess;

  @ManyToOne(() => Document, (document) => document.shareCodePermissions, {
    onDelete: 'CASCADE',
  })
  sharedDocument: Document;
}
