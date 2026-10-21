import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? Number.parseInt(String(value), 10)
      : 3000,
  )
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  HOST: string = '0.0.0.0';

  @IsString()
  @IsNotEmpty({
    message: 'DATABASE_URL is required to initialize the database connection',
  })
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  })
  @IsBoolean()
  @IsOptional()
  CORS_CREDENTIALS: boolean = true;

  @IsString()
  @IsOptional()
  BODY_LIMIT: string = '1mb';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.flatMap((error) =>
      error.constraints ? Object.values(error.constraints) : [],
    );
    throw new Error(
      `[Config] Startup environment validation failed:\n  - ${errorMessages.join('\n  - ')}`,
    );
  }

  return validatedConfig;
}
