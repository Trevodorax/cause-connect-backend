import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssociationsModule } from 'src/associations/associations.module';
import { Event } from './entities/events.entity';
import { EventUserEnrollment } from './entities/event-user-enrollments';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventUserEnrollment]),
    AssociationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
