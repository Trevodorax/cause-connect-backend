import { Module } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';
import { PollQuestionModule } from 'src/poll-question/poll-question.module';
import { Ballot } from './entities/ballots.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Ballot]), PollQuestionModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
