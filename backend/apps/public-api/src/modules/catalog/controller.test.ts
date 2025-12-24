import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type {
  DepartmentsService,
  CategoriesService,
  SubcategoriesService,
  BrandsService,
  ProductsService,
} from '@lokaly/domain';
import { catalogController } from './controller';

describe('public-api catalogController', () => {
  let mockDepartmentsService: Partial<DepartmentsService>;
  let mockCategoriesService: Partial<CategoriesService>;
  let mockSubcategoriesService: Partial<SubcategoriesService>;
  let mockBrandsService: Partial<BrandsService>;
  let mockProductsService: Partial<ProductsService>;
  let app: ReturnType<typeof catalogController>;

  beforeEach(() => {
    mockDepartmentsService = {
      findMany: async () => [],
    };
    mockCategoriesService = {
      findByDepartmentId: async () => [],
    };
    mockSubcategoriesService = {
      findByCategoryId: async () => [],
    };
    mockBrandsService = {
      findMany: async () => [],
    };
    mockProductsService = {
      findMany: async () => [],
      count: async () => 0,
      findById: async () => null,
      findBySku: async () => null,
      search: async () => [],
    };
    app = catalogController(
      mockDepartmentsService as DepartmentsService,
      mockCategoriesService as CategoriesService,
      mockSubcategoriesService as SubcategoriesService,
      mockBrandsService as BrandsService,
      mockProductsService as ProductsService
    );
  });

  describe('GET /catalog/departments', () => {
    it('should return departments list', async () => {
      const departments = [
        { id: 1, name: 'Department 1' },
        { id: 2, name: 'Department 2' },
      ];
      mockDepartmentsService.findMany = async () => departments as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/departments')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(departments);
    });
  });

  describe('GET /catalog/categories', () => {
    it('should return categories by departmentId', async () => {
      const categories = [
        { id: 1, name: 'Category 1', departmentId: 1 },
        { id: 2, name: 'Category 2', departmentId: 1 },
      ];
      mockCategoriesService.findByDepartmentId = async () => categories as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/categories?departmentId=1')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(categories);
    });

    it('should return 400 when departmentId is missing', async () => {
      const res = await app.handle(
        new Request('http://localhost/catalog/categories')
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('departmentId');
    });
  });

  describe('GET /catalog/subcategories', () => {
    it('should return subcategories by categoryId', async () => {
      const subcategories = [
        { id: 1, name: 'Subcategory 1', categoryId: 1 },
        { id: 2, name: 'Subcategory 2', categoryId: 1 },
      ];
      mockSubcategoriesService.findByCategoryId = async () =>
        subcategories as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/subcategories?categoryId=1')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(subcategories);
    });

    it('should return 400 when categoryId is missing', async () => {
      const res = await app.handle(
        new Request('http://localhost/catalog/subcategories')
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('categoryId');
    });
  });

  describe('GET /catalog/brands', () => {
    it('should return brands list', async () => {
      const brands = [
        { id: 1, name: 'Brand 1' },
        { id: 2, name: 'Brand 2' },
      ];
      mockBrandsService.findMany = async () => brands as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/brands')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(brands);
    });
  });

  describe('GET /catalog/products', () => {
    it('should return paginated products list', async () => {
      const products = [
        { id: 1, name: 'Product 1', sku: 'SKU1' },
        { id: 2, name: 'Product 2', sku: 'SKU2' },
      ];
      mockProductsService.findMany = async () => products as any;
      mockProductsService.count = async () => 30;

      const res = await app.handle(
        new Request('http://localhost/catalog/products?limit=2&offset=0')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        total: 30,
        limit: 2,
        offset: 0,
        hasMore: true,
      });
    });

    it('should apply filters', async () => {
      mockProductsService.findMany = async (opts) => {
        expect(opts?.filters?.subcategoryId).toBe(1);
        expect(opts?.filters?.isFeatured).toBe(true);
        return [] as any;
      };
      mockProductsService.count = async () => 5;

      await app.handle(
        new Request(
          'http://localhost/catalog/products?subcategoryId=1&isFeatured=true'
        )
      );
    });
  });

  describe('GET /catalog/products/:id', () => {
    it('should return product by id', async () => {
      const product = { id: 1, name: 'Product', sku: 'SKU123' };
      mockProductsService.findById = async () => product as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/products/1')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(product);
    });

    it('should return 404 when product not found', async () => {
      mockProductsService.findById = async () => null;

      const res = await app.handle(
        new Request('http://localhost/catalog/products/999')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });

  describe('GET /catalog/products/by-sku', () => {
    it('should return product by sku', async () => {
      const product = { id: 1, sku: 'SKU123', name: 'Product' };
      mockProductsService.findBySku = async () => product as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/products/by-sku?sku=SKU123')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(product);
    });

    it('should return 404 when product not found', async () => {
      mockProductsService.findBySku = async () => null;

      const res = await app.handle(
        new Request('http://localhost/catalog/products/by-sku?sku=INVALID')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Product not found');
    });
  });

  describe('GET /catalog/products/search', () => {
    it('should return search results', async () => {
      const results = [{ id: 1, name: 'Test Product' }];
      mockProductsService.search = async () => results as any;

      const res = await app.handle(
        new Request('http://localhost/catalog/products/search?q=test')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(results);
    });
  });
});
