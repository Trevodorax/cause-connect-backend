import {
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatbotConversationMessage } from './chatbot-conversation-message.entity';
import { User } from 'src/users/users.entity';

@Entity()
export class ChatbotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.chatbotConversation, {
    cascade: ['remove'],
  })
  @JoinColumn()
  user: User;

  @OneToMany(
    () => ChatbotConversationMessage,
    (message) => message.conversation,
    {
      cascade: ['insert', 'update', 'remove'],
    },
  )
  messages: ChatbotConversationMessage[];
}
