import { Association } from 'src/associations/associations.entity';
import { Task } from 'src/tasks/tasks.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @ManyToOne(() => Association, (association) => association.projects)
  association: Association;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}
