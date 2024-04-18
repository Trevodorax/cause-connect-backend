import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AssociationsService } from './associations.service';
import { z } from 'zod';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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

export interface AssociationResponse {
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
  async getAllAssociations(
    @Query('ready') ready?: 'true' | 'false',
  ): Promise<AssociationResponse[]> {
    if (ready === 'true') {
      return this.associationsService.getSetUpAssociations();
    }
    return this.associationsService.getAllAssociations();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteAssociation(
    @Param('id') id: string,
  ): Promise<AssociationResponse> {
    return this.associationsService.deleteAssociation(id);
  }

  @Public()
  @Get(':id')
  async getAssociation(@Param('id') id: string): Promise<AssociationResponse> {
    return this.associationsService.getAssociation(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  async updateAssociation(
    @Body() body: z.infer<typeof UpdateAssociationSchema>,
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<AssociationResponse> {
    if (user.association.id !== id && user.role !== UserRole.SUPER_ADMIN) {
      throw new Error('You can only update your own association');
    }

    const validDto = UpdateAssociationSchema.parse(body);
    const association = await this.associationsService.updateAssociation(
      id,
      validDto,
    );

    return association;
  }

  @Public()
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  async updateAssociationLogo(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') associationId: string,
  ): Promise<{ logoUrl: string }> {
    const url = await this.associationsService.updateAssociationLogo(
      file,
      associationId,
    );

    return {
      logoUrl: url,
    };
  }

  @Public()
  @Get(':id/stripe-account-id')
  async getStripeAccountId(@Param('id') id: string): Promise<{ id: string }> {
    return this.associationsService.getAssociationStripeAccountId(id);
  }
}
