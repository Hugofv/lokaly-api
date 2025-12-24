/**
 * Users CRUD
 *
 * CRUD operations for admin/staff users with Redis caching.
 * Strategic cache invalidation on mutations.
 */

import type { DbConnection, User, NewUser } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { users } from '@lokaly/db/schema';

export interface UsersRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(options?: UsersFindManyOptions): Promise<User[]>;
  create(data: NewUser): Promise<User>;
  update(id: number, data: Partial<NewUser>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  count(filters?: UserFilters): Promise<number>;
}

export interface UsersFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'email' | 'first_name';
  orderDirection?: 'asc' | 'desc';
  filters?: UserFilters;
}

export interface UserFilters {
  role?: string;
  department?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export class UsersService implements UsersRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  /**
   * Find user by ID with cache
   * Cache TTL: 5 minutes (users don't change frequently)
   */
  async findById(id: number): Promise<User | null> {
    const cacheKey = `users:${id}`;

    // Try cache first
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.db.drizzle
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    const user = result[0] || null;

    // Cache for 5 minutes
    if (user) {
      await this.cache.set(cacheKey, user, { ttl: 300 });
    }

    return user;
  }

  /**
   * Find user by email with cache
   * Cache TTL: 5 minutes
   */
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `users:email:${email}`;

    // Try cache first
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const result = await this.db.drizzle
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    const user = result[0] || null;

    // Cache for 5 minutes
    if (user) {
      await this.cache.set(cacheKey, user, { ttl: 300 });
      // Also cache by ID
      await this.cache.set(`users:${user.id}`, user, { ttl: 300 });
    }

    return user;
  }

  /**
   * Find many users with pagination and filters
   * Cache TTL: 2 minutes (lists change more frequently)
   */
  async findMany(options: UsersFindManyOptions = {}): Promise<User[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
    } = options;

    // Build cache key from options
    const cacheKey = `list:users:${JSON.stringify({
      limit,
      offset,
      orderBy,
      orderDirection,
      filters,
    })}`;

    // Try cache first
    const cached = await this.cache.get<User[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build conditions
    const conditions = [isNull(users.deletedAt)];
    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.department) {
      conditions.push(eq(users.department, filters.department));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }
    if (filters.emailVerified !== undefined) {
      conditions.push(eq(users.emailVerified, filters.emailVerified));
    }

    // Build base query
    const baseQuery = this.db.drizzle
      .select()
      .from(users)
      .where(and(...conditions));

    // Apply ordering and pagination
    let result: User[];
    if (orderBy === 'created_at') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(users.createdAt) : users.createdAt
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'email') {
      result = await baseQuery
        .orderBy(orderDirection === 'desc' ? desc(users.email) : users.email)
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'first_name') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(users.firstName) : users.firstName
        )
        .limit(limit)
        .offset(offset);
    } else {
      result = await baseQuery.limit(limit).offset(offset);
    }

    // Cache for 2 minutes
    await this.cache.set(cacheKey, result, { ttl: 120 });

    return result;
  }

  /**
   * Create new user
   * Invalidates list caches
   */
  async create(data: NewUser): Promise<User> {
    const result = await this.db.drizzle
      .insert(users)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const user = result[0];
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Cache the new user
    await this.cache.set(`users:${user.id}`, user, { ttl: 300 });
    await this.cache.set(`users:email:${user.email}`, user, { ttl: 300 });

    // Invalidate list caches
    await this.cache.invalidateList('users');

    return user;
  }

  /**
   * Update user
   * Invalidates all related caches
   */
  async update(id: number, data: Partial<NewUser>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const result = await this.db.drizzle
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    const updated = result[0] || null;

    if (updated) {
      // Invalidate all caches for this user
      await this.cache.invalidateEntity('users', id);

      // Cache updated user
      await this.cache.set(`users:${updated.id}`, updated, { ttl: 300 });
      await this.cache.set(`users:email:${updated.email}`, updated, {
        ttl: 300,
      });

      // Invalidate list caches
      await this.cache.invalidateList('users');
    }

    return updated;
  }

  /**
   * Soft delete user
   * Invalidates all related caches
   */
  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.drizzle
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // Invalidate all caches
    await this.cache.invalidateEntity('users', id);
    await this.cache.invalidateList('users');

    return true;
  }

  /**
   * Count users with filters
   * Cache TTL: 5 minutes
   */
  async count(filters: UserFilters = {}): Promise<number> {
    const cacheKey = `count:users:${JSON.stringify(filters)}`;

    // Try cache first
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Build query
    const conditions = [isNull(users.deletedAt)];
    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.department) {
      conditions.push(eq(users.department, filters.department));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }
    if (filters.emailVerified !== undefined) {
      conditions.push(eq(users.emailVerified, filters.emailVerified));
    }

    const result = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(...conditions));

    const count = Number(result[0]?.count || 0);

    // Cache for 5 minutes
    await this.cache.set(cacheKey, count, { ttl: 300 });

    return count;
  }
}
