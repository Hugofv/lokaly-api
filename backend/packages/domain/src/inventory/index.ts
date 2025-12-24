/**
 * Inventory Domain Logic
 *
 * Handles inventory reservations and releases.
 * Emits events for async processing.
 */

import type {
  DbConnection,
  InventoryReservation,
  NewInventoryReservation,
} from '@lokaly/db';
import type {
  InventoryReservedEvent,
  InventoryReleasedEvent,
  DomainEvent,
} from '@lokaly/events';
import type { EventPublisher } from '../order';
import { eq, and, isNull } from 'drizzle-orm';
import { inventoryReservations } from '@lokaly/db/schema';

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
    orderId: number,
    productId: number,
    quantity: number,
    options?: {
      productVariantId?: number;
      warehouseId?: number;
      productSku?: string;
      locationCode?: string;
      reservedBy?: string;
    }
  ): Promise<number> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const [reservation] = await this.db.drizzle
      .insert(inventoryReservations)
      .values({
        orderId,
        productId,
        productVariantId: options?.productVariantId,
        productSku: options?.productSku,
        quantity,
        status: 'reserved',
        warehouseId: options?.warehouseId,
        locationCode: options?.locationCode,
        reservedBy: options?.reservedBy,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!reservation) {
      throw new Error('Failed to create inventory reservation');
    }

    const event: InventoryReservedEvent = {
      type: 'inventory.reserved',
      payload: {
        orderId: orderId.toString(),
        productId: productId.toString(),
        quantity,
        reservationId: reservation.id.toString(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'inventory-service',
        correlationId: orderId.toString(),
      },
    };

    await this.eventPublisher.publish(event);

    return reservation.id;
  }

  /**
   * Release inventory reservation
   */
  async releaseReservation(
    reservationId: number,
    reason: string,
    releasedBy?: string
  ): Promise<void> {
    const [reservation] = await this.db.drizzle
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.id, reservationId),
          isNull(inventoryReservations.deletedAt)
        )
      )
      .limit(1);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === 'released') {
      return; // Idempotent
    }

    await this.db.drizzle
      .update(inventoryReservations)
      .set({
        status: 'released',
        releaseReason: reason,
        releasedBy,
        updatedAt: new Date(),
      })
      .where(eq(inventoryReservations.id, reservationId));

    const event: InventoryReleasedEvent = {
      type: 'inventory.released',
      payload: {
        reservationId: reservationId.toString(),
        productId: reservation.productId.toString(),
        quantity: reservation.quantity,
        reason,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'inventory-service',
        correlationId: reservation.orderId.toString(),
      },
    };

    await this.eventPublisher.publish(event);
  }
}
