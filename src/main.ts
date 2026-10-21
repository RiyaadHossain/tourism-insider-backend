import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';
  const port = configService.get<number>('PORT') || 3000;
  const host = configService.get<string>('HOST') || '0.0.0.0';
  const bodyLimit = configService.get<string>('BODY_LIMIT') || '1mb';

  // 1. Graceful shutdown hooks
  app.enableShutdownHooks();

  // 2. Security HTTP headers via Helmet
  app.use(helmet());

  // 3. Payload size limiting
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // 4. Configurable CORS setup
  const rawOrigins =
    configService.get<string>('CORS_ORIGINS') || 'http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowCredentials =
    configService.get<boolean>('CORS_CREDENTIALS') ?? true;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser requests with no origin (e.g. server-to-server, curl, health checks)
      if (!origin) {
        return callback(null, true);
      }
      if (!isProduction && allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: allowCredentials,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'X-Request-Id',
    ],
  });

  // 5. Global API Prefix
  app.setGlobalPrefix('api/v1');

  // 6. Global Response Interceptor
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // 7. Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 8. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors = []) => {
        const formatErrors = (validationErrors: typeof errors): string[] => {
          const messages: string[] = [];
          for (const err of validationErrors) {
            if (err.constraints) {
              messages.push(...Object.values(err.constraints));
            }
            if (err.children && err.children.length > 0) {
              messages.push(...formatErrors(err.children));
            }
          }
          return messages;
        };

        const details = formatErrors(errors);
        return new BadRequestException({
          message: 'Validation failed',
          error: 'Bad Request',
          details,
        });
      },
    }),
  );

  // 9. Start HTTP listener
  await app.listen(port, host);

  logger.log(
    `🚀 Application running on http://${host}:${port}/api/v1 in [${nodeEnv}] mode`,
  );
}

void bootstrap();
