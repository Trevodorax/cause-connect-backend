import { Module } from '@nestjs/common';
import { AssociationsService } from './associations.service';
import { AssociationsController } from './associations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Association } from './associations.entity';
import { UsersModule } from 'src/users/users.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Association]), UsersModule, FilesModule],
  controllers: [AssociationsController],
  providers: [AssociationsService],
  exports: [AssociationsService],
})
export class AssociationsModule {}
