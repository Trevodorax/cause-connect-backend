import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CheckoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  associationId: string;
}
