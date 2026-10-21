import { Controller, Get } from '@nestjs/common';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { HealthService } from './health.service.js';
import type { LivenessStatus, ReadinessStatus } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ResponseMessage('Application is healthy')
  getLiveness(): LivenessStatus {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ResponseMessage('Application is ready')
  async getReadiness(): Promise<ReadinessStatus> {
    return await this.healthService.getReadiness();
  }
}
