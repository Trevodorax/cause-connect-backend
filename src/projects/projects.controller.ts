import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { z } from 'zod';
import { TaskStatus } from 'src/tasks/tasks.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { Roles } from 'src/auth/rules.decorator';
import { TaskResponse } from 'src/tasks/tasks.controller';

const NewProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

const PartialProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

const NewTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]),
  deadline: z.coerce.date(),
});

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}
  @Roles(UserRole.ADMIN)
  @Post()
  async createProject(
    body: z.infer<typeof NewProjectSchema>,
    @GetUser() user: User,
  ): Promise<ProjectResponse> {
    const validBody = NewProjectSchema.parse(body);
    const project = await this.projectsService.createProject({
      name: validBody.name,
      description: validBody.description,
      startTime: validBody.startTime,
      endTime: validBody.endTime,
      associationId: user.association.id,
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startTime: project.startTime,
      endTime: project.endTime,
    };
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get()
  async getProjects(@GetUser() user: User): Promise<ProjectResponse[]> {
    const projects = await this.projectsService.getProjectsForAssociation(
      user.association.id,
    );

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      startTime: project.startTime,
      endTime: project.endTime,
    }));
  }

  @Get('me')
  async getMyProjects(@GetUser() user: User): Promise<ProjectResponse[]> {
    const projects = await this.projectsService.getUserProjects(user.id);

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      startTime: project.startTime,
      endTime: project.endTime,
    }));
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get(':id')
  async getProjectById(
    @Param('projectId') projectId: string,
    @GetUser() user: User,
  ): Promise<ProjectResponse> {
    const project = await this.projectsService.getProjectById(
      projectId,
      user.association.id,
    );

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startTime: project.startTime,
      endTime: project.endTime,
    };
  }

  // delete project by id
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteProject(
    id: string,
    @GetUser() user: User,
  ): Promise<ProjectResponse> {
    const deletedProject = await this.projectsService.deleteProject(
      id,
      user.association.id,
    );

    return {
      id: deletedProject.id,
      name: deletedProject.name,
      description: deletedProject.description,
      startTime: deletedProject.startTime,
      endTime: deletedProject.endTime,
    };
  }

  // update project by id
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateProject(
    @Param('projectId') projectId: string,
    body: z.infer<typeof PartialProjectSchema>,
    @GetUser() user: User,
  ): Promise<ProjectResponse> {
    const validBody = PartialProjectSchema.parse(body);
    const updatedProject = await this.projectsService.updateProject(
      projectId,
      validBody,
      user.association.id,
    );

    return {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      startTime: updatedProject.startTime,
      endTime: updatedProject.endTime,
    };
  }

  // get all tasks for project
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get(':projectId/tasks')
  async getTasksForProject(
    @Param('projectId') projectId: string,
    @GetUser() user: User,
  ): Promise<TaskResponse[]> {
    const tasks = await this.projectsService.getTasksForProject(
      projectId,
      user.association.id,
    );

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      responsibleUser: task.user,
    }));
  }

  // add a task to a project
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Post(':projectId/tasks')
  async addTaskToProject(
    @Param('projectId') id: string,
    body: z.infer<typeof NewTaskSchema>,
    @GetUser() user: User,
  ): Promise<TaskResponse> {
    const validBody = NewTaskSchema.parse(body);
    const task = await this.projectsService.addTaskToProject(
      {
        title: validBody.title,
        description: validBody.description,
        status: validBody.status,
        deadline: validBody.deadline,
        projectId: id,
      },
      user.association.id,
    );

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      responsibleUser: task.user,
    };
  }

  // get all my tasks for a project
  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get(':projectId/tasks/me')
  async getMyTasksForProject(
    @Param('projectId') projectId: string,
    @GetUser() user: User,
  ): Promise<TaskResponse[]> {
    const tasks = await this.projectsService.getTasksForUserInProject(
      projectId,
      user.id,
      user.association.id,
    );

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      deadline: task.deadline,
      responsibleUser: task.user,
    }));
  }
}
