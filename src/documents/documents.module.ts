import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/documents.entity';
import { FilesModule } from 'src/files/files.module';
import { DocumentAccess } from './entities/document-access.entity';
import { DocumentPermission } from './entities/document-permissions';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentAccess, DocumentPermission]),
    FilesModule,
    UsersModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
