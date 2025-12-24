/**
 * Domain Package
 * 
 * Core business logic and domain models.
 * This package is completely framework-agnostic.
 * 
 * Architecture Decision:
 * - Domain logic emits events (doesn't call services directly)
 * - Events are published via an event publisher interface
 * - This allows replacing Redis with RabbitMQ/SQS without changing domain logic
 * - All business rules live here, not in controllers
 */

export * from "./order";
export * from "./inventory";
export * from "./delivery";

// Export EventPublisher interface for use in apps
export type { EventPublisher } from "./order";

