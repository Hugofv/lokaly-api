/**
 * Customers CRUD
 *
 * CRUD operations for customers with Redis caching.
 * Strategic cache invalidation on mutations.
 */

import type { DbConnection, Customer, NewCustomer } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, sql, or, like, isNull } from 'drizzle-orm';
import { customers } from '@lokaly/db/schema';

export interface CustomersRepository {
  findById(id: number): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findByCpf(cpf: string): Promise<Customer | null>;
  findByReferralCode(code: string): Promise<Customer | null>;
  findMany(options?: CustomersFindManyOptions): Promise<Customer[]>;
  create(data: NewCustomer): Promise<Customer>;
  update(id: number, data: Partial<NewCustomer>): Promise<Customer | null>;
  delete(id: number): Promise<boolean>;
  count(filters?: CustomerFilters): Promise<number>;
  search(query: string, limit?: number): Promise<Customer[]>;
}

export interface CustomersFindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'email' | 'first_name' | 'total_spent';
  orderDirection?: 'asc' | 'desc';
  filters?: CustomerFilters;
}

export interface CustomerFilters {
  status?: string;
  emailVerified?: boolean;
  loyaltyTier?: string;
  referredBy?: number;
}

export class CustomersService implements CustomersRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  /**
   * Find customer by ID with cache
   * Cache TTL: 5 minutes
   */
  async findById(id: number): Promise<Customer | null> {
    const cacheKey = `customers:${id}`;

    const cached = await this.cache.get<Customer>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
      .limit(1);

    const customer = result[0] || null;

    if (customer) {
      await this.cache.set(cacheKey, customer, { ttl: 300 });
    }

    return customer;
  }

  /**
   * Find customer by email with cache
   * Cache TTL: 5 minutes
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const cacheKey = `customers:email:${email}`;

    const cached = await this.cache.get<Customer>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)))
      .limit(1);

    const customer = result[0] || null;

    if (customer) {
      await this.cache.set(cacheKey, customer, { ttl: 300 });
      await this.cache.set(`customers:${customer.id}`, customer, { ttl: 300 });
    }

    return customer;
  }

  /**
   * Find customer by CPF with cache
   * Cache TTL: 5 minutes
   */
  async findByCpf(cpf: string): Promise<Customer | null> {
    const cacheKey = `customers:cpf:${cpf}`;

    const cached = await this.cache.get<Customer>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(customers)
      .where(and(eq(customers.cpf, cpf), isNull(customers.deletedAt)))
      .limit(1);

    const customer = result[0] || null;

    if (customer) {
      await this.cache.set(cacheKey, customer, { ttl: 300 });
      await this.cache.set(`customers:${customer.id}`, customer, { ttl: 300 });
    }

    return customer;
  }

  /**
   * Find customer by referral code with cache
   * Cache TTL: 10 minutes (referral codes don't change)
   */
  async findByReferralCode(code: string): Promise<Customer | null> {
    const cacheKey = `customers:referral:${code}`;

    const cached = await this.cache.get<Customer>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(customers)
      .where(and(eq(customers.referralCode, code), isNull(customers.deletedAt)))
      .limit(1);

    const customer = result[0] || null;

    if (customer) {
      await this.cache.set(cacheKey, customer, { ttl: 600 });
      await this.cache.set(`customers:${customer.id}`, customer, { ttl: 300 });
    }

    return customer;
  }

  /**
   * Find many customers with pagination and filters
   * Cache TTL: 2 minutes
   */
  async findMany(options: CustomersFindManyOptions = {}): Promise<Customer[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
    } = options;

    const cacheKey = `list:customers:${JSON.stringify({
      limit,
      offset,
      orderBy,
      orderDirection,
      filters,
    })}`;

    const cached = await this.cache.get<Customer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [isNull(customers.deletedAt)];
    if (filters.status) {
      conditions.push(eq(customers.status, filters.status));
    }
    if (filters.emailVerified !== undefined) {
      conditions.push(eq(customers.emailVerified, filters.emailVerified));
    }
    if (filters.loyaltyTier) {
      conditions.push(eq(customers.loyaltyTier, filters.loyaltyTier));
    }
    if (filters.referredBy) {
      conditions.push(eq(customers.referredBy, filters.referredBy));
    }

    const baseQuery = this.db.drizzle
      .select()
      .from(customers)
      .where(and(...conditions));

    let result: Customer[];
    if (orderBy === 'created_at') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(customers.createdAt)
            : customers.createdAt
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'email') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc' ? desc(customers.email) : customers.email
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'first_name') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(customers.firstName)
            : customers.firstName
        )
        .limit(limit)
        .offset(offset);
    } else if (orderBy === 'total_spent') {
      result = await baseQuery
        .orderBy(
          orderDirection === 'desc'
            ? desc(customers.totalSpent)
            : customers.totalSpent
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
   * Search customers by name or email
   * Cache TTL: 1 minute (search results change frequently)
   */
  async search(query: string, limit: number = 20): Promise<Customer[]> {
    const cacheKey = `search:customers:${query}:${limit}`;

    const cached = await this.cache.get<Customer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const searchTerm = `%${query}%`;
    const result = await this.db.drizzle
      .select()
      .from(customers)
      .where(
        and(
          isNull(customers.deletedAt),
          or(
            like(customers.firstName, searchTerm),
            like(customers.lastName, searchTerm),
            like(customers.email, searchTerm)
          )
        )
      )
      .limit(limit);

    await this.cache.set(cacheKey, result, { ttl: 60 });

    return result;
  }

  /**
   * Create new customer
   * Invalidates list caches
   */
  async create(data: NewCustomer): Promise<Customer> {
    const result = await this.db.drizzle
      .insert(customers)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const customer = result[0];

    // Cache the new customer
    await this.cache.set(`customers:${customer.id}`, customer, { ttl: 300 });
    if (customer.email) {
      await this.cache.set(`customers:email:${customer.email}`, customer, {
        ttl: 300,
      });
    }
    if (customer.cpf) {
      await this.cache.set(`customers:cpf:${customer.cpf}`, customer, {
        ttl: 300,
      });
    }
    if (customer.referralCode) {
      await this.cache.set(
        `customers:referral:${customer.referralCode}`,
        customer,
        { ttl: 600 }
      );
    }

    // Invalidate list caches
    await this.cache.invalidateList('customers');

    return customer;
  }

  /**
   * Update customer
   * Invalidates all related caches
   */
  async update(
    id: number,
    data: Partial<NewCustomer>
  ): Promise<Customer | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const result = await this.db.drizzle
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    const updated = result[0] || null;

    if (updated) {
      // Invalidate all caches for this customer
      await this.cache.invalidateEntity('customers', id);

      // Cache updated customer
      await this.cache.set(`customers:${updated.id}`, updated, { ttl: 300 });
      if (updated.email) {
        await this.cache.set(`customers:email:${updated.email}`, updated, {
          ttl: 300,
        });
      }
      if (updated.cpf) {
        await this.cache.set(`customers:cpf:${updated.cpf}`, updated, {
          ttl: 300,
        });
      }
      if (updated.referralCode) {
        await this.cache.set(
          `customers:referral:${updated.referralCode}`,
          updated,
          { ttl: 600 }
        );
      }

      // Invalidate list caches
      await this.cache.invalidateList('customers');
    }

    return updated;
  }

  /**
   * Soft delete customer
   * Invalidates all related caches
   */
  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.drizzle
      .update(customers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    // Invalidate all caches
    await this.cache.invalidateEntity('customers', id);
    await this.cache.invalidateList('customers');

    return true;
  }

  /**
   * Count customers with filters
   * Cache TTL: 5 minutes
   */
  async count(filters: CustomerFilters = {}): Promise<number> {
    const cacheKey = `count:customers:${JSON.stringify(filters)}`;

    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const conditions = [isNull(customers.deletedAt)];
    if (filters.status) {
      conditions.push(eq(customers.status, filters.status));
    }
    if (filters.emailVerified !== undefined) {
      conditions.push(eq(customers.emailVerified, filters.emailVerified));
    }
    if (filters.loyaltyTier) {
      conditions.push(eq(customers.loyaltyTier, filters.loyaltyTier));
    }
    if (filters.referredBy) {
      conditions.push(eq(customers.referredBy, filters.referredBy));
    }

    const result = await this.db.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...conditions));

    const count = Number(result[0]?.count || 0);

    await this.cache.set(cacheKey, count, { ttl: 300 });

    return count;
  }
}
