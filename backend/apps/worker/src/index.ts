/**
 * Worker Service
 * 
 * Background job processor and async event handler.
 * 
 * Architecture:
 * - Consumes jobs/events from Redis
 * - Handles async tasks:
 *   - inventory reservation
 *   - order status transitions
 *   - notifications
 *   - delivery assignment
 * - Idempotent event handling
 * - Retry logic with exponential backoff
 */

import { initDb, getDb, runMigrations } from "@lokaly/db";
import type { DomainEvent } from "@lokaly/events";
import { OrderService, InventoryService, DeliveryService } from "@lokaly/domain";
import { retry } from "@lokaly/utils";
import { RedisEventConsumer } from "./infra/redis-consumer";
import { RedisEventPublisher } from "./infra/redis-publisher";
import { processEvent } from "./handlers/event-handler";

// Initialize services
let orderService: OrderService;
let inventoryService: InventoryService;
let deliveryService: DeliveryService;
let eventPublisher: RedisEventPublisher;

/**
 * Initialize application
 */
async function init() {
  // Initialize database
  const dbConnectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/lokaly";
  await initDb(dbConnectionString);
  const db = getDb();
  await runMigrations(db);

  // Initialize Redis event publisher (for emitting new events)
  eventPublisher = new RedisEventPublisher();
  await eventPublisher.connect(process.env.REDIS_URL || "redis://localhost:6379");

  // Initialize domain services
  orderService = new OrderService(db, eventPublisher);
  inventoryService = new InventoryService(db, eventPublisher);
  deliveryService = new DeliveryService(db, eventPublisher);

  console.log(`[Worker] Initialized`);
}

/**
 * Process domain events
 */
async function handleEvent(event: DomainEvent): Promise<void> {
  try {
    console.log(`[Worker] Processing event: ${event.type} (${event.metadata.eventId})`);

    // Process event with retry logic
    await retry(
      () => processEvent(event, { orderService, inventoryService, deliveryService }),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    console.log(`[Worker] Successfully processed event: ${event.type}`);
  } catch (error) {
    console.error(`[Worker] Failed to process event: ${event.type}`, error);
    // In production, send to dead letter queue
    throw error;
  }
}

/**
 * Start worker
 */
await init();

// Initialize Redis consumer
const consumer = new RedisEventConsumer();
await consumer.connect(process.env.REDIS_URL || "redis://localhost:6379");

// Start consuming events
console.log("[Worker] Starting event consumption...");
await consumer.consume(handleEvent);

console.log("🔄 Worker service running");

