import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { VotesService, VoteWinningOption } from './votes.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { z } from 'zod';
import {
  NewPollQuestionDto,
  NewPollQuestionSchema,
  QuestionAnswersCount,
} from 'src/poll-question/poll-question.service';
import { Roles } from 'src/auth/rules.decorator';
import {
  VoteAcceptanceCriteria,
  VoteStatus,
  VoteVisibility,
} from './entities/votes.entity';

interface VoteResponse {
  id: string;
  title: string;
  description: string;
  status: VoteStatus;
  visibility: VoteVisibility;
  minPercentAnswers: number;
  acceptanceCriteria: VoteAcceptanceCriteria;
}

interface PollQuestionResponse {
  id: string;
  prompt: string;
  type: string;
  options: { id: string; content: string }[];
}

export interface FullVoteResponse extends VoteResponse {
  question: PollQuestionResponse;
}

const CreateVoteSchema = z.object({
  title: z.string(),
  description: z.string(),
  visibility: z.enum([VoteVisibility.PUBLIC, VoteVisibility.PRIVATE]),
  minPercentAnswers: z.number(),
  acceptanceCriteria: z.enum([
    VoteAcceptanceCriteria.MAJORITY,
    VoteAcceptanceCriteria.TWO_THIRDS,
    VoteAcceptanceCriteria.UNANIMITY,
  ]),
  question: NewPollQuestionSchema.omit({ surveyId: true }),
});

const UpdateVoteSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  visibility: z
    .enum([VoteVisibility.PUBLIC, VoteVisibility.PRIVATE])
    .optional(),
  minPercentAnswers: z.number().optional(),
  acceptanceCriteria: z
    .enum([
      VoteAcceptanceCriteria.MAJORITY,
      VoteAcceptanceCriteria.TWO_THIRDS,
      VoteAcceptanceCriteria.UNANIMITY,
    ])
    .optional(),
});

const AnswerVoteSchema = z.object({
  optionIds: z.array(z.string()),
});

@Controller('votes')
export class VotesController {
  constructor(private readonly voteService: VotesService) {}

  @Get()
  async getVotesForUserAssociation(
    @GetUser() user: User,
  ): Promise<VoteResponse[]> {
    const votes = await this.voteService.findAllByAssociation(
      user.association.id,
      user.role,
    );

    return votes.map((vote) => ({
      id: vote.id,
      title: vote.title,
      description: vote.description,
      status: vote.status,
      visibility: vote.visibility,
      minPercentAnswers: vote.minPercentAnswers,
      acceptanceCriteria: vote.acceptanceCriteria,
    }));
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createVote(
    @GetUser() user: User,
    @Body() vote: z.infer<typeof CreateVoteSchema>,
  ): Promise<VoteResponse> {
    const validVote = CreateVoteSchema.parse(vote);

    const newVote = await this.voteService.create({
      ...validVote,
      associationId: user.association.id,
    });

    return {
      id: newVote.id,
      title: newVote.title,
      description: newVote.description,
      status: newVote.status,
      visibility: newVote.visibility,
      minPercentAnswers: newVote.minPercentAnswers,
      acceptanceCriteria: newVote.acceptanceCriteria,
    };
  }

  @Get(':voteId')
  async getVote(@Param('voteId') voteId: string): Promise<FullVoteResponse> {
    const vote = await this.voteService.findFullById(voteId);
    return vote;
  }

  @Roles(UserRole.ADMIN)
  @Patch(':voteId')
  async updateVote(
    @Param('voteId') voteId: string,
    @Body() vote: Partial<z.infer<typeof UpdateVoteSchema>>,
  ): Promise<VoteResponse> {
    const validVote = UpdateVoteSchema.parse(vote);
    const updatedVote = await this.voteService.update(voteId, validVote);
    return {
      id: updatedVote.id,
      title: updatedVote.title,
      description: updatedVote.description,
      status: updatedVote.status,
      visibility: updatedVote.visibility,
      minPercentAnswers: updatedVote.minPercentAnswers,
      acceptanceCriteria: updatedVote.acceptanceCriteria,
    };
  }

  @Post(':voteId/answers')
  async submitVoteAnswers(
    @GetUser() user: User,
    @Param('voteId') voteId: string,
    @Body() answers: z.infer<typeof AnswerVoteSchema>,
  ) {
    await this.voteService.answerVote({
      voteId,
      responderId: user.id,
      optionIds: answers.optionIds,
    });
  }

  @Roles(UserRole.ADMIN)
  @Post(':voteId/ballots')
  async openNewBallot(
    @Param('voteId') voteId: string,
    @Body() newQuestion: NewPollQuestionDto,
  ): Promise<PollQuestionResponse> {
    const pollQuestion = await this.voteService.openNewBallot(
      voteId,
      newQuestion,
    );

    return {
      id: pollQuestion.id,
      prompt: pollQuestion.prompt,
      type: pollQuestion.type,
      options: pollQuestion.options.map((option) => ({
        id: option.id,
        content: option.content,
      })),
    };
  }

  @Get(':voteId/results')
  async getCurrentBallotResults(
    @Param('voteId') voteId: string,
  ): Promise<QuestionAnswersCount> {
    return this.voteService.getCurrentBallotResults(voteId);
  }

  @Get(':voteId/winning-option')
  async getWinningOption(
    @Param('voteId') voteId: string,
  ): Promise<VoteWinningOption> {
    return this.voteService.getWinningOption(voteId);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':voteId/close')
  async closeVote(@Param('voteId') voteId: string) {
    await this.voteService.closeVote(voteId);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':voteId/open')
  async openVote(@Param('voteId') voteId: string) {
    await this.voteService.openVote(voteId);
  }
}
