import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/users.entity';
import { ChatbotChatRole } from './constants';

interface ChatbotConversationMessageResponse {
  id: string;
  role: ChatbotChatRole;
  content: string;
  createdAt: Date;
}

interface ChatbotConversationResponse {
  id: string;
  messages: ChatbotConversationMessageResponse[];
}

interface ChatbotAnswerResponse {
  message: string;
}

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('send-question')
  async sendQuestion(
    @Body() body: { question: string },
    @GetUser() user: User,
  ): Promise<ChatbotAnswerResponse> {
    const answer = await this.chatbotService.sendQuestion({
      newMessage: body.question,
      senderId: user.id,
    });

    return {
      message: answer,
    };
  }

  @Delete('reset')
  async resetConversation(
    @GetUser() user: User,
  ): Promise<ChatbotConversationResponse> {
    const conversation = await this.chatbotService.resetConversation(user.id);

    return {
      id: conversation.id,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  }

  @Get('conversation')
  async getConversation(
    @GetUser() user: User,
  ): Promise<ChatbotConversationResponse> {
    const conversation = await this.chatbotService.getUserConversation(user.id);
    return {
      id: conversation.id,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  }
}
