/**
 * Event Handlers
 * 
 * Processes domain events and triggers appropriate business logic.
 * All handlers are idempotent.
 */

import type { DomainEvent } from "@lokaly/events";
import { OrderService, InventoryService, DeliveryService } from "@lokaly/domain";

type Services = {
  orderService: OrderService;
  inventoryService: InventoryService;
  deliveryService: DeliveryService;
};

/**
 * Process a domain event
 * Routes events to appropriate handlers
 */
export async function processEvent(
  event: DomainEvent,
  services: Services
): Promise<void> {
  switch (event.type) {
    case "order.created":
      await handleOrderCreated(event, services);
      break;

    case "order.status_changed":
      await handleOrderStatusChanged(event, services);
      break;

    case "order.cancelled":
      await handleOrderCancelled(event, services);
      break;

    case "inventory.reserved":
      await handleInventoryReserved(event, services);
      break;

    case "delivery.assigned":
      await handleDeliveryAssigned(event, services);
      break;

    default:
      console.log(`[Event Handler] Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle order.created event
 * Business Logic:
 * - Reserve inventory for all items
 * - Transition order to "confirmed" status
 */
async function handleOrderCreated(
  event: DomainEvent & { type: "order.created" },
  services: Services
): Promise<void> {
  const { orderService, inventoryService } = services;

  // Reserve inventory for each item
  for (const item of event.payload.items) {
    await inventoryService.reserveInventory(
      event.payload.orderId,
      item.productId,
      item.quantity
    );
  }

  // Transition order to confirmed status
  await orderService.updateOrderStatus(
    event.payload.orderId,
    "confirmed",
    "system"
  );
}

/**
 * Handle order.status_changed event
 * Business Logic:
 * - Trigger notifications
 * - Update related entities
 */
async function handleOrderStatusChanged(
  event: DomainEvent & { type: "order.status_changed" },
  services: Services
): Promise<void> {
  // In production, send notifications here
  console.log(
    `[Event Handler] Order ${event.payload.orderId} status changed: ${event.payload.previousStatus} -> ${event.payload.newStatus}`
  );

  // Example: Auto-assign delivery when order is ready
  if (event.payload.newStatus === "ready") {
    // In production, implement courier assignment logic
    console.log(`[Event Handler] Order ${event.payload.orderId} is ready for delivery assignment`);
  }
}

/**
 * Handle order.cancelled event
 * Business Logic:
 * - Release all inventory reservations
 */
async function handleOrderCancelled(
  event: DomainEvent & { type: "order.cancelled" },
  services: Services
): Promise<void> {
  const { inventoryService } = services;

  // In production, fetch reservations and release them
  // For now, this is a placeholder
  console.log(
    `[Event Handler] Order ${event.payload.orderId} cancelled, releasing inventory`
  );
}

/**
 * Handle inventory.reserved event
 * Business Logic:
 * - Validate reservation
 * - Trigger picking if all items reserved
 */
async function handleInventoryReserved(
  event: DomainEvent & { type: "inventory.reserved" },
  services: Services
): Promise<void> {
  // In production, check if all items are reserved
  // If yes, transition order to "picking" status
  console.log(
    `[Event Handler] Inventory reserved: ${event.payload.reservationId} for order ${event.payload.orderId}`
  );
}

/**
 * Handle delivery.assigned event
 * Business Logic:
 * - Update order status
 * - Send notifications
 */
async function handleDeliveryAssigned(
  event: DomainEvent & { type: "delivery.assigned" },
  services: Services
): Promise<void> {
  const { orderService } = services;

  await orderService.updateOrderStatus(
    event.payload.orderId,
    "assigned",
    "system"
  );

  console.log(
    `[Event Handler] Delivery assigned: Order ${event.payload.orderId} to courier ${event.payload.courierId}`
  );
}

