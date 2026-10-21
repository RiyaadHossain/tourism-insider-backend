import 'reflect-metadata';
import { Environment, validateEnvironment } from './env.validation.js';

describe('validateEnvironment', () => {
  it('should validate valid environment configuration with defaults', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    };

    const validated = validateEnvironment(config);
    expect(validated.NODE_ENV).toBe(Environment.Development);
    expect(validated.PORT).toBe(3000);
    expect(validated.HOST).toBe('0.0.0.0');
    expect(validated.DATABASE_URL).toBe(
      'postgresql://user:pass@localhost:5432/db',
    );
    expect(validated.CORS_CREDENTIALS).toBe(true);
  });

  it('should throw an error when DATABASE_URL is missing', () => {
    const config = {
      PORT: '3000',
    };

    expect(() => validateEnvironment(config)).toThrow(
      /DATABASE_URL is required/,
    );
  });

  it('should parse string PORT to integer and reject invalid ports', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      PORT: '8080',
    };

    const validated = validateEnvironment(config);
    expect(validated.PORT).toBe(8080);

    const invalidConfig = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      PORT: '999999',
    };
    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /PORT must not be greater than 65535/,
    );
  });

  it('should reject invalid NODE_ENV', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'invalid_env',
    };

    expect(() => validateEnvironment(config)).toThrow(
      /NODE_ENV must be one of the following values/,
    );
  });
});
