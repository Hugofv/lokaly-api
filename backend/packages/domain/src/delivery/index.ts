/**
 * Delivery Domain Logic
 * 
 * Handles delivery assignments and tracking.
 */

import type { DbConnection, DeliveryAssignmentRow } from "@lokaly/db";
import type {
  DeliveryAssignedEvent,
  DeliveryPickedUpEvent,
  DeliveryCompletedEvent,
  DomainEvent,
} from "@lokaly/events";
import type { EventPublisher } from "../order";

/**
 * Delivery Service
 */
export class DeliveryService {
  constructor(
    private db: DbConnection,
    private eventPublisher: EventPublisher
  ) {}

  /**
   * Assign delivery to a courier
   */
  async assignDelivery(
    orderId: string,
    courierId: string,
    estimatedPickupTime: Date,
    estimatedDeliveryTime: Date
  ): Promise<string> {
    const assignmentId = crypto.randomUUID();

    await this.db.query(
      `INSERT INTO delivery_assignments (id, order_id, courier_id, status, assigned_at, estimated_pickup_time, estimated_delivery_time)
       VALUES (?, ?, ?, 'assigned', CURRENT_TIMESTAMP, ?, ?)`,
      [assignmentId, orderId, courierId, estimatedPickupTime, estimatedDeliveryTime]
    );

    const event: DeliveryAssignedEvent = {
      type: "delivery.assigned",
      payload: {
        orderId,
        courierId,
        estimatedPickupTime: estimatedPickupTime.getTime(),
        estimatedDeliveryTime: estimatedDeliveryTime.getTime(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "delivery-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);

    return assignmentId;
  }

  /**
   * Mark delivery as picked up
   */
  async markPickedUp(orderId: string, courierId: string): Promise<void> {
    await this.db.query(
      `UPDATE delivery_assignments SET status = 'picked_up' WHERE order_id = ? AND courier_id = ?`,
      [orderId, courierId]
    );

    const event: DeliveryPickedUpEvent = {
      type: "delivery.picked_up",
      payload: {
        orderId,
        courierId,
        pickedUpAt: Date.now(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "delivery-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);
  }

  /**
   * Mark delivery as completed
   */
  async markCompleted(orderId: string, courierId: string): Promise<void> {
    await this.db.query(
      `UPDATE delivery_assignments SET status = 'completed' WHERE order_id = ? AND courier_id = ?`,
      [orderId, courierId]
    );

    const event: DeliveryCompletedEvent = {
      type: "delivery.completed",
      payload: {
        orderId,
        courierId,
        completedAt: Date.now(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "delivery-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);
  }

  /**
   * Get delivery assignment for an order
   */
  async getAssignment(orderId: string): Promise<DeliveryAssignmentRow | null> {
    const [assignment] = (await this.db.query(
      `SELECT * FROM delivery_assignments WHERE order_id = ? ORDER BY assigned_at DESC LIMIT 1`,
      [orderId]
    )) as DeliveryAssignmentRow[];

    return assignment || null;
  }
}

