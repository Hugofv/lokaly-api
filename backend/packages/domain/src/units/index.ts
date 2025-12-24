/**
 * Units CRUD
 *
 * CRUD operations for units of measurement with Redis caching.
 */

import type { DbConnection, Unit, NewUnit } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, isNull } from 'drizzle-orm';
import { units } from '@lokaly/db/schema';

export interface UnitsRepository {
  findById(id: number): Promise<Unit | null>;
  findByCode(code: string): Promise<Unit | null>;
  findByType(type: string): Promise<Unit[]>;
  findMany(): Promise<Unit[]>;
  create(data: NewUnit): Promise<Unit>;
  update(id: number, data: Partial<NewUnit>): Promise<Unit | null>;
  delete(id: number): Promise<boolean>;
}

export class UnitsService implements UnitsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Unit | null> {
    const cacheKey = `units:${id}`;
    const cached = await this.cache.get<Unit>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(units)
      .where(and(eq(units.id, id), isNull(units.deletedAt)))
      .limit(1);

    const unit = result[0] || null;
    if (unit) await this.cache.set(cacheKey, unit, { ttl: 600 }); // 10 min - units don't change often
    return unit;
  }

  async findByCode(code: string): Promise<Unit | null> {
    const cacheKey = `units:code:${code}`;
    const cached = await this.cache.get<Unit>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(units)
      .where(and(eq(units.code, code), isNull(units.deletedAt)))
      .limit(1);

    const unit = result[0] || null;
    if (unit) {
      await this.cache.set(cacheKey, unit, { ttl: 600 });
      await this.cache.set(`units:${unit.id}`, unit, { ttl: 600 });
    }
    return unit;
  }

  async findByType(type: string): Promise<Unit[]> {
    const cacheKey = `units:type:${type}`;
    const cached = await this.cache.get<Unit[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(units)
      .where(
        and(
          eq(units.type, type),
          isNull(units.deletedAt),
          eq(units.isActive, true)
        )
      )
      .orderBy(units.displayOrder);

    await this.cache.set(cacheKey, result, { ttl: 600 });
    return result;
  }

  async findMany(): Promise<Unit[]> {
    const cacheKey = 'list:units:all';
    const cached = await this.cache.get<Unit[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(units)
      .where(and(isNull(units.deletedAt), eq(units.isActive, true)))
      .orderBy(units.displayOrder);

    await this.cache.set(cacheKey, result, { ttl: 600 });
    return result;
  }

  async create(data: NewUnit): Promise<Unit> {
    const result = await this.db.drizzle
      .insert(units)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const unit = result[0];
    if (!unit) throw new Error('Failed to create unit');

    await this.cache.set(`units:${unit.id}`, unit, { ttl: 600 });
    if (unit.code) {
      await this.cache.set(`units:code:${unit.code}`, unit, { ttl: 600 });
    }
    await this.cache.deletePattern('units:type:*');
    await this.cache.delete('list:units:all');
    return unit;
  }

  async update(id: number, data: Partial<NewUnit>): Promise<Unit | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(units)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('units', id);
      await this.cache.set(`units:${updated.id}`, updated, { ttl: 600 });
      if (updated.code) {
        await this.cache.set(`units:code:${updated.code}`, updated, {
          ttl: 600,
        });
      }
      await this.cache.deletePattern('units:type:*');
      await this.cache.delete('list:units:all');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(units)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(units.id, id));

    await this.cache.invalidateEntity('units', id);
    await this.cache.deletePattern('units:type:*');
    await this.cache.delete('list:units:all');
    return true;
  }
}
