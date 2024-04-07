import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Settings } from './entities/settings.entity';
import { Theme } from './entities/themes.entity';
import { Association } from 'src/associations/associations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings, Theme, Association])],
  exports: [SettingsService],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
