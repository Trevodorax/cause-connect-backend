import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { PollQuestion } from './poll-question.entity';
import { User } from 'src/users/users.entity';

@Entity()
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @ManyToOne(() => PollQuestion, (pollQuestion) => pollQuestion.options, {
    onDelete: 'CASCADE',
  })
  question: PollQuestion;

  @ManyToMany(() => User, (user) => user.answers, {
    cascade: true,
  })
  responders: User[];
}
