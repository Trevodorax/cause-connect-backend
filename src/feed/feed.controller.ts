import { Controller, Get } from '@nestjs/common';
import { FeedService } from './feed.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/users/users.entity';

interface FeedItemResponse {
  id: string;
  type: 'event' | 'meeting' | 'user' | 'vote' | 'survey';
  title: string;
  description: string;
  createdAt: Date;
}

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('')
  async getFeed(@GetUser() user: User): Promise<FeedItemResponse[]> {
    const feed = await this.feedService.getFeed({
      associationId: user.association.id,
    });

    return feed;
  }
}
