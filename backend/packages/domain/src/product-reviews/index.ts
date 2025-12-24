/**
 * Product Reviews CRUD
 *
 * CRUD operations for product reviews with Redis caching.
 */

import type { DbConnection, ProductReview, NewProductReview } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { productReviews } from '@lokaly/db/schema';

export interface ProductReviewsRepository {
  findById(id: number): Promise<ProductReview | null>;
  findByProductId(
    productId: number,
    options?: FindManyOptions
  ): Promise<ProductReview[]>;
  findByCustomerId(customerId: number): Promise<ProductReview[]>;
  getAverageRating(productId: number): Promise<number>;
  create(data: NewProductReview): Promise<ProductReview>;
  update(
    id: number,
    data: Partial<NewProductReview>
  ): Promise<ProductReview | null>;
  delete(id: number): Promise<boolean>;
}

export interface FindManyOptions {
  limit?: number;
  offset?: number;
  isPublished?: boolean;
  minRating?: number;
}

export class ProductReviewsService implements ProductReviewsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<ProductReview | null> {
    const cacheKey = `product-reviews:${id}`;
    const cached = await this.cache.get<ProductReview>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.id, id), isNull(productReviews.deletedAt)))
      .limit(1);

    const review = result[0] || null;
    if (review) await this.cache.set(cacheKey, review, { ttl: 300 });
    return review;
  }

  async findByProductId(
    productId: number,
    options: FindManyOptions = {}
  ): Promise<ProductReview[]> {
    const { limit = 20, offset = 0, isPublished, minRating } = options;
    const cacheKey = `product-reviews:product:${productId}:${JSON.stringify(
      options
    )}`;
    const cached = await this.cache.get<ProductReview[]>(cacheKey);
    if (cached) return cached;

    const conditions = [
      eq(productReviews.productId, productId),
      isNull(productReviews.deletedAt),
    ];

    if (isPublished !== undefined) {
      conditions.push(eq(productReviews.isPublished, isPublished));
    }
    if (minRating) {
      conditions.push(sql`${productReviews.rating} >= ${minRating}`);
    }

    const result = await this.db.drizzle
      .select()
      .from(productReviews)
      .where(and(...conditions))
      .orderBy(desc(productReviews.createdAt))
      .limit(limit)
      .offset(offset);

    await this.cache.set(cacheKey, result, { ttl: 120 });
    return result;
  }

  async findByCustomerId(customerId: number): Promise<ProductReview[]> {
    const cacheKey = `product-reviews:customer:${customerId}`;
    const cached = await this.cache.get<ProductReview[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.customerId, customerId),
          isNull(productReviews.deletedAt)
        )
      )
      .orderBy(desc(productReviews.createdAt));

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async getAverageRating(productId: number): Promise<number> {
    const cacheKey = `product-reviews:product:${productId}:avg-rating`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.drizzle
      .select({
        avg: sql<number>`AVG(${productReviews.rating})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.isPublished, true),
          isNull(productReviews.deletedAt)
        )
      );

    const avg = result[0]?.avg ? Number(result[0].avg) : 0;
    await this.cache.set(cacheKey, avg, { ttl: 300 });
    return avg;
  }

  async create(data: NewProductReview): Promise<ProductReview> {
    const result = await this.db.drizzle
      .insert(productReviews)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const review = result[0];
    if (!review) throw new Error('Failed to create product review');

    await this.cache.set(`product-reviews:${review.id}`, review, { ttl: 300 });
    await this.cache.delete(`product-reviews:product:${review.productId}:*`);
    await this.cache.delete(
      `product-reviews:product:${review.productId}:avg-rating`
    );
    await this.cache.delete(`product-reviews:customer:${review.customerId}`);
    return review;
  }

  async update(
    id: number,
    data: Partial<NewProductReview>
  ): Promise<ProductReview | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(productReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productReviews.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('product-reviews', id);
      await this.cache.set(`product-reviews:${updated.id}`, updated, {
        ttl: 300,
      });
      await this.cache.deletePattern(
        `product-reviews:product:${updated.productId}:*`
      );
      await this.cache.delete(
        `product-reviews:product:${updated.productId}:avg-rating`
      );
      await this.cache.delete(`product-reviews:customer:${updated.customerId}`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(productReviews)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(productReviews.id, id));

    await this.cache.invalidateEntity('product-reviews', id);
    await this.cache.deletePattern(
      `product-reviews:product:${existing.productId}:*`
    );
    await this.cache.delete(
      `product-reviews:product:${existing.productId}:avg-rating`
    );
    await this.cache.delete(`product-reviews:customer:${existing.customerId}`);
    return true;
  }
}
