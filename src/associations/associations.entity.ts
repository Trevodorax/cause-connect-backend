import { Project } from 'src/projects/projects.entity';
import { Survey } from 'src/surveys/surveys.entity';
import { User } from 'src/users/users.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class Association {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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
}
