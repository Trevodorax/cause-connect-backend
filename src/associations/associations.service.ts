import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Association } from './associations.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/users.entity';
import { FilesAzureService } from 'src/files/files.azure.service';

interface NewAssociationDto {
  name: string;
  logo?: string;
  description: string;
}

interface NewAssociationWithAdminDto {
  admin: {
    email: string;
    fullName: string;
  };
  association: NewAssociationDto;
}

interface PartialAssociationDto {
  name?: string;
  logo?: string;
  description?: string;
}

@Injectable()
export class AssociationsService {
  constructor(
    @InjectRepository(Association)
    private associationRepository: Repository<Association>,
    private userService: UsersService,
    private filesService: FilesAzureService,
  ) {}

  async createAssociationWithAdmin(
    dto: NewAssociationWithAdminDto,
  ): Promise<Association> {
    const { admin, association } = dto;

    const createdAssociation = await this.createAssociation(association);

    if (!createdAssociation) {
      throw new InternalServerErrorException('Failed to create association');
    }

    const newAdmin = await this.userService.createUser({
      associationId: createdAssociation.id,
      email: admin.email,
      fullName: admin.fullName,
      role: UserRole.ADMIN,
    });
    if (!newAdmin) {
      throw new InternalServerErrorException('Failed to create admin');
    }

    return createdAssociation;
  }

  async createAssociation(
    association: NewAssociationDto,
  ): Promise<Association | null> {
    const existingAssociation = await this.associationRepository.findOneBy({
      name: association.name,
    });
    if (existingAssociation) {
      throw new ConflictException(
        'An association with this name already exists',
      );
    }
    const result = await this.associationRepository.insert(association);
    const associationId = result.generatedMaps[0].id;
    return this.associationRepository.findOneBy({ id: associationId });
  }

  async findById(id: string): Promise<Association | null> {
    return this.associationRepository.findOneBy({ id });
  }

  async getAllAssociations(): Promise<Association[]> {
    return this.associationRepository.find();
  }

  async deleteAssociation(id: string): Promise<Association> {
    const association = await this.associationRepository.findOneBy({ id });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    await this.associationRepository.delete(id);

    return association;
  }

  async getAssociation(id: string): Promise<Association> {
    const association = await this.associationRepository.findOneBy({ id });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    return association;
  }

  async updateAssociation(
    id: string,
    association: PartialAssociationDto,
  ): Promise<Association> {
    // check association exists
    const existingAssociation = await this.associationRepository.findOneBy({
      id,
    });
    if (!existingAssociation) {
      throw new NotFoundException('Association not found');
    }

    const result = await this.associationRepository.update(id, association);
    if (!result.affected) {
      throw new InternalServerErrorException('Failed to update association');
    }

    const modifiedAssociation = await this.associationRepository.findOneBy({
      id,
    });

    if (!modifiedAssociation) {
      throw new InternalServerErrorException(
        'Failed to find modified association',
      );
    }

    return modifiedAssociation;
  }

  async updateAssociationLogo(
    file: Express.Multer.File,
    associationId: string,
  ) {
    const url = await this.filesService.uploadFile(file);

    this.associationRepository.update({ id: associationId }, { logo: url });

    return url;
  }
}
