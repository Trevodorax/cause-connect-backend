import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '#1677FF' })
  color: string;

  @Column({ default: 'Inter' })
  font: string;
}
