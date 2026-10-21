import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_METADATA_KEY } from '../decorators/response-message.decorator.js';
import { SKIP_RESPONSE_ENVELOPE_METADATA_KEY } from '../decorators/skip-response-envelope.decorator.js';
import { ApiResponse } from '../interfaces/api-response.interface.js';
import { sanitizeUrl } from '../utils/sanitize.util.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const isRpcOrWs = context.getType() !== 'http';
    if (isRpcOrWs) {
      return next.handle();
    }

    const skipEnvelope = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_ENVELOPE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipEnvelope) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data: T) => {
        // 204 No Content must not include a body per HTTP specification
        if (response.statusCode === 204) {
          return data;
        }

        // Do not wrap binary streams, file downloads, or Buffers
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
          return data;
        }

        // Avoid double-wrapping if the handler already returned an ApiResponse
        if (this.isAlreadyWrapped(data)) {
          return data;
        }

        const path = sanitizeUrl(request.originalUrl || request.url);

        return {
          success: true,
          statusCode: response.statusCode,
          message: customMessage || 'Request completed successfully',
          data: (data ?? null) as T,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }

  private isAlreadyWrapped(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const candidate = data as Record<string, unknown>;
    return (
      candidate.success === true &&
      typeof candidate.statusCode === 'number' &&
      typeof candidate.timestamp === 'string' &&
      typeof candidate.path === 'string' &&
      'data' in candidate
    );
  }
}
