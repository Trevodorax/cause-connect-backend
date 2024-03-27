import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssociationsModule } from 'src/associations/associations.module';
import { Event } from './events.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), AssociationsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
