import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from 'src/settings/entities/settings.entity';
import Stripe from 'stripe';
import { AccountWithProductsResponse } from './payment.controller';
import { UserResponse } from 'src/users/users.controller';
import { EmailService } from 'src/email/email.service';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { CheckoutSession } from './checkout-session.entity';

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
    @InjectRepository(CheckoutSession)
    private checkoutSessionRepository: Repository<CheckoutSession>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET ?? '', {
      apiVersion: '2023-10-16',
    });
  }

  // ======================= UTILS ======================= //
  async getSettings(
    associationId: string,
    checkForStripeAccount: boolean = true,
  ): Promise<Settings> {
    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found for this association');
    }
    if (checkForStripeAccount && !settings?.paymentData?.stripeAccountId) {
      throw new NotFoundException(
        'No Stripe account found for this association',
      );
    }
    return settings;
  }

  private getCustomerId(
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

  async getCustomerSubscriptions(
    associationId: string,
    stripeCustomerId: string,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    const settings = await this.getSettings(associationId);

    return await this.stripe.subscriptions.list(
      {
        customer: stripeCustomerId,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  private async getCustomerSubscriptionSchedules(
    associationId: string,
    stripeCustomerId: string,
  ): Promise<Stripe.ApiList<Stripe.SubscriptionSchedule>> {
    const settings = await this.getSettings(associationId);

    return await this.stripe.subscriptionSchedules.list(
      {
        customer: stripeCustomerId,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  private async getSchedule(
    schedule: string | Stripe.SubscriptionSchedule,
    stripeAccountId: string,
  ): Promise<Stripe.SubscriptionSchedule> {
    if (typeof schedule === 'string') {
      return await this.stripe.subscriptionSchedules.retrieve(schedule, {
        stripeAccount: stripeAccountId,
      });
    }

    return schedule;
  }

  // ======================= ACCOUNTS ======================= //
  async getAccount(associationId: string): Promise<Stripe.Account> {
    const settings = await this.getSettings(associationId);
    return await this.stripe.accounts.retrieve(
      settings.paymentData.stripeAccountId,
    );
  }

  async getConnectedAccounts(): Promise<Stripe.ApiList<Stripe.Account>> {
    return await this.stripe.accounts.list();
  }

  async getSetupConnectedAccounts(): Promise<Stripe.Account[]> {
    const connectedAccounts = await this.getConnectedAccounts();
    return connectedAccounts.data.filter((account) => account.charges_enabled);
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

  // ======================= ACCOUNT SESSIONS ======================= //
  async createAccountSession(associationId: string): Promise<string> {
    const settings = await this.getSettings(associationId);

    const accountSession = await this.stripe.accountSessions.create({
      account: settings.paymentData.stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return accountSession.client_secret;
  }

  async createContributionCheckoutSession(
    associationId: string,
    customerId: string,
  ): Promise<string> {
    const settings = await this.getSettings(associationId);

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
        return_url: `${this.configService.get<string>('WEBAPP_URL')}/app/checkout/contribution/return?session_id={CHECKOUT_SESSION_ID}`,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    await this.checkoutSessionRepository.save({
      sessionId: session.id,
      associationId,
    });

    return String(session.client_secret);
  }

  async createDonationCheckoutSession(
    associationId: string,
    customerId?: string,
  ): Promise<string> {
    const settings = await this.getSettings(associationId);

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
            ? `${this.configService.get<string>('WEBAPP_URL')}/checkout/donation/return?session_id={CHECKOUT_SESSION_ID}`
            : `${this.configService.get<string>('WEBAPP_URL')}/app/checkout/donation/return?session_id={CHECKOUT_SESSION_ID}`,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    await this.checkoutSessionRepository.save({
      sessionId: session.id,
      associationId,
    });

    return String(session.client_secret);
  }

  async getCheckoutSessions(
    stripeAccountId: string,
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return await this.stripe.checkout.sessions.list({
      stripeAccount: stripeAccountId,
    });
  }

  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    const session = await this.checkoutSessionRepository.findOne({
      where: { sessionId: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const settings = await this.getSettings(session.associationId, true);

    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: settings.paymentData.stripeAccountId,
    });
  }

  // ======================= SUBSCRIPTIONS ======================= //
  async updateSubscriptions(
    associationId: string,
    updateProductBody: UpdateProductDto,
  ): Promise<void> {
    const settings = await this.getSettings(associationId);

    const newPrice = await this.stripe.prices.create(
      {
        unit_amount: updateProductBody.constributionPrice,
        currency: 'eur',
        recurring: { interval: 'month' },
        product: settings.paymentData.stripeContributionId,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    await this.stripe.products.update(
      settings.paymentData.stripeContributionId,
      {
        default_price: newPrice.id,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );

    const subscriptions = await this.stripe.subscriptions.list({
      stripeAccount: settings.paymentData.stripeAccountId,
    });
    subscriptions.data.forEach(async (subscription) => {
      let schedule: Stripe.SubscriptionSchedule;
      if (subscription.schedule !== null) {
        schedule = await this.getSchedule(
          subscription.schedule,
          settings.paymentData.stripeAccountId,
        );
      } else {
        schedule = await this.stripe.subscriptionSchedules.create(
          {
            from_subscription: subscription.id,
          },
          {
            stripeAccount: settings.paymentData.stripeAccountId,
          },
        );
      }

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
          stripeAccount: settings.paymentData.stripeAccountId,
        },
      );
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    stripeAccountId: string,
  ): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId, {
      stripeAccount: stripeAccountId,
    });
  }

  async cancelSubscriptionSchedule(
    subscriptionScheduleId: string,
    stripeAccountId: string,
  ): Promise<void> {
    await this.stripe.subscriptionSchedules.cancel(subscriptionScheduleId, {
      stripeAccount: stripeAccountId,
    });
  }

  async cancelCustomerSubscriptions(
    associationId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    const settings = await this.getSettings(associationId);

    const subscriptions = await this.getCustomerSubscriptions(
      associationId,
      stripeCustomerId,
    );
    subscriptions.data.forEach(async (subscription) => {
      if (subscription.status === 'active') {
        await this.cancelSubscription(
          subscription.id,
          settings.paymentData.stripeAccountId,
        );
      }
    });

    const subscriptionSchedules = await this.getCustomerSubscriptionSchedules(
      associationId,
      stripeCustomerId,
    );
    subscriptionSchedules.data.forEach(async (subscriptionSchedule) => {
      if (subscriptionSchedule.status === 'active') {
        await this.cancelSubscriptionSchedule(
          subscriptionSchedule.id,
          settings.paymentData.stripeAccountId,
        );
      }
    });
  }

  async getLateSubscriptions(
    associationId: string,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    const settings = await this.getSettings(associationId);

    return await this.stripe.subscriptions.list(
      {
        status: 'past_due',
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  // ======================= CUSTOMERS ======================= //
  async createCustomer(
    associationId: string,
    createCustomerBody: CreateCustomerDto,
  ): Promise<Stripe.Customer> {
    const settings = await this.getSettings(associationId);

    return await this.stripe.customers.create(
      {
        email: createCustomerBody.email,
      },
      {
        stripeAccount: settings.paymentData.stripeAccountId,
      },
    );
  }

  async getCustomer(
    associationId: string,
    customerId: string,
  ): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    const settings = await this.getSettings(associationId);

    return await this.stripe.customers.retrieve(customerId, {
      stripeAccount: settings.paymentData.stripeAccountId,
    });
  }

  async getLateUsers(associationId: string): Promise<UserResponse[]> {
    const lateSubscriptions = await this.getLateSubscriptions(associationId);
    const usersPromises: Promise<UserResponse | null>[] =
      lateSubscriptions.data.map(async (subscription) => {
        const customerId = this.getCustomerId(subscription.customer);
        if (customerId !== null) {
          const user =
            await this.usersService.findOneByStripeCustomerId(customerId);
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
