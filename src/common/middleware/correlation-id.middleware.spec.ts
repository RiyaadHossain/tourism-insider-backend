import { Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it('should preserve valid client-provided correlation id', () => {
    const validId = 'client-req-12345';
    const req = {
      headers: {
        'x-correlation-id': validId,
      },
    } as unknown as Request;

    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-correlation-id']).toBe(validId);
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-Id', validId);
    expect(next).toHaveBeenCalled();
  });

  it('should generate a new UUID if header is missing', () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const generatedId = req.headers['x-correlation-id'] as string;
    expect(generatedId).toBeDefined();
    expect(typeof generatedId).toBe('string');
    expect(generatedId.length).toBeGreaterThan(10);
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-Id', generatedId);
    expect(next).toHaveBeenCalled();
  });

  it('should generate a new UUID if header contains invalid characters', () => {
    const req = {
      headers: {
        'x-correlation-id': 'invalid/id with spaces!!',
      },
    } as unknown as Request;

    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const generatedId = req.headers['x-correlation-id'] as string;
    expect(generatedId).not.toBe('invalid/id with spaces!!');
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-Id', generatedId);
    expect(next).toHaveBeenCalled();
  });
});
