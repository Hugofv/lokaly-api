/**
 * Drizzle ORM Schema Definitions
 *
 * All database tables and their relationships are defined here.
 * Uses snake_case naming convention for database columns.
 * ENUMs are handled in the backend, not in the database.
 */

import {
  pgTable,
  text,
  decimal,
  integer,
  bigint,
  timestamp,
  boolean,
  uniqueIndex,
  unique,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Orders Table
 * Main table for customer orders
 */
export const orders = pgTable('orders', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  status: text('status').notNull(), // pending, confirmed, picking, ready, assigned, picked_up, in_transit, delivered, cancelled
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  subtotalAmount: decimal('subtotal_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0.00'),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default(
    '0.00'
  ),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryInstructions: text('delivery_instructions'),
  paymentStatus: text('payment_status').notNull(), // pending, paid, failed, refunded
  paymentMethod: text('payment_method'), // credit_card, debit_card, cash, pix, etc.
  paymentTransactionId: text('payment_transaction_id'),
  notes: text('notes'),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: text('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Order Items Table
 * Items within an order
 */
export const orderItems = pgTable('order_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  productVariantId: bigint('product_variant_id', { mode: 'number' }).references(
    () => productVariants.id,
    { onDelete: 'set null' }
  ), // Optional: if item is a specific variant
  productName: text('product_name').notNull(), // Denormalized for historical records
  productSku: text('product_sku'), // Denormalized for historical records
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Inventory Reservations Table
 * Tracks inventory reservations for orders
 */
export const inventoryReservations = pgTable('inventory_reservations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  productVariantId: bigint('product_variant_id', { mode: 'number' }).references(
    () => productVariants.id,
    { onDelete: 'set null' }
  ), // Optional: if reservation is for a specific variant
  productSku: text('product_sku'), // Denormalized for quick reference
  quantity: integer('quantity').notNull(),
  status: text('status').notNull(), // reserved, released, fulfilled
  warehouseId: bigint('warehouse_id', { mode: 'number' }).references(
    () => warehouses.id,
    { onDelete: 'set null' }
  ), // Reference to warehouse
  locationCode: text('location_code'),
  reservedBy: text('reserved_by'),
  releasedBy: text('released_by'),
  releaseReason: text('release_reason'),
  notes: text('notes'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Delivery Assignments Table
 * Tracks delivery assignments to couriers
 */
export const deliveryAssignments = pgTable('delivery_assignments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  courierId: text('courier_id').notNull(),
  courierName: text('courier_name'),
  courierPhone: text('courier_phone'),
  status: text('status').notNull(), // assigned, accepted, rejected, picked_up, in_transit, delivered, cancelled
  pickupAddress: text('pickup_address').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryInstructions: text('delivery_instructions'),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  estimatedPickupTime: timestamp('estimated_pickup_time'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualPickupTime: timestamp('actual_pickup_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  deliveryNotes: text('delivery_notes'),
  customerSignature: text('customer_signature'),
  deliveryRating: integer('delivery_rating'), // 1-5 stars
  deliveryFeedback: text('delivery_feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * ============================================
 * PRODUCT CATALOG SCHEMA
 * ============================================
 */

/**
 * Units of Measurement Table
 * Defines different units for products (kg, litro, unidade, etc)
 * Note: baseUnitId is a self-reference that should be handled at application level
 */
export const units = pgTable('units', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(), // kg, l, un, g, ml, etc
  name: text('name').notNull(), // Quilograma, Litro, Unidade, etc
  abbreviation: text('abbreviation').notNull(), // kg, L, un, g, ml
  type: text('type').notNull(), // weight, volume, unit, length, area
  conversionFactor: decimal('conversion_factor', {
    precision: 10,
    scale: 6,
  }).default('1.000000'), // For unit conversions (e.g., 1 kg = 1000 g)
  baseUnitId: bigint('base_unit_id', { mode: 'number' }), // Self-reference to base unit (FK added via migration to avoid circular type)
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Departments Table
 * Top level of product hierarchy (e.g., Mercearia, Perecíveis, Bebidas)
 */
export const departments = pgTable('departments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Categories Table
 * Second level of hierarchy (e.g., Cereais e Grãos, Carnes, Laticínios)
 */
export const categories = pgTable('categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  departmentId: bigint('department_id', { mode: 'number' })
    .notNull()
    .references(() => departments.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Subcategories Table
 * Third level of hierarchy (e.g., Arroz, Feijão, Massas)
 */
export const subcategories = pgTable('subcategories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  categoryId: bigint('category_id', { mode: 'number' })
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Brands Table
 * Product brands (e.g., Coca-Cola, Nestlé, Sadia)
 */
export const brands = pgTable('brands', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Products Table
 * Main product catalog table
 */
export const products = pgTable('products', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  sku: text('sku').notNull().unique(), // Stock Keeping Unit
  barcode: text('barcode').unique(), // EAN, UPC, etc
  name: text('name').notNull(),
  displayName: text('display_name'), // Name to display to customers
  description: text('description'),
  shortDescription: text('short_description'),
  subcategoryId: bigint('subcategory_id', { mode: 'number' })
    .notNull()
    .references(() => subcategories.id, { onDelete: 'restrict' }),
  brandId: bigint('brand_id', { mode: 'number' }).references(() => brands.id, {
    onDelete: 'set null',
  }),
  unitId: bigint('unit_id', { mode: 'number' })
    .notNull()
    .references(() => units.id, { onDelete: 'restrict' }),
  // Product attributes
  weight: decimal('weight', { precision: 10, scale: 3 }), // Weight in base unit
  volume: decimal('volume', { precision: 10, scale: 3 }), // Volume in base unit
  length: decimal('length', { precision: 10, scale: 2 }), // Length in cm
  width: decimal('width', { precision: 10, scale: 2 }), // Width in cm
  height: decimal('height', { precision: 10, scale: 2 }), // Height in cm
  packageQuantity: integer('package_quantity').default(1), // Quantity per package
  // Product status and flags
  status: text('status').notNull(), // active, inactive, discontinued, out_of_stock
  isPerishable: boolean('is_perishable').default(false),
  requiresRefrigeration: boolean('requires_refrigeration').default(false),
  isFrozen: boolean('is_frozen').default(false),
  isAlcoholic: boolean('is_alcoholic').default(false),
  isTobacco: boolean('is_tobacco').default(false),
  minAgeRestriction: integer('min_age_restriction'), // Minimum age to purchase
  // Nutritional and regulatory
  nutritionalInfo: text('nutritional_info'), // JSON string with nutritional data
  allergens: text('allergens'), // JSON array of allergens
  ingredients: text('ingredients'),
  origin: text('origin'), // Country/region of origin
  // Pricing and inventory
  basePrice: decimal('base_price', { precision: 10, scale: 2 }), // Base price (can be overridden by prices table)
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }), // Cost price for margin calculation
  minStockLevel: integer('min_stock_level').default(0),
  maxStockLevel: integer('max_stock_level'),
  // SEO and marketing
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  seoKeywords: text('seo_keywords'),
  isFeatured: boolean('is_featured').default(false),
  isNew: boolean('is_new').default(false),
  isBestSeller: boolean('is_best_seller').default(false),
  // Metadata
  tags: text('tags'), // JSON array of tags
  customAttributes: text('custom_attributes'), // JSON object for extensibility
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Product Images Table
 * Multiple images per product in different sizes
 * Note: Only one image can be primary per product (enforced at application level or via unique partial index)
 */
export const productImages = pgTable(
  'product_images',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(), // Full URL to the image
    thumbnailUrl: text('thumbnail_url'), // Thumbnail version URL
    size: text('size').notNull(), // thumbnail, small, medium, large, original
    width: integer('width'),
    height: integer('height'),
    fileSize: integer('file_size'), // Size in bytes
    mimeType: text('mime_type'), // image/jpeg, image/png, etc
    altText: text('alt_text'), // Alt text for accessibility
    title: text('title'), // Image title
    displayOrder: integer('display_order').default(0), // Order for display
    isPrimary: boolean('is_primary').default(false), // Primary image for product
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Index for product queries
    productIdIdx: index('product_images_product_id_idx').on(table.productId),
  })
);

/**
 * Product Variants Table
 * Different variants of the same product (size, flavor, color, etc)
 */
export const productVariants = pgTable('product_variants', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(), // Variant-specific SKU
  barcode: text('barcode').unique(),
  name: text('name').notNull(), // Variant name (e.g., "500g", "Sabor Morango")
  variantType: text('variant_type').notNull(), // size, flavor, color, package, etc
  variantValue: text('variant_value').notNull(), // The actual value (e.g., "500", "Morango")
  // Variant-specific attributes
  weight: decimal('weight', { precision: 10, scale: 3 }),
  volume: decimal('volume', { precision: 10, scale: 3 }),
  priceModifier: decimal('price_modifier', {
    precision: 10,
    scale: 2,
  }).default('0.00'), // Price adjustment for this variant
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Warehouses Table
 * Physical storage locations
 */
export const warehouses = pgTable('warehouses', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),
  phone: text('phone'),
  email: text('email'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Product Stock Table
 * Stock levels per product per warehouse
 * Note: variantId must belong to the same productId (enforced at application level)
 */
export const productStock = pgTable(
  'product_stock',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: bigint('variant_id', { mode: 'number' }).references(
      () => productVariants.id,
      { onDelete: 'cascade' }
    ), // Null if base product, set if variant
    warehouseId: bigint('warehouse_id', { mode: 'number' })
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').default(0).notNull(), // Available quantity
    reservedQuantity: integer('reserved_quantity').default(0).notNull(), // Reserved for orders
    locationCode: text('location_code'), // Physical location in warehouse
    lastRestockedAt: timestamp('last_restocked_at'),
    lastCountedAt: timestamp('last_counted_at'), // Last physical count
    reorderPoint: integer('reorder_point').default(0), // When to reorder
    maxStock: integer('max_stock'), // Maximum stock level
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Unique constraint: one stock record per product/variant/warehouse combination
    productVariantWarehouseUnique: unique().on(
      table.productId,
      table.variantId,
      table.warehouseId
    ),
    // Indexes for performance
    productIdIdx: index('product_stock_product_id_idx').on(table.productId),
    warehouseIdIdx: index('product_stock_warehouse_id_idx').on(
      table.warehouseId
    ),
    variantIdIdx: index('product_stock_variant_id_idx').on(table.variantId),
  })
);

/**
 * Product Prices Table
 * Pricing with support for promotions and different price types
 */
export const productPrices = pgTable('product_prices', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  variantId: bigint('variant_id', { mode: 'number' }).references(
    () => productVariants.id,
    { onDelete: 'cascade' }
  ), // Null if base product price
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', {
    precision: 10,
    scale: 2,
  }), // Original price for showing discounts
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }), // Cost for margin calculation
  priceType: text('price_type').notNull(), // regular, sale, promotional, bulk
  // Promotion details
  promotionId: text('promotion_id'), // Reference to promotion if applicable
  promotionName: text('promotion_name'),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  // Conditions
  minQuantity: integer('min_quantity').default(1), // Minimum quantity for this price
  maxQuantity: integer('max_quantity'), // Maximum quantity for this price
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(0), // Higher priority prices override lower ones
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Product Reviews Table
 * Customer reviews and ratings
 */
export const productReviews = pgTable('product_reviews', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name'),
  rating: integer('rating').notNull(), // 1-5 stars
  title: text('title'),
  review: text('review'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  isPublished: boolean('is_published').default(true),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Type exports for use in domain layer
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type NewInventoryReservation = typeof inventoryReservations.$inferInsert;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;
export type NewDeliveryAssignment = typeof deliveryAssignments.$inferInsert;

// Catalog types
export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Subcategory = typeof subcategories.$inferSelect;
export type NewSubcategory = typeof subcategories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type ProductStock = typeof productStock.$inferSelect;
export type NewProductStock = typeof productStock.$inferInsert;
export type ProductPrice = typeof productPrices.$inferSelect;
export type NewProductPrice = typeof productPrices.$inferInsert;
export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;
