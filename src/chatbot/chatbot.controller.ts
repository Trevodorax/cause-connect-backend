import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/users.entity';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('send-question')
  async sendQuestion(
    @Body() body: { question: string },
    @GetUser() user: User,
  ) {
    const answer = await this.chatbotService.sendQuestion({
      newMessage: body.question,
      senderId: user.id,
    });

    return {
      answer,
    };
  }

  @Delete('reset')
  async resetConversation(@GetUser() user: User) {
    return this.chatbotService.resetConversation(user.id);
  }

  @Get('conversation')
  async getConversation(@GetUser() user: User) {
    return this.chatbotService.getUserConversation(user.id);
  }
}
