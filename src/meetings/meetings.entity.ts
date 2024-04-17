import { Event } from 'src/events/entities/events.entity';
import { Vote } from 'src/votes/entities/votes.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Entity()
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agendum: string;

  @Column({ default: '' })
  presenceCode: string;

  @OneToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn()
  event: Event;

  @OneToMany(() => Vote, (vote) => vote.meeting, { cascade: true })
  votes: Vote[];
}
