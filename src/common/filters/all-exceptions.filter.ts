import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ? (exceptionResponse as { message: string }).message
            : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${message} - ${request.originalUrl}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const isDev = process.env.NODE_ENV === 'development';

    response.status(status).json({
      success: false,
      error: message,
      ...(isDev && exception instanceof Error && { stack: exception.stack }),
    });
  }
}
