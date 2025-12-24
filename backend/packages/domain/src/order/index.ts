/**
 * Order Domain Logic
 *
 * Handles order creation, status transitions, and business rules.
 * Emits events instead of calling services directly.
 */

import type {
  DbConnection,
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
} from '@lokaly/db';
import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
  DomainEvent,
} from '@lokaly/events';
import { eq, and, isNull } from 'drizzle-orm';
import { orders, orderItems } from '@lokaly/db/schema';

/**
 * Event Publisher Interface
 * Domain layer depends on this interface, not Redis directly
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'picking'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type CreateOrderInput = {
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    productId: number;
    productVariantId?: number;
    quantity: number;
    unitPrice: number;
    productName: string;
    productSku?: string;
  }>;
  deliveryAddressId?: number;
  deliveryAddress: string;
  deliveryInstructions?: string;
  subtotalAmount: number;
  taxAmount?: number;
  deliveryFee?: number;
  discountAmount?: number;
  paymentMethod?: string;
  notes?: string;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
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
  async createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    const totalAmount =
      input.subtotalAmount +
      (input.taxAmount || 0) +
      (input.deliveryFee || 0) -
      (input.discountAmount || 0);

    // Validate business rules
    if (input.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    if (totalAmount <= 0) {
      throw new Error('Order total must be greater than zero');
    }

    // Use transaction to ensure atomicity
    const order = await this.db.drizzle.transaction(async (tx) => {
      // Insert order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          customerId: input.customerId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          deliveryAddressId: input.deliveryAddressId,
          deliveryAddress: input.deliveryAddress,
          deliveryInstructions: input.deliveryInstructions,
          status: 'pending',
          totalAmount: totalAmount.toString(),
          subtotalAmount: input.subtotalAmount.toString(),
          taxAmount: (input.taxAmount || 0).toString(),
          deliveryFee: (input.deliveryFee || 0).toString(),
          discountAmount: (input.discountAmount || 0).toString(),
          paymentStatus: 'pending',
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!newOrder) {
        throw new Error('Failed to create order');
      }

      // Insert order items
      const itemsToInsert: NewOrderItem[] = input.items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.unitPrice * item.quantity).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const insertedItems = await tx
        .insert(orderItems)
        .values(itemsToInsert)
        .returning();

      return {
        ...newOrder,
        items: insertedItems,
      };
    });

    // Emit domain event (async, doesn't block transaction)
    const event: OrderCreatedEvent = {
      type: 'order.created',
      payload: {
        orderId: order.id.toString(),
        customerId: order.customerId.toString(),
        items: order.items.map((item) => ({
          productId: item.productId.toString(),
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })),
        totalAmount: Number(order.totalAmount),
        deliveryAddress: order.deliveryAddress,
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'order-service',
        correlationId: order.id.toString(),
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
    orderId: number,
    newStatus: OrderStatus,
    changedBy?: number
  ): Promise<OrderWithItems> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate status transition (business rule)
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['picking', 'cancelled'],
      picking: ['ready', 'cancelled'],
      ready: ['assigned', 'cancelled'],
      assigned: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    const currentStatus = order.status as OrderStatus;
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Update in database
    const [updatedOrder] = await this.db.drizzle
      .update(orders)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), isNull(orders.deletedAt)))
      .returning();

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    // Fetch items
    const items = await this.db.drizzle
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt))
      );

    const orderWithItems: OrderWithItems = {
      ...updatedOrder,
      items,
    };

    // Emit event
    const event: OrderStatusChangedEvent = {
      type: 'order.status_changed',
      payload: {
        orderId: orderId.toString(),
        previousStatus: currentStatus,
        newStatus,
        changedBy: changedBy?.toString(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'order-service',
        correlationId: orderId.toString(),
      },
    };

    await this.eventPublisher.publish(event);

    return orderWithItems;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: number,
    reason: string,
    cancelledBy: number
  ): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'delivered') {
      throw new Error('Cannot cancel a delivered order');
    }

    if (order.status === 'cancelled') {
      return; // Idempotent
    }

    // Update order with cancellation info
    await this.db.drizzle
      .update(orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), isNull(orders.deletedAt)));

    const event: OrderCancelledEvent = {
      type: 'order.cancelled',
      payload: {
        orderId: orderId.toString(),
        reason,
        cancelledBy: cancelledBy.toString(),
      },
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: Date.now(),
        source: 'order-service',
        correlationId: orderId.toString(),
      },
    };

    await this.eventPublisher.publish(event);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number): Promise<OrderWithItems | null> {
    const [order] = await this.db.drizzle
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), isNull(orders.deletedAt)))
      .limit(1);

    if (!order) {
      return null;
    }

    const items = await this.db.drizzle
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.orderId, orderId), isNull(orderItems.deletedAt))
      );

    return {
      ...order,
      items,
    };
  }
}
