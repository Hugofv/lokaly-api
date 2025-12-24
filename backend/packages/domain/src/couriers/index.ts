/**
 * Couriers CRUD
 *
 * CRUD operations for delivery couriers with Redis caching.
 * Strategic cache invalidation on mutations.
 */

import type { DbConnection, Courier, NewCourier } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, sql, or, like, isNull } from 'drizzle-orm';
import { couriers } from '@lokaly/db/schema';

export interface CouriersRepository {
  findById(id: number): Promise<Courier | null>;
  findByEmail(email: string): Promise<Courier | null>;
  findByCpf(cpf: string): Promise<Courier | null>;
  findAvailable(options?: FindAvailableOptions): Promise<Courier[]>;
  findMany(options?: CouriersFindManyOptions): Promise<Courier[]>;
  create(data: NewCourier): Promise<Courier>;
  update(id: number, data: Partial<NewCourier>): Promise<Courier | null>;
  delete(id: number): Promise<boolean>;
  updateLocation(
    id: number,
    latitude: number,
    longitude: number
  ): Promise<boolean>;
  setAvailability(id: number, isAvailable: boolean): Promise<boolean>;
  count(filters?: CourierFilters): Promise<number>;
  search(query: string, limit?: number): Promise<Courier[]>;
}

export interface CouriersFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?:
    | 'created_at'
    | 'email'
    | 'first_name'
    | 'total_deliveries'
    | 'total_rating';
  orderDirection?: 'asc' | 'desc';
  filters?: CourierFilters;
}

export interface FindAvailableOptions {
  limit?: number;
  vehicleType?: string;
  minRating?: number;
}

export interface CourierFilters {
  status?: string;
  vehicleType?: string;
  isAvailable?: boolean;
  isVerified?: boolean;
}

