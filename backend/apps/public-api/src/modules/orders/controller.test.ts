import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type { OrderService } from '@lokaly/domain';
import { ordersController } from './controller';

describe('public-api ordersController', () => {
  let mockService: Partial<OrderService>;
  let app: ReturnType<typeof ordersController>;

  beforeEach(() => {
    mockService = {
      createOrder: async () => ({ id: 1 } as any),
      getOrderById: async () => null,
    };
    app = ordersController(mockService as OrderService);
  });

  describe('POST /orders', () => {
    it('should return 401 when auth is missing', async () => {
      const res = await app.handle(
        new Request('http://localhost/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [],
            subtotalAmount: 100,
            deliveryAddress: 'Address',
          }),
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should create order for authenticated customer', async () => {
      const newOrder = {
        id: 1,
        customerId: 1,
        status: 'pending',
      };
      mockService.createOrder = async () => newOrder as any;

      // Mock auth context (normally injected by publicAuthPlugin)
      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '1',
            role: 'customer',
            email: 'customer@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                productId: 1,
                quantity: 2,
                unitPrice: 10.0,
                productName: 'Product',
              },
            ],
            subtotalAmount: 20,
            deliveryAddress: 'Address',
            customerName: 'Customer',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newOrder);
    });

    it('should return 401 for non-customer/courier role', async () => {
      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '1',
            role: 'admin',
            email: 'admin@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [],
            subtotalAmount: 100,
            deliveryAddress: 'Address',
          }),
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('GET /orders/:id', () => {
    it('should return 401 when auth is missing', async () => {
      const res = await app.handle(new Request('http://localhost/orders/1'));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return order for authenticated customer', async () => {
      const order = {
        id: 1,
        customerId: 1,
        status: 'pending',
      };
      mockService.getOrderById = async () => order as any;

      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '1',
            role: 'customer',
            email: 'customer@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders/1')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(order);
    });

    it('should return 404 when order not found', async () => {
      mockService.getOrderById = async () => null;

      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '1',
            role: 'customer',
            email: 'customer@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders/999')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Order not found');
    });

    it('should return 403 when customer tries to access another customer order', async () => {
      const order = {
        id: 1,
        customerId: 2, // Different customer
        status: 'pending',
      };
      mockService.getOrderById = async () => order as any;

      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '1', // Current customer
            role: 'customer',
            email: 'customer1@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders/1')
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should allow courier to access any order', async () => {
      const order = {
        id: 1,
        customerId: 2,
        status: 'pending',
      };
      mockService.getOrderById = async () => order as any;

      const appWithAuth = new Elysia()
        .derive(() => ({
          auth: {
            userId: '10',
            role: 'courier',
            email: 'courier@test.com',
          },
        }))
        .use(ordersController(mockService as OrderService));

      const res = await appWithAuth.handle(
        new Request('http://localhost/orders/1')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(order);
    });
  });
});
