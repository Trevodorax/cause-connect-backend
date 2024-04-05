import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Survey, SurveyVisibility } from './surveys.entity';
import { Repository } from 'typeorm';
import {
  NewPollQuestionDto,
  PollQuestionService,
  QuestionAnswersCount,
} from 'src/poll-question/poll-question.service';
import {
  PollQuestion,
  PollQuestionType,
} from 'src/poll-question/entities/poll-question.entity';
import { FullSurveyResponse } from './surveys.controller';

interface CreateSurveyDto {
  title: string;
  description: string;
  associationId: string;
  visibility: SurveyVisibility;
  questions: {
    prompt: string;
    type: PollQuestionType;
    options: { content: string }[];
  }[];
}

interface PartialSurveyDto {
  title?: string;
  description?: string;
  associationId?: string;
  visibility?: SurveyVisibility;
}

interface AnswerSurveyDto {
  surveyId: string;
  responderId: string;
  answers: {
    questionId: string;
    optionIds: string[];
  }[];
}

type SurveyResults = QuestionAnswersCount[];

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    private pollQuestionService: PollQuestionService,
  ) {}
  // create a survey
  async create(survey: CreateSurveyDto): Promise<Survey> {
    const result = await this.surveyRepository.insert({
      title: survey.title,
      description: survey.description,
      visibility: survey.visibility,
      association: { id: survey.associationId },
    });
    const surveyId = result.generatedMaps[0].id;
    const newSurvey = await this.findById(surveyId);

    if (!newSurvey) {
      throw new InternalServerErrorException('Survey not created');
    }

    survey.questions.map(async (question) =>
      this.pollQuestionService.create({
        prompt: question.prompt,
        type: question.type,
        options: question.options,
        surveyId: surveyId,
      }),
    );

    return newSurvey;
  }

  // get all surveys for an association
  async findAllByAssociation(associationId: string): Promise<Survey[]> {
    return this.surveyRepository.find({
      where: {
        association: { id: associationId },
      },
    });
  }

  // get one survey by id
  async findById(id: string): Promise<Survey> {
    const survey = await this.surveyRepository.findOneBy({ id });
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    return survey;
  }

  // get one full survey by id
  async findFullById(id: string): Promise<FullSurveyResponse> {
    const survey = await this.surveyRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
    });
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    return survey;
  }

  // update a survey by id
  async update(id: string, survey: PartialSurveyDto): Promise<Survey> {
    await this.surveyRepository.update({ id }, survey);

    const updatedSurvey = await this.findById(id);
    if (!updatedSurvey) {
      throw new NotFoundException('Survey not found');
    }

    return updatedSurvey;
  }

  // replace a survey by id
  async replace(
    id: string,
    survey: CreateSurveyDto,
  ): Promise<FullSurveyResponse> {
    await this.delete(id);

    const recreated = await this.create(survey);

    return this.findFullById(recreated.id);
  }

  // delete a survey by id
  async delete(id: string): Promise<Survey> {
    const survey = await this.findById(id);
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    await this.surveyRepository.delete(survey);

    return survey;
  }

  // add a question to a survey
  async addQuestion(
    surveyId: string,
    question: NewPollQuestionDto,
  ): Promise<PollQuestion[]> {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['questions'],
    });
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    const createdQuestion = await this.pollQuestionService.create({
      prompt: question.prompt,
      type: question.type,
      options: question.options,
      surveyId,
    });

    return [...survey.questions, createdQuestion];
  }

  // remove a question from a survey
  async removeQuestion(
    surveyId: string,
    questionId: string,
  ): Promise<PollQuestion[]> {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['questions'],
    });
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    const deletedQuestion = await this.pollQuestionService.delete(questionId);
    if (!deletedQuestion) {
      throw new NotFoundException('Question not found');
    }

    return survey.questions.filter((question) => question.id !== questionId);
  }

  // answer a survey
  async answerSurvey(answer: AnswerSurveyDto): Promise<void> {
    await Promise.all(
      answer.answers.map(async (currentAnswer) => {
        await this.pollQuestionService.sendAnswers({
          questionId: currentAnswer.questionId,
          optionIds: currentAnswer.optionIds,
          responderId: answer.responderId,
        });
      }),
    );
  }

  // get the results of a survey
  async getResults(surveyId: string): Promise<SurveyResults> {
    const survey = await this.surveyRepository.findOne({
      where: { id: surveyId },
      relations: ['questions'],
    });
    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    const answers = Promise.all(
      survey.questions.map(async (question) => {
        const answersCount = await this.pollQuestionService.getAnswersCount(
          question.id,
        );

        return answersCount;
      }),
    );

    return answers;
  }
}
