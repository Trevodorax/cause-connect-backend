import { Injectable, NotFoundException } from '@nestjs/common';
import { CHAT_TEMPLATE, openAIConf, ChatbotChatRole } from './constants';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { ChatbotConversation } from './entities/chatbot-conversation.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatbotConversationMessage } from './entities/chatbot-conversation-message.entity';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { EventsService } from 'src/events/events.service';

interface SendQuestionDto {
  newMessage: string;
  senderId: string;
}

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(ChatbotConversation)
    private chatbotConversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotConversationMessage)
    private chatbotConversationMessageRepository: Repository<ChatbotConversationMessage>,
    private configService: ConfigService,
    private usersService: UsersService,
    private eventsService: EventsService,
  ) {}
  async sendQuestion(dto: SendQuestionDto): Promise<{
    question: ChatbotConversationMessage;
    answer: ChatbotConversationMessage;
  }> {
    const question = await this.addUserMessage(
      dto.senderId,
      ChatbotChatRole.USER,
      dto.newMessage,
    );

    const chain = this.loadSingleChain(CHAT_TEMPLATE);

    const context = await this.getConversationContext(dto.senderId);

    const response = await chain.invoke({
      ...context,
      input: question.content,
    });
    const stringResponse = this.responseToString(response);

    const answer = await this.addUserMessage(
      dto.senderId,
      ChatbotChatRole.ASSISTANT,
      stringResponse,
    );

    return {
      question,
      answer,
    };
  }

  async addUserMessage(
    userId: string,
    role: ChatbotChatRole,
    content: string,
  ): Promise<ChatbotConversationMessage> {
    const conversation = await this.getUserConversation(userId);

    const newMessage = this.chatbotConversationMessageRepository.create({
      role,
      content: content,
      conversation: conversation,
    });

    conversation.messages.push(newMessage);

    await this.chatbotConversationRepository.save(conversation);

    return newMessage;
  }

  async getUserMessages(userId: string): Promise<ChatbotConversationMessage[]> {
    const conversation = await this.chatbotConversationRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!conversation) {
      return [];
    }

    const messages = await this.chatbotConversationMessageRepository.find({
      where: { conversation: { id: conversation.id } },
      order: { createdAt: 'ASC' },
    });

    return messages;
  }

  async resetConversation(userId: string): Promise<ChatbotConversation> {
    const userConversation = await this.getUserConversation(userId);
    const deletedConversation =
      await this.chatbotConversationRepository.remove(userConversation);

    return deletedConversation;
  }

  getUserConversation = async (
    userId: string,
  ): Promise<ChatbotConversation> => {
    const conversation = await this.chatbotConversationRepository.findOne({
      where: { user: { id: userId } },
    });

    if (conversation) {
      const messages = await this.getUserMessages(userId);
      return {
        ...conversation,
        messages,
      };
    }

    const createdConversation = this.chatbotConversationRepository.create({
      user: { id: userId },
      messages: [],
    });

    const savedConversation =
      await this.chatbotConversationRepository.save(createdConversation);

    return {
      ...savedConversation,
      messages: [],
    };
  };

  private responseToString = (response: Uint8Array) =>
    Object.values(response)
      .map((code) => String.fromCharCode(code))
      .join('');

  private loadSingleChain = (template: string) => {
    const prompt = PromptTemplate.fromTemplate(template);

    const model = new ChatOpenAI({
      temperature: +openAIConf.BASIC_CHAT_OPENAI_TEMPERATURE,
      modelName: openAIConf.GPT_3_5_TURBO_1106.toString(),
      openAIApiKey: this.configService.get('OPENAI_API_KEY'),
    });

    const outputParser = new HttpResponseOutputParser();
    return prompt.pipe(model).pipe(outputParser);
  };

  private async getConversationContext(userId: string) {
    // history of the conversation
    const previousMessages = await this.getUserMessages(userId);
    const formattedPreviousMessages = previousMessages.map(
      (message) => `${message.role}: ${message.content}`,
    );

    // user and association info
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userInfo = {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      association: user.association,
    };

    // events
    const events = await this.eventsService.getAllPublicEventsInAssociation(
      user.association.id,
    );

    return {
      chatHistory: formattedPreviousMessages.join('\n'),
      userInfo: JSON.stringify(userInfo),
      associationInfo: JSON.stringify(user?.association),
      events: JSON.stringify(events),
    };
  }
}
