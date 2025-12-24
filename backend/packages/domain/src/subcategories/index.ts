/**
 * Subcategories CRUD
 *
 * CRUD operations for subcategories with Redis caching.
 */

import type { DbConnection, Subcategory, NewSubcategory } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, isNull } from 'drizzle-orm';
import { subcategories } from '@lokaly/db/schema';

export interface SubcategoriesRepository {
  findById(id: number): Promise<Subcategory | null>;
  findByCategoryId(categoryId: number): Promise<Subcategory[]>;
  create(data: NewSubcategory): Promise<Subcategory>;
  update(
    id: number,
    data: Partial<NewSubcategory>
  ): Promise<Subcategory | null>;
  delete(id: number): Promise<boolean>;
}

export class SubcategoriesService implements SubcategoriesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Subcategory | null> {
    const cacheKey = `subcategories:${id}`;
    const cached = await this.cache.get<Subcategory>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(subcategories)
      .where(and(eq(subcategories.id, id), isNull(subcategories.deletedAt)))
      .limit(1);

    const subcat = result[0] || null;
    if (subcat) await this.cache.set(cacheKey, subcat, { ttl: 300 });
    return subcat;
  }

  async findByCategoryId(categoryId: number): Promise<Subcategory[]> {
    const cacheKey = `subcategories:category:${categoryId}`;
    const cached = await this.cache.get<Subcategory[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(subcategories)
      .where(
        and(
          eq(subcategories.categoryId, categoryId),
          isNull(subcategories.deletedAt)
        )
      )
      .orderBy(subcategories.displayOrder);

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async create(data: NewSubcategory): Promise<Subcategory> {
    const result = await this.db.drizzle
      .insert(subcategories)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const subcat = result[0];
    if (!subcat) throw new Error('Failed to create subcategory');

    await this.cache.set(`subcategories:${subcat.id}`, subcat, { ttl: 300 });
    await this.cache.delete(`subcategories:category:${subcat.categoryId}`);
    await this.cache.invalidateList('subcategories');
    return subcat;
  }

  async update(
    id: number,
    data: Partial<NewSubcategory>
  ): Promise<Subcategory | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subcategories.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('subcategories', id);
      await this.cache.set(`subcategories:${updated.id}`, updated, {
        ttl: 300,
      });
      await this.cache.delete(`subcategories:category:${updated.categoryId}`);
      await this.cache.invalidateList('subcategories');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(subcategories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(subcategories.id, id));

    await this.cache.invalidateEntity('subcategories', id);
    await this.cache.delete(`subcategories:category:${existing.categoryId}`);
    await this.cache.invalidateList('subcategories');
    return true;
  }
}
