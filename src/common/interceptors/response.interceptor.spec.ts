import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);
  });

  const createMockContext = (options: {
    url?: string;
    statusCode?: number;
    skipEnvelope?: boolean;
    customMessage?: string;
  }) => {
    const request = {
      url: options.url || '/api/v1/test',
      originalUrl: options.url || '/api/v1/test',
    };
    const response = {
      statusCode: options.statusCode ?? 200,
    };

    const context = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'SKIP_RESPONSE_ENVELOPE_METADATA_KEY') {
        return options.skipEnvelope;
      }
      if (key === 'RESPONSE_MESSAGE_METADATA_KEY') {
        return options.customMessage;
      }
      return undefined;
    });

    return { context, request, response };
  };

  it('should wrap standard successful response in envelope', (done) => {
    const { context } = createMockContext({ statusCode: 200 });
    const callHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'Alice' }),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toMatchObject({
        success: true,
        statusCode: 200,
        message: 'Request completed successfully',
        data: { id: 1, name: 'Alice' },
        path: '/api/v1/test',
      });
      expect((result as Record<string, unknown>).timestamp).toBeDefined();
      done();
    });
  });

  it('should use custom message when provided', (done) => {
    const { context } = createMockContext({
      statusCode: 201,
      customMessage: 'Resource created',
    });
    const callHandler: CallHandler = {
      handle: () => of({ id: 2 }),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toMatchObject({
        success: true,
        statusCode: 201,
        message: 'Resource created',
        data: { id: 2 },
      });
      done();
    });
  });

  it('should bypass envelope if SkipResponseEnvelope is set', (done) => {
    const rawData = { stream: true };
    const { context } = createMockContext({ skipEnvelope: true });
    const callHandler: CallHandler = {
      handle: () => of(rawData),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toBe(rawData);
      done();
    });
  });

  it('should not wrap 204 No Content', (done) => {
    const { context } = createMockContext({ statusCode: 204 });
    const callHandler: CallHandler = {
      handle: () => of(undefined),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toBeUndefined();
      done();
    });
  });

  it('should not wrap StreamableFile or Buffer', (done) => {
    const buffer = Buffer.from('hello');
    const { context } = createMockContext({ statusCode: 200 });
    const callHandler: CallHandler = {
      handle: () => of(buffer),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toBe(buffer);
      done();
    });
  });

  it('should not double wrap an already wrapped response', (done) => {
    const existingEnvelope = {
      success: true,
      statusCode: 200,
      message: 'Already wrapped',
      data: { hello: 'world' },
      timestamp: '2026-10-12T00:00:00.000Z',
      path: '/api/v1/test',
    };
    const { context } = createMockContext({ statusCode: 200 });
    const callHandler: CallHandler = {
      handle: () => of(existingEnvelope),
    };

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toBe(existingEnvelope);
      done();
    });
  });
});
