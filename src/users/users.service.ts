import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from './users.entity';
import {
  NewUserDto,
  PartialUserDto,
  ResetPasswordDto,
  UserSearchDto,
} from './users.dto';
import * as bcrypt from 'bcrypt';
import { Association } from 'src/associations/associations.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Association)
    private associationRepository: Repository<Association>,
  ) {}
  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { passwordResetCode: dto.resetPasswordCode },
    });
    if (!user || user.passwordResetCode === null) {
      throw new UnauthorizedException('Wrong reset password code');
    }

    user.passwordHash = await this.passwordToHash(dto.newPassword);

    await this.userRepository.save(user);

    return user;
  }

  async findAllByAssociation(associationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { association: { id: associationId } },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async createUser(user: NewUserDto): Promise<User | null> {
    // check if the email already exists in the association
    const existingUser = await this.findOneByEmailInAssociation(
      user.email,
      user.associationId,
    );
    if (existingUser) {
      throw new UnprocessableEntityException('Email already exists');
    }

    // check if the association exists
    const association = await this.associationRepository.findOne({
      where: { id: user.associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    // insert user into the database
    const result = await this.userRepository.insert({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      association: association,
    });
    const userId = result.generatedMaps[0].id;

    // return the newly created user
    return this.userRepository.findOneBy({ id: userId });
  }

  async edit(id: string, data: PartialUserDto): Promise<User> {
    // find the user by id
    const user = await this.findOneById(id);

    // if the user is not found, throw an error
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.email) {
      const existingUser = await this.findOneByEmailInAssociation(
        data.email,
        user.association.id,
      );
      if (existingUser) {
        throw new UnprocessableEntityException('Email already exists');
      }

      user.email = data.email;
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    if (data.role) {
      user.role = data.role;
    }

    // save the updated user info
    return this.userRepository.save(user);
  }

  async search(associationId: string, search: UserSearchDto) {
    const matchingUsers = await this.userRepository.find({
      where: [
        {
          email: Like(`%${search.search}%`),
          association: { id: associationId },
        },
      ],
    });

    return matchingUsers;
  }

  async findOneByEmailInAssociation(email: string, associationId: string) {
    return this.userRepository.findOne({
      where: { email, association: { id: associationId } },
    });
  }

  private async passwordToHash(password: string): Promise<string> {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  }
}
