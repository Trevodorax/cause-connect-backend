import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { PollOption } from './poll-option.entity';
import { Survey } from 'src/surveys/surveys.entity';

export enum PollQuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'mutliple_choice',
}

@Entity()
export class PollQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  prompt: string;

  @Column({ type: 'simple-enum', enum: PollQuestionType })
  type: PollQuestionType;

  @OneToMany(() => PollOption, (option) => option.question)
  options: PollOption[];

  @ManyToOne(() => Survey, (survey) => survey.questions, {
    onDelete: 'CASCADE',
  })
  survey: Survey;
}
