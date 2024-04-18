import {
  Controller,
  Get,
  Patch,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import { z } from 'zod';
import { SettingsService } from './settings.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';

interface PaymentDataResponse {
  id: string;
  stripeAccountId: string;
  stripeContributionId: string;
  stripeDonationId: string;
  contributionPrice: number;
}
interface ThemeResponse {
  id: string;
  color: string;
  font: string;
}

interface SettingsResponse {
  id: string;
  paymentData: PaymentDataResponse;
  theme: ThemeResponse;
}

const UpdatePaymentDataSchema = z.object({
  stripeAccountId: z.string().optional(),
  stripeContributionId: z.string().optional(),
  stripeDonationId: z.string().optional(),
  contributionPrice: z.number().optional(),
});

const UpdateThemeSchema = z.object({
  color: z.string().optional(),
  font: z.string().optional(),
});

const UpdateSettingsSchema = z.object({
  paymentData: UpdatePaymentDataSchema.optional(),
  theme: UpdateThemeSchema.optional(),
});

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async getSettings(
    @GetUser() authenticatedUser: User,
  ): Promise<SettingsResponse> {
    return this.settingsService.getSettings(authenticatedUser.association.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch()
  async updateSettings(
    @GetUser() authenticatedUser: User,
    @Body() body: z.infer<typeof UpdateSettingsSchema>,
  ): Promise<SettingsResponse> {
    const validBody = UpdateSettingsSchema.parse(body);
    const settings = this.settingsService.updateSettings(
      authenticatedUser.association.id,
      validBody,
    );
    if (!settings) {
      throw new InternalServerErrorException('Failed to update settings');
    }

    return settings;
  }

  @Roles(UserRole.ADMIN, UserRole.INTERNAL)
  @Get('theme')
  async getTheme(@GetUser() authenticatedUser: User): Promise<ThemeResponse> {
    return this.settingsService.getTheme(authenticatedUser.association.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('theme')
  async updateTheme(
    @GetUser() authenticatedUser: User,
    @Body() body: z.infer<typeof UpdateThemeSchema>,
  ): Promise<ThemeResponse> {
    const validBody = UpdateThemeSchema.parse(body);
    const theme = this.settingsService.updateTheme(
      authenticatedUser.association.id,
      validBody,
    );
    if (!theme) {
      throw new InternalServerErrorException('Failed to update theme');
    }

    return theme;
  }

  @Get('payment')
  async getPaymentData(
    @GetUser() authenticatedUser: User,
  ): Promise<PaymentDataResponse> {
    return this.settingsService.getPaymentData(
      authenticatedUser.association.id,
    );
  }

  @Roles(UserRole.ADMIN)
  @Patch('payment')
  async updatePaymentData(
    @GetUser() authenticatedUser: User,
    @Body() body: z.infer<typeof UpdatePaymentDataSchema>,
  ): Promise<PaymentDataResponse> {
    const validBody = UpdatePaymentDataSchema.parse(body);
    const paymentData = this.settingsService.updatePaymentData(
      authenticatedUser.association.id,
      validBody,
    );
    if (!paymentData) {
      throw new InternalServerErrorException('Failed to update payment data');
    }

    return paymentData;
  }
}
