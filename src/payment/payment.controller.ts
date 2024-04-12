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
  @Post('account')
  async createAccountWithProduct(
    @Body() createAccountWithProductBody: z.infer<typeof createAccountWithProductBodySchema>,
  ): Promise<AccountWithProductResponse> {
    const validBody = createAccountWithProductBodySchema.parse(createAccountWithProductBody);
    return this.paymentService.createAccountWithProduct(validBody);
  }

  @Roles(UserRole.ADMIN)
  @Get('account/:accountId')
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
  @Post('account/:accountId/session')
  async createAccountSession(
    @Param('accountId') accountId: string,
    @GetUser() authenticatedUser: User,
  ): Promise<string | undefined> {
    return this.paymentService.createAccountSession(
      accountId,
      authenticatedUser.association.id,
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('account/:accountId')
  async deleteAccount(@Param('accountId') accountId: string): Promise<void> {
    return this.paymentService.deleteAccount(accountId);
  }
}
