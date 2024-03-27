import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EventsService,
  NewEventDto,
  PartialEventDto,
} from 'src/events/events.service';
import { Meeting } from './meetings.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/users.entity';
import { v4 as uuid } from 'uuid';

interface NewMeetingDto {
  agendum: string;
  event: NewEventDto;
}

interface PartialMeetingDto {
  agendum?: string;
  event?: PartialEventDto;
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly eventsService: EventsService,
    @InjectRepository(Meeting)
    private meetingsRepository: Repository<Meeting>,
  ) {}

  // use all services from events service but for meeting
  async createMeeting(newMeeting: NewMeetingDto): Promise<Meeting> {
    const event = await this.eventsService.createEvent(newMeeting.event);

    const draftMeeting = this.meetingsRepository.create({
      ...newMeeting,
      event,
    });
    const meeting = await this.meetingsRepository.save(draftMeeting);

    return meeting;
  }

  async getMeetingById(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }

    return meeting;
  }

  async getPublicMeetingsInAssociation(
    associationId: string,
  ): Promise<Meeting[]> {
    return this.meetingsRepository.find({
      where: { event: { association: { id: associationId } } },
      relations: ['event'],
    });
  }

  async updateMeeting(
    id: string,
    partialMeeting: PartialMeetingDto,
  ): Promise<Meeting> {
    const meeting = await this.getMeetingById(id);

    if (partialMeeting.event) {
      const updatedEvent = await this.eventsService.updateEvent(
        meeting.event.id,
        partialMeeting.event,
      );

      meeting.event = updatedEvent;
    }

    meeting.agendum = partialMeeting.agendum ?? meeting.agendum;

    this.meetingsRepository.save(meeting);

    return meeting;
  }

  async deleteMeeting(id: string): Promise<Meeting> {
    const meeting = await this.getMeetingById(id);
    const deletedMeeting = await this.meetingsRepository.remove(meeting);

    return deletedMeeting;
  }

  // add participants by id
  async addParticipants(id: string, participantIds: string[]): Promise<void> {
    const meetingId = await this.getEventId(id);
    await this.eventsService.addParticipants({
      eventId: meetingId,
      participantIds,
    });
  }

  // remove participants by id
  async removeParticipants(
    id: string,
    participantIds: string[],
  ): Promise<void> {
    const meetingId = await this.getEventId(id);
    await this.eventsService.removeParticipants({
      eventId: meetingId,
      participantIds,
    });
  }

  // get participants
  async getParticipants(id: string): Promise<User[]> {
    const meetingId = await this.getEventId(id);
    return this.eventsService.getParticipants(meetingId);
  }

  // declare a user as present in a meeting
  async answerPresent(
    id: string,
    userId: string,
    presenceCode: string,
  ): Promise<void> {
    const meeting = await this.getMeetingById(id);
    if (meeting.presenceCode !== presenceCode) {
      throw new UnauthorizedException('Invalid presence code');
    }

    const eventId = await this.getEventId(id);
    await this.eventsService.markUserPresent(eventId, userId);
  }

  async declareAbsent(id: string, userId: string): Promise<void> {
    const eventId = await this.getEventId(id);
    await this.eventsService.markUserAbsent(eventId, userId);
  }

  async getPresentParticipants(id: string): Promise<User[]> {
    const eventId = await this.getEventId(id);
    return this.eventsService.getPresentUsers(eventId);
  }

  async generatePresenceCode(id: string): Promise<string> {
    const meeting = await this.getMeetingById(id);
    const presenceCode = uuid();

    meeting.presenceCode = presenceCode;

    await this.meetingsRepository.save(meeting);

    return presenceCode;
  }

  private async getEventId(id: string): Promise<string> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }

    return meeting.event.id;
  }
}
