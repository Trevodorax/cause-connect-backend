import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from '../settings/entities/settings.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { User } from 'src/users/users.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Settings, User]), EmailModule],
  exports: [PaymentService],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
