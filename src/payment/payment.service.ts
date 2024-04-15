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
import { AccountWithProductsResponse } from './payment.controller';
import { UserResponse } from 'src/users/users.controller';
import { User } from 'src/users/users.entity';
import { EmailService } from 'src/email/email.service';

interface CreateAccountWithProductDto {
  email: string;
}

interface UpdateProductDto {
  constributionPrice: number;
}

interface CreateCustomerDto {
  email: string;
}

interface ReminderEmailsDto {
  emails: string[];
}

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET ?? '', {
      apiVersion: '2023-10-16',
    });
  }

  async createAccount(email: string): Promise<Stripe.Account> {
    return await this.stripe.accounts.create({
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
        throw new NotFoundException(
          'No Stripe account found for this association',
        );
      }
      if (settings.paymentData.stripeAccountId !== accountId) {
        throw new UnauthorizedException(
          'You are not allowed to access this account',
        );
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
      throw new InternalServerErrorException(
        'Failed to create account session',
      );
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
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }
    if (settings.paymentData.stripeAccountId !== accountId) {
      throw new UnauthorizedException(
        'You are not allowed to access this account',
      );
    }

    return await this.stripe.accounts.retrieve(
      settings.paymentData.stripeAccountId,
    );
  }

  async createAccountWithProducts(
    createAccountWithProductBody: CreateAccountWithProductDto,
  ): Promise<AccountWithProductsResponse> {
    const account = await this.createAccount(
      createAccountWithProductBody.email,
    );

    const contribution = await this.stripe.products.create(
      {
        name: 'Contribution',
        default_price_data: {
          currency: 'eur',
          unit_amount: 0,
          recurring: { interval: 'month' },
        },
      },
      {
        stripeAccount: account.id,
      },
    );

    const donation = await this.stripe.products.create(
      {
        name: 'Donation',
      },
      {
        stripeAccount: account.id,
      },
    );

    await this.stripe.prices.create(
      {
        currency: 'eur',
        custom_unit_amount: {
          enabled: true,
        },
        product: donation.id,
      },
      {
        stripeAccount: account.id,
      },
    );

    return {
      account,
      contribution,
      donation,
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
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }
    if (settings.paymentData.stripeAccountId !== accountId) {
      throw new UnauthorizedException(
        'You are not allowed to access this account',
      );
    }

    const newPrice = await this.stripe.prices.create(
      {
        unit_amount: updateProductBody.constributionPrice,
        currency: 'eur',
        recurring: { interval: 'month' },
        product: settings.paymentData.stripeContributionId,
      },
      {
        stripeAccount: accountId,
      },
    );

    await this.stripe.products.update(
      settings.paymentData.stripeContributionId,
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
      if (subscription.schedule !== null) {
        if (typeof subscription.schedule === 'string') {
          const schedule = await this.stripe.subscriptionSchedules.retrieve(
            subscription.schedule,
            {
              stripeAccount: accountId,
            },
          );

          await this.stripe.subscriptionSchedules.update(
            schedule.id,
            {
              phases: [
                {
                  items: [
                    {
                      price:
                        typeof schedule.phases[0].items[0].price === 'string'
                          ? schedule.phases[0].items[0].price
                          : schedule.phases[0].items[0].price.id,
                      quantity: schedule.phases[0].items[0].quantity,
                    },
                  ],
                  start_date: schedule.phases[0].start_date,
                  end_date: schedule.phases[0].end_date,
                },
                {
                  items: [
                    {
                      price: newPrice.id,
                    },
                  ],
                },
              ],
            },
            {
              stripeAccount: accountId,
            },
          );
        } else {
          await this.stripe.subscriptionSchedules.update(
            subscription.schedule.id,
            {
              phases: [
                {
                  items: [
                    {
                      price:
                        typeof subscription.schedule.phases[0].items[0]
                          .price === 'string'
                          ? subscription.schedule.phases[0].items[0].price
                          : subscription.schedule.phases[0].items[0].price.id,
                      quantity:
                        subscription.schedule.phases[0].items[0].quantity,
                    },
                  ],
                  start_date: subscription.schedule.phases[0].start_date,
                  end_date: subscription.schedule.phases[0].end_date,
                },
                {
                  items: [
                    {
                      price: newPrice.id,
                    },
                  ],
                },
              ],
            },
            {
              stripeAccount: accountId,
            },
          );
        }
      } else {
        await this.stripe.subscriptionSchedules.create(
          {
            customer:
              typeof subscription.customer === 'string'
                ? subscription.customer
                : subscription.customer.id,
            start_date: subscription.current_period_start,
            phases: [
              {
                items: [
                  {
                    price:
                      typeof subscription.items.data[0].price === 'string'
                        ? subscription.items.data[0].price
                        : subscription.items.data[0].price.id,
                    quantity: subscription.items.data[0].quantity,
                  },
                ],
                end_date: subscription.current_period_end,
              },
              {
                items: [
                  {
                    price: newPrice.id,
                  },
                ],
              },
            ],
          },
          {
            stripeAccount: accountId,
          },
        );
      }
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
        throw new NotFoundException(
          'No Stripe account found for this association',
        );
      }
      if (settings.paymentData.stripeAccountId !== accountId) {
        throw new UnauthorizedException(
          'You are not allowed to access this account',
        );
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

  async getCustomer(
    associationId: string,
    customerId: string,
  ): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    return await this.stripe.customers.retrieve(customerId, {
      stripeAccount: settings.paymentData.stripeAccountId,
    });
  }

  async createContributionCheckoutSession(
    associationId: string,
    customerId: string,
  ): Promise<string> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    const price = await this.stripe.prices.search(
      {
        query: `product:'${settings.paymentData.stripeContributionId}'`,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
    if (!price.data[0]) {
      throw new NotFoundException('Price not found');
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        locale: 'fr',
        line_items: [
          {
            price: price.data[0].id,
            quantity: 1,
          },
        ],
        ui_mode: 'embedded',
        return_url:
          'http://localhost:5173/app/checkout/contribution/return?session_id={CHECKOUT_SESSION_ID}',
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    return String(session.client_secret);
  }

  async createDonationCheckoutSession(
    associationId: string,
    customerId?: string,
  ): Promise<string> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    const price = await this.stripe.prices.search(
      {
        query: `product:'${settings.paymentData.stripeDonationId}'`,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
    if (!price.data[0]) {
      throw new NotFoundException('Price not found');
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        locale: 'fr',
        line_items: [
          {
            price: price.data[0].id,
            quantity: 1,
          },
        ],
        ui_mode: 'embedded',
        return_url:
          customerId === undefined
            ? 'http://localhost:5173/checkout/donation/return?session_id={CHECKOUT_SESSION_ID}'
            : 'http://localhost:5173/app/checkout/donation/return?session_id={CHECKOUT_SESSION_ID}',
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    return String(session.client_secret);
  }

  async getCheckoutSession(
    associationId: string,
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: settings.paymentData.stripeAccountId,
    });
  }

  async getCheckoutSessions(
    stripeAccountId: string,
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return await this.stripe.checkout.sessions.list({
      stripeAccount: stripeAccountId,
    });
  }

  async getCustomerSubscription(
    associationId: string,
    customerId: string,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    return await this.stripe.subscriptions.list(
      {
        customer: customerId,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  async getLateSubscriptions(
    associationId: string,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }

    return await this.stripe.subscriptions.list(
      {
        status: 'past_due',
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  async getLateUsers(associationId: string): Promise<UserResponse[]> {
    const lateSubscriptions = await this.getLateSubscriptions(associationId);
    const usersPromises: Promise<UserResponse | null>[] =
      lateSubscriptions.data.map(async (subscription) => {
        const customerId = this.getCustomerId(subscription.customer);
        if (customerId !== null) {
          const user = await this.usersRepository.findOne({
            where: { stripeCustomerId: customerId },
          });
          if (user !== null) {
            return {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              stripeCustomerId: user.stripeCustomerId,
            };
          }
        }
        return null;
      });

    const users = await Promise.all(usersPromises);
    return users.filter((user) => user !== null) as UserResponse[];
  }

  getCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
  ): string | null {
    if (typeof customer === 'string') {
      return customer;
    }
    if ('deleted' in customer && customer.deleted) {
      return null;
    }
    return customer.id;
  }

  async sendReminderEmails(
    reminderEmailsDto: ReminderEmailsDto,
  ): Promise<void> {
    reminderEmailsDto.emails.forEach(async (email) => {
      await this.emailService.sendLateUserEmail({
        email,
      });
    });
  }
}
