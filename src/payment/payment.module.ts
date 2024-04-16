import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from '../settings/entities/settings.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EmailModule } from 'src/email/email.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settings]),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  exports: [PaymentService],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
