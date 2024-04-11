import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from 'src/settings/entities/settings.entity';
import Stripe from 'stripe';
import { AccountWithPlanResponse } from './payment.controller';

interface CreateAccountWithPlanDto {
  email: string;
}

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET ?? '', {
      apiVersion: '2023-10-16',
    });
  }

  async createAccount(email: string): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email,
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.stripe.accounts.del(accountId);
  }

  async createAccountSession(
    accountId: string,
    associationId: string,
  ): Promise<string> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { association: { id: associationId } },
        relations: ['paymentData'],
      });
      if (!settings?.paymentData?.stripeAccountId) {
        throw new NotFoundException('No Stripe account found for this association');
      }
      if (settings.paymentData.stripeAccountId !== accountId) {
        throw new UnauthorizedException('You are not allowed to access this account');
      }

      const accountSession = await this.stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: { enabled: true },
        },
      });

      return accountSession.client_secret;
    } catch (error) {
      console.error(
        'An error occurred when calling the Stripe API to create an account session',
        error,
      );
      throw new InternalServerErrorException('Failed to create account session');
    }
  }

  async getAccount(
    accountId: string,
    associationId: string,
  ): Promise<Stripe.Account> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException('No Stripe account found for this association');
    }
    if (settings.paymentData.stripeAccountId !== accountId) {
      throw new UnauthorizedException('You are not allowed to access this account');
    }

    return this.stripe.accounts.retrieve(settings.paymentData.stripeAccountId);
  }

  async createAccountWithPlan(
    createAccountWithPlanBody: CreateAccountWithPlanDto,
  ): Promise<AccountWithPlanResponse> {
    const account = await this.createAccount(createAccountWithPlanBody.email);

    const plan = await this.stripe.plans.create(
      {
        amount: 0,
        currency: 'eur',
        interval: 'month',
        product: { name: 'Contribution' },
      },
      { stripeAccount: account.id },
    );

    return {
      account,
      plan,
    };
  }
}
