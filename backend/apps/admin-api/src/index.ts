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

const PORT = 3001;
const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || 'admin-api-secret-key-change-in-production';

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
  const dbConnectionString =
    process.env.DATABASE_URL || 'postgresql://localhost:5432/lokaly';
  await initDb(dbConnectionString);
  const db = getDb();
  await runMigrations(db);

  // Initialize JWT service (separate secret from public API)
  jwtService = new JwtService(JWT_SECRET);

  // Initialize Redis event publisher
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(
    process.env.REDIS_URL || 'redis://localhost:6379'
  );

  // Initialize cache
  const cache = getCache(
    process.env.REDIS_URL || 'redis://localhost:6379',
    300
  );

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);

  // Initialize Elysia app
  app = createApp(db, cache, eventPublisher, jwtService);

  console.log(`[Admin API] Initialized on port ${PORT}`);

  // Start Elysia server
  app.listen(PORT);

  console.log(`🔐 Admin API server running on http://localhost:${PORT}`);
}

/**
 * Start server
 */
await init();
