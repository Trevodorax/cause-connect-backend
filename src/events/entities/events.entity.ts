import { Association } from 'src/associations/associations.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { EventUserEnrollment } from './event-user-enrollments';

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

  @OneToMany(
    () => EventUserEnrollment,
    (eventUserEnrollment) => eventUserEnrollment.event,
  )
  eventUserEnrollments: EventUserEnrollment[];

  @ManyToOne(() => Association, (association) => association.events)
  association: Association;

  @CreateDateColumn()
  createdAt: Date;
}
