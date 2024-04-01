import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './projects.entity';
import { Repository } from 'typeorm';
import { AssociationsService } from 'src/associations/associations.service';
import { Task } from 'src/tasks/tasks.entity';
import { NewTaskDto, TasksService } from 'src/tasks/tasks.service';

interface NewProjectDto {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;

  associationId: string;
}

interface PartialProjectDto {
  name?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private associationsService: AssociationsService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
  ) {}
  async createProject(newProject: NewProjectDto): Promise<Project> {
    const association = await this.associationsService.findById(
      newProject.associationId,
    );
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const result = await this.projectsRepository.insert({
      name: newProject.name,
      description: newProject.description,
      startTime: newProject.startTime,
      endTime: newProject.endTime,
      association: association,
    });
    const projectId = result.generatedMaps[0].id;

    const createdProject = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!createdProject) {
      throw new InternalServerErrorException('Could not create project');
    }

    return createdProject;
  }

  async getProjectsForAssociation(associationId: string): Promise<Project[]> {
    const association = this.associationsService.findById(associationId);
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    return this.projectsRepository.find({
      where: { association: { id: associationId } },
    });
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.projectsRepository
      .createQueryBuilder('project')
      .innerJoin('project.association', 'association')
      .innerJoin('association.members', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  async getProjectById(
    projectId: string,
    userAssociationId: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['association'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.association.id !== userAssociationId) {
      throw new UnauthorizedException(
        'You are not in the association this project belongs to.',
      );
    }

    return project;
  }

  async deleteProject(
    projectId: string,
    userAssociationId: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.association.id !== userAssociationId) {
      throw new UnauthorizedException(
        'You are not in the association this project belongs to.',
      );
    }

    const deletedProject = await this.projectsRepository.remove(project);
    return deletedProject;
  }

  async updateProject(
    projectId: string,
    projectUpdate: PartialProjectDto,
    userAssociationId: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.association.id !== userAssociationId) {
      throw new UnauthorizedException(
        'You are not in the association this project belongs to.',
      );
    }

    await this.projectsRepository.update({ id: projectId }, projectUpdate);

    const updatedProject = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!updatedProject) {
      throw new InternalServerErrorException('Could not update project');
    }

    return updatedProject;
  }

  async getTasksForProject(
    projectId: string,
    userAssociationId: string,
  ): Promise<Task[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['tasks'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.association.id !== userAssociationId) {
      throw new UnauthorizedException(
        'You are not in the association this project belongs to.',
      );
    }

    return project.tasks;
  }

  async getTasksForUserInProject(
    projectId: string,
    userId: string,
    userAssociationId: string,
  ): Promise<Task[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['tasks'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.association.id !== userAssociationId) {
      throw new UnauthorizedException(
        'You are not in the association this project belongs to.',
      );
    }

    return project.tasks.filter((task) => task.user.id === userId);
  }

  async addTaskToProject(
    task: NewTaskDto,
    userAssociationId: string,
  ): Promise<Task> {
    const result = await this.tasksService.createTask(
      {
        title: task.title,
        description: task.description,
        status: task.status,
        deadline: task.deadline,
        projectId: task.projectId,
      },
      userAssociationId,
    );
    return result;
  }
}
