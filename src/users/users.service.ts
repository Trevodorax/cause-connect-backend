import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  forwardRef,
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
import { EmailService } from 'src/email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { PollOption } from 'src/poll-question/entities/poll-option.entity';
import { PaymentService } from 'src/payment/payment.service';
import { SettingsService } from 'src/settings/settings.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Association)
    private associationRepository: Repository<Association>,
    private emailService: EmailService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private settingsService: SettingsService,
  ) {}
  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { passwordResetCode: dto.passwordResetCode },
      relations: ['association'],
    });
    if (!user || !user.passwordResetCode || user.passwordResetCode === '') {
      throw new UnauthorizedException('Wrong reset password code');
    }

    user.passwordHash = await this.passwordToHash(dto.newPassword);
    user.passwordResetCode = '';

    await this.userRepository.save(user);

    return user;
  }

  async findAllByAssociation(associationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { association: { id: associationId } },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: id },
      relations: ['association'],
    });
  }

  async findOneByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { stripeCustomerId: stripeCustomerId },
      relations: ['association'],
    });
  }

  async deleteUser(id: string): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.paymentService.cancelCustomerSubscriptions(
      user.association.id,
      user.stripeCustomerId,
    );

    const deletedUser = await this.userRepository.remove(user);
    return deletedUser;
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

    // get stripe account for the association
    const settings = await this.settingsService.getSettings(user.associationId);
    if (!settings.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    const stripeCustomer = await this.paymentService.createCustomer(
      user.associationId,
      { email: user.email },
    );

    // insert user into the database
    const result = await this.userRepository.insert({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      association: association,
      stripeCustomerId: stripeCustomer.id,
    });
    const userId = result.generatedMaps[0].id;

    this.sendPasswordResetEmail(userId);

    // return the newly created user
    return this.userRepository.findOneBy({ id: userId });
  }

  async sendPasswordResetEmail(id: string) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const code = uuidv4();
    user.passwordResetCode = code;
    await this.userRepository.save(user);

    this.emailService.sendPasswordResetEmail({
      email: user.email,
      fullName: user.fullName,
      passwordResetCode: code,
    });

    return user.email;
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
      if (existingUser && existingUser.id !== user.id) {
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
      relations: ['association'],
    });
  }

  async addAnswersToUser(userId: string, optionIds: string[]): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['answers'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userAnswers = user?.answers ?? [];

    userAnswers.push(...optionIds.map((id) => ({ id }) as PollOption));

    user.answers = userAnswers;

    await this.userRepository.save(user);
  }

  private async passwordToHash(password: string): Promise<string> {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  }
}
