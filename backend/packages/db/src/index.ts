/**
 * Database Package
 * 
 * Shared database connection and schema definitions.
 * Uses Bun's built-in PostgreSQL support.
 * 
 * Architecture Decision:
 * - Single connection pool shared across apps
 * - Transactions handled in domain layer
 * - Schema migrations managed here
 */

import { Database } from "bun:sqlite";

// For PostgreSQL, we'll use Bun's native support
// This is a placeholder - Bun's PostgreSQL API may vary
export type DbConnection = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  transaction: <T>(fn: (tx: DbConnection) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

/**
 * Database connection pool
 * In production, this would use connection pooling
 */
let dbConnection: DbConnection | null = null;

/**
 * Initialize database connection
 */
export async function initDb(connectionString: string): Promise<DbConnection> {
  if (dbConnection) {
    return dbConnection;
  }

  // Note: Bun's PostgreSQL API is still evolving
  // This is a conceptual implementation
  // In practice, you might use: const db = Bun.connect({ hostname, port, database, user, password })
  
  dbConnection = {
    query: async (sql: string, params?: unknown[]) => {
      // Placeholder - implement with actual Bun PostgreSQL API
      console.log(`[DB Query] ${sql}`, params);
      return [];
    },
    transaction: async <T>(fn: (tx: DbConnection) => Promise<T>) => {
      // Placeholder - implement transaction logic
      return fn(dbConnection!);
    },
    close: async () => {
      dbConnection = null;
    },
  };

  return dbConnection;
}

/**
 * Get database connection (throws if not initialized)
 */
export function getDb(): DbConnection {
  if (!dbConnection) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return dbConnection;
}

/**
 * Schema Definitions
 */

export type OrderRow = {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  created_at: Date;
  updated_at: Date;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: Date;
};

export type InventoryReservationRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  status: "reserved" | "released" | "fulfilled";
  created_at: Date;
  expires_at: Date;
};

export type DeliveryAssignmentRow = {
  id: string;
  order_id: string;
  courier_id: string;
  status: string;
  assigned_at: Date;
  estimated_pickup_time: Date;
  estimated_delivery_time: Date;
};

/**
 * Migration helper
 */
export async function runMigrations(db: DbConnection): Promise<void> {
  // In production, use a proper migration tool
  const migrations = [
    `
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        status TEXT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        delivery_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS inventory_reservations (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS delivery_assignments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        courier_id TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estimated_pickup_time TIMESTAMP,
        estimated_delivery_time TIMESTAMP
      );
    `,
  ];

  for (const migration of migrations) {
    await db.query(migration);
  }
}

