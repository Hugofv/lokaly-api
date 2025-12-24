/**
 * Database Package
 *
 * Shared database connection and schema definitions.
 * Uses Drizzle ORM with PostgreSQL.
 *
 * Architecture Decision:
 * - Single connection pool shared across apps
 * - Transactions handled in domain layer
 * - Schema migrations managed here
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from './schema';

export type {
  // User management types
  User,
  NewUser,
  Customer,
  NewCustomer,
  Address,
  NewAddress,
  Courier,
  NewCourier,
  // Order types
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
  InventoryReservation,
  NewInventoryReservation,
  DeliveryAssignment,
  NewDeliveryAssignment,
  // Catalog types
  Unit,
  NewUnit,
  Department,
  NewDepartment,
  Category,
  NewCategory,
  Subcategory,
  NewSubcategory,
  Brand,
  NewBrand,
  Product,
  NewProduct,
  ProductImage,
  NewProductImage,
  ProductVariant,
  NewProductVariant,
  Warehouse,
  NewWarehouse,
  ProductStock,
  NewProductStock,
  ProductPrice,
  NewProductPrice,
  ProductReview,
  NewProductReview,
} from './schema';

// Export enums for use in domain layer
export {
  // User management enums
  UserRole,
  CustomerStatus,
  AddressType,
  CourierStatus,
  VehicleType,
  Gender,
  // Order enums
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  InventoryReservationStatus,
  DeliveryAssignmentStatus,
  // Catalog enums
  UnitType,
  ProductStatus,
  ProductVariantType,
  ProductImageSize,
  ProductPriceType,
  // Validation functions
  isValidUserRole,
  isValidCustomerStatus,
  isValidAddressType,
  isValidCourierStatus,
  isValidVehicleType,
  isValidGender,
  isValidOrderStatus,
  isValidPaymentStatus,
  isValidInventoryReservationStatus,
  isValidDeliveryAssignmentStatus,
  isValidUnitType,
  isValidProductStatus,
  isValidProductVariantType,
  isValidProductImageSize,
  isValidProductPriceType,
} from './enums';

export type {
  OrderStatus as OrderStatusType,
  PaymentStatus as PaymentStatusType,
  PaymentMethod as PaymentMethodType,
  InventoryReservationStatus as InventoryReservationStatusType,
  DeliveryAssignmentStatus as DeliveryAssignmentStatusType,
  UnitType as UnitTypeType,
  ProductStatus as ProductStatusType,
  ProductVariantType as ProductVariantTypeType,
  ProductImageSize as ProductImageSizeType,
  ProductPriceType as ProductPriceTypeType,
} from './enums';

/**
 * Database connection interface for backward compatibility
 * This wraps Drizzle's API to match the existing interface
 */
export type DbConnection = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  transaction: <T>(fn: (tx: DbConnection) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
  // Drizzle-specific methods
  drizzle: ReturnType<typeof drizzle>;
};

/**
 * Database connection instance
 */
let dbConnection: DbConnection | null = null;
let sql: postgres.Sql | null = null;

/**
 * Initialize database connection
 */
export async function initDb(connectionString: string): Promise<DbConnection> {
  if (dbConnection) {
    return dbConnection;
  }

  // Create postgres connection
  sql = postgres(connectionString, {
    max: 10, // Connection pool size
  });

  // Create Drizzle instance
  const db = drizzle(sql, { schema });

  // Wrap in compatibility layer
  dbConnection = {
    query: async (querySql: string, params?: unknown[]) => {
      // Use raw SQL query for compatibility
      const result = await sql!.unsafe(querySql, params as any[]);
      return result;
    },
    transaction: async <T>(fn: (tx: DbConnection) => Promise<T>) => {
      // Use postgres transaction directly for SQL compatibility
      return (await sql!.begin(async (txSql) => {
        // Create a transaction-compatible wrapper
        const txWrapper: DbConnection = {
          query: async (querySql: string, params?: unknown[]) => {
            const result = await txSql.unsafe(querySql, params as any[]);
            return result;
          },
          transaction: async <T2>(fn2: (tx2: DbConnection) => Promise<T2>) => {
            // Nested transactions - in PostgreSQL this creates a savepoint
            return (await txSql.begin(async (nestedTxSql) => {
              const nestedWrapper: DbConnection = {
                query: async (querySql: string, params?: unknown[]) => {
                  const result = await nestedTxSql.unsafe(
                    querySql,
                    params as any[]
                  );
                  return result;
                },
                transaction: async () => {
                  throw new Error(
                    'Nested transactions beyond 2 levels are not supported'
                  );
                },
                close: async () => {},
                drizzle: db as any, // Use main db instance for nested
              };
              return fn2(nestedWrapper);
            })) as T2;
          },
          close: async () => {},
          drizzle: db as any, // Use main db instance
        };
        return fn(txWrapper);
      })) as T;
    },
    close: async () => {
      await sql?.end();
      sql = null;
      dbConnection = null;
    },
    drizzle: db,
  };

  return dbConnection;
}

