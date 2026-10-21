export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl: string;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  bodyLimit: string;
}

export const configuration = (): AppConfig => {
  const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000';
  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number.parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    databaseUrl: process.env.DATABASE_URL || '',
    cors: {
      origins: origins.length > 0 ? origins : ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS !== 'false',
    },
    bodyLimit: process.env.BODY_LIMIT || '1mb',
  };
};
