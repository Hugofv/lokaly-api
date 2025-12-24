/**
 * Product Prices CRUD
 *
 * CRUD operations for product prices with Redis caching.
 */

import type { DbConnection, ProductPrice, NewProductPrice } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';
import { productPrices } from '@lokaly/db/schema';

export interface ProductPricesRepository {
  findById(id: number): Promise<ProductPrice | null>;
  findByProductId(
    productId: number,
    variantId?: number
  ): Promise<ProductPrice[]>;
  findActiveByProductId(
    productId: number,
    variantId?: number
  ): Promise<ProductPrice[]>;
  create(data: NewProductPrice): Promise<ProductPrice>;
  update(
    id: number,
    data: Partial<NewProductPrice>
  ): Promise<ProductPrice | null>;
  delete(id: number): Promise<boolean>;
}

export class ProductPricesService implements ProductPricesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<ProductPrice | null> {
    const cacheKey = `product-prices:${id}`;
    const cached = await this.cache.get<ProductPrice>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productPrices)
      .where(and(eq(productPrices.id, id), isNull(productPrices.deletedAt)))
      .limit(1);

    const price = result[0] || null;
    if (price) await this.cache.set(cacheKey, price, { ttl: 180 }); // 3 min - prices change more than products
    return price;
  }

  async findByProductId(
    productId: number,
    variantId?: number
  ): Promise<ProductPrice[]> {
    const cacheKey = `product-prices:product:${productId}:${
      variantId ?? 'base'
    }`;
    const cached = await this.cache.get<ProductPrice[]>(cacheKey);
    if (cached) return cached;

    const conditions = [
      eq(productPrices.productId, productId),
      isNull(productPrices.deletedAt),
    ];

    if (variantId) {
      conditions.push(eq(productPrices.variantId, variantId));
    } else {
      conditions.push(sql`${productPrices.variantId} IS NULL`);
    }

    const result = await this.db.drizzle
      .select()
      .from(productPrices)
      .where(and(...conditions))
      .orderBy(productPrices.priority);

    await this.cache.set(cacheKey, result, { ttl: 180 });
    return result;
  }

  async findActiveByProductId(
    productId: number,
    variantId?: number
  ): Promise<ProductPrice[]> {
    const cacheKey = `product-prices:product:${productId}:${
      variantId ?? 'base'
    }:active`;
    const cached = await this.cache.get<ProductPrice[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const conditions = [
      eq(productPrices.productId, productId),
      eq(productPrices.isActive, true),
      isNull(productPrices.deletedAt),
    ];

    if (variantId) {
      conditions.push(eq(productPrices.variantId, variantId));
    } else {
      conditions.push(sql`${productPrices.variantId} IS NULL`);
    }

    // Check validity dates
    const result = await this.db.drizzle
      .select()
      .from(productPrices)
      .where(and(...conditions))
      .orderBy(productPrices.priority);

    // Filter by date range in memory (or add to query)
    const active = result.filter((price) => {
      if (price.validFrom && price.validFrom > now) return false;
      if (price.validUntil && price.validUntil < now) return false;
      return true;
    });

    await this.cache.set(cacheKey, active, { ttl: 180 });
    return active;
  }

  async create(data: NewProductPrice): Promise<ProductPrice> {
    const result = await this.db.drizzle
      .insert(productPrices)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const price = result[0];
    if (!price) throw new Error('Failed to create product price');

    await this.cache.set(`product-prices:${price.id}`, price, { ttl: 180 });
    const variantKey = price.variantId ?? 'base';
    await this.cache.delete(
      `product-prices:product:${price.productId}:${variantKey}`
    );
    await this.cache.delete(
      `product-prices:product:${price.productId}:${variantKey}:active`
    );
    return price;
  }

  async update(
    id: number,
    data: Partial<NewProductPrice>
  ): Promise<ProductPrice | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(productPrices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productPrices.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('product-prices', id);
      await this.cache.set(`product-prices:${updated.id}`, updated, {
        ttl: 180,
      });
      const variantKey = updated.variantId ?? 'base';
      await this.cache.delete(
        `product-prices:product:${updated.productId}:${variantKey}`
      );
      await this.cache.delete(
        `product-prices:product:${updated.productId}:${variantKey}:active`
      );
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(productPrices)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(productPrices.id, id));

    await this.cache.invalidateEntity('product-prices', id);
    const variantKey = existing.variantId ?? 'base';
    await this.cache.delete(
      `product-prices:product:${existing.productId}:${variantKey}`
    );
    await this.cache.delete(
      `product-prices:product:${existing.productId}:${variantKey}:active`
    );
    return true;
  }
}
