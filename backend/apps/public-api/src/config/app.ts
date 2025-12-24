/**
 * Public API Configuration
 * Centralized environment configuration for public-api
 */

export const appConfig = {
  port: Number(process.env.PORT || 3000),
  jwtSecret:
    process.env.JWT_SECRET || 'public-api-secret-key-change-in-production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/lokaly',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
} as const;
