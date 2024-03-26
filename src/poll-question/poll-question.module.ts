import { Module } from '@nestjs/common';
import { PollQuestionService } from './poll-question.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PollQuestion } from './entities/poll-question.entity';
import { PollOption } from './entities/poll-option.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([PollQuestion, PollOption]), UsersModule],
  providers: [PollQuestionService],
  exports: [PollQuestionService],
})
export class PollQuestionModule {}
