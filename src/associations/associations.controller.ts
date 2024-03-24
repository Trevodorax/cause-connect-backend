import { Body, Controller, Post } from '@nestjs/common';
import { AssociationsService } from './associations.service';
import { z } from 'zod';
import { Association } from './associations.entity';
import { Public } from 'src/auth/decorators/public.decorator';

const NewAssociationSchema = z.object({
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

@Controller('associations')
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Public()
  @Post()
  async createAssociation(
    @Body() body: z.infer<typeof NewAssociationSchema>,
  ): Promise<Association> {
    const validDto = NewAssociationSchema.parse(body);
    return this.associationsService.createAssociationWithAdmin(validDto);
  }
}
