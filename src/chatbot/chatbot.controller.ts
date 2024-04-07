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
  question: ChatbotConversationMessageResponse;
  answer: ChatbotConversationMessageResponse;
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
      question: {
        id: answer.question.id,
        role: answer.question.role,
        content: answer.question.content,
        createdAt: answer.question.createdAt,
      },
      answer: {
        id: answer.answer.id,
        role: answer.answer.role,
        content: answer.answer.content,
        createdAt: answer.answer.createdAt,
      },
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
