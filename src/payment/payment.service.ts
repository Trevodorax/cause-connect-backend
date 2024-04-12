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
import { AccountWithProductResponse } from './payment.controller';

interface CreateAccountWithProductDto {
  email: string;
}

interface UpdateProductDto {
  constributionPrice: number;
}

interface CreateCustomerDto {
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

  async createAccountWithProduct(
    createAccountWithProductBody: CreateAccountWithProductDto,
  ): Promise<AccountWithProductResponse> {
    const account = await this.createAccount(createAccountWithProductBody.email);

    const product = await this.stripe.products.create(
      {
        name: 'Contribution',
      },
      {
        stripeAccount: account.id,
      },
    );

    await this.stripe.prices.create(
      {
        unit_amount: 0,
        currency: 'eur',
        recurring: { interval: 'month' },
        product: product.id,
      },
      {
        stripeAccount: account.id,
      },
    );

    return {
      account,
      product,
    };
  }

  async updateSubscriptions(
    accountId: string,
    associationId: string,
    updateProductBody: UpdateProductDto,
  ): Promise<void> {
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

    const newPrice = await this.stripe.prices.create(
      {
        unit_amount: updateProductBody.constributionPrice,
        currency: 'eur',
        recurring: { interval: 'month' },
        product: settings.paymentData.stripeProductId,
      },
      {
        stripeAccount: accountId,
      },
    );

    await this.stripe.products.update(
      settings.paymentData.stripeProductId,
      {
        default_price: newPrice.id,
      },
      {
        stripeAccount: accountId,
      },
    );

    const subscriptions = await this.stripe.subscriptions.list({
      stripeAccount: accountId,
    });
    subscriptions.data.forEach(async (subscription) => {
      await this.stripe.subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPrice.id,
            },
          ],
        },
        {
          stripeAccount: accountId,
        },
      );
    });
  }

  async createCustomer(
    accountId: string,
    associationId: string,
    createCustomerBody: CreateCustomerDto,
  ): Promise<Stripe.Customer> {
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

      return await this.stripe.customers.create(
        {
          email: createCustomerBody.email,
        },
        {
          stripeAccount: accountId,
        },
      );
    } catch (error) {
      console.error(
        'An error occurred when calling the Stripe API to create a customer',
        error,
      );
      throw new InternalServerErrorException('Failed to create customer');
    }
  }
}
