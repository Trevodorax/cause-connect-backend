import { Module } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';
import { PollQuestionModule } from 'src/poll-question/poll-question.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vote]), PollQuestionModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
