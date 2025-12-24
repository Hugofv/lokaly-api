/**
 * Inventory Domain Logic
 * 
 * Handles inventory reservations and releases.
 * Emits events for async processing.
 */

import type { DbConnection, InventoryReservationRow } from "@lokaly/db";
import type {
  InventoryReservedEvent,
  InventoryReleasedEvent,
  DomainEvent,
} from "@lokaly/events";
import type { EventPublisher } from "../order";

/**
 * Inventory Service
 */
export class InventoryService {
  constructor(
    private db: DbConnection,
    private eventPublisher: EventPublisher
  ) {}

  /**
   * Reserve inventory for an order
   * Emits inventory.reserved event
   */
  async reserveInventory(
    orderId: string,
    productId: string,
    quantity: number
  ): Promise<string> {
    const reservationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.db.query(
      `INSERT INTO inventory_reservations (id, order_id, product_id, quantity, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, 'reserved', CURRENT_TIMESTAMP, ?)`,
      [reservationId, orderId, productId, quantity, expiresAt]
    );

    const event: InventoryReservedEvent = {
      type: "inventory.reserved",
      payload: {
        orderId,
        productId,
        quantity,
        reservationId,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "inventory-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);

    return reservationId;
  }

  /**
   * Release inventory reservation
   */
  async releaseReservation(
    reservationId: string,
    reason: string
  ): Promise<void> {
    const [reservation] = (await this.db.query(
      `SELECT * FROM inventory_reservations WHERE id = ?`,
      [reservationId]
    )) as InventoryReservationRow[];

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status === "released") {
      return; // Idempotent
    }

    await this.db.query(
      `UPDATE inventory_reservations SET status = 'released' WHERE id = ?`,
      [reservationId]
    );

    const event: InventoryReleasedEvent = {
      type: "inventory.released",
      payload: {
        reservationId,
        productId: reservation.product_id,
        quantity: reservation.quantity,
        reason,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "inventory-service",
        correlationId: reservation.order_id,
      },
    };

    await this.eventPublisher.publish(event);
  }
}

