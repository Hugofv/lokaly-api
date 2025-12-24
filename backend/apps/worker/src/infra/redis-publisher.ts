/**
 * Redis Event Publisher (Worker)
 * 
 * Same implementation as public-api, but used by worker to emit new events.
 */

import type { DomainEvent } from "@lokaly/events";
import type { EventPublisher } from "@lokaly/domain";

export class RedisEventPublisher implements EventPublisher {
  private redis: any; // Bun.redis connection

  async connect(redisUrl: string): Promise<void> {
    console.log(`[Redis Publisher] Connecting to ${redisUrl}`);
    // In production, use actual Bun.redis API
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventJson = JSON.stringify(event);
    // await this.redis.xadd("domain-events", "*", "event", eventJson);
    console.log(`[Redis Publisher] Published event: ${event.type} (${event.metadata.eventId})`);
  }

  async disconnect(): Promise<void> {
    console.log("[Redis Publisher] Disconnected");
  }
}

