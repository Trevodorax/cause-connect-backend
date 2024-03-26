import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vote, VoteStatus, VoteVisibility } from './entities/votes.entity';
import { Repository } from 'typeorm';
import {
  NewPollQuestionDto,
  PollQuestionService,
  QuestionAnswersCount,
} from 'src/poll-question/poll-question.service';
import {
  PollQuestion,
  PollQuestionType,
} from 'src/poll-question/entities/poll-question.entity';
import { FullVoteResponse } from './votes.controller';

interface CreateVoteDto {
  title: string;
  description: string;
  associationId: string;
  visibility: VoteVisibility;
  questions: {
    prompt: string;
    type: PollQuestionType;
    options: { content: string }[];
  }[];
}

interface PartialVoteDto {
  title?: string;
  description?: string;
  associationId?: string;
  status?: VoteStatus;
  visibility?: VoteVisibility;
}

interface AnswerVoteDto {
  voteId: string;
  responderId: string;
  answers: {
    questionId: string;
    optionIds: string[];
  }[];
}

type VoteResults = QuestionAnswersCount[];

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    private pollQuestionService: PollQuestionService,
  ) {}
  // create a vote
  async create(vote: CreateVoteDto): Promise<Vote> {
    const result = await this.voteRepository.insert({
      title: vote.title,
      description: vote.description,
      visibility: vote.visibility,
      status: VoteStatus.NOT_STARTED,
      association: { id: vote.associationId },
    });
    const voteId = result.generatedMaps[0].id;
    const newVote = await this.findById(voteId);

    if (!newVote) {
      throw new InternalServerErrorException('Vote not created');
    }

    vote.questions.map(async (question) =>
      this.pollQuestionService.create({
        prompt: question.prompt,
        type: question.type,
        options: question.options,
        voteId: voteId,
      }),
    );

    return newVote;
  }

  // get all votes for an association
  async findAllPublicByAssociation(associationId: string): Promise<Vote[]> {
    return this.voteRepository.find({
      where: {
        association: { id: associationId },
        visibility: VoteVisibility.PUBLIC,
      },
    });
  }

  // get one vote by id
  async findById(id: string): Promise<Vote> {
    const vote = await this.voteRepository.findOneBy({ id });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    return vote;
  }

  // get one full vote by id
  async findFullById(id: string): Promise<FullVoteResponse> {
    const vote = await this.voteRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    return vote;
  }

  // update a vote by id
  async update(id: string, vote: PartialVoteDto): Promise<Vote> {
    await this.voteRepository.update({ id }, vote);

    const updatedVote = await this.findById(id);
    if (!updatedVote) {
      throw new NotFoundException('Vote not found');
    }

    return updatedVote;
  }

  // delete a vote by id
  async delete(id: string): Promise<Vote> {
    const vote = await this.findById(id);
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    await this.voteRepository.delete(vote);

    return vote;
  }

  // add a question to a vote
  async addQuestion(
    voteId: string,
    question: NewPollQuestionDto,
  ): Promise<PollQuestion[]> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
      relations: ['questions'],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const createdQuestion = await this.pollQuestionService.create({
      prompt: question.prompt,
      type: question.type,
      options: question.options,
      voteId,
    });

    return [...vote.questions, createdQuestion];
  }

  // remove a question from a vote
  async removeQuestion(
    voteId: string,
    questionId: string,
  ): Promise<PollQuestion[]> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
      relations: ['questions'],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const deletedQuestion = await this.pollQuestionService.delete(questionId);
    if (!deletedQuestion) {
      throw new NotFoundException('Question not found');
    }

    return vote.questions.filter((question) => question.id !== questionId);
  }

  // answer a vote
  async answerVote(answer: AnswerVoteDto): Promise<void> {
    await Promise.all(
      answer.answers.map(async (currentAnswer) => {
        await this.pollQuestionService.sendAnswers({
          questionId: currentAnswer.questionId,
          optionIds: currentAnswer.optionIds,
          responderId: answer.responderId,
        });
      }),
    );
  }

  // get the results of a vote
  async getResults(voteId: string): Promise<VoteResults> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
      relations: ['questions'],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const answers = Promise.all(
      vote.questions.map(async (question) => {
        const answersCount = await this.pollQuestionService.getAnswersCount(
          question.id,
        );

        return answersCount;
      }),
    );

    return answers;
  }
}
