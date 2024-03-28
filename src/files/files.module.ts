import { Module } from '@nestjs/common';
import { FilesAzureService } from './files.azure.service';

@Module({
  providers: [FilesAzureService],
  exports: [FilesAzureService],
})
export class FilesModule {}
