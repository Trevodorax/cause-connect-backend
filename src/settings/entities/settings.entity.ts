import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Theme } from './themes.entity';
import { PaymentData } from './payment.entity';
import { Association } from 'src/associations/associations.entity';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => PaymentData, { onDelete: 'CASCADE' })
  @JoinColumn()
  paymentData: PaymentData;

  @OneToOne(() => Theme, { onDelete: 'CASCADE' })
  @JoinColumn()
  theme: Theme;

  @OneToOne(() => Association)
  @JoinColumn()
  association: Association;
}
