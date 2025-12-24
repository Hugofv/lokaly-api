import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type { CustomersService, AddressesService } from '@lokaly/domain';
import { customersController } from './controller';

describe('admin-api customersController', () => {
  let mockCustomersService: Partial<CustomersService>;
  let mockAddressesService: Partial<AddressesService>;
  let app: ReturnType<typeof customersController>;

  beforeEach(() => {
    mockCustomersService = {
      findMany: async () => [],
      count: async () => 0,
      findById: async () => null,
      search: async () => [],
      create: async () => ({ id: 1 } as any),
      update: async () => null,
      delete: async () => false,
    };
    mockAddressesService = {
      findByCustomerId: async () => [],
      create: async () => ({ id: 1 } as any),
    };
    app = customersController(
      mockCustomersService as CustomersService,
      mockAddressesService as AddressesService
    );
  });

  describe('GET /customers', () => {
    it('should return paginated customers list', async () => {
      mockCustomersService.findMany = async () =>
        [
          { id: 1, email: 'customer1@test.com' },
          { id: 2, email: 'customer2@test.com' },
        ] as any;
      mockCustomersService.count = async () => 15;

      const res = await app.handle(
        new Request('http://localhost/customers?limit=2&offset=0')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        total: 15,
        limit: 2,
        offset: 0,
        hasMore: true,
      });
    });

    it('should apply status and loyaltyTier filters', async () => {
      mockCustomersService.findMany = async (opts) => {
        expect(opts?.filters?.status).toBe('active');
        expect(opts?.filters?.loyaltyTier).toBe('gold');
        return [] as any;
      };
      mockCustomersService.count = async () => 3;

      await app.handle(
        new Request('http://localhost/customers?status=active&loyaltyTier=gold')
      );
    });
  });

  describe('GET /customers/search', () => {
    it('should return search results', async () => {
      const results = [
        { id: 1, email: 'test1@test.com' },
        { id: 2, email: 'test2@test.com' },
      ];
      mockCustomersService.search = async () => results as any;

      const res = await app.handle(
        new Request('http://localhost/customers/search?q=test')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(results);
    });
  });

  describe('GET /customers/:id', () => {
    it('should return customer by id', async () => {
      const customer = { id: 1, email: 'customer@test.com' };
      mockCustomersService.findById = async () => customer as any;

      const res = await app.handle(new Request('http://localhost/customers/1'));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(customer);
    });

    it('should return 404 when customer not found', async () => {
      mockCustomersService.findById = async () => null;

      const res = await app.handle(
        new Request('http://localhost/customers/999')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Customer not found');
    });
  });

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        id: 1,
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'Customer',
      };
      mockCustomersService.create = async () => newCustomer as any;

      const res = await app.handle(
        new Request('http://localhost/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'new@test.com',
            firstName: 'New',
            lastName: 'Customer',
            cpf: '12345678900',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newCustomer);
    });
  });

  describe('PATCH /customers/:id', () => {
    it('should update customer', async () => {
      const updatedCustomer = { id: 1, email: 'updated@test.com' };
      mockCustomersService.update = async () => updatedCustomer as any;

      const res = await app.handle(
        new Request('http://localhost/customers/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'updated@test.com' }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(updatedCustomer);
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should delete customer', async () => {
      mockCustomersService.delete = async () => true;

      const res = await app.handle(
        new Request('http://localhost/customers/1', { method: 'DELETE' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /customers/:id/addresses', () => {
    it('should return customer addresses', async () => {
      const addresses = [
        { id: 1, street: 'Street 1' },
        { id: 2, street: 'Street 2' },
      ];
      mockAddressesService.findByCustomerId = async () => addresses as any;

      const res = await app.handle(
        new Request('http://localhost/customers/1/addresses')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(addresses);
    });
  });

  describe('POST /customers/:id/addresses', () => {
    it('should create address for customer', async () => {
      const newAddress = {
        id: 1,
        customerId: 1,
        street: 'New Street',
        number: '123',
      };
      mockAddressesService.create = async () => newAddress as any;

      const res = await app.handle(
        new Request('http://localhost/customers/1/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'home',
            street: 'New Street',
            number: '123',
            neighborhood: 'Neighborhood',
            city: 'City',
            state: 'State',
            zipCode: '12345-678',
            country: 'BR',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newAddress);
    });
  });
});
