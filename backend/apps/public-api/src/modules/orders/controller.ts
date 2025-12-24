/**
 * Public Orders Controller
 * Uses OrderService from domain layer and RedisEventPublisher via EventPublisher
 */

import { Elysia } from 'elysia';
import type { OrderService } from '@lokaly/domain';
import { jsonResponse, errorResponse } from '../../shared/responses';
import { ordersValidators } from './validators';

export const ordersController = (orderService: OrderService) =>
  new Elysia({ prefix: '/orders' })
    // Create order (requires auth)
    .post(
      '/',
      async ({ body, auth }) => {
        if (!auth || (auth.role !== 'customer' && auth.role !== 'courier')) {
          return errorResponse('Unauthorized', 401);
        }

        try {
          const order = await orderService.createOrder({
            customerId: Number(auth.userId),
            customerName: body.customerName || '',
            customerPhone: body.customerPhone,
            customerEmail: auth.email,
            items: body.items,
            deliveryAddressId: body.deliveryAddressId,
            deliveryAddress: body.deliveryAddress,
            deliveryInstructions: body.deliveryInstructions,
            subtotalAmount: body.subtotalAmount,
            taxAmount: body.taxAmount,
            deliveryFee: body.deliveryFee,
            discountAmount: body.discountAmount,
            paymentMethod: body.paymentMethod,
            notes: body.notes,
          });

          return jsonResponse(order, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      ordersValidators.create
    )
    // Get order by id (requires auth, customer can only see own orders)
    .get(
      '/:id',
      async ({ params, auth }) => {
        if (!auth || (auth.role !== 'customer' && auth.role !== 'courier')) {
          return errorResponse('Unauthorized', 401);
        }

        try {
          const orderId = Number(params.id);
          const order = await orderService.getOrderById(orderId);

          if (!order) {
            return errorResponse('Order not found', 404);
          }

          if (auth.role === 'customer' && order.customerId !== Number(auth.userId)) {
            return errorResponse('Forbidden', 403);
          }

          return jsonResponse(order);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      ordersValidators.getById
    );
