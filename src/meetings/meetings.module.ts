import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './meetings.entity';
import { EventsModule } from 'src/events/events.module';
import { VotesModule } from 'src/votes/votes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting]), EventsModule, VotesModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
