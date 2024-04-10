import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/events.entity';
import { Meeting } from 'src/meetings/meetings.entity';
import { User } from 'src/users/users.entity';
import { Vote } from 'src/votes/entities/votes.entity';
import { Survey } from 'src/surveys/surveys.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Meeting, User, Vote, Survey])],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
