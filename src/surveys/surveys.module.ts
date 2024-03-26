import { Module } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from './surveys.entity';
import { PollQuestionModule } from 'src/poll-question/poll-question.module';

@Module({
  imports: [TypeOrmModule.forFeature([Survey]), PollQuestionModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
