import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './entities/themes.entity';
import { Settings } from './entities/settings.entity';
import { Association } from 'src/associations/associations.entity';
import { PaymentData } from './entities/payment.entity';
import { PaymentService } from 'src/payment/payment.service';

interface UpdatePaymentDataDto {
  stripeAccountId?: string;
  stripeContributionId?: string;
  stripeDonationId?: string;
  contributionPrice?: number;
}
interface UpdateThemeDto {
  color?: string;
  font?: string;
}

interface NewSettingsDto {
  associationId: string;
}

interface UpdateSettingsDto {
  paymentData?: UpdatePaymentDataDto;
  theme?: UpdateThemeDto;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(PaymentData)
    private paymentDataRepository: Repository<PaymentData>,
    @InjectRepository(Theme)
    private themeRepository: Repository<Theme>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    @InjectRepository(Association)
    private associationRepository: Repository<Association>,
    private paymentService: PaymentService,
  ) {}

  async createSettings(data: NewSettingsDto): Promise<Settings | null> {
    const association = this.associationRepository.findOne({
      where: { id: data.associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const paymentData = await this.paymentDataRepository.insert({});
    if (!paymentData) {
      throw new InternalServerErrorException('Failed to create payment data');
    }
    const paymentDataId = paymentData.generatedMaps[0].id;

    const theme = await this.themeRepository.insert({});
    if (!theme) {
      throw new InternalServerErrorException('Failed to create theme');
    }
    const themeId = theme.generatedMaps[0].id;

    const settings = new Settings();
    settings.paymentData = { id: paymentDataId } as PaymentData;
    settings.theme = { id: themeId } as Theme;
    settings.association = { id: data.associationId } as Association;
    const createdSettings = await this.settingsRepository.insert(settings);
    const settingsId = createdSettings.generatedMaps[0].id;

    return this.settingsRepository.findOneBy({ id: settingsId });
  }

  async getSettings(associationId: string): Promise<Settings> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData', 'theme'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateSettings(
    associationId: string,
    data: UpdateSettingsDto,
  ): Promise<Settings> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const result = await this.settingsRepository.update(
      { association: { id: associationId } },
      data,
    );
    if (!result.affected) {
      throw new InternalServerErrorException('Failed to update settings');
    }

    const modifiedSettings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
    });

    if (!modifiedSettings) {
      throw new InternalServerErrorException(
        'Failed to find modified settings',
      );
    }

    return modifiedSettings;
  }

  async getTheme(associationId: string): Promise<Theme> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['theme'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings.theme;
  }

  async updateTheme(
    associationId: string,
    data: UpdateThemeDto,
  ): Promise<Theme> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['theme'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const result = await this.themeRepository.update(
      { id: settings.theme.id },
      data,
    );
    if (!result.affected) {
      throw new InternalServerErrorException('Failed to update theme');
    }

    const modifiedTheme = await this.themeRepository.findOne({
      where: { id: settings.theme.id },
    });

    if (!modifiedTheme) {
      throw new InternalServerErrorException('Failed to find modified theme');
    }

    return modifiedTheme;
  }

  async getPaymentData(associationId: string): Promise<PaymentData> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings.paymentData;
  }

  async updatePaymentData(
    associationId: string,
    data: UpdatePaymentDataDto,
  ): Promise<PaymentData> {
    const association = this.associationRepository.findOne({
      where: { id: associationId },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const settings = await this.settingsRepository.findOne({
      where: { association: { id: associationId } },
      relations: ['paymentData'],
    });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const result = await this.paymentDataRepository.update(
      { id: settings.paymentData.id },
      data,
    );
    if (!result.affected) {
      throw new InternalServerErrorException('Failed to update payment data');
    }

    if (data.contributionPrice) {
      await this.paymentService.updateSubscriptions(
        settings.paymentData.stripeAccountId,
        associationId,
        { constributionPrice: data.contributionPrice },
      );
    }

    const modifiedPaymentData = await this.paymentDataRepository.findOne({
      where: { id: settings.paymentData.id },
    });

    if (!modifiedPaymentData) {
      throw new InternalServerErrorException(
        'Failed to find modified payment data',
      );
    }

    return modifiedPaymentData;
  }
}
