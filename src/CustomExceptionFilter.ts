import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch(HttpException, ZodError, Error)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(
    exception: HttpException | NotFoundException | ZodError | Error,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 422;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      errors: exception instanceof ZodError ? exception.errors : undefined,
    });
  }
}
