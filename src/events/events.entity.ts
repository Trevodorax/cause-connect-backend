import { Association } from 'src/associations/associations.entity';
import { User } from 'src/users/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
} from 'typeorm';

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  summary: string;

  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @Column({ type: 'simple-enum', enum: EventVisibility })
  visibility: EventVisibility;

  @ManyToMany(() => User, (user) => user.events)
  @JoinTable()
  participants: User[];

  @ManyToOne(() => Association, (association) => association.events)
  association: Association;
}
