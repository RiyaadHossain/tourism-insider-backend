jest.mock('../prisma/prisma.service.js', () => ({
  PrismaService: jest.fn(),
}));

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let getLivenessMock: jest.Mock;
  let getReadinessMock: jest.Mock;

  beforeEach(() => {
    getLivenessMock = jest.fn();
    getReadinessMock = jest.fn();

    const service = {
      getLiveness: getLivenessMock,
      getReadiness: getReadinessMock,
    } as unknown as HealthService;

    controller = new HealthController(service);
  });

  it('should call getLiveness on health check', () => {
    const mockLiveness = {
      status: 'ok' as const,
      uptime: 10,
      timestamp: '2026-10-12T00:00:00.000Z',
    };
    getLivenessMock.mockReturnValue(mockLiveness);

    const result = controller.getLiveness();
    expect(result).toBe(mockLiveness);
    expect(getLivenessMock).toHaveBeenCalled();
  });

  it('should call getReadiness on ready check', async () => {
    const mockReadiness = {
      status: 'ok' as const,
      database: 'connected' as const,
      timestamp: '2026-10-12T00:00:00.000Z',
    };
    getReadinessMock.mockResolvedValue(mockReadiness);

    const result = await controller.getReadiness();
    expect(result).toBe(mockReadiness);
    expect(getReadinessMock).toHaveBeenCalled();
  });
});
