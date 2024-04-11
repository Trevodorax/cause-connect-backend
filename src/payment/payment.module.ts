import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from '../settings/entities/settings.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
