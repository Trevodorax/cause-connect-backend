import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { z } from 'zod';
import { NewPollQuestionSchema } from 'src/poll-question/poll-question.service';
import { Roles } from 'src/auth/rules.decorator';
import { CustomExceptionFilter } from 'src/CustomExceptionFilter';
import { VoteVisibility } from './entities/votes.entity';

interface VoteResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
}

export interface FullVoteResponse extends VoteResponse {
  questions: {
    id: string;
    prompt: string;
    type: string;
    options: { id: string; content: string }[];
  }[];
}

const CreateVoteSchema = z.object({
  title: z.string(),
  description: z.string(),
  visibility: z.enum([VoteVisibility.PUBLIC, VoteVisibility.PRIVATE]),
  questions: z.array(NewPollQuestionSchema.omit({ voteId: true })),
});

const AnswerVoteSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionIds: z.array(z.string()),
    }),
  ),
});

@UseFilters(new CustomExceptionFilter())
@Controller('votes')
export class VotesController {
  constructor(private readonly voteService: VotesService) {}

  @Get()
  async getPublicVotesForUserAssociation(
    @GetUser() user: User,
  ): Promise<VoteResponse[]> {
    const votes = await this.voteService.findAllPublicByAssociation(
      user.association.id,
    );

    return votes.map((vote) => ({
      id: vote.id,
      title: vote.title,
      description: vote.description,
      status: vote.status,
      visibility: vote.visibility,
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
      title: validVote.title,
      description: validVote.description,
      associationId: user.association.id,
      visibility: validVote.visibility,
      questions: validVote.questions,
    });

    return {
      id: newVote.id,
      title: newVote.title,
      description: newVote.description,
      status: newVote.status,
      visibility: newVote.visibility,
    };
  }

  @Get(':voteId')
  async getVote(@Param('voteId') voteId: string): Promise<FullVoteResponse> {
    const vote = await this.voteService.findFullById(voteId);
    return vote;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':voteId')
  async deleteVote(@Param('voteId') voteId: string): Promise<VoteResponse> {
    const vote = await this.voteService.delete(voteId);
    return {
      id: vote.id,
      title: vote.title,
      description: vote.description,
      status: vote.status,
      visibility: vote.visibility,
    };
  }

  @Roles(UserRole.ADMIN)
  @Patch(':voteId')
  async updateVote(
    @Param('voteId') voteId: string,
    @Body() vote: Partial<z.infer<typeof CreateVoteSchema>>,
  ): Promise<VoteResponse> {
    const updatedVote = await this.voteService.update(voteId, vote);
    return {
      id: updatedVote.id,
      title: updatedVote.title,
      description: updatedVote.description,
      status: updatedVote.status,
      visibility: updatedVote.visibility,
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
      ...answers,
    });
  }

  @Get(':voteId/results')
  async getVoteResults(@Param('voteId') voteId: string) {
    return this.voteService.getResults(voteId);
  }
}
