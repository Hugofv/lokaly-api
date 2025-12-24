/**
 * Brands CRUD
 *
 * CRUD operations for brands with Redis caching.
 */

import type { DbConnection, Brand, NewBrand } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { brands } from '@lokaly/db/schema';

export interface BrandsRepository {
  findById(id: number): Promise<Brand | null>;
  findByCode(code: string): Promise<Brand | null>;
  findMany(options?: FindManyOptions): Promise<Brand[]>;
  create(data: NewBrand): Promise<Brand>;
  update(id: number, data: Partial<NewBrand>): Promise<Brand | null>;
  delete(id: number): Promise<boolean>;
}

export interface FindManyOptions {
  limit?: number;
  offset?: number;
  isActive?: boolean;
}

export class BrandsService implements BrandsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Brand | null> {
    const cacheKey = `brands:${id}`;
    const cached = await this.cache.get<Brand>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(brands)
      .where(and(eq(brands.id, id), isNull(brands.deletedAt)))
      .limit(1);

    const brand = result[0] || null;
    if (brand) await this.cache.set(cacheKey, brand, { ttl: 300 });
    return brand;
  }

  async findByCode(code: string): Promise<Brand | null> {
    const cacheKey = `brands:code:${code}`;
    const cached = await this.cache.get<Brand>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(brands)
      .where(and(eq(brands.code, code), isNull(brands.deletedAt)))
      .limit(1);

    const brand = result[0] || null;
    if (brand) {
      await this.cache.set(cacheKey, brand, { ttl: 300 });
      await this.cache.set(`brands:${brand.id}`, brand, { ttl: 300 });
    }
    return brand;
  }

  async findMany(options: FindManyOptions = {}): Promise<Brand[]> {
    const { limit = 50, offset = 0, isActive } = options;
    const cacheKey = `list:brands:${JSON.stringify(options)}`;
    const cached = await this.cache.get<Brand[]>(cacheKey);
    if (cached) return cached;

    const conditions = [isNull(brands.deletedAt)];
    if (isActive !== undefined) {
      conditions.push(eq(brands.isActive, isActive));
    }

    const result = await this.db.drizzle
      .select()
      .from(brands)
      .where(and(...conditions))
      .orderBy(brands.name)
      .limit(limit)
      .offset(offset);

    await this.cache.set(cacheKey, result, { ttl: 120 });
    return result;
  }

  async create(data: NewBrand): Promise<Brand> {
    const result = await this.db.drizzle
      .insert(brands)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const brand = result[0];
    if (!brand) throw new Error('Failed to create brand');

    await this.cache.set(`brands:${brand.id}`, brand, { ttl: 300 });
    if (brand.code) {
      await this.cache.set(`brands:code:${brand.code}`, brand, { ttl: 300 });
    }
    await this.cache.invalidateList('brands');
    return brand;
  }

  async update(id: number, data: Partial<NewBrand>): Promise<Brand | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('brands', id);
      await this.cache.set(`brands:${updated.id}`, updated, { ttl: 300 });
      if (updated.code) {
        await this.cache.set(`brands:code:${updated.code}`, updated, {
          ttl: 300,
        });
      }
      await this.cache.invalidateList('brands');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(brands)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(brands.id, id));

    await this.cache.invalidateEntity('brands', id);
    await this.cache.invalidateList('brands');
    return true;
  }
}
