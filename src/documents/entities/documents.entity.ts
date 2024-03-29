import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentAccess } from './document-access.entity';
import { DocumentPermission } from './document-permissions';

export enum DocumentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
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
    { cascade: true },
  )
  shareCodePermissions: DocumentPermission[];

  @UpdateDateColumn()
  lastUpdateTime: Date;

  @Column()
  visibility: DocumentVisibility;

  @OneToMany(() => DocumentAccess, (documentAccess) => documentAccess.document)
  documentAccesses: DocumentAccess[];
}
