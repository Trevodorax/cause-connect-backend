import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Association } from './associations.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/users.entity';

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

@Injectable()
export class AssociationsService {
  constructor(
    @InjectRepository(Association)
    private associationRepository: Repository<Association>,
    private userService: UsersService,
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
    const result = await this.associationRepository.insert(association);
    const associationId = result.generatedMaps[0].id;
    return this.associationRepository.findOneBy({ id: associationId });
  }

  async findById(id: string): Promise<Association | null> {
    return this.associationRepository.findOneBy({ id });
  }
}
