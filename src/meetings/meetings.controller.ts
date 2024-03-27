import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { Roles } from 'src/auth/rules.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { z } from 'zod';
import {
  createEventSchema,
  EventResponse,
  updateEventSchema,
} from 'src/events/events.controller';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { UserResponse } from 'src/users/users.controller';

const createMeetingSchema = z.object({
  agendum: z.string(),
  event: createEventSchema,
});

const updateMeetingSchema = z.object({
  agendum: z.string().optional(),
  event: updateEventSchema.optional(),
});

interface MeetingResponse {
  id: string;
  agendum: string;
  event: EventResponse;
}

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async createMeeting(
    @Body() meeting: z.infer<typeof createMeetingSchema>,
    @GetUser() user: User,
  ): Promise<MeetingResponse> {
    const validatedEvent = createMeetingSchema.parse(meeting);
    return this.meetingsService.createMeeting({
      ...validatedEvent,
      event: {
        ...validatedEvent.event,
        associationId: user.association.id,
      },
    });
  }

  @Get()
  async getAllPublicMeetings(
    @GetUser() user: User,
  ): Promise<MeetingResponse[]> {
    const meetings = await this.meetingsService.getPublicMeetingsInAssociation(
      user.association.id,
    );

    return meetings.map((meeting) => ({
      id: meeting.id,
      agendum: meeting.agendum,
      event: {
        id: meeting.event.id,
        title: meeting.event.title,
        description: meeting.event.description,
        summary: meeting.event.summary,
        visibility: meeting.event.visibility,
        startTime: meeting.event.startTime,
        endTime: meeting.event.endTime,
      },
    }));
  }

  @Get(':id')
  async getMeetingById(@Param('id') id: string): Promise<MeetingResponse> {
    const meeting = await this.meetingsService.getMeetingById(id);
    return {
      id: meeting.id,
      agendum: meeting.agendum,
      event: {
        id: meeting.event.id,
        title: meeting.event.title,
        description: meeting.event.description,
        summary: meeting.event.summary,
        visibility: meeting.event.visibility,
        startTime: meeting.event.startTime,
        endTime: meeting.event.endTime,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteMeeting(@Param('id') id: string): Promise<MeetingResponse> {
    const deletedMeeting = await this.meetingsService.deleteMeeting(id);
    return {
      id: deletedMeeting.id,
      agendum: deletedMeeting.agendum,
      event: {
        id: deletedMeeting.event.id,
        title: deletedMeeting.event.title,
        description: deletedMeeting.event.description,
        summary: deletedMeeting.event.summary,
        visibility: deletedMeeting.event.visibility,
        startTime: deletedMeeting.event.startTime,
        endTime: deletedMeeting.event.endTime,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() meeting: z.infer<typeof updateMeetingSchema>,
  ): Promise<MeetingResponse> {
    const validatedMeeting = updateMeetingSchema.parse(meeting);
    const updatedMeeting = await this.meetingsService.updateMeeting(
      id,
      validatedMeeting,
    );

    return {
      id: updatedMeeting.id,
      agendum: updatedMeeting.agendum,
      event: {
        id: updatedMeeting.event.id,
        title: updatedMeeting.event.title,
        description: updatedMeeting.event.description,
        summary: updatedMeeting.event.summary,
        visibility: updatedMeeting.event.visibility,
        startTime: updatedMeeting.event.startTime,
        endTime: updatedMeeting.event.endTime,
      },
    };
  }

  @Post(':id/register')
  async registerForEvent(
    @Param('id') meetingId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.meetingsService.addParticipants(meetingId, [user.id]);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/participants')
  async addParticipants(
    @Param('id') meetingId: string,
    @Body() participants: { participantIds: string[] },
  ): Promise<void> {
    return this.meetingsService.addParticipants(
      meetingId,
      participants.participantIds,
    );
  }

  @Delete(':id/unregister')
  async unregisterFromEvent(
    @Param('id') meetingId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.meetingsService.removeParticipants(meetingId, [user.id]);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/participants')
  async removeParticipants(
    @Param('id') meetingId: string,
    @Body() participants: { participantIds: string[] },
  ): Promise<void> {
    return this.meetingsService.removeParticipants(
      meetingId,
      participants.participantIds,
    );
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') eventId: string): Promise<UserResponse[]> {
    const participants = await this.meetingsService.getParticipants(eventId);
    return participants.map((participant) => ({
      id: participant.id,
      email: participant.email,
      fullName: participant.fullName,
      role: participant.role,
    }));
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/presence-code')
  async generatePresenceCode(
    @Param('id') meetingId: string,
  ): Promise<{ presenceCode: string }> {
    const presenceCode =
      await this.meetingsService.generatePresenceCode(meetingId);

    return { presenceCode };
  }

  @Post(':id/present')
  async answerPresent(
    @Param('id') meetingId: string,
    @GetUser() user: User,
    @Body() { presenceCode }: { presenceCode: string },
  ): Promise<void> {
    return this.meetingsService.answerPresent(meetingId, user.id, presenceCode);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/present')
  async declareAbsent(
    @Param('id') meetingId: string,
    @Body() { userId }: { userId: string },
  ): Promise<void> {
    if (!userId) throw new BadRequestException('userId is required');
    return this.meetingsService.declareAbsent(meetingId, userId);
  }

  @Get(':id/present')
  async getPresentParticipants(
    @Param('id') meetingId: string,
  ): Promise<UserResponse[]> {
    const participants =
      await this.meetingsService.getPresentParticipants(meetingId);

    return participants.map((participant) => ({
      id: participant.id,
      email: participant.email,
      fullName: participant.fullName,
      role: participant.role,
    }));
  }
}