export class CouriersService implements CouriersRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  /**
   * Find courier by ID with cache
   * Cache TTL: 3 minutes (location changes frequently)
   */
  async findById(id: number): Promise<Courier | null> {
    const cacheKey = `couriers:${id}`;

    const cached = await this.cache.get<Courier>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(couriers)
      .where(and(eq(couriers.id, id), isNull(couriers.deletedAt)))
      .limit(1);

    const courier = result[0] || null;

    if (courier) {
      // Shorter TTL for couriers (location changes)
      await this.cache.set(cacheKey, courier, { ttl: 180 });
    }

    return courier;
  }

  /**
   * Find courier by email with cache
   * Cache TTL: 5 minutes
   */
  async findByEmail(email: string): Promise<Courier | null> {
    const cacheKey = `couriers:email:${email}`;

    const cached = await this.cache.get<Courier>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(couriers)
      .where(and(eq(couriers.email, email), isNull(couriers.deletedAt)))
      .limit(1);

    const courier = result[0] || null;

    if (courier) {
      await this.cache.set(cacheKey, courier, { ttl: 300 });
      await this.cache.set(`couriers:${courier.id}`, courier, { ttl: 180 });
    }

    return courier;
  }

  /**
   * Find courier by CPF with cache
   * Cache TTL: 5 minutes
   */
  async findByCpf(cpf: string): Promise<Courier | null> {
    const cacheKey = `couriers:cpf:${cpf}`;

    const cached = await this.cache.get<Courier>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(couriers)
      .where(and(eq(couriers.cpf, cpf), isNull(couriers.deletedAt)))
      .limit(1);

    const courier = result[0] || null;

    if (courier) {
      await this.cache.set(cacheKey, courier, { ttl: 300 });
      await this.cache.set(`couriers:${courier.id}`, courier, { ttl: 180 });
    }

    return courier;
  }

  /**
   * Find available couriers
   * Cache TTL: 30 seconds (availability changes frequently)
   */
  async findAvailable(options: FindAvailableOptions = {}): Promise<Courier[]> {
    const { limit = 20, vehicleType, minRating } = options;
    const cacheKey = `couriers:available:${JSON.stringify({
      limit,
      vehicleType,
      minRating,
    })}`;

    const cached = await this.cache.get<Courier[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [
      isNull(couriers.deletedAt),
      eq(couriers.isAvailable, true),
      eq(couriers.status, 'active'),
    ];

    if (vehicleType) {
      conditions.push(eq(couriers.vehicleType, vehicleType));
    }

    if (minRating) {
      conditions.push(sql`${couriers.totalRating} >= ${minRating}`);
    }

    const result = await this.db.drizzle
      .select()
      .from(couriers)
      .where(and(...conditions))
      .orderBy(desc(couriers.totalRating), desc(couriers.onTimeDeliveryRate))
      .limit(limit);

    // Very short TTL for availability
    await this.cache.set(cacheKey, result, { ttl: 30 });

    return result;
  }

  /**
   * Find many couriers with pagination and filters
   * Cache TTL: 2 minutes
   */
  async findMany(options: CouriersFindManyOptions = {}): Promise<Courier[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
    } = options;

    const cacheKey = `list:couriers:${JSON.stringify({
      limit,
      offset,
      orderBy,
      orderDirection,
      filters,
    })}`;

    const cached = await this.cache.get<Courier[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [isNull(couriers.deletedAt)];
    if (filters.status) {
      conditions.push(eq(couriers.status, filters.status));
    }
    if (filters.vehicleType) {
      conditions.push(eq(couriers.vehicleType, filters.vehicleType));
    }
    if (filters.isAvailable !== undefined) {
      conditions.push(eq(couriers.isAvailable, filters.isAvailable));
    }
    if (filters.isVerified !== undefined) {
      conditions.push(eq(couriers.isVerified, filters.isVerified));
    }

    const baseQuery = this.db.drizzle
      .select()
      .from(couriers)
      .where(and(...conditions));

    let result: Courier[];
    if (orderBy === 'created_at') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(couriers.createdAt)
            : couriers.createdAt
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'email') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(couriers.email) : couriers.email
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'first_name') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(couriers.firstName)
            : couriers.firstName
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'total_deliveries') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(couriers.totalDeliveries)
            : couriers.totalDeliveries
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'total_rating') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(couriers.totalRating)
            : couriers.totalRating
        )
        .limit(limit)
        .offset(offset);
    } else {
      result = await baseQuery.limit(limit).offset(offset);
    }

    await this.cache.set(cacheKey, result, { ttl: 120 });

    return result;
  }

  /**
   * Search couriers by name or email
   * Cache TTL: 1 minute
   */
  async search(query: string, limit: number = 20): Promise<Courier[]> {
    const cacheKey = `search:couriers:${query}:${limit}`;

    const cached = await this.cache.get<Courier[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const searchTerm = `%${query}%`;
    const result = await this.db.drizzle
      .select()
      .from(couriers)
      .where(
        and(
          isNull(couriers.deletedAt),
          or(
            like(couriers.firstName, searchTerm),
            like(couriers.lastName, searchTerm),
            like(couriers.email, searchTerm)
          )
        )
      )
      .limit(limit);

    await this.cache.set(cacheKey, result, { ttl: 60 });

    return result;
  }

  /**
   * Create new courier
   * Invalidates list caches
   */
  async create(data: NewCourier): Promise<Courier> {
    const result = await this.db.drizzle
      .insert(couriers)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const courier = result[0];
    if (!courier) {
      throw new Error('Failed to create courier');
    }

    // Cache the new courier
    await this.cache.set(`couriers:${courier.id}`, courier, { ttl: 180 });
    if (courier.email) {
      await this.cache.set(`couriers:email:${courier.email}`, courier, {
        ttl: 300,
      });
    }
    if (courier.cpf) {
      await this.cache.set(`couriers:cpf:${courier.cpf}`, courier, {
        ttl: 300,
      });
    }

    // Invalidate list caches
    await this.cache.invalidateList('couriers');
    await this.cache.deletePattern('couriers:available:*');

    return courier;
  }

  /**
   * Update courier
   * Invalidates all related caches
   */
  async update(id: number, data: Partial<NewCourier>): Promise<Courier | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const result = await this.db.drizzle
      .update(couriers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(couriers.id, id))
      .returning();

    const updated = result[0]!;
    if (!updated) {
      return null;
    }

    // Invalidate all caches for this courier
    await this.cache.invalidateEntity('couriers', id);

    // Cache updated courier
    await this.cache.set(`couriers:${updated.id}`, updated, { ttl: 180 });
    if (updated.email) {
      await this.cache.set(`couriers:email:${updated.email}`, updated, {
        ttl: 300,
      });
    }
    if (updated.cpf) {
      await this.cache.set(`couriers:cpf:${updated.cpf}`, updated, {
        ttl: 300,
      });
    }

    // Invalidate list and availability caches
    await this.cache.invalidateList('couriers');
    await this.cache.deletePattern('couriers:available:*');

    return updated;
  }

  /**
   * Update courier location
   * Short TTL cache (location changes frequently)
   */
  async updateLocation(
    id: number,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    const result = await this.db.drizzle
      .update(couriers)
      .set({
        currentLatitude: latitude.toString(),
        currentLongitude: longitude.toString(),
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(couriers.id, id))
      .returning();

    if (result.length === 0) {
      return false;
    }

    const updated = result[0]!;

    // Invalidate availability cache (location affects availability)
    await this.cache.deletePattern('couriers:available:*');

    // Update cache with short TTL
    await this.cache.set(`couriers:${updated.id}`, updated, { ttl: 60 });

    return true;
  }

  /**
   * Set courier availability
   * Invalidates availability caches
   */
  async setAvailability(id: number, isAvailable: boolean): Promise<boolean> {
    const result = await this.db.drizzle
      .update(couriers)
      .set({
        isAvailable,
        updatedAt: new Date(),
      })
      .where(eq(couriers.id, id))
      .returning();

    if (result.length === 0) {
      return false;
    }

    const updated = result[0]!;

    // Invalidate availability caches
    await this.cache.deletePattern('couriers:available:*');

    // Update cache
    await this.cache.set(`couriers:${updated.id}`, updated, { ttl: 180 });
    await this.cache.invalidateList('couriers');

    return true;
  }

  /**
   * Soft delete courier
   * Invalidates all related caches
   */
  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.drizzle
      .update(couriers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(couriers.id, id));

    // Invalidate all caches
    await this.cache.invalidateEntity('couriers', id);
    await this.cache.invalidateList('couriers');
    await this.cache.deletePattern('couriers:available:*');

    return true;
  }

  /**
   * Count couriers with filters
   * Cache TTL: 5 minutes
   */
  async count(filters: CourierFilters = {}): Promise<number> {
    const cacheKey = `count:couriers:${JSON.stringify(filters)}`;

    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const conditions = [isNull(couriers.deletedAt)];
    if (filters.status) {
      conditions.push(eq(couriers.status, filters.status));
    }
    if (filters.vehicleType) {
      conditions.push(eq(couriers.vehicleType, filters.vehicleType));
    }
    if (filters.isAvailable !== undefined) {
      conditions.push(eq(couriers.isAvailable, filters.isAvailable));
    }
    if (filters.isVerified !== undefined) {
      conditions.push(eq(couriers.isVerified, filters.isVerified));
    }

    const result = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(couriers)
      .where(and(...conditions));

    const count = Number(result[0]?.count || 0);

    await this.cache.set(cacheKey, count, { ttl: 300 });

    return count;
  }
}
