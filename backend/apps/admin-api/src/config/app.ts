/**
 * Application Configuration
 * Centralized configuration for admin-api
 */

export const appConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret:
    process.env.ADMIN_JWT_SECRET || 'admin-api-secret-key-change-in-production',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/lokaly',
} as const;
