import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventVisibility } from './events.entity';
import { User } from 'src/users/users.entity';
import { AssociationsService } from 'src/associations/associations.service';

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
    const event = await this.eventsRepository.findOne({
      where: { id: dto.eventId },
      relations: ['participants'],
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${dto.eventId} not found`);
    }

    const newParticipants = dto.participantIds.map((id) => ({ id }) as User);
    event.participants = [...event.participants, ...newParticipants];
    await this.eventsRepository.save(event);
  }

  // remove participants by id
  async removeParticipants(dto: EventParticipantsDto): Promise<void> {
    const event = await this.eventsRepository.findOne({
      where: { id: dto.eventId },
      relations: ['participants'],
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${dto.eventId} not found`);
    }

    const participants = event.participants.filter(
      (participant) => !dto.participantIds.includes(participant.id),
    );
    event.participants = participants;
    await this.eventsRepository.save(event);
  }

  // get participants
  async getParticipants(eventId: string): Promise<User[]> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['participants'],
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    return event.participants;
  }
}
