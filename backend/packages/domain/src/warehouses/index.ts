/**
 * Warehouses CRUD
 *
 * CRUD operations for warehouses with Redis caching.
 */

import type { DbConnection, Warehouse, NewWarehouse } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, isNull } from 'drizzle-orm';
import { warehouses } from '@lokaly/db/schema';

export interface WarehousesRepository {
  findById(id: number): Promise<Warehouse | null>;
  findByCode(code: string): Promise<Warehouse | null>;
  findMany(isActive?: boolean): Promise<Warehouse[]>;
  create(data: NewWarehouse): Promise<Warehouse>;
  update(id: number, data: Partial<NewWarehouse>): Promise<Warehouse | null>;
  delete(id: number): Promise<boolean>;
}

export class WarehousesService implements WarehousesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Warehouse | null> {
    const cacheKey = `warehouses:${id}`;
    const cached = await this.cache.get<Warehouse>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), isNull(warehouses.deletedAt)))
      .limit(1);

    const warehouse = result[0] || null;
    if (warehouse) await this.cache.set(cacheKey, warehouse, { ttl: 300 });
    return warehouse;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const cacheKey = `warehouses:code:${code}`;
    const cached = await this.cache.get<Warehouse>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.code, code), isNull(warehouses.deletedAt)))
      .limit(1);

    const warehouse = result[0] || null;
    if (warehouse) {
      await this.cache.set(cacheKey, warehouse, { ttl: 300 });
      await this.cache.set(`warehouses:${warehouse.id}`, warehouse, {
        ttl: 300,
      });
    }
    return warehouse;
  }

  async findMany(isActive?: boolean): Promise<Warehouse[]> {
    const cacheKey = `list:warehouses:${isActive ?? 'all'}`;
    const cached = await this.cache.get<Warehouse[]>(cacheKey);
    if (cached) return cached;

    const conditions = [isNull(warehouses.deletedAt)];
    if (isActive !== undefined) {
      conditions.push(eq(warehouses.isActive, isActive));
    }

    const result = await this.db.drizzle
      .select()
      .from(warehouses)
      .where(and(...conditions))
      .orderBy(warehouses.name);

    await this.cache.set(cacheKey, result, { ttl: 300 });
    return result;
  }

  async create(data: NewWarehouse): Promise<Warehouse> {
    const result = await this.db.drizzle
      .insert(warehouses)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const warehouse = result[0];
    if (!warehouse) throw new Error('Failed to create warehouse');

    await this.cache.set(`warehouses:${warehouse.id}`, warehouse, { ttl: 300 });
    if (warehouse.code) {
      await this.cache.set(`warehouses:code:${warehouse.code}`, warehouse, {
        ttl: 300,
      });
    }
    await this.cache.invalidateList('warehouses');
    return warehouse;
  }

  async update(
    id: number,
    data: Partial<NewWarehouse>
  ): Promise<Warehouse | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(warehouses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('warehouses', id);
      await this.cache.set(`warehouses:${updated.id}`, updated, { ttl: 300 });
      if (updated.code) {
        await this.cache.set(`warehouses:code:${updated.code}`, updated, {
          ttl: 300,
        });
      }
      await this.cache.invalidateList('warehouses');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(warehouses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(warehouses.id, id));

    await this.cache.invalidateEntity('warehouses', id);
    await this.cache.invalidateList('warehouses');
    return true;
  }
}
