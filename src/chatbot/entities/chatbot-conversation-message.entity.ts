import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatbotConversation } from './chatbot-conversation.entity';
import { VercelChatRole } from '../utils';

@Entity()
export class ChatbotConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: VercelChatRole })
  role: VercelChatRole;

  @Column('varchar', { length: 3000 })
  content: string;

  @ManyToOne(
    () => ChatbotConversation,
    (conversation) => conversation.messages,
    { onUpdate: 'CASCADE', onDelete: 'CASCADE' },
  )
  conversation: ChatbotConversation;

  @CreateDateColumn()
  createdAt: Date;
}
