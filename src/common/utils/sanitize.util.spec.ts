import { sanitizeUrl } from './sanitize.util.js';

describe('sanitizeUrl', () => {
  it('should return / if url is empty or not a string', () => {
    expect(sanitizeUrl('')).toBe('/');
    expect(sanitizeUrl(undefined)).toBe('/');
  });

  it('should return path unchanged if no query params exist', () => {
    expect(sanitizeUrl('/api/v1/health')).toBe('/api/v1/health');
  });

  it('should preserve non-sensitive query params', () => {
    expect(sanitizeUrl('/api/v1/users?page=1&limit=20')).toBe(
      '/api/v1/users?page=1&limit=20',
    );
  });

  it('should redact sensitive query parameters', () => {
    const url = '/api/v1/auth/callback?code=123&token=supersecret&page=1';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('code=123');
    expect(sanitized).toContain('page=1');
  });

  it('should redact case-insensitive sensitive keys', () => {
    const url = '/api/v1/test?TOKEN=secret&ApiKey=12345';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('TOKEN=%5BREDACTED%5D');
    expect(sanitized).toContain('ApiKey=%5BREDACTED%5D');
  });
});
