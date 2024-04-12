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
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { EventUserEnrollment } from 'src/events/entities/event-user-enrollments';
import { DocumentAccess } from 'src/documents/entities/document-access.entity';
import { ChatbotConversation } from 'src/chatbot/entities/chatbot-conversation.entity';

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

  @Column({ default: null })
  stripeCustomerId: string;

  @ManyToOne(() => Association, (association) => association.members)
  association: Association;

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @ManyToMany(() => PollOption, (answer) => answer.responders)
  @JoinTable()
  answers: PollOption[];

  @OneToMany(() => EventUserEnrollment, (enrollment) => enrollment.user)
  eventUserEnrollments: EventUserEnrollment[];

  @OneToMany(() => DocumentAccess, (documentAccess) => documentAccess.user)
  documentAccesses: DocumentAccess[];

  @OneToOne(() => ChatbotConversation, (conversation) => conversation.user, {
    nullable: true,
  })
  chatbotConversation?: ChatbotConversation;

  @CreateDateColumn()
  createdAt: Date;
}
