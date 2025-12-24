/**
 * Product Variants CRUD
 *
 * CRUD operations for product variants with Redis caching.
 */

import type {
  DbConnection,
  ProductVariant,
  NewProductVariant,
} from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, isNull } from 'drizzle-orm';
import { productVariants } from '@lokaly/db/schema';

export interface ProductVariantsRepository {
  findById(id: number): Promise<ProductVariant | null>;
  findByProductId(productId: number): Promise<ProductVariant[]>;
  findBySku(sku: string): Promise<ProductVariant | null>;
  create(data: NewProductVariant): Promise<ProductVariant>;
  update(
    id: number,
    data: Partial<NewProductVariant>
  ): Promise<ProductVariant | null>;
  delete(id: number): Promise<boolean>;
}

export class ProductVariantsService implements ProductVariantsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<ProductVariant | null> {
    const cacheKey = `product-variants:${id}`;
    const cached = await this.cache.get<ProductVariant>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.id, id), isNull(productVariants.deletedAt)))
      .limit(1);

    const variant = result[0] || null;
    if (variant) await this.cache.set(cacheKey, variant, { ttl: 300 });
    return variant;
  }

  async findByProductId(productId: number): Promise<ProductVariant[]> {
    const cacheKey = `product-variants:product:${productId}`;
    const cached = await this.cache.get<ProductVariant[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          isNull(productVariants.deletedAt)
        )
      )
      .orderBy(productVariants.displayOrder);

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async findBySku(sku: string): Promise<ProductVariant | null> {
    const cacheKey = `product-variants:sku:${sku}`;
    const cached = await this.cache.get<ProductVariant>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productVariants)
      .where(
        and(eq(productVariants.sku, sku), isNull(productVariants.deletedAt))
      )
      .limit(1);

    const variant = result[0] || null;
    if (variant) {
      await this.cache.set(cacheKey, variant, { ttl: 300 });
      await this.cache.set(`product-variants:${variant.id}`, variant, {
        ttl: 300,
      });
    }
    return variant;
  }

  async create(data: NewProductVariant): Promise<ProductVariant> {
    const result = await this.db.drizzle
      .insert(productVariants)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const variant = result[0];
    if (!variant) throw new Error('Failed to create product variant');

    await this.cache.set(`product-variants:${variant.id}`, variant, {
      ttl: 300,
    });
    if (variant.sku) {
      await this.cache.set(`product-variants:sku:${variant.sku}`, variant, {
        ttl: 300,
      });
    }
    await this.cache.delete(`product-variants:product:${variant.productId}`);
    return variant;
  }

  async update(
    id: number,
    data: Partial<NewProductVariant>
  ): Promise<ProductVariant | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('product-variants', id);
      await this.cache.set(`product-variants:${updated.id}`, updated, {
        ttl: 300,
      });
      if (updated.sku) {
        await this.cache.set(`product-variants:sku:${updated.sku}`, updated, {
          ttl: 300,
        });
      }
      await this.cache.delete(`product-variants:product:${updated.productId}`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(productVariants)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(productVariants.id, id));

    await this.cache.invalidateEntity('product-variants', id);
    await this.cache.delete(`product-variants:product:${existing.productId}`);
    return true;
  }
}
