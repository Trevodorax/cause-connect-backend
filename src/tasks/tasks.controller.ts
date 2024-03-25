import { Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { z } from 'zod';
import { TaskStatus } from './tasks.entity';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';

const PartialTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z
    .enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE])
    .optional(),
  deadline: z.date().optional(),
  projectId: z.string().optional(),
  responsibleUserId: z.string().optional(),
});

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: Date;
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
  // get one task by id
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get(':id')
  async getTaskById(@Param('id') id: string): Promise<TaskResponse> {
    const task = await this.tasksService.getTaskById(id);
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
    };
  }

  // delete task by id
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteTask(@Param('id') id: string): Promise<TaskResponse> {
    const deletedTask = await this.tasksService.deleteTaskById(id);
    return deletedTask;
  }

  // update task by id
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @GetUser() user: User,
    body: z.infer<typeof PartialTaskSchema>,
  ): Promise<TaskResponse> {
    const validBody = PartialTaskSchema.parse(body);
    const task = await this.tasksService.updateTaskById(
      id,
      validBody,
      user.association.id,
    );
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
    };
  }

  // get all tasks assigned to me
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get('me')
  async getMyTasks(@GetUser() user: User): Promise<TaskResponse[]> {
    const tasks = await this.tasksService.getUserTasks(user.id);
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
    }));
  }
}
