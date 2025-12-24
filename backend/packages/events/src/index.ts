/**
 * Event Contracts Package
 * 
 * This package defines all domain events in the system.
 * Events are framework-agnostic and represent business occurrences.
 * 
 * Architecture Decision:
 * - Events are pure data structures (no methods)
 * - Event names follow pattern: <domain>.<action>
 * - Events are serializable to JSON for Redis transport
 * - This allows replacing Redis with RabbitMQ/SQS without changing domain logic
 */

export type EventMetadata = {
  eventId: string;
  timestamp: number;
  source: string;
  correlationId?: string;
};

export type BaseEvent = {
  metadata: EventMetadata;
};

// Order Domain Events
export type OrderCreatedEvent = BaseEvent & {
  type: "order.created";
  payload: {
    orderId: string;
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
    deliveryAddress: string;
  };
};

export type OrderStatusChangedEvent = BaseEvent & {
  type: "order.status_changed";
  payload: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    changedBy?: string;
  };
};

export type OrderCancelledEvent = BaseEvent & {
  type: "order.cancelled";
  payload: {
    orderId: string;
    reason: string;
    cancelledBy: string;
  };
};

// Inventory Domain Events
export type InventoryReservedEvent = BaseEvent & {
  type: "inventory.reserved";
  payload: {
    orderId: string;
    productId: string;
    quantity: number;
    reservationId: string;
  };
};

export type InventoryReleasedEvent = BaseEvent & {
  type: "inventory.released";
  payload: {
    reservationId: string;
    productId: string;
    quantity: number;
    reason: string;
  };
};

// Picking Domain Events
export type PickingStartedEvent = BaseEvent & {
  type: "picking.started";
  payload: {
    orderId: string;
    pickerId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  };
};

export type PickingCompletedEvent = BaseEvent & {
  type: "picking.completed";
  payload: {
    orderId: string;
    pickerId: string;
    completedAt: number;
  };
};

// Delivery Domain Events
export type DeliveryAssignedEvent = BaseEvent & {
  type: "delivery.assigned";
  payload: {
    orderId: string;
    courierId: string;
    estimatedPickupTime: number;
    estimatedDeliveryTime: number;
  };
};

export type DeliveryPickedUpEvent = BaseEvent & {
  type: "delivery.picked_up";
  payload: {
    orderId: string;
    courierId: string;
    pickedUpAt: number;
  };
};

export type DeliveryCompletedEvent = BaseEvent & {
  type: "delivery.completed";
  payload: {
    orderId: string;
    courierId: string;
    completedAt: number;
  };
};

// Union type for all events
export type DomainEvent =
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderCancelledEvent
  | InventoryReservedEvent
  | InventoryReleasedEvent
  | PickingStartedEvent
  | PickingCompletedEvent
  | DeliveryAssignedEvent
  | DeliveryPickedUpEvent
  | DeliveryCompletedEvent;

/**
 * Event Factory
 * Creates events with proper metadata
 */
export function createEvent<T extends DomainEvent>(
  type: T["type"],
  payload: T extends { payload: infer P } ? P : never,
  source: string,
  correlationId?: string
): T {
  return {
    type,
    payload,
    metadata: {
      eventId: crypto.randomUUID(),
      timestamp: Date.now(),
      source,
      correlationId,
    },
  } as T;
}

/**
 * Event Serialization
 * Events must be serializable for Redis transport
 */
export function serializeEvent(event: DomainEvent): string {
  return JSON.stringify(event);
}

export function deserializeEvent(json: string): DomainEvent {
  return JSON.parse(json) as DomainEvent;
}

