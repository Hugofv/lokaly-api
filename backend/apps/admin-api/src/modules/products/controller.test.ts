import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type { ProductsService } from '@lokaly/domain';
import { productsController } from './controller';

describe('admin-api productsController', () => {
  let mockService: Partial<ProductsService>;
  let app: ReturnType<typeof productsController>;

  beforeEach(() => {
    mockService = {
      findMany: async () => [],
      count: async () => 0,
      findById: async () => null,
      findBySku: async () => null,
      search: async () => [],
      create: async () => ({ id: 1 } as any),
      update: async () => null,
      delete: async () => false,
    };
    app = productsController(mockService as ProductsService);
  });

  describe('GET /products', () => {
    it('should return paginated products list', async () => {
      mockService.findMany = async () =>
        [
          { id: 1, name: 'Product 1', sku: 'SKU1' },
          { id: 2, name: 'Product 2', sku: 'SKU2' },
        ] as any;
      mockService.count = async () => 25;

      const res = await app.handle(
        new Request('http://localhost/products?limit=2&offset=0')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(25);
    });

    it('should apply filters', async () => {
      mockService.findMany = async (opts) => {
        expect(opts?.filters?.subcategoryId).toBe(1);
        expect(opts?.filters?.isFeatured).toBe(true);
        return [] as any;
      };
      mockService.count = async () => 5;

      await app.handle(
        new Request('http://localhost/products?subcategoryId=1&isFeatured=true')
      );
    });
  });

  describe('GET /products/search', () => {
    it('should return search results', async () => {
      const results = [{ id: 1, name: 'Test Product' }];
      mockService.search = async () => results as any;

      const res = await app.handle(
        new Request('http://localhost/products/search?q=test')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(results);
    });
  });

  describe('GET /products/by-sku', () => {
    it('should return product by sku', async () => {
      const product = { id: 1, sku: 'SKU123', name: 'Product' };
      mockService.findBySku = async () => product as any;

      const res = await app.handle(
        new Request('http://localhost/products/by-sku?sku=SKU123')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(product);
    });

    it('should return 404 when product not found', async () => {
      mockService.findBySku = async () => null;

      const res = await app.handle(
        new Request('http://localhost/products/by-sku?sku=INVALID')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      const product = { id: 1, name: 'Product' };
      mockService.findById = async () => product as any;

      const res = await app.handle(new Request('http://localhost/products/1'));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(product);
    });

    it('should return 404 when product not found', async () => {
      mockService.findById = async () => null;

      const res = await app.handle(
        new Request('http://localhost/products/999')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        id: 1,
        name: 'New Product',
        sku: 'NEW-SKU',
      };
      mockService.create = async () => newProduct as any;

      const res = await app.handle(
        new Request('http://localhost/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Product',
            sku: 'NEW-SKU',
            subcategoryId: 1,
            unitId: 1,
            status: 'active',
            basePrice: '10.00',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newProduct);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product', async () => {
      const updatedProduct = { id: 1, name: 'Updated Product' };
      mockService.update = async () => updatedProduct as any;

      const res = await app.handle(
        new Request('http://localhost/products/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Product' }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(updatedProduct);
    });

    it('should return 404 when product not found', async () => {
      mockService.update = async () => null;

      const res = await app.handle(
        new Request('http://localhost/products/999', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        })
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product', async () => {
      mockService.delete = async () => true;

      const res = await app.handle(
        new Request('http://localhost/products/1', { method: 'DELETE' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('should return 404 when product not found', async () => {
      mockService.delete = async () => false;

      const res = await app.handle(
        new Request('http://localhost/products/999', { method: 'DELETE' })
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });
});
