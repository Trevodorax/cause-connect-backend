import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PaymentData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  contributionPrice: number;

  @Column({ default: null })
  stripeProductId: string;

  @Column({ default: null })
  stripeAccountId: string;
}
