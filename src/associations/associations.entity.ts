import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Project } from 'src/projects/projects.entity';
import { Survey } from 'src/surveys/surveys.entity';
import { User } from 'src/users/users.entity';
import { Vote } from 'src/votes/entities/votes.entity';
import { Event } from 'src/events/entities/events.entity';
import { Settings } from 'src/settings/entities/settings.entity';

@Entity()
export class Association {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: '' })
  logo: string;

  @Column('varchar', { length: 1000 })
  description: string;

  @OneToMany(() => User, (user) => user.association)
  members: User[];

  @OneToMany(() => Project, (project) => project.association)
  projects: Project[];

  @OneToMany(() => Survey, (survey) => survey.association)
  surveys: Survey[];

  @OneToMany(() => Vote, (vote) => vote.association)
  votes: Vote[];

  @OneToMany(() => Event, (event) => event.association)
  events: Event[];

  @OneToOne(() => Settings, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  settings: Settings;
}
