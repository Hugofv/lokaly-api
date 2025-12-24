/**
 * Departments CRUD
 *
 * CRUD operations for departments with Redis caching.
 */

import type { DbConnection, Department, NewDepartment } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { departments } from '@lokaly/db/schema';

export interface DepartmentsRepository {
  findById(id: number): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  findMany(options?: DepartmentsFindManyOptions): Promise<Department[]>;
  create(data: NewDepartment): Promise<Department>;
  update(id: number, data: Partial<NewDepartment>): Promise<Department | null>;
  delete(id: number): Promise<boolean>;
}

export interface DepartmentsFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'name' | 'display_order';
  orderDirection?: 'asc' | 'desc';
  isActive?: boolean;
}

export class DepartmentsService implements DepartmentsRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  async findById(id: number): Promise<Department | null> {
    const cacheKey = `departments:${id}`;
    const cached = await this.cache.get<Department>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), isNull(departments.deletedAt)))
      .limit(1);

    const dept = result[0] || null;
    if (dept) await this.cache.set(cacheKey, dept, { ttl: 300 });
    return dept;
  }

  async findByCode(code: string): Promise<Department | null> {
    const cacheKey = `departments:code:${code}`;
    const cached = await this.cache.get<Department>(cacheKey);
    if (cached) return cached;

    const result = await this.db.drizzle
      .select()
      .from(departments)
      .where(and(eq(departments.code, code), isNull(departments.deletedAt)))
      .limit(1);

    const dept = result[0] || null;
    if (dept) {
      await this.cache.set(cacheKey, dept, { ttl: 300 });
      await this.cache.set(`departments:${dept.id}`, dept, { ttl: 300 });
    }
    return dept;
  }

  async findMany(
    options: DepartmentsFindManyOptions = {}
  ): Promise<Department[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'display_order',
      orderDirection = 'asc',
      isActive,
    } = options;

    const cacheKey = `list:departments:${JSON.stringify(options)}`;
    const cached = await this.cache.get<Department[]>(cacheKey);
    if (cached) return cached;

    const conditions = [isNull(departments.deletedAt)];
    if (isActive !== undefined) {
      conditions.push(eq(departments.isActive, isActive));
    }

    const baseQuery = this.db.drizzle
      .select()
      .from(departments)
      .where(and(...conditions));

    let result: Department[];
    if (orderBy === 'display_order') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(departments.displayOrder)
            : departments.displayOrder
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'name') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(departments.name) : departments.name
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'created_at') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(departments.createdAt)
            : departments.createdAt
        )
        .limit(limit)
        .offset(offset);
    } else {
      result = await baseQuery.limit(limit).offset(offset);
    }
    await this.cache.set(cacheKey, result, { ttl: 120 });
    return result;
  }

  async create(data: NewDepartment): Promise<Department> {
    const result = await this.db.drizzle
      .insert(departments)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const dept = result[0];
    if (!dept) throw new Error('Failed to create department');

    await this.cache.set(`departments:${dept.id}`, dept, { ttl: 300 });
    if (dept.code) {
      await this.cache.set(`departments:code:${dept.code}`, dept, { ttl: 300 });
    }
    await this.cache.invalidateList('departments');
    return dept;
  }

  async update(
    id: number,
    data: Partial<NewDepartment>
  ): Promise<Department | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.drizzle
      .update(departments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    const updated = result[0] || null;
    if (updated) {
      await this.cache.invalidateEntity('departments', id);
      await this.cache.set(`departments:${updated.id}`, updated, { ttl: 300 });
      if (updated.code) {
        await this.cache.set(`departments:code:${updated.code}`, updated, {
          ttl: 300,
        });
      }
      await this.cache.invalidateList('departments');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    await this.db.drizzle
      .update(departments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(departments.id, id));

    await this.cache.invalidateEntity('departments', id);
    await this.cache.invalidateList('departments');
    return true;
  }
}
