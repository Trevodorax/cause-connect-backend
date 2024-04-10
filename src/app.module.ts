import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmConfigService } from './config/database.config';
import { AssociationsModule } from './associations/associations.module';
import { EmailModule } from './email/email.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { PollQuestionModule } from './poll-question/poll-question.module';
import { SurveysModule } from './surveys/surveys.module';
import { VotesModule } from './votes/votes.module';
import { EventsModule } from './events/events.module';
import { MeetingsModule } from './meetings/meetings.module';
import { FilesModule } from './files/files.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SettingsModule } from './settings/settings.module';
import { FeedModule } from './feed/feed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
    }),
    UsersModule,
    AuthModule,
    AssociationsModule,
    EmailModule,
    ProjectsModule,
    TasksModule,
    PollQuestionModule,
    SurveysModule,
    VotesModule,
    EventsModule,
    MeetingsModule,
    FilesModule,
    DocumentsModule,
    ChatbotModule,
    SettingsModule,
    FeedModule,
  ],
  providers: [AppService, AuthService],
})
export class AppModule {}
