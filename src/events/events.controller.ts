import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { z } from 'zod';
import { EventVisibility } from './events.entity';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { UserResponse } from 'src/users/users.controller';

const createEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  summary: z.string(),
  visibility: z.enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE]),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  visibility: z
    .enum([EventVisibility.PUBLIC, EventVisibility.PRIVATE])
    .optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

interface EventResponse {
  id: string;
  title: string;
  description: string;
  summary: string;
  visibility: EventVisibility;
  startTime: Date;
  endTime: Date;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async createEvent(
    @Body() event: z.infer<typeof createEventSchema>,
    @GetUser() user: User,
  ): Promise<EventResponse> {
    const validatedEvent = createEventSchema.parse(event);
    return this.eventsService.createEvent({
      ...validatedEvent,
      associationId: user.association.id,
    });
  }

  @Get()
  async getAllPublicEvents(@GetUser() user: User): Promise<EventResponse[]> {
    return this.eventsService.getAllPublicEventsInAssociation(
      user.association.id,
    );
  }

  @Get(':id')
  async getEventById(@Param('id') id: string): Promise<EventResponse> {
    return this.eventsService.getEventById(id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteEvent(@Param('id') id: string): Promise<EventResponse> {
    return this.eventsService.deleteEvent(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() event: z.infer<typeof updateEventSchema>,
  ): Promise<EventResponse> {
    const validatedEvent = updateEventSchema.parse(event);
    return this.eventsService.updateEvent(id, validatedEvent);
  }

  @Post(':id/register')
  async registerForEvent(
    @Param('id') eventId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.eventsService.addParticipants({
      eventId,
      participantIds: [user.id],
    });
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/participants')
  async addParticipants(
    @Param('id') eventId: string,
    @Body() participants: { participantIds: string[] },
  ): Promise<void> {
    return this.eventsService.addParticipants({
      eventId,
      participantIds: participants.participantIds,
    });
  }

  @Delete(':id/unregister')
  async unregisterFromEvent(
    @Param('id') eventId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.eventsService.removeParticipants({
      eventId,
      participantIds: [user.id],
    });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/participants')
  async removeParticipants(
    @Param('id') eventId: string,
    @Body() participants: { participantIds: string[] },
  ): Promise<void> {
    return this.eventsService.removeParticipants({
      eventId,
      participantIds: participants.participantIds,
    });
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') eventId: string): Promise<UserResponse[]> {
    const participants = await this.eventsService.getParticipants(eventId);
    return participants.map((participant) => ({
      id: participant.id,
      email: participant.email,
      fullName: participant.fullName,
      role: participant.role,
    }));
  }
}
