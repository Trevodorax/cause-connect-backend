import { Project } from 'src/projects/projects.entity';
import { Survey } from 'src/surveys/surveys.entity';
import { User } from 'src/users/users.entity';
import { Vote } from 'src/votes/entities/votes.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Event } from 'src/events/entities/events.entity';

@Entity()
export class Association {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: '' })
  logo: string;

  @Column()
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
}
