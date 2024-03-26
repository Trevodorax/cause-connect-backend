import { Association } from 'src/associations/associations.entity';
import { PollOption } from 'src/poll-question/entities/poll-option.entity';
import { Task } from 'src/tasks/tasks.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true })
  passwordResetCode?: string;

  @Column({ type: 'simple-enum', enum: UserRole })
  role: UserRole;

  @ManyToOne(() => Association, (association) => association.members)
  association: Association;

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @ManyToMany(() => PollOption, (answer) => answer.responders)
  @JoinTable()
  answers: PollOption[];
}
