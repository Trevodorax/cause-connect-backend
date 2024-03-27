import { User } from 'src/users/users.entity';
import { Event } from './events.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class EventUserEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  userId: string;

  @Column()
  present: boolean;

  @ManyToOne(() => Event, (event) => event.eventUserEnrollments)
  event: Event;

  @ManyToOne(() => User, (user) => user.eventUserEnrollments)
  user: User;
}
