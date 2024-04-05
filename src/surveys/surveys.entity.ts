import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Association } from 'src/associations/associations.entity';
import { PollQuestion } from 'src/poll-question/entities/poll-question.entity';

export enum SurveyStatus {
  NOT_STARTED = 'not_started',
  OPEN = 'open',
  DONE = 'done',
}

export enum SurveyVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity()
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'simple-enum', enum: SurveyVisibility })
  visibility: SurveyVisibility;

  @ManyToOne(() => Association, (association) => association.surveys)
  association: Association;

  @OneToMany(() => PollQuestion, (question) => question.survey)
  questions: PollQuestion[];
}
