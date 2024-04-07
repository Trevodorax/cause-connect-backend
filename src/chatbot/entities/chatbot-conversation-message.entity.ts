import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatbotConversation } from './chatbot-conversation.entity';
import { ChatbotChatRole } from '../constants';

@Entity()
export class ChatbotConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: ChatbotChatRole })
  role: ChatbotChatRole;

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
