/**
 * Public API Server (Elysia)
 *
 * Public-facing API for customers and couriers.
 * - Uses Elysia for HTTP routing
 * - JWT auth via JwtService (@lokaly/auth)
 * - Domain services from @lokaly/domain
 * - Events published via RedisEventPublisher
 */

import { initDb, getDb } from '@lokaly/db';
import { JwtService } from '@lokaly/auth';
import { RedisEventPublisher } from './infra/redis-publisher';
import { createApp } from './app';
import { appConfig } from './config/app';

let jwtService: JwtService;
let eventPublisher: RedisEventPublisher;

async function init() {
  // Initialize database
  await initDb(appConfig.databaseUrl);
  const db = getDb();
  // Note: Migrations should be run manually or via CI/CD, not automatically on startup

  // Initialize JWT service
  jwtService = new JwtService(appConfig.jwtSecret);

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(appConfig.redisUrl);

  // Initialize Elysia app
  const app = createApp(db, eventPublisher, jwtService);

  console.log(`[Public API] Initialized on port ${appConfig.port}`);

  app.listen(appConfig.port);

  console.log(
    `🚀 Public API server running on http://localhost:${appConfig.port}`
  );
}

await init();
