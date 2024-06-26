import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Vote,
  VoteAcceptanceCriteria,
  VoteStatus,
  VoteVisibility,
} from './entities/votes.entity';
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
import { Ballot } from './entities/ballots.entity';
import { UserRole } from 'src/users/users.entity';

interface CreateVoteDto {
  title: string;
  description: string;
  associationId: string;
  visibility: VoteVisibility;
  minPercentAnswers: number;
  acceptanceCriteria: VoteAcceptanceCriteria;
  question: {
    prompt: string;
    type: PollQuestionType;
    options: { content: string }[];
  };
}

interface PartialVoteDto {
  title?: string;
  description?: string;
  associationId?: string;
  status?: VoteStatus;
  visibility?: VoteVisibility;
  minPercentAnswers?: number;
  acceptanceCriteria?: VoteAcceptanceCriteria;
}

interface AnswerVoteDto {
  voteId: string;
  responderId: string;
  optionIds: string[];
}

type BallotResults = QuestionAnswersCount;

export interface VoteWinningOption {
  optionId: string;
  isValid: boolean;
  lastBallotResults: BallotResults;
}

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Ballot)
    private ballotRepository: Repository<Ballot>,
    private pollQuestionService: PollQuestionService,
  ) {}
  // create a vote
  async create(vote: CreateVoteDto): Promise<Vote> {
    const result = await this.voteRepository.insert({
      title: vote.title,
      description: vote.description,
      visibility: vote.visibility,
      minPercentAnswers: vote.minPercentAnswers,
      acceptanceCriteria: vote.acceptanceCriteria,
      status: VoteStatus.NOT_STARTED,
      association: { id: vote.associationId },
    });
    const voteId = result.generatedMaps[0].id;
    const newVote = await this.findById(voteId);
    if (!newVote) {
      throw new InternalServerErrorException('Vote not created');
    }

    const ballot = await this.createBallot(vote.question, 1);

    newVote.ballots = [ballot];

    this.voteRepository.save(newVote);

    return newVote;
  }

  // get one vote by id
  async findById(id: string): Promise<Vote> {
    const vote = await this.voteRepository.findOne({
      where: { id },
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    return vote;
  }

  // get all votes for an association
  async findAllByAssociation(
    associationId: string,
    userRole: UserRole,
  ): Promise<Vote[]> {
    const votes = await this.voteRepository.find({
      where: {
        association: { id: associationId },
      },
    });

    if (userRole === UserRole.ADMIN) {
      return votes;
    }

    return votes.filter((vote) => vote.visibility === VoteVisibility.PUBLIC);
  }

  // get one full vote by id
  async findFullById(id: string): Promise<FullVoteResponse> {
    const vote = await this.voteRepository.findOne({
      where: { id },
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const ballot = await this.getLastBallot(vote.id, vote.currentBallot);

    return {
      ...vote,
      question: ballot.question,
    };
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

  // add a question to a vote
  async openNewBallot(
    voteId: string,
    question: NewPollQuestionDto,
  ): Promise<PollQuestion> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
      relations: ['ballots'],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const createdQuestion = await this.pollQuestionService.create({
      prompt: question.prompt,
      type: question.type,
      options: question.options,
    });

    const newBallot = await this.createBallot(
      createdQuestion,
      vote.currentBallot + 1,
    );

    vote.ballots.push(newBallot);
    vote.currentBallot++;

    this.voteRepository.save(vote);

    return createdQuestion;
  }

  // answer a vote
  async answerVote(answer: AnswerVoteDto): Promise<void> {
    const vote = await this.findById(answer.voteId);

    if (vote.status !== VoteStatus.OPEN) {
      throw new UnauthorizedException('Vote is not open');
    }

    const currentBallot = await this.getLastBallot(
      answer.voteId,
      vote.currentBallot,
    );

    await this.pollQuestionService.sendAnswers({
      questionId: currentBallot.question.id,
      optionIds: answer.optionIds,
      responderId: answer.responderId,
    });
  }

  // get the results of a vote
  async getCurrentBallotResults(voteId: string): Promise<BallotResults> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    const currentBallot = await this.getLastBallot(voteId, vote.currentBallot);

    const answersCount = await this.pollQuestionService.getAnswersCount(
      currentBallot.question.id,
    );

    return answersCount;
  }

  async getWinningOption(voteId: string): Promise<VoteWinningOption> {
    const vote = await this.findById(voteId);

    const answersCount = await this.getCurrentBallotResults(voteId);

    const totalVotesCount = answersCount.optionCounts.reduce(
      (acc, currentOptionCount) => acc + currentOptionCount.count,
      0,
    );

    const sortedOptions = answersCount.optionCounts.sort(
      (firstOption, secondOption) => secondOption.count - firstOption.count,
    );
    const winningOption = sortedOptions[0];

    // acceptance criteria
    const minNbVotesPerAcceptanceCriteria: {
      [key in VoteAcceptanceCriteria]: number;
    } = {
      [VoteAcceptanceCriteria.MAJORITY]: totalVotesCount / 2,
      [VoteAcceptanceCriteria.TWO_THIRDS]: (totalVotesCount / 3) * 2,
      [VoteAcceptanceCriteria.UNANIMITY]: totalVotesCount,
    };
    const isAcceptanceCriteriaMet =
      winningOption.count >
      minNbVotesPerAcceptanceCriteria[vote.acceptanceCriteria];

    // min percent answers
    const nbPeopleInVoteMeeting = await this.getNbPeopleInVoteMeeting(voteId);
    const minNbAnswers =
      nbPeopleInVoteMeeting ?? 0 * (vote.minPercentAnswers / 100);
    const isMinPercentAnswersMet = totalVotesCount > minNbAnswers;

    return {
      optionId: winningOption.optionId,
      isValid: isAcceptanceCriteriaMet && isMinPercentAnswersMet,
      lastBallotResults: answersCount,
    };
  }

  async openVote(voteId: string): Promise<void> {
    const vote = await this.findById(voteId);

    vote.status = VoteStatus.OPEN;

    this.voteRepository.save(vote);
  }

  async closeVote(voteId: string): Promise<void> {
    const vote = await this.findById(voteId);

    vote.status = VoteStatus.DONE;

    this.voteRepository.save(vote);
  }

  private async getLastBallot(
    voteId: string,
    currentBallotIndex: number,
  ): Promise<Ballot> {
    const lastBallot = await this.ballotRepository.findOne({
      where: { vote: { id: voteId }, number: currentBallotIndex },
      relations: ['question', 'question.options'],
    });
    if (!lastBallot) {
      throw new NotFoundException('Last ballot not found');
    }

    return lastBallot;
  }

  private async createBallot(
    question: NewPollQuestionDto,
    ballotNumber: number,
  ): Promise<Ballot> {
    const createdQuestion = await this.pollQuestionService.create({
      prompt: question.prompt,
      type: question.type,
      options: question.options,
    });

    const createBallotResponse = await this.ballotRepository.insert({
      number: ballotNumber,
      question: createdQuestion,
    });
    const ballotId = createBallotResponse.generatedMaps[0].id;

    const createdBallot = await this.ballotRepository.findOneBy({
      id: ballotId,
    });
    if (!createdBallot) {
      throw new InternalServerErrorException('Failed to create ballot.');
    }

    return createdBallot;
  }

  private async getNbPeopleInVoteMeeting(
    voteId: string,
  ): Promise<number | null> {
    const vote = await this.voteRepository.findOne({
      where: { id: voteId },
      relations: [
        'meeting',
        'meeting.event',
        'meeting.event.eventUserEnrollments',
      ],
    });
    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    if (!vote.meeting) {
      return null;
    }

    return vote.meeting.event.eventUserEnrollments.length;
  }
}
