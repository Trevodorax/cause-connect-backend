import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PollQuestion,
  PollQuestionType,
} from './entities/poll-question.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { PollOption } from './entities/poll-option.entity';
import { z } from 'zod';

export const PollQuestionTypeSchema = z.enum([
  PollQuestionType.SINGLE_CHOICE,
  PollQuestionType.MULTIPLE_CHOICE,
]);

interface AnswersDto {
  responderId: string;
  optionIds: string[];
  questionId: string;
}

export interface QuestionAnswersCount {
  questionId: string;
  optionCounts: QuestionAnswerCount[];
}

interface QuestionAnswerCount {
  optionId: string;
  count: number;
}

export const NewPollQuestionSchema = z.object({
  prompt: z.string(),
  type: PollQuestionTypeSchema,
  options: z.array(z.object({ content: z.string() })),
  surveyId: z.string(),
});

export type NewPollQuestionDto = z.infer<typeof NewPollQuestionSchema>;

export const NewPollOptionSchema = z.object({
  content: z.string(),
});

type NewPollOptionDto = z.infer<typeof NewPollOptionSchema>;

@Injectable()
export class PollQuestionService {
  constructor(
    @InjectRepository(PollQuestion)
    private pollQuestionRepository: Repository<PollQuestion>,
    @InjectRepository(PollOption)
    private pollOptionRepository: Repository<PollOption>,
    private usersService: UsersService,
  ) {}
  async create(pollQuestion: NewPollQuestionDto): Promise<PollQuestion> {
    // create question
    const result = await this.pollQuestionRepository.insert({
      prompt: pollQuestion.prompt,
      type: pollQuestion.type,
      survey: { id: pollQuestion.surveyId },
    });

    const questionId = result.generatedMaps[0].id;
    const question = await this.findById(questionId);
    if (!question) {
      throw new InternalServerErrorException('Failed to create question');
    }

    // create options and add them to question
    await Promise.all(
      pollQuestion.options.map((option) =>
        this.createPollOption(option, questionId),
      ),
    );

    return question;
  }

  async createPollOption(
    pollOption: NewPollOptionDto,
    questionId: string,
  ): Promise<PollOption> {
    const result = await this.pollOptionRepository.insert({
      content: pollOption.content,
      question: { id: questionId },
    });

    const optionId = result.generatedMaps[0].id;
    const option = await this.pollOptionRepository.findOne({
      where: { id: optionId },
    });
    if (!option) {
      throw new InternalServerErrorException('Failed to create option');
    }

    return option;
  }

  async findById(id: string): Promise<PollQuestion> {
    const question = await this.pollQuestionRepository.findOne({
      where: { id },
      relations: ['options'],
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async sendAnswers(answers: AnswersDto) {
    // validate input
    const question = await this.findById(answers.questionId);
    if (
      question.type === PollQuestionType.SINGLE_CHOICE &&
      answers.optionIds.length > 1
    ) {
      throw new UnprocessableEntityException(
        'Single choice question can only have one answer',
      );
    }

    const possibleOptionIds = question.options.map((option) => option.id);
    const validOptionIds = answers.optionIds.filter((optionId) =>
      possibleOptionIds.includes(optionId),
    );

    const userAlreadyAnswered = await this.pollOptionRepository.existsBy({
      question: { id: answers.questionId },
      responders: { id: answers.responderId },
    });
    if (userAlreadyAnswered) {
      throw new UnauthorizedException(
        'You have already answered this question',
      );
    }

    this.usersService.addAnswersToUser(answers.responderId, validOptionIds);
  }

  async getAnswersCount(questionId: string): Promise<QuestionAnswersCount> {
    const question = await this.findById(questionId);
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const optionIds = question.options.map((option) => option.id);
    const optionCounts = await Promise.all(
      optionIds.map(async (optionId) => await this.getAnswerCount(optionId)),
    );

    return {
      questionId,
      optionCounts,
    };
  }

  async getAnswerCount(optionId: string): Promise<QuestionAnswerCount> {
    const option = await this.pollOptionRepository.findOne({
      where: { id: optionId },
      relations: ['responders'],
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

    return {
      optionId,
      count: option.responders.length,
    };
  }

  async delete(id: string): Promise<PollQuestion> {
    const question = await this.pollQuestionRepository.findOne({
      where: { id },
      relations: ['options'],
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.pollQuestionRepository.delete({ id });
    return question;
  }
}
