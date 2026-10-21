const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'password',
  'pass',
  'secret',
  'client_secret',
  'key',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'signature',
  'sig',
  'session',
  'sessionid',
  'session_id',
]);

/**
 * Sanitizes a URL path by redacting values of any sensitive query parameters.
 * E.g. `/api/v1/auth/callback?code=123&token=abc` -> `/api/v1/auth/callback?code=123&token=[REDACTED]`
 */
export function sanitizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }

  const basePath = url.slice(0, queryIndex);
  const queryString = url.slice(queryIndex + 1);

  if (!queryString) {
    return basePath;
  }

  try {
    const params = new URLSearchParams(queryString);
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        params.set(key, '[REDACTED]');
      }
    }
    const sanitizedQuery = params.toString();
    return sanitizedQuery ? `${basePath}?${sanitizedQuery}` : basePath;
  } catch {
    return basePath;
  }
}
