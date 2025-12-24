/**
 * Addresses CRUD
 *
 * CRUD operations for customer addresses with Redis caching.
 * Strategic cache invalidation on mutations.
 */

import type { DbConnection, Address, NewAddress } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { addresses } from '@lokaly/db/schema';

export interface AddressesRepository {
  findById(id: number): Promise<Address | null>;
  findByCustomerId(customerId: number): Promise<Address[]>;
  findDefaultByCustomerId(customerId: number): Promise<Address | null>;
  create(data: NewAddress): Promise<Address>;
  update(id: number, data: Partial<NewAddress>): Promise<Address | null>;
  delete(id: number): Promise<boolean>;
  setDefault(customerId: number, addressId: number): Promise<boolean>;
}

export class AddressesService implements AddressesRepository {
  constructor(private db: DbConnection, private cache: CacheService) {}

  /**
   * Find address by ID with cache
   * Cache TTL: 5 minutes
   */
  async findById(id: number): Promise<Address | null> {
    const cacheKey = `addresses:${id}`;

    const cached = await this.cache.get<Address>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), isNull(addresses.deletedAt)))
      .limit(1);

    const address = result[0] || null;

    if (address) {
      await this.cache.set(cacheKey, address, { ttl: 300 });
    }

    return address;
  }

  /**
   * Find all addresses for a customer
   * Cache TTL: 5 minutes
   */
  async findByCustomerId(customerId: number): Promise<Address[]> {
    const cacheKey = `addresses:customer:${customerId}`;

    const cached = await this.cache.get<Address[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.customerId, customerId), isNull(addresses.deletedAt))
      )
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    await this.cache.set(cacheKey, result, { ttl: 300 });

    return result;
  }

  /**
   * Find default address for a customer
   * Cache TTL: 5 minutes
   */
  async findDefaultByCustomerId(customerId: number): Promise<Address | null> {
    const cacheKey = `addresses:customer:${customerId}:default`;

    const cached = await this.cache.get<Address>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.drizzle
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.isDefault, true),
          isNull(addresses.deletedAt)
        )
      )
      .limit(1);

    const address = result[0] || null;

    if (address) {
      await this.cache.set(cacheKey, address, { ttl: 300 });
      await this.cache.set(`addresses:${address.id}`, address, { ttl: 300 });
    }

    return address;
  }

  /**
   * Create new address
   * Invalidates customer address caches
   */
  async create(data: NewAddress): Promise<Address> {
    const result = await this.db.drizzle
      .insert(addresses)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const address = result[0];
    if (!address) {
      throw new Error('Failed to create address');
    }

    // Cache the new address
    await this.cache.set(`addresses:${address.id}`, address, { ttl: 300 });

    // Invalidate customer address caches
    await this.cache.delete(`addresses:customer:${address.customerId}`);
    await this.cache.delete(`addresses:customer:${address.customerId}:default`);

    // If this is the default, invalidate default cache
    if (address.isDefault) {
      await this.cache.delete(
        `addresses:customer:${address.customerId}:default`
      );
    }

    return address;
  }

  /**
   * Update address
   * Invalidates all related caches
   */
  async update(id: number, data: Partial<NewAddress>): Promise<Address | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const result = await this.db.drizzle
      .update(addresses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, id))
      .returning();

    const updated = result[0] || null;

    if (updated) {
      // Invalidate all caches for this address
      await this.cache.invalidateEntity('addresses', id);

      // Invalidate customer address caches
      await this.cache.delete(`addresses:customer:${updated.customerId}`);
      await this.cache.delete(
        `addresses:customer:${updated.customerId}:default`
      );

      // Cache updated address
      await this.cache.set(`addresses:${updated.id}`, updated, { ttl: 300 });
    }

    return updated;
  }

  /**
   * Soft delete address
   * Invalidates all related caches
   */
  async delete(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await this.db.drizzle
      .update(addresses)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, id));

    // Invalidate all caches
    await this.cache.invalidateEntity('addresses', id);
    await this.cache.delete(`addresses:customer:${existing.customerId}`);
    await this.cache.delete(
      `addresses:customer:${existing.customerId}:default`
    );

    return true;
  }

  /**
   * Set default address for a customer
   * Unsets other default addresses and updates cache
   */
  async setDefault(customerId: number, addressId: number): Promise<boolean> {
    // First, unset all other default addresses for this customer
    await this.db.drizzle
      .update(addresses)
      .set({
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.customerId, customerId),
          eq(addresses.id, addressId),
          isNull(addresses.deletedAt)
        )
      );

    // Set the new default
    const result = await this.db.drizzle
      .update(addresses)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.customerId, customerId),
          isNull(addresses.deletedAt)
        )
      )
      .returning();

    if (result.length === 0) {
      return false;
    }

    // Invalidate all customer address caches
    await this.cache.delete(`addresses:customer:${customerId}`);
    await this.cache.delete(`addresses:customer:${customerId}:default`);

    // Cache the new default
    const updated = result[0]!;
    await this.cache.set(`addresses:${updated.id}`, updated, { ttl: 300 });
    await this.cache.set(`addresses:customer:${customerId}:default`, updated, {
      ttl: 300,
    });

    return true;
  }
}
