import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotConversationMessage } from './entities/chatbot-conversation-message.entity';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { UsersModule } from 'src/users/users.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotConversationMessage, ChatbotConversation]),
    UsersModule,
    EventsModule,
  ],
  providers: [ChatbotService],
  controllers: [ChatbotController],
})
export class ChatbotModule {}
