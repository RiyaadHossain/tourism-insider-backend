import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface LivenessStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadinessStatus {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prismaService: PrismaService) {}

  getLiveness(): LivenessStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessStatus> {
    try {
      // Lightweight database connectivity check using existing Prisma service
      await this.prismaService.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log failure internally without leaking credentials or connection string
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error(
        `Database readiness check failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException({
        message: 'Service is not ready',
        error: 'Service Unavailable',
        details: ['Database connection is unavailable'],
      });
    }
  }
}
