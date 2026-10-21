import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

// Matches alphanumeric, hyphens, and underscores between 1 and 64 characters
const CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader =
      req.headers[CORRELATION_ID_HEADER] || req.headers['x-request-id'];

    let correlationId: string;

    if (typeof rawHeader === 'string' && CORRELATION_ID_REGEX.test(rawHeader)) {
      correlationId = rawHeader;
    } else {
      correlationId = randomUUID();
    }

    // Attach to request headers and property for downstream use
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    (req as unknown as { correlationId: string }).correlationId = correlationId;

    // Return correlation ID to client in response header
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
