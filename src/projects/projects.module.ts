import { forwardRef, Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './projects.entity';
import { AssociationsModule } from 'src/associations/associations.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { Task } from 'src/tasks/tasks.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Task]),
    AssociationsModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
