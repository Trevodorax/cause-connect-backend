import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Task, TaskStatus } from './tasks.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from 'src/projects/projects.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/users.entity';

export interface NewTaskDto {
  title: string;
  description: string;
  status: TaskStatus;
  deadline: Date;

  projectId: string;
}

interface PartialTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  deadline?: Date;
  projectId?: string;
  responsibleUserId?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    private usersService: UsersService,
  ) {}

  // create task
  async createTask(dto: NewTaskDto, userAssociationId: string): Promise<Task> {
    const project = await this.projectsService.getProjectById(
      dto.projectId,
      userAssociationId,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const result = await this.tasksRepository.insert({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      deadline: dto.deadline,
      project: project,
    });
    const taskId = result.generatedMaps[0].id;

    const createdTask = await this.tasksRepository.findOne({
      where: { id: taskId },
    });
    if (!createdTask) {
      throw new InternalServerErrorException('Could not create task');
    }

    return createdTask;
  }

  // get task by id
  async getTaskById(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['user', 'project'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  // delete task by id
  async deleteTaskById(id: string): Promise<Task> {
    const task = await this.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.tasksRepository.delete(task.id);

    return task;
  }

  // update task by id
  async updateTaskById(
    id: string,
    dto: PartialTaskDto,
    userAssociationId: string,
  ): Promise<Task> {
    const task = await this.getTaskById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (dto.projectId) {
      const project = await this.projectsService.getProjectById(
        dto.projectId,
        userAssociationId,
      );
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      task.project = project;
    }

    if (dto.responsibleUserId) {
      const user = await this.usersService.findOneById(dto.responsibleUserId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      task.user = user;
    }

    if (dto.title) {
      task.title = dto.title;
    }

    if (dto.description) {
      task.description = dto.description;
    }

    if (dto.status) {
      task.status = dto.status;
    }

    if (dto.deadline) {
      task.deadline = dto.deadline;
    }

    if (dto.responsibleUserId) {
      this.assignUserToTask({ userId: dto.responsibleUserId, taskId: id });
    }

    await this.tasksRepository.save(task);

    return task;
  }

  async assignUserToTask(dto: {
    userId: string;
    taskId: string;
  }): Promise<Task> {
    const task = await this.getTaskById(dto.taskId);

    task.user = { id: dto.userId } as User;

    this.tasksRepository.save(task);

    return task;
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'project'],
    });
  }
}
