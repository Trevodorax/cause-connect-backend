import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from './users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { z } from 'zod';
import { Public } from 'src/auth/decorators/public.decorator';
import { AssociationResponse } from 'src/associations/associations.controller';

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
  stripeCustomerId: string;
}

export interface UserWithAssociationResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  stripeCustomerId: string;
  association: AssociationResponse;
}

interface SendPasswordEmailResponse {
  email: string;
}

const SendPasswordEmailSchema = z.object({
  email: z.string().email(),
  associationId: z.string(),
});

const UpdateRoleSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  role: z
    .enum([UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL])
    .optional(),
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
      stripeCustomerId: user.stripeCustomerId,
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
        stripeCustomerId: user.stripeCustomerId,
      }),
    );
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get('internal')
  async getInternalUsers(@GetUser() user: User): Promise<UserResponse[]> {
    const associationId = user.association.id;
    return (await this.usersService.findAllByAssociation(associationId))
      .filter(
        (user) =>
          user.role === UserRole.INTERNAL || user.role === UserRole.ADMIN,
      )
      .map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        stripeCustomerId: user.stripeCustomerId,
      }));
  }

  @Get('me')
  async me(
    @GetUser() user: UserResponse,
  ): Promise<UserWithAssociationResponse> {
    const foundUser = await this.usersService.findOneById(user.id);
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }
    return {
      id: foundUser.id,
      email: foundUser.email,
      fullName: foundUser.fullName,
      role: foundUser.role,
      stripeCustomerId: foundUser.stripeCustomerId,
      association: {
        id: foundUser.association.id,
        description: foundUser.association.description,
        logo: foundUser.association.logo,
        name: foundUser.association.name,
      },
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
      stripeCustomerId: user.stripeCustomerId,
    };
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: z.infer<typeof UpdateRoleSchema>,
  ): Promise<UserResponse> {
    const validBody = UpdateRoleSchema.parse(body);
    const user = await this.usersService.edit(id, validBody);

    if (!user) {
      throw new InternalServerErrorException('Failed to update user role');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      stripeCustomerId: user.stripeCustomerId,
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
      stripeCustomerId: user.stripeCustomerId,
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
