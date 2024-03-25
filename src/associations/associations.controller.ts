import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { AssociationsService } from './associations.service';
import { z } from 'zod';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/rules.decorator';
import { UserRole } from 'src/users/users.entity';

const CreateAssociationSchema = z.object({
  admin: z.object({
    email: z.string().email(),
    fullName: z.string(),
  }),
  association: z.object({
    name: z.string(),
    logo: z.string().optional(),
    description: z.string(),
  }),
});

interface AssociationResponse {
  id: string;
  name: string;
  logo: string;
  description: string;
}

const UpdateAssociationSchema = z.object({
  name: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
});

@Controller('associations')
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Public()
  @Post()
  async createAssociation(
    @Body() body: z.infer<typeof CreateAssociationSchema>,
  ): Promise<AssociationResponse> {
    const validDto = CreateAssociationSchema.parse(body);
    return this.associationsService.createAssociationWithAdmin(validDto);
  }

  @Public()
  @Get()
  async getAllAssociations(): Promise<AssociationResponse[]> {
    return this.associationsService.getAllAssociations();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteAssociation(id: string): Promise<AssociationResponse> {
    return this.associationsService.deleteAssociation(id);
  }

  @Get(':id')
  async getAssociation(id: string): Promise<AssociationResponse> {
    return this.associationsService.getAssociation(id);
  }

  @Patch(':id')
  async updateAssociation(
    @Body() body: z.infer<typeof UpdateAssociationSchema>,
    id: string,
  ): Promise<AssociationResponse> {
    const validDto = UpdateAssociationSchema.parse(body);
    const association = await this.associationsService.updateAssociation(
      id,
      validDto,
    );

    return association;
  }
}
