import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Settings } from './entities/settings.entity';
import { PaymentData } from './entities/payment.entity';
import { Theme } from './entities/themes.entity';
import { Association } from 'src/associations/associations.entity';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settings, PaymentData, Theme, Association]),
    PaymentModule,
  ],
  exports: [SettingsService],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
