import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventVisibility } from 'src/events/entities/events.entity';
import { Meeting } from 'src/meetings/meetings.entity';
import { Survey, SurveyVisibility } from 'src/surveys/surveys.entity';
import { User } from 'src/users/users.entity';
import { Vote, VoteVisibility } from 'src/votes/entities/votes.entity';
import { Repository } from 'typeorm';

interface FeedItem {
  id: string;
  type: 'event' | 'meeting' | 'user' | 'vote' | 'survey';
  title: string;
  description: string;
  createdAt: Date;
}

interface GetFeedDto {
  associationId: string;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
  ) {}

  async getFeed(dto: GetFeedDto): Promise<FeedItem[]> {
    // get all entities
    const events = await this.eventRepository.find({
      where: {
        association: { id: dto.associationId },
        visibility: EventVisibility.PUBLIC,
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const users = await this.userRepository.find({
      where: { association: { id: dto.associationId } },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const votes = await this.voteRepository.find({
      where: {
        association: { id: dto.associationId },
        visibility: VoteVisibility.PUBLIC,
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const surveys = await this.surveyRepository.find({
      where: {
        association: { id: dto.associationId },
        visibility: SurveyVisibility.PUBLIC,
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // transform entities to feed items
    const eventFeedItems = await Promise.all(
      events.map((event) => this.feedItemFromEvent(event)),
    );
    const userFeedItems = users.map(this.feedItemFromUser);
    const voteFeedItems = votes.map(this.feedItemFromVote);
    const surveyFeedItems = surveys.map(this.feedItemFromSurvey);

    // return all feed items sorted by DESC createdAt
    return [
      ...eventFeedItems,
      ...userFeedItems,
      ...voteFeedItems,
      ...surveyFeedItems,
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async feedItemFromEvent(event: Event): Promise<FeedItem> {
    const meeting = await this.meetingRepository.findOne({
      where: { event: { id: event.id } },
    });

    if (meeting) {
      return {
        id: meeting.id,
        type: 'meeting',
        title: event.title,
        description: event.description,
        createdAt: event.createdAt,
      };
    }

    return {
      id: event.id,
      type: 'event',
      title: event.title,
      description: event.description,
      createdAt: event.createdAt,
    };
  }

  private feedItemFromUser(user: User): FeedItem {
    return {
      id: user.id,
      type: 'user',
      title: user.fullName,
      description: user.email,
      createdAt: user.createdAt,
    };
  }

  private feedItemFromVote(vote: Vote): FeedItem {
    return {
      id: vote.id,
      type: 'vote',
      title: vote.title,
      description: vote.description,
      createdAt: vote.createdAt,
    };
  }

  private feedItemFromSurvey(survey: Survey): FeedItem {
    return {
      id: survey.id,
      type: 'survey',
      title: survey.title,
      description: survey.description,
      createdAt: survey.createdAt,
    };
  }
}
