import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Association } from 'src/associations/associations.entity';
import { Ballot } from './ballots.entity';

export enum VoteStatus {
  NOT_STARTED = 'not_started',
  OPEN = 'open',
  DONE = 'done',
}

export enum VoteVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum VoteAcceptanceCriteria {
  MAJORITY = 'majority',
  TWO_THIRDS = 'two_thirds',
  UNANIMITY = 'unanimity',
}

@Entity()
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'simple-enum', enum: VoteStatus })
  status: VoteStatus;

  @Column({ type: 'simple-enum', enum: VoteVisibility })
  visibility: VoteVisibility;

  @Column()
  minPercentAnswers: number;

  @Column({ type: 'simple-enum', enum: VoteAcceptanceCriteria })
  acceptanceCriteria: VoteAcceptanceCriteria;

  @ManyToOne(() => Association, (association) => association.votes)
  association: Association;

  @OneToMany(() => Ballot, (ballot) => ballot.vote)
  ballots: Ballot[];

  @Column({ default: 1 })
  currentBallot: number;
}
