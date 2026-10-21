import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { sanitizeUrl } from '../utils/sanitize.util.js';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method } = req;
      const path = sanitizeUrl(req.originalUrl || req.url);
      const { statusCode } = res;
      const correlationId =
        (req.headers['x-correlation-id'] as string) ||
        (req as unknown as { correlationId?: string }).correlationId ||
        '-';

      const logMessage = `[${correlationId}] ${method} ${path} ${statusCode} +${duration}ms`;

      if (statusCode >= 500) {
        // If the exception filter already logged the detailed error/stack, log summary as warn to prevent duplicate stack dumps
        const alreadyLogged = (
          req as unknown as { __exceptionLogged?: boolean }
        ).__exceptionLogged;
        if (alreadyLogged) {
          this.logger.warn(logMessage);
        } else {
          this.logger.error(logMessage);
        }
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
