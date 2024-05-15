import { Controller, Body, Post, Get, Delete, Param } from '@nestjs/common';
import { Stripe } from 'stripe';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { UserResponse } from 'src/users/users.controller';
import { Public } from 'src/auth/decorators/public.decorator';

export interface AccountWithProductsResponse {
  account: Stripe.Account;
  contribution: Stripe.Product;
  donation: Stripe.Product;
}

const createAccountWithProductBodySchema = z.object({
  email: z.string().email(),
});

const sendReminderEmailsSchema = z.object({
  emails: z.array(z.string().email()),
});

const createPublicDonationCheckoutSessionSchema = z.object({
  associationId: z.string(),
});

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ====================== ACCOUNTS ====================== //
  @Roles(UserRole.ADMIN)
  @Post('accounts')
  async createAccountWithProduct(
    @Body()
    createAccountWithProductBody: z.infer<
      typeof createAccountWithProductBodySchema
    >,
  ): Promise<AccountWithProductsResponse> {
    const validBody = createAccountWithProductBodySchema.parse(
      createAccountWithProductBody,
    );
    return this.paymentService.createAccountWithProducts(validBody);
  }

  @Get('accounts')
  async getAccount(
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.Account> {
    return await this.paymentService.getAccount(
      authenticatedUser.association.id,
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('accounts/:accountId')
  async deleteAccount(@Param('accountId') accountId: string): Promise<void> {
    return this.paymentService.deleteAccount(accountId);
  }

  @Roles(UserRole.ADMIN)
  @Get('accounts/:accountId/checkout-sessions')
  async getCheckoutSessions(
    @Param('accountId') accountId: string,
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return this.paymentService.getCheckoutSessions(accountId);
  }

  // ====================== SESSIONS ====================== //
  @Roles(UserRole.ADMIN)
  @Post('sessions')
  async createAccountSession(
    @GetUser() authenticatedUser: User,
  ): Promise<string | undefined> {
    return this.paymentService.createAccountSession(
      authenticatedUser.association.id,
    );
  }

  @Public()
  @Get('checkout/sessions/:sessionId/status')
  async getCheckoutSession(
    @Param('sessionId') sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.paymentService.getCheckoutSession(sessionId);
  }

  // ====================== CUSTOMERS ====================== //
  @Get('customers/:customerId')
  async getCustomer(
    @Param('customerId') customerId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    return await this.paymentService.getCustomer(
      authenticatedUser.association.id,
      customerId,
    );
  }

  @Roles(UserRole.ADMIN)
  @Get('late-users')
  async getLateUsers(
    @GetUser() authenticatedUser: User,
  ): Promise<UserResponse[]> {
    return this.paymentService.getLateUsers(authenticatedUser.association.id);
  }

  @Roles(UserRole.ADMIN)
  @Post('late-users/send-reminder')
  async sendLateUsersReminder(
    @Body()
    sendLateUsersReminderBody: z.infer<typeof sendReminderEmailsSchema>,
  ): Promise<void> {
    return this.paymentService.sendReminderEmails(sendLateUsersReminderBody);
  }

  // ====================== CHECKOUT SESSIONS ====================== //
  @Post('checkout/contribution')
  async createContributionCheckoutSession(
    @GetUser() authenticatedUser: User,
  ): Promise<string> {
    return this.paymentService.createContributionCheckoutSession(
      authenticatedUser.association.id,
      authenticatedUser.stripeCustomerId,
    );
  }

  @Post('checkout/donation')
  async createPrivateDonationCheckoutSession(
    @GetUser() authenticatedUser: User,
  ): Promise<string> {
    return this.paymentService.createDonationCheckoutSession(
      authenticatedUser.association.id,
      authenticatedUser.stripeCustomerId,
    );
  }

  @Public()
  @Post('checkout/public-donation')
  async createPublicDonationCheckoutSession(
    @Body()
    createPublicDonationCheckoutSessionBody: z.infer<
      typeof createPublicDonationCheckoutSessionSchema
    >,
  ): Promise<string> {
    const validBody = createPublicDonationCheckoutSessionSchema.parse(
      createPublicDonationCheckoutSessionBody,
    );
    return this.paymentService.createDonationCheckoutSession(
      validBody.associationId,
    );
  }

  // ====================== SUBSCRIPTIONS ====================== //
  @Get('subscriptions')
  async getMySubscriptions(
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.paymentService.getCustomerSubscriptions(
      authenticatedUser.association.id,
      authenticatedUser.stripeCustomerId,
    );
  }
}
