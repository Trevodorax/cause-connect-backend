import { User } from 'src/users/users.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './documents.entity';
import { DocumentPermission } from './document-permissions';

@Entity()
export class DocumentAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @Column()
  userId: string;

  @OneToMany(
    () => DocumentPermission,
    (permission) => permission.documentAccess,
    { cascade: true },
  )
  permissions: DocumentPermission[];

  @ManyToOne(() => Document, (document) => document.documentAccesses, {
    onDelete: 'CASCADE',
  })
  document: Document;

  @ManyToOne(() => User, (user) => user.documentAccesses)
  user: User;
}
