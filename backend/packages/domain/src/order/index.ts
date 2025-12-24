/**
 * Order Domain Logic
 * 
 * Handles order creation, status transitions, and business rules.
 * Emits events instead of calling services directly.
 */

import type { DbConnection, OrderRow, OrderItemRow } from "@lokaly/db";
import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
  DomainEvent,
} from "@lokaly/events";

/**
 * Event Publisher Interface
 * Domain layer depends on this interface, not Redis directly
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "picking"
  | "ready"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled";

export type CreateOrderInput = {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
};

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Order Service
 * Contains all order-related business logic
 */
export class OrderService {
  constructor(
    private db: DbConnection,
    private eventPublisher: EventPublisher
  ) {}

  /**
   * Create a new order
   * Business Rules:
   * - Calculate total from items
   * - Set initial status to "pending"
   * - Emit order.created event
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const orderId = crypto.randomUUID();
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Validate business rules
    if (input.items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    if (totalAmount <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    // Use transaction to ensure atomicity
    const order = await this.db.transaction(async (tx: DbConnection) => {
      // Insert order
      await tx.query(
        `INSERT INTO orders (id, customer_id, status, total_amount, delivery_address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [orderId, input.customerId, "pending", totalAmount, input.deliveryAddress]
      );

      // Insert order items
      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        await tx.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [itemId, orderId, item.productId, item.quantity, item.price]
        );
      }

      // Fetch created order
      const [orderRow] = (await tx.query(
        `SELECT * FROM orders WHERE id = ?`,
        [orderId]
      )) as OrderRow[];

      const itemRows = (await tx.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [orderId]
      )) as OrderItemRow[];

      return {
        id: orderRow.id,
        customerId: orderRow.customer_id,
        status: orderRow.status as OrderStatus,
        totalAmount: Number(orderRow.total_amount),
        deliveryAddress: orderRow.delivery_address,
        items: itemRows.map((item: OrderItemRow) => ({
          productId: item.product_id,
          quantity: item.quantity,
          price: Number(item.price),
        })),
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      };
    });

    // Emit domain event (async, doesn't block transaction)
    const event: OrderCreatedEvent = {
      type: "order.created",
      payload: {
        orderId: order.id,
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "order-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);

    return order;
  }

  /**
   * Update order status
   * Business Rules:
   * - Validate status transition
   * - Emit order.status_changed event
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy?: string
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Validate status transition (business rule)
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["picking", "cancelled"],
      picking: ["ready", "cancelled"],
      ready: ["assigned", "cancelled"],
      assigned: ["picked_up", "cancelled"],
      picked_up: ["in_transit", "cancelled"],
      in_transit: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${newStatus}`
      );
    }

    // Update in database
    await this.db.query(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, orderId]
    );

    const updatedOrder = await this.getOrderById(orderId);
    if (!updatedOrder) {
      throw new Error("Failed to fetch updated order");
    }

    // Emit event
    const event: OrderStatusChangedEvent = {
      type: "order.status_changed",
      payload: {
        orderId,
        previousStatus: order.status,
        newStatus,
        changedBy,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "order-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);

    return updatedOrder;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "delivered") {
      throw new Error("Cannot cancel a delivered order");
    }

    if (order.status === "cancelled") {
      return; // Idempotent
    }

    await this.updateOrderStatus(orderId, "cancelled", cancelledBy);

    const event: OrderCancelledEvent = {
      type: "order.cancelled",
      payload: {
        orderId,
        reason,
        cancelledBy,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "order-service",
        correlationId: orderId,
      },
    };

    await this.eventPublisher.publish(event);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const [orderRow] = (await this.db.query(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    )) as OrderRow[];

    if (!orderRow) {
      return null;
    }

    const itemRows = (await this.db.query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    )) as OrderItemRow[];

    return {
      id: orderRow.id,
      customerId: orderRow.customer_id,
      status: orderRow.status as OrderStatus,
      totalAmount: Number(orderRow.total_amount),
      deliveryAddress: orderRow.delivery_address,
      items: itemRows.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
    };
  }
}

