/**
 * Products CRUD
 *
 * CRUD operations for products with Redis caching.
 * Strategic cache invalidation on mutations.
 */

import type { DbConnection, Product, NewProduct } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, sql, or, like, isNull } from 'drizzle-orm';
import { products } from '@lokaly/db/schema';

export interface ProductsRepository {
  findById(id: number): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  findMany(options?: ProductsFindManyOptions): Promise<Product[]>;
  search(query: string, limit?: number): Promise<Product[]>;
  create(data: NewProduct): Promise<Product>;
  update(id: number, data: Partial<NewProduct>): Promise<Product | null>;
  delete(id: number): Promise<boolean>;
  count(filters?: ProductFilters): Promise<number>;
}

export interface ProductsFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'name' | 'base_price' | 'sku';
  orderDirection?: 'asc' | 'desc';
  filters?: ProductFilters;
}

export interface ProductFilters {
  subcategoryId?: number;
  brandId?: number;
  status?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isPerishable?: boolean;
  requiresRefrigeration?: boolean;
}

export class ProductsService implements ProductsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  /**
   * Find product by ID with cache
   * Cache TTL: 5 minutes
   */
  async findById(id: number): Promise<Product | null> {
    const cacheKey = `products:${id}`;

    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    const product = result[0] || null;

    if (product) {
      await this.cache.set(cacheKey, product, { ttl: 300 });
    }

    return product;
  }

  /**
   * Find product by SKU with cache
   * Cache TTL: 5 minutes
   */
  async findBySku(sku: string): Promise<Product | null> {
    const cacheKey = `products:sku:${sku}`;

    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), isNull(products.deletedAt)))
      .limit(1);

    const product = result[0] || null;

    if (product) {
      await this.cache.set(cacheKey, product, { ttl: 300 });
      await this.cache.set(`products:${product.id}`, product, { ttl: 300 });
    }

    return product;
  }

  /**
   * Find product by barcode with cache
   * Cache TTL: 5 minutes
   */
  async findByBarcode(barcode: string): Promise<Product | null> {
    const cacheKey = `products:barcode:${barcode}`;

    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(products)
      .where(and(eq(products.barcode, barcode), isNull(products.deletedAt)))
      .limit(1);

    const product = result[0] || null;

    if (product) {
      await this.cache.set(cacheKey, product, { ttl: 300 });
      await this.cache.set(`products:${product.id}`, product, { ttl: 300 });
    }

    return product;
  }

  /**
   * Find many products with pagination and filters
   * Cache TTL: 2 minutes
   */
  async findMany(options: ProductsFindManyOptions = {}): Promise<Product[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
    } = options;

    const cacheKey = `list:products:${JSON.stringify({
      limit,
      offset,
      orderBy,
      orderDirection,
      filters,
    })}`;

    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [isNull(products.deletedAt)];
    if (filters.subcategoryId) {
      conditions.push(eq(products.subcategoryId, filters.subcategoryId));
    }
    if (filters.brandId) {
      conditions.push(eq(products.brandId, filters.brandId));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.isFeatured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.isFeatured));
    }
    if (filters.isNew !== undefined) {
      conditions.push(eq(products.isNew, filters.isNew));
    }
    if (filters.isBestSeller !== undefined) {
      conditions.push(eq(products.isBestSeller, filters.isBestSeller));
    }
    if (filters.isPerishable !== undefined) {
      conditions.push(eq(products.isPerishable, filters.isPerishable));
    }
    if (filters.requiresRefrigeration !== undefined) {
      conditions.push(
        eq(products.requiresRefrigeration, filters.requiresRefrigeration)
      );
    }

    // Build base query
    let baseQuery = this.db.drizzle
      .select()
      .from(products)
      .where(and(...conditions));

    // Apply ordering and pagination based on orderBy
    let result: Product[];
    if (orderBy === 'created_at') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(products.createdAt)
            : products.createdAt
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'name') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(products.name) : products.name
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'base_price') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(products.basePrice)
            : products.basePrice
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'sku') {
      result = await baseQuery
        .orderBy(orderDirection === 'desc' ? desc(products.sku) : products.sku)
        .limit(limit)
        .offset(offset);
    } else {
      result = await baseQuery.limit(limit).offset(offset);
    }

    await this.cache.set(cacheKey, result, { ttl: 120 });

    return result;
  }

  /**
   * Search products by name or SKU
   * Cache TTL: 1 minute
   */
  async search(query: string, limit: number = 20): Promise<Product[]> {
    const cacheKey = `search:products:${query}:${limit}`;

    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const searchTerm = `%${query}%`;
    const result = await this.db.drizzle
      .select()
      .from(products)
      .where(
        and(
          isNull(products.deletedAt),
          or(
            like(products.name, searchTerm),
            like(products.sku, searchTerm),
            like(products.displayName, searchTerm)
          )
        )
      )
      .limit(limit);

    await this.cache.set(cacheKey, result, { ttl: 60 });

    return result;
  }

  /**
   * Create new product
   * Invalidates list caches
   */
  async create(data: NewProduct): Promise<Product> {
    const result = await this.db.drizzle
      .insert(products)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const product = result[0];
    if (!product) {
      throw new Error('Failed to create product');
    }

    // Cache the new product
    await this.cache.set(`products:${product.id}`, product, { ttl: 300 });
    if (product.sku) {
      await this.cache.set(`products:sku:${product.sku}`, product, {
        ttl: 300,
      });
    }
    if (product.barcode) {
      await this.cache.set(`products:barcode:${product.barcode}`, product, {
        ttl: 300,
      });
    }

    // Invalidate list caches
    await this.cache.invalidateList('products');

    return product;
  }

  /**
   * Update product
   * Invalidates all related caches
   */
  async update(id: number, data: Partial<NewProduct>): Promise<Product | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const result = await this.db.drizzle
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    const updated = result[0] || null;

    if (updated) {
      // Invalidate all caches for this product
      await this.cache.invalidateEntity('products', id);

      // Cache updated product
      await this.cache.set(`products:${updated.id}`, updated, { ttl: 300 });
      if (updated.sku) {
        await this.cache.set(`products:sku:${updated.sku}`, updated, {
          ttl: 300,
        });
      }
      if (updated.barcode) {
        await this.cache.set(`products:barcode:${updated.barcode}`, updated, {
          ttl: 300,
        });
      }

      // Invalidate list caches
      await this.cache.invalidateList('products');
    }

    return updated;
  }

  /**
   * Soft delete product
   * Invalidates all related caches
   */
  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.drizzle
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // Invalidate all caches
    await this.cache.invalidateEntity('products', id);
    await this.cache.invalidateList('products');

    return true;
  }

  /**
   * Count products with filters
   * Cache TTL: 5 minutes
   */
  async count(filters: ProductFilters = {}): Promise<number> {
    const cacheKey = `count:products:${JSON.stringify(filters)}`;

    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const conditions = [isNull(products.deletedAt)];
    if (filters.subcategoryId) {
      conditions.push(eq(products.subcategoryId, filters.subcategoryId));
    }
    if (filters.brandId) {
      conditions.push(eq(products.brandId, filters.brandId));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.isFeatured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.isFeatured));
    }
    if (filters.isNew !== undefined) {
      conditions.push(eq(products.isNew, filters.isNew));
    }
    if (filters.isBestSeller !== undefined) {
      conditions.push(eq(products.isBestSeller, filters.isBestSeller));
    }

    const result = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const count = Number(result[0]?.count || 0);

    await this.cache.set(cacheKey, count, { ttl: 300 });

    return count;
  }
}
