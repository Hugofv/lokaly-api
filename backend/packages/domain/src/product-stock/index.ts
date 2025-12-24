/**
 * Product Stock CRUD
 *
 * CRUD operations for product stock with Redis caching.
 * Short TTL for stock as it changes frequently.
 */

import type { DbConnection, ProductStock, NewProductStock } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { productStock } from '@lokaly/db/schema';

export interface ProductStockRepository {
  findById(id: number): Promise<ProductStock | null>;
  findByProductAndWarehouse(
    productId: number,
    warehouseId: number,
    variantId?: number
  ): Promise<ProductStock | null>;
  findByProductId(productId: number): Promise<ProductStock[]>;
  findByWarehouseId(warehouseId: number): Promise<ProductStock[]>;
  create(data: NewProductStock): Promise<ProductStock>;
  update(
    id: number,
    data: Partial<NewProductStock>
  ): Promise<ProductStock | null>;
  updateQuantity(
    productId: number,
    warehouseId: number,
    variantId: number | null,
    quantity: number
  ): Promise<boolean>;
  delete(id: number): Promise<boolean>;
}

export class ProductStockService implements ProductStockRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<ProductStock | null> {
    const cacheKey = `product-stock:${id}`;
    const cached = await this.cache.get<ProductStock>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productStock)
      .where(and(eq(productStock.id, id), isNull(productStock.deletedAt)))
      .limit(1);

    const stock = result[0] || null;
    if (stock) await this.cache.set(cacheKey, stock, { ttl: 60 }); // Short TTL - stock changes frequently
    return stock;
  }

  async findByProductAndWarehouse(
    productId: number,
    warehouseId: number,
    variantId?: number
  ): Promise<ProductStock | null> {
    const cacheKey = `product-stock:${productId}:${
      variantId ?? 'base'
    }:${warehouseId}`;
    const cached = await this.cache.get<ProductStock>(cacheKey);
    if (cached) return cached;

    const conditions = [
      eq(productStock.productId, productId),
      eq(productStock.warehouseId, warehouseId),
      isNull(productStock.deletedAt),
    ];

    if (variantId) {
      conditions.push(eq(productStock.variantId, variantId));
    } else {
      conditions.push(sql`${productStock.variantId} IS NULL`);
    }

    const result = await this.db.drizzle
      .select()
      .from(productStock)
      .where(and(...conditions))
      .limit(1);

    const stock = result[0] || null;
    if (stock) {
      await this.cache.set(cacheKey, stock, { ttl: 60 });
      await this.cache.set(`product-stock:${stock.id}`, stock, { ttl: 60 });
    }
    return stock;
  }

  async findByProductId(productId: number): Promise<ProductStock[]> {
    const cacheKey = `product-stock:product:${productId}`;
    const cached = await this.cache.get<ProductStock[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productStock)
      .where(
        and(
          eq(productStock.productId, productId),
          isNull(productStock.deletedAt)
        )
      );

    await this.cache.set(cacheKey, result, { ttl: 60 });
    return result;
  }

  async findByWarehouseId(warehouseId: number): Promise<ProductStock[]> {
    const cacheKey = `product-stock:warehouse:${warehouseId}`;
    const cached = await this.cache.get<ProductStock[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productStock)
      .where(
        and(
          eq(productStock.warehouseId, warehouseId),
          isNull(productStock.deletedAt)
        )
      );

    await this.cache.set(cacheKey, result, { ttl: 60 });
    return result;
  }

  async create(data: NewProductStock): Promise<ProductStock> {
    const result = await this.db.drizzle
      .insert(productStock)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const stock = result[0];
    if (!stock) throw new Error('Failed to create product stock');

    await this.cache.set(`product-stock:${stock.id}`, stock, { ttl: 60 });
    const variantKey = stock.variantId ?? 'base';
    await this.cache.set(
      `product-stock:${stock.productId}:${variantKey}:${stock.warehouseId}`,
      stock,
      { ttl: 60 }
    );
    await this.cache.delete(`product-stock:product:${stock.productId}`);
    await this.cache.delete(`product-stock:warehouse:${stock.warehouseId}`);
    return stock;
  }

  async update(
    id: number,
    data: Partial<NewProductStock>
  ): Promise<ProductStock | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(productStock)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productStock.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('product-stock', id);
      await this.cache.set(`product-stock:${updated.id}`, updated, { ttl: 60 });
      const variantKey = updated.variantId ?? 'base';
      await this.cache.set(
        `product-stock:${updated.productId}:${variantKey}:${updated.warehouseId}`,
        updated,
        { ttl: 60 }
      );
      await this.cache.delete(`product-stock:product:${updated.productId}`);
      await this.cache.delete(`product-stock:warehouse:${updated.warehouseId}`);
    }
    return updated;
  }

  async updateQuantity(
    productId: number,
    warehouseId: number,
    variantId: number | null,
    quantity: number
  ): Promise<boolean> {
    const conditions = [
      eq(productStock.productId, productId),
      eq(productStock.warehouseId, warehouseId),
      isNull(productStock.deletedAt),
    ];

    if (variantId) {
      conditions.push(eq(productStock.variantId, variantId));
    } else {
      conditions.push(sql`${productStock.variantId} IS NULL`);
    }

    const result = await this.db.drizzle
      .update(productStock)
      .set({ quantity, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (result.length === 0) return false;

    const updated = result[0]!;
    await this.cache.set(`product-stock:${updated.id}`, updated, { ttl: 60 });
    const variantKey = variantId ?? 'base';
    await this.cache.set(
      `product-stock:${productId}:${variantKey}:${warehouseId}`,
      updated,
      { ttl: 60 }
    );
    await this.cache.delete(`product-stock:product:${productId}`);
    await this.cache.delete(`product-stock:warehouse:${warehouseId}`);
    return true;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(productStock)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(productStock.id, id));

    await this.cache.invalidateEntity('product-stock', id);
    await this.cache.delete(`product-stock:product:${existing.productId}`);
    await this.cache.delete(`product-stock:warehouse:${existing.warehouseId}`);
    return true;
  }
}
