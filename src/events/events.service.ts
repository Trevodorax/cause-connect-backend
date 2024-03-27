import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Event, EventVisibility } from './entities/events.entity';
import { User } from 'src/users/users.entity';
import { AssociationsService } from 'src/associations/associations.service';
import { EventUserEnrollment } from './entities/event-user-enrollments';

export interface NewEventDto {
  title: string;
  description: string;
  summary: string;
  visibility: EventVisibility;
  startTime: Date;
  endTime: Date;

  associationId: string;
}

export interface PartialEventDto {
  title?: string;
  description?: string;
  summary?: string;
  visibility?: EventVisibility;
  startTime?: Date;
  endTime?: Date;
}

export interface EventParticipantsDto {
  eventId: string;
  participantIds: string[];
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(EventUserEnrollment)
    private eventUserEnrollmentsRepository: Repository<EventUserEnrollment>,
    private associationsService: AssociationsService,
  ) {}
  // create
  async createEvent(newEvent: NewEventDto): Promise<Event> {
    const association = await this.associationsService.getAssociation(
      newEvent.associationId,
    );

    const draftEvent = this.eventsRepository.create({
      ...newEvent,
      association,
    });
    const event = await this.eventsRepository.save(draftEvent);
    return event;
  }

  // get one
  async getEventById(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    return event;
  }

  // get all public
  async getAllPublicEventsInAssociation(
    associationId: string,
  ): Promise<Event[]> {
    return this.eventsRepository.find({
      where: {
        visibility: EventVisibility.PUBLIC,
        association: { id: associationId },
      },
    });
  }

  // update
  async updateEvent(id: string, changes: PartialEventDto): Promise<Event> {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    const updatedEvent = await this.eventsRepository.save({
      ...event,
      ...changes,
    });

    return updatedEvent;
  }

  // delete
  async deleteEvent(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    await this.eventsRepository.delete(id);
    return event;
  }

  // add participants by id
  async addParticipants(dto: EventParticipantsDto): Promise<void> {
    const alreadyEnrolled = await this.eventUserEnrollmentsRepository.exists({
      where: {
        eventId: dto.eventId,
        userId: In(dto.participantIds),
      },
    });
    if (alreadyEnrolled) {
      throw new BadRequestException(
        'At least one user in the list is already enrolled',
      );
    }

    try {
      await this.eventUserEnrollmentsRepository.save(
        dto.participantIds.map((participantId) => ({
          eventId: dto.eventId,
          userId: participantId,
          present: false,
        })),
      );
    } catch (e) {
      throw new NotFoundException('Event or user not found');
    }
  }

  // remove participants by id
  async removeParticipants(dto: EventParticipantsDto): Promise<void> {
    await this.eventUserEnrollmentsRepository.delete({
      eventId: dto.eventId,
      userId: In(dto.participantIds),
    });
  }

  // get participants
  async getParticipants(eventId: string): Promise<User[]> {
    const enrollments = await this.eventUserEnrollmentsRepository.find({
      where: { eventId },
      relations: ['user'],
    });

    return enrollments.map((enrollment) => enrollment.user);
  }

  // mark user as present
  async markUserPresent(eventId: string, userId: string): Promise<void> {
    await this.eventUserEnrollmentsRepository.update(
      { eventId, userId },
      { present: true },
    );
  }

  // mark user as absent
  async markUserAbsent(eventId: string, userId: string): Promise<void> {
    await this.eventUserEnrollmentsRepository.update(
      { eventId, userId },
      { present: false },
    );
  }

  // get present users
  async getPresentUsers(eventId: string): Promise<User[]> {
    const enrollments = await this.eventUserEnrollmentsRepository.find({
      where: { eventId, present: true },
      relations: ['user'],
    });

    return enrollments.map((enrollment) => enrollment.user);
  }
}
