import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Theme } from './themes.entity';
import { Association } from 'src/associations/associations.entity';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: null })
  contributionPrice: number;

  @Column({ default: null })
  contributionInterval: number;

  @OneToOne(() => Theme, { onDelete: 'CASCADE' })
  @JoinColumn()
  theme: Theme;

  @OneToOne(() => Association)
  @JoinColumn()
  association: Association;
}