/**
 * Get database connection (throws if not initialized)
 */
export function getDb(): DbConnection {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbConnection;
}

/**
 * Get Drizzle instance directly (for type-safe queries)
 */
export function getDrizzle(): ReturnType<typeof drizzle> {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbConnection.drizzle;
}

/**
 * Run migrations using Drizzle Kit
 */
export async function runMigrations(db: DbConnection): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://lokaly:lokaly@localhost:5432/lokaly';

  // Create a temporary connection for migrations
  const migrationSql = postgres(connectionString, { max: 1 });
  const migrationDb = drizzle(migrationSql);

  try {
    // Get the directory path of this file
    const migrationsFolder = new URL('./../drizzle', import.meta.url).pathname;

    // Run migrations from the drizzle folder
    // Drizzle will automatically skip migrations that have already been applied
    await migrate(migrationDb, { migrationsFolder });
    console.log('[DB] Migrations completed successfully');
  } catch (error: any) {
    // Check if error is about existing sequence/relation
    if (error?.code === '42P07' || error?.message?.includes('already exists')) {
      console.error('[DB] ❌ Migration error: Object already exists');
      console.error('[DB] Error details:', error.message);
      console.error('');
      console.error('[DB] 🔧 Soluções:');
      console.error(
        '[DB]   1. Execute: cd backend/packages/db && bun run db:fix'
      );
      console.error(
        '[DB]   2. Ou use: bun run db:push (apenas desenvolvimento)'
      );
      console.error('[DB]   3. Ou limpe o banco e recrie as migrações');
      console.error('');
      // Em desenvolvimento, podemos continuar, mas em produção deve falhar
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      console.warn('[DB] ⚠️  Continuando em modo desenvolvimento...');
    } else {
      console.error('[DB] Migration error:', error);
      throw error;
    }
  } finally {
    await migrationSql.end();
  }
}

/**
 * Legacy type exports for backward compatibility
 * These map to the new schema types
 * Note: IDs are now BigInt (number in JS), not strings
 */
export type OrderRow = {
  id: number; // BigInt mapped to number
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  total_amount: number;
  subtotal_amount: number;
  tax_amount: number | null;
  delivery_fee: number | null;
  delivery_address: string;
  delivery_instructions: string | null;
  payment_status: string;
  payment_method: string | null;
  payment_transaction_id: string | null;
  notes: string | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type OrderItemRow = {
  id: number; // BigInt mapped to number
  order_id: number; // BigInt mapped to number
  product_id: number; // BigInt mapped to number - FK to products.id
  product_variant_id: number | null; // BigInt mapped to number - FK to product_variants.id (optional)
  product_name: string; // Denormalized for historical records
  product_sku: string | null; // Denormalized for historical records
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type InventoryReservationRow = {
  id: number; // BigInt mapped to number
  order_id: number; // BigInt mapped to number
  product_id: number; // BigInt mapped to number - FK to products.id
  product_variant_id: number | null; // BigInt mapped to number - FK to product_variants.id (optional)
  product_sku: string | null; // Denormalized for quick reference
  quantity: number;
  status: string; // reserved, released, fulfilled
  warehouse_id: number | null; // BigInt mapped to number - FK to warehouses.id
  location_code: string | null;
  reserved_by: string | null;
  released_by: string | null;
  release_reason: string | null;
  notes: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type DeliveryAssignmentRow = {
  id: number; // BigInt mapped to number
  order_id: number; // BigInt mapped to number
  courier_id: string;
  courier_name: string | null;
  courier_phone: string | null;
  status: string;
  pickup_address: string;
  delivery_address: string;
  delivery_instructions: string | null;
  assigned_at: Date;
  accepted_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  estimated_pickup_time: Date | null;
  estimated_delivery_time: Date | null;
  actual_pickup_time: Date | null;
  actual_delivery_time: Date | null;
  delivery_notes: string | null;
  customer_signature: string | null;
  delivery_rating: number | null;
  delivery_feedback: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

// Export schema for direct use
export { schema };

// Export seed function
export { seed } from './seed';
