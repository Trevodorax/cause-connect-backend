import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PaymentData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  contributionPrice: number;

  @Column({ default: null })
  stripePlanId: string;

  @Column({ default: null })
  stripeAccountId: string;

  @Column({ default: null })
  stripeSessionInProgress: boolean;
}
