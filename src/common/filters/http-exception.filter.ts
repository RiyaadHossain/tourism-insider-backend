import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface.js';
import { sanitizeUrl } from '../utils/sanitize.util.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If headers are already sent, delegate to Express default handler
    if (response.headersSent) {
      return;
    }

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request as unknown as { correlationId?: string }).correlationId ||
      'unknown';

    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown[] = [];

    if (isHttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = this.getStatusErrorPhrase(statusCode);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, unknown>;

        // If error response provides custom error phrase
        if (typeof respObj.error === 'string') {
          error = respObj.error;
        } else {
          error = this.getStatusErrorPhrase(statusCode);
        }

        // If validation errors are present in message as an array
        if (Array.isArray(respObj.message)) {
          message = 'Validation failed';
          details = respObj.message;
        } else if (typeof respObj.message === 'string') {
          message = respObj.message;
        } else {
          message = this.getStatusErrorPhrase(statusCode);
        }

        // If explicit details array was provided
        if (Array.isArray(respObj.details)) {
          details = respObj.details;
        }
      }
    } else {
      // Non-HttpException unexpected errors
      message = isProduction
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';
      error = 'Internal Server Error';
      details =
        !isProduction && exception instanceof Error ? [exception.message] : [];
    }

    const path = sanitizeUrl(request.originalUrl || request.url);

    // Server-side logging for unexpected (5xx) or non-HTTP errors
    if (statusCode >= 500) {
      const errorStack =
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception);
      this.logger.error(
        `[${correlationId}] ${request.method} ${path} - ${statusCode} ${error}: ${message}`,
        errorStack,
      );
      // Mark request so request-logger middleware knows this exception was already logged with stack trace
      (
        request as unknown as { __exceptionLogged?: boolean }
      ).__exceptionLogged = true;
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path,
    };

    response.status(statusCode).json(errorPayload);
  }

  private static readonly STATUS_PHRASES: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };

  private getStatusErrorPhrase(statusCode: number): string {
    return (
      HttpExceptionFilter.STATUS_PHRASES[statusCode] || 'Internal Server Error'
    );
  }
}
