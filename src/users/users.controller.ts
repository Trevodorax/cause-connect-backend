import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from './users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { z } from 'zod';
import { Public } from 'src/auth/decorators/public.decorator';

const CreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL]),
});

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface SendPasswordEmailResponse {
  email: string;
}

const SendPasswordEmailSchema = z.object({
  email: z.string().email(),
  associationId: z.string(),
});

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async createUser(
    @GetUser() authenticatedUser: User,
    @Body() body: z.infer<typeof CreateUserSchema>,
  ): Promise<UserResponse> {
    const validBody = CreateUserSchema.parse(body);
    const user = await this.usersService.createUser({
      associationId: authenticatedUser.association.id,
      ...validBody,
    });

    if (!user) {
      throw new InternalServerErrorException('Failed to create user');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async getAllUsers(@GetUser() user: User): Promise<UserResponse[]> {
    const associationId = user.association.id;
    return (await this.usersService.findAllByAssociation(associationId)).map(
      (user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }),
    );
  }

  @Get('me')
  me(@GetUser() user: UserResponse): UserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserResponse> {
    const user = await this.usersService.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<UserResponse> {
    const user = await this.usersService.deleteUser(id);

    return {
      id: id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/send-password-email')
  async sendPasswordEmail(
    @Param('id') id: string,
  ): Promise<SendPasswordEmailResponse> {
    const email = await this.usersService.sendPasswordResetEmail(id);

    return { email };
  }

  @Public()
  @Post('send-password-email')
  async sendPasswordEmailByEmail(
    @Body() body: z.infer<typeof SendPasswordEmailSchema>,
  ) {
    const { email, associationId } = SendPasswordEmailSchema.parse(body);
    const user = await this.usersService.findOneByEmailInAssociation(
      email,
      associationId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.sendPasswordResetEmail(user.id);

    return { email };
  }
}
