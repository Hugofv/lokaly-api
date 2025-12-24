/**
 * Admin API Server
 *
 * Admin-only API for backoffice operations.
 *
 * Architecture:
 * - Separate server on port 3001
 * - REST only (no WebSocket)
 * - Strict admin authentication
 * - Role-based access control (RBAC)
 * - Heavy read queries allowed
 * - No exposure to public internet without protection
 * - Built with Elysia framework
 */

import { initDb, getDb, runMigrations } from '@lokaly/db';
import { getCache } from '@lokaly/cache';
import { JwtService } from '@lokaly/auth';
import { OrderService } from '@lokaly/domain';
import { RedisEventPublisher } from './infra/redis-publisher';
import { createApp } from './app';
import { appConfig } from './config/app';

// Initialize services
let jwtService: JwtService;
let orderService: OrderService;
let eventPublisher: RedisEventPublisher;
let app: Awaited<ReturnType<typeof createApp>>;

/**
 * Initialize application
 */
async function init() {
  // Initialize database
  await initDb(appConfig.databaseUrl);
  const db = getDb();
  await runMigrations(db);

  // Initialize JWT service (separate secret from public API)
  jwtService = new JwtService(appConfig.jwtSecret);

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(appConfig.redisUrl);

  // Initialize cache
  const cache = getCache(appConfig.redisUrl, 300);

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);

  // Initialize Elysia app
  app = createApp(db, cache, eventPublisher, jwtService);

  console.log(`[Admin API] Initialized on port ${appConfig.port}`);

  // Start Elysia server
  app.listen(appConfig.port);

  console.log(
    `🔐 Admin API server running on http://localhost:${appConfig.port}`
  );
}

/**
 * Start server
 */
await init();
