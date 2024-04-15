import { Controller, Body, Post, Get, Delete, Param } from '@nestjs/common';
import { Stripe } from 'stripe';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { UserResponse } from 'src/users/users.controller';

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

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
  @Get('accounts/:accountId')
  async getAccount(
    @Param('accountId') accountId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.Account | null> {
    return await this.paymentService.getAccount(
      accountId,
      authenticatedUser.association.id,
    );
  }

  @Roles(UserRole.ADMIN)
  @Post('accounts/:accountId/session')
  async createAccountSession(
    @Param('accountId') accountId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<string | undefined> {
    return this.paymentService.createAccountSession(
      accountId,
      authenticatedUser.association.id,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
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

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
  @Post('customers/:customerId/checkout/contribution')
  async createContributionCheckoutSession(
    @Param('customerId') customerId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<string> {
    return this.paymentService.createContributionCheckoutSession(
      authenticatedUser.association.id,
      customerId,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
  @Post('customers/:customerId/checkout/donation')
  async createDonationCheckoutSession(
    @Param('customerId') customerId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<string> {
    return this.paymentService.createDonationCheckoutSession(
      authenticatedUser.association.id,
      customerId,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
  @Get('checkout/session/:sessionId/status')
  async getCheckoutSession(
    @Param('sessionId') sessionId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.Checkout.Session> {
    return this.paymentService.getCheckoutSession(
      authenticatedUser.association.id,
      sessionId,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL, UserRole.EXTERNAL)
  @Get('customers/:customerId/subscription')
  async getCustomerSubscription(
    @Param('customerId') customerId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.paymentService.getCustomerSubscription(
      authenticatedUser.association.id,
      customerId,
    );
  }

  @Roles(UserRole.ADMIN)
  @Get('accounts/:accountId/checkout-sessions')
  async getCheckoutSessions(
    @Param('accountId') accountId: string,
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return this.paymentService.getCheckoutSessions(accountId);
  }

  @Roles(UserRole.ADMIN)
  @Get('late-users')
  async getLateUsers(
    @GetUser() authenticatedUser: User,
  ): Promise<UserResponse[]> {
    return this.paymentService.getLateUsers(authenticatedUser.association.id);
  }

  @Roles(UserRole.ADMIN)
  @Delete('accounts/:accountId')
  async deleteAccount(@Param('accountId') accountId: string): Promise<void> {
    return this.paymentService.deleteAccount(accountId);
  }

  @Roles(UserRole.ADMIN)
  @Post('late-users/send-reminder')
  async sendLateUsersReminder(
    @Body()
    sendLateUsersReminderBody: z.infer<typeof sendReminderEmailsSchema>,
  ): Promise<void> {
    return this.paymentService.sendReminderEmails(sendLateUsersReminderBody);
  }
}
