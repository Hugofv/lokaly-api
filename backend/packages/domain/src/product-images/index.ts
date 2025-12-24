/**
 * Product Images CRUD
 *
 * CRUD operations for product images with Redis caching.
 */

import type { DbConnection, ProductImage, NewProductImage } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { productImages } from '@lokaly/db/schema';

export interface ProductImagesRepository {
  findById(id: number): Promise<ProductImage | null>;
  findByProductId(productId: number): Promise<ProductImage[]>;
  findPrimaryByProductId(productId: number): Promise<ProductImage | null>;
  create(data: NewProductImage): Promise<ProductImage>;
  update(
    id: number,
    data: Partial<NewProductImage>
  ): Promise<ProductImage | null>;
  delete(id: number): Promise<boolean>;
  setPrimary(productId: number, imageId: number): Promise<boolean>;
}

export class ProductImagesService implements ProductImagesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<ProductImage | null> {
    const cacheKey = `product-images:${id}`;
    const cached = await this.cache.get<ProductImage>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productImages)
      .where(and(eq(productImages.id, id), isNull(productImages.deletedAt)))
      .limit(1);

    const image = result[0] || null;
    if (image) await this.cache.set(cacheKey, image, { ttl: 300 });
    return image;
  }

  async findByProductId(productId: number): Promise<ProductImage[]> {
    const cacheKey = `product-images:product:${productId}`;
    const cached = await this.cache.get<ProductImage[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, productId),
          isNull(productImages.deletedAt)
        )
      )
      .orderBy(productImages.displayOrder, productImages.createdAt);

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async findPrimaryByProductId(
    productId: number
  ): Promise<ProductImage | null> {
    const cacheKey = `product-images:product:${productId}:primary`;
    const cached = await this.cache.get<ProductImage>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, productId),
          eq(productImages.isPrimary, true),
          isNull(productImages.deletedAt)
        )
      )
      .limit(1);

    const image = result[0] || null;
    if (image) {
      await this.cache.set(cacheKey, image, { ttl: 300 });
      await this.cache.set(`product-images:${image.id}`, image, { ttl: 300 });
    }
    return image;
  }

  async create(data: NewProductImage): Promise<ProductImage> {
    // If setting as primary, unset other primary images
    if (data.isPrimary) {
      await this.db.drizzle
        .update(productImages)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(productImages.productId, data.productId),
            eq(productImages.isPrimary, true),
            isNull(productImages.deletedAt)
          )
        );
    }

    const result = await this.db.drizzle
      .insert(productImages)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const image = result[0];
    if (!image) throw new Error('Failed to create product image');

    await this.cache.set(`product-images:${image.id}`, image, { ttl: 300 });
    await this.cache.delete(`product-images:product:${image.productId}`);
    await this.cache.delete(
      `product-images:product:${image.productId}:primary`
    );
    return image;
  }

  async update(
    id: number,
    data: Partial<NewProductImage>
  ): Promise<ProductImage | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    // If setting as primary, unset other primary images
    if (data.isPrimary) {
      await this.db.drizzle
        .update(productImages)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(productImages.productId, existing.productId),
            eq(productImages.id, id),
            eq(productImages.isPrimary, true),
            isNull(productImages.deletedAt)
          )
        );
    }

    const result = await this.db.drizzle
      .update(productImages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productImages.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('product-images', id);
      await this.cache.set(`product-images:${updated.id}`, updated, {
        ttl: 300,
      });
      await this.cache.delete(`product-images:product:${updated.productId}`);
      await this.cache.delete(
        `product-images:product:${updated.productId}:primary`
      );
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(productImages)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(productImages.id, id));

    await this.cache.invalidateEntity('product-images', id);
    await this.cache.delete(`product-images:product:${existing.productId}`);
    await this.cache.delete(
      `product-images:product:${existing.productId}:primary`
    );
    return true;
  }

  async setPrimary(productId: number, imageId: number): Promise<boolean> {
    // Unset all primary images for this product
    await this.db.drizzle
      .update(productImages)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(productImages.productId, productId),
          isNull(productImages.deletedAt)
        )
      );

    // Set new primary
    const result = await this.db.drizzle
      .update(productImages)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
          isNull(productImages.deletedAt)
        )
      )
      .returning();

    if (result.length === 0) return false;

    await this.cache.delete(`product-images:product:${productId}`);
    await this.cache.delete(`product-images:product:${productId}:primary`);
    const updated = result[0]!;
    await this.cache.set(`product-images:${updated.id}`, updated, { ttl: 300 });
    await this.cache.set(
      `product-images:product:${productId}:primary`,
      updated,
      {
        ttl: 300,
      }
    );
    return true;
  }
}
