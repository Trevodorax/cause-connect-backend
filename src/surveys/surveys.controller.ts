import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { GetUser } from 'src/auth/decorators/user.decorator';
import { User, UserRole } from 'src/users/users.entity';
import { z } from 'zod';
import { NewPollQuestionSchema } from 'src/poll-question/poll-question.service';
import { SurveyVisibility } from './surveys.entity';
import { Roles } from 'src/auth/rules.decorator';

interface SurveyResponse {
  id: string;
  title: string;
  description: string;
  visibility: string;
}

export interface FullSurveyResponse extends SurveyResponse {
  questions: {
    id: string;
    prompt: string;
    type: string;
    options: { id: string; content: string }[];
  }[];
}

const CreateSurveySchema = z.object({
  title: z.string(),
  description: z.string(),
  visibility: z.enum([SurveyVisibility.PUBLIC, SurveyVisibility.PRIVATE]),
  questions: z.array(NewPollQuestionSchema.omit({ surveyId: true })),
});

const UpdateSurveySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  visibility: z
    .enum([SurveyVisibility.PUBLIC, SurveyVisibility.PRIVATE])
    .optional(),
});

const AnswerSurveySchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionIds: z.array(z.string()),
    }),
  ),
});

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveyService: SurveysService) {}

  @Get()
  async getSurveysForUserAssociation(
    @GetUser() user: User,
  ): Promise<SurveyResponse[]> {
    const surveys = await this.surveyService.findAllByAssociation(
      user.association.id,
    );

    return surveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      visibility: survey.visibility,
    }));
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createSurvey(
    @GetUser() user: User,
    @Body() survey: z.infer<typeof CreateSurveySchema>,
  ): Promise<SurveyResponse> {
    const validSurvey = CreateSurveySchema.parse(survey);

    const newSurvey = await this.surveyService.create({
      title: validSurvey.title,
      description: validSurvey.description,
      associationId: user.association.id,
      visibility: validSurvey.visibility,
      questions: validSurvey.questions,
    });

    return {
      id: newSurvey.id,
      title: newSurvey.title,
      description: newSurvey.description,
      visibility: newSurvey.visibility,
    };
  }

  @Get(':surveyId')
  async getSurvey(
    @Param('surveyId') surveyId: string,
  ): Promise<FullSurveyResponse> {
    const survey = await this.surveyService.findFullById(surveyId);
    return survey;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':surveyId')
  async deleteSurvey(
    @Param('surveyId') surveyId: string,
  ): Promise<SurveyResponse> {
    const survey = await this.surveyService.delete(surveyId);
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      visibility: survey.visibility,
    };
  }

  @Roles(UserRole.ADMIN)
  @Patch(':surveyId')
  async updateSurvey(
    @Param('surveyId') surveyId: string,
    @Body() survey: Partial<z.infer<typeof UpdateSurveySchema>>,
  ): Promise<SurveyResponse> {
    const validSurvey = UpdateSurveySchema.parse(survey);
    const updatedSurvey = await this.surveyService.update(
      surveyId,
      validSurvey,
    );
    return {
      id: updatedSurvey.id,
      title: updatedSurvey.title,
      description: updatedSurvey.description,
      visibility: updatedSurvey.visibility,
    };
  }

  @Post(':surveyId/answers')
  async submitSurveyAnswers(
    @GetUser() user: User,
    @Param('surveyId') surveyId: string,
    @Body() answers: z.infer<typeof AnswerSurveySchema>,
  ) {
    await this.surveyService.answerSurvey({
      surveyId,
      responderId: user.id,
      ...answers,
    });
  }

  @Get(':surveyId/results')
  async getSurveyResults(@Param('surveyId') surveyId: string) {
    return this.surveyService.getResults(surveyId);
  }
}
