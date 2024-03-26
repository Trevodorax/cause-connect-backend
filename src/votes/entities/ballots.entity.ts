import { PollQuestion } from 'src/poll-question/entities/poll-question.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Vote } from './votes.entity';

@Entity()
export class Ballot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  number: number;

  @OneToOne(() => PollQuestion)
  @JoinColumn()
  question: PollQuestion;

  @ManyToOne(() => Vote, (vote) => vote.ballots)
  vote: Vote;
}
