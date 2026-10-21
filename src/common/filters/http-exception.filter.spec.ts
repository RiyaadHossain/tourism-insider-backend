import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  const createMockArgumentsHost = (requestUrl = '/api/v1/test') => {
    const request = {
      url: requestUrl,
      originalUrl: requestUrl,
      method: 'GET',
      headers: {
        'x-correlation-id': 'test-corr-id',
      },
    };

    const statusFn = jest.fn();
    const jsonFn = jest.fn();
    statusFn.mockReturnValue({ json: jsonFn });

    const response = {
      status: statusFn,
      headersSent: false,
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, request, response, statusFn, jsonFn };
  };

  it('should format standard NotFoundException', () => {
    const { host, statusFn, jsonFn } =
      createMockArgumentsHost('/api/v1/users/99');
    const exception = new NotFoundException('User not found');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(404);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
        details: [],
        path: '/api/v1/users/99',
      }),
    );
  });

  it('should normalize validation errors with message array into details', () => {
    const { host, statusFn, jsonFn } = createMockArgumentsHost('/api/v1/users');
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: ['email must be an email', 'name should not be empty'],
      }),
    );
  });

  it('should mask unexpected errors in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { host, statusFn, jsonFn } = createMockArgumentsHost();
    const unexpectedError = new Error(
      'Secret DB crash: postgres://user:pass@host',
    );

    filter.catch(unexpectedError, host);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        details: [],
      }),
    );

    process.env.NODE_ENV = originalEnv;
  });
});
