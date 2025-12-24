/**
 * Categories CRUD
 *
 * CRUD operations for categories with Redis caching.
 */

import type { DbConnection, Category, NewCategory } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { categories } from '@lokaly/db/schema';

export interface CategoriesRepository {
  findById(id: number): Promise<Category | null>;
  findByDepartmentId(departmentId: number): Promise<Category[]>;
  create(data: NewCategory): Promise<Category>;
  update(id: number, data: Partial<NewCategory>): Promise<Category | null>;
  delete(id: number): Promise<boolean>;
}

export interface FindManyOptions {
  departmentId?: number;
  limit?: number;
  offset?: number;
  isActive?: boolean;
}

export class CategoriesService implements CategoriesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Category | null> {
    const cacheKey = `categories:${id}`;
    const cached = await this.cache.get<Category>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    const cat = result[0] || null;
    if (cat) await this.cache.set(cacheKey, cat, { ttl: 300 });
    return cat;
  }

  async findByDepartmentId(departmentId: number): Promise<Category[]> {
    const cacheKey = `categories:department:${departmentId}`;
    const cached = await this.cache.get<Category[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.departmentId, departmentId),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(categories.displayOrder);

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async create(data: NewCategory): Promise<Category> {
    const result = await this.db.drizzle
      .insert(categories)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const cat = result[0];
    if (!cat) throw new Error('Failed to create category');

    await this.cache.set(`categories:${cat.id}`, cat, { ttl: 300 });
    await this.cache.delete(`categories:department:${cat.departmentId}`);
    await this.cache.invalidateList('categories');
    return cat;
  }

  async update(
    id: number,
    data: Partial<NewCategory>
  ): Promise<Category | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('categories', id);
      await this.cache.set(`categories:${updated.id}`, updated, { ttl: 300 });
      await this.cache.delete(`categories:department:${updated.departmentId}`);
      await this.cache.invalidateList('categories');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(categories.id, id));

    await this.cache.invalidateEntity('categories', id);
    await this.cache.delete(`categories:department:${existing.departmentId}`);
    await this.cache.invalidateList('categories');
    return true;
  }
}
