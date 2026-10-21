import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service.js';

jest.mock('../prisma/prisma.service.js', () => {
  return {
    PrismaService: jest.fn().mockImplementation(() => ({
      $queryRawUnsafe: jest.fn(),
    })),
  };
});

import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthService', () => {
  let service: HealthService;
  let mockPrismaService: { $queryRawUnsafe: jest.Mock };

  beforeEach(() => {
    mockPrismaService = {
      $queryRawUnsafe: jest.fn(),
    };
    service = new HealthService(mockPrismaService as unknown as PrismaService);
  });

  describe('getLiveness', () => {
    it('should return liveness status ok with uptime', () => {
      const result = service.getLiveness();
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status when database is reachable', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([{ 1: 1 }]);

      const result = await service.getReadiness();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT 1',
      );
    });

    it('should throw ServiceUnavailableException when database check fails', async () => {
      mockPrismaService.$queryRawUnsafe.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      await expect(service.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
