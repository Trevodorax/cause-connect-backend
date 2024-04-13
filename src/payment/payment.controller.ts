import { Controller, Body, Post, Get, Delete, Param } from '@nestjs/common';
import { Stripe } from 'stripe';
import { z } from 'zod';
import { PaymentService } from './payment.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';

export interface AccountWithProductResponse {
  account: Stripe.Account;
  product: Stripe.Product;
}

const createAccountWithProductBodySchema = z.object({
  email: z.string().email(),
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
  ): Promise<AccountWithProductResponse> {
    const validBody = createAccountWithProductBodySchema.parse(
      createAccountWithProductBody,
    );
    return this.paymentService.createAccountWithProduct(validBody);
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
  @Post('customers/:customerId/checkout-session')
  async createCheckoutSession(
    @Param('customerId') customerId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<string> {
    return this.paymentService.createCheckoutSession(
      authenticatedUser.association.id,
      customerId,
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
  @Delete('accounts/:accountId')
  async deleteAccount(@Param('accountId') accountId: string): Promise<void> {
    return this.paymentService.deleteAccount(accountId);
  }
}
