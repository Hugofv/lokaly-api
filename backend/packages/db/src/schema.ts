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
 * ============================================
 * USER MANAGEMENT SCHEMA
 * ============================================
 */

/**
 * Users Table
 * Admin and staff users for managing the platform
 */
export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(), // admin, super_admin
    // Personal information
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    // Department and permissions
    department: text('department'), // sales, operations, finance, support, etc
    permissions: text('permissions'), // JSON array of specific permissions
    // Status
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerifiedAt: timestamp('email_verified_at'),
    // Security
    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: text('last_login_ip'),
    passwordChangedAt: timestamp('password_changed_at'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    twoFactorSecret: text('two_factor_secret'),
    // Metadata
    notes: text('notes'), // Internal notes about the user
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

/**
 * Customers Table
 * Customer accounts for e-commerce platform
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customers: any = pgTable(
  'customers',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'), // Nullable for social login
    // Personal information
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    dateOfBirth: timestamp('date_of_birth'),
    gender: text('gender'), // male, female, other, prefer_not_to_say
    avatarUrl: text('avatar_url'),
    // Document information (Brazilian context)
    cpf: text('cpf').unique(), // CPF for individuals
    cnpj: text('cnpj').unique(), // CNPJ for companies
    companyName: text('company_name'), // If customer is a company
    // Status and verification
    status: text('status').notNull(), // active, inactive, suspended, verified, unverified
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerifiedAt: timestamp('email_verified_at'),
    emailVerificationToken: text('email_verification_token'),
    // Preferences
    language: text('language').default('pt-BR'),
    currency: text('currency').default('BRL'),
    timezone: text('timezone').default('America/Sao_Paulo'),
    marketingConsent: boolean('marketing_consent').default(false).notNull(),
    smsConsent: boolean('sms_consent').default(false).notNull(),
    emailConsent: boolean('email_consent').default(true).notNull(),
    // Loyalty and rewards
    loyaltyPoints: integer('loyalty_points').default(0).notNull(),
    loyaltyTier: text('loyalty_tier').default('bronze'), // bronze, silver, gold, platinum
    totalOrders: integer('total_orders').default(0).notNull(),
    totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default(
      '0.00'
    ),
    // Security
    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: text('last_login_ip'),
    passwordChangedAt: timestamp('password_changed_at'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at'),
    accountLockedUntil: timestamp('account_locked_until'), // For account lockout
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    // Social login
    socialProvider: text('social_provider'), // google, facebook, apple
    socialId: text('social_id'), // External ID from social provider
    // Referral program
    referralCode: text('referral_code').unique(), // Customer's unique referral code
    referredBy: bigint('referred_by', { mode: 'number' }).references(
      () => customers.id,
      { onDelete: 'set null' }
    ), // Who referred this customer
    // Metadata
    notes: text('notes'), // Internal notes
    customAttributes: text('custom_attributes'), // JSON object for extensibility
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('customers_email_idx').on(table.email),
    phoneIdx: index('customers_phone_idx').on(table.phone),
    cpfIdx: index('customers_cpf_idx').on(table.cpf),
    statusIdx: index('customers_status_idx').on(table.status),
    referralCodeIdx: index('customers_referral_code_idx').on(
      table.referralCode
    ),
  })
);

/**
 * Addresses Table
 * Multiple addresses per customer (1:N relationship)
 */
export const addresses = pgTable(
  'addresses',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    // Address type and label
    type: text('type').notNull(), // home, work, other
    label: text('label'), // Custom label (e.g., "Casa", "Escritório")
    isDefault: boolean('is_default').default(false).notNull(),
    // Address details
    recipientName: text('recipient_name'), // Name of person receiving delivery
    recipientPhone: text('recipient_phone'),
    street: text('street').notNull(),
    number: text('number').notNull(),
    complement: text('complement'), // Apartment, suite, etc
    neighborhood: text('neighborhood').notNull(), // Bairro
    city: text('city').notNull(),
    state: text('state').notNull(), // Estado (UF)
    zipCode: text('zip_code').notNull(), // CEP
    country: text('country').default('BR').notNull(),
    // Location data
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    // Delivery instructions
    deliveryInstructions: text('delivery_instructions'), // Special instructions for delivery
    // Status
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    customerIdIdx: index('addresses_customer_id_idx').on(table.customerId),
    zipCodeIdx: index('addresses_zip_code_idx').on(table.zipCode),
  })
);

/**
 * Couriers Table
 * Delivery couriers/drivers
 */
export const couriers = pgTable(
  'couriers',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    // Authentication (can share users table or separate)
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    // Personal information
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone').notNull(),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    dateOfBirth: timestamp('date_of_birth'),
    avatarUrl: text('avatar_url'),
    // Document information
    cpf: text('cpf').notNull().unique(),
    rg: text('rg'), // Identity document
    cnh: text('cnh'), // Driver's license number
    cnhCategory: text('cnh_category'), // A, B, C, D, E
    // Vehicle information
    vehicleType: text('vehicle_type').notNull(), // bicycle, motorcycle, car, van, walking
    vehicleBrand: text('vehicle_brand'),
    vehicleModel: text('vehicle_model'),
    vehicleYear: integer('vehicle_year'),
    licensePlate: text('license_plate'),
    vehicleColor: text('vehicle_color'),
    // Status and availability
    status: text('status').notNull(), // active, inactive, busy, offline, suspended
    isAvailable: boolean('is_available').default(true).notNull(),
    currentLatitude: decimal('current_latitude', { precision: 10, scale: 8 }),
    currentLongitude: decimal('current_longitude', {
      precision: 11,
      scale: 8,
    }),
    lastLocationUpdate: timestamp('last_location_update'),
    // Performance metrics
    totalDeliveries: integer('total_deliveries').default(0).notNull(),
    totalRating: decimal('total_rating', { precision: 3, scale: 2 }), // Average rating
    totalRatings: integer('total_ratings').default(0).notNull(), // Number of ratings
    onTimeDeliveryRate: decimal('on_time_delivery_rate', {
      precision: 5,
      scale: 2,
    }), // Percentage
    // Verification
    isVerified: boolean('is_verified').default(false).notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: bigint('verified_by', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' }
    ), // Admin who verified
    // Security
    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: text('last_login_ip'),
    // Metadata
    notes: text('notes'), // Internal notes
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('couriers_email_idx').on(table.email),
    phoneIdx: index('couriers_phone_idx').on(table.phone),
    cpfIdx: index('couriers_cpf_idx').on(table.cpf),
    statusIdx: index('couriers_status_idx').on(table.status),
    availableIdx: index('couriers_available_idx').on(table.isAvailable),
  })
);

/**
 * ============================================
 * ORDERS SCHEMA
 * ============================================
 */

/**
 * Orders Table
 * Main table for customer orders
 */
export const orders = pgTable(
  'orders',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    // Customer reference (FK)
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    // Denormalized customer data for historical records
    customerName: text('customer_name').notNull(), // Denormalized
    customerPhone: text('customer_phone'), // Denormalized
    customerEmail: text('customer_email'), // Denormalized
    // Delivery address (can reference addresses table or be denormalized)
    deliveryAddressId: bigint('delivery_address_id', {
      mode: 'number',
    }).references(() => addresses.id, { onDelete: 'set null' }), // FK to addresses table
    deliveryAddress: text('delivery_address').notNull(), // Denormalized for historical records
    deliveryInstructions: text('delivery_instructions'),
    // Order status
    status: text('status').notNull(), // pending, confirmed, picking, ready, assigned, picked_up, in_transit, delivered, cancelled
    // Financial amounts
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    subtotalAmount: decimal('subtotal_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default(
      '0.00'
    ),
    deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default(
      '0.00'
    ),
    discountAmount: decimal('discount_amount', {
      precision: 10,
      scale: 2,
    }).default('0.00'), // Total discount applied
    // Payment information
    paymentStatus: text('payment_status').notNull(), // pending, paid, failed, refunded
    paymentMethod: text('payment_method'), // credit_card, debit_card, cash, pix, etc.
    paymentTransactionId: text('payment_transaction_id'),
    paymentGateway: text('payment_gateway'), // stripe, pagarme, mercado_pago, etc
    // Order metadata
    orderNumber: text('order_number').unique(), // Human-readable order number (e.g., ORD-2024-001234)
    notes: text('notes'), // Customer notes
    internalNotes: text('internal_notes'), // Internal staff notes
    // Cancellation
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: bigint('cancelled_by', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' }
    ), // Admin who cancelled
    cancellationReason: text('cancellation_reason'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
    statusIdx: index('orders_status_idx').on(table.status),
    orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  })
);

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
export const deliveryAssignments = pgTable(
  'delivery_assignments',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // Courier reference (FK)
    courierId: bigint('courier_id', { mode: 'number' })
      .notNull()
      .references(() => couriers.id, { onDelete: 'restrict' }),
    // Denormalized courier data for historical records
    courierName: text('courier_name'), // Denormalized
    courierPhone: text('courier_phone'), // Denormalized
    // Status
    status: text('status').notNull(), // assigned, accepted, rejected, picked_up, in_transit, delivered, cancelled
    // Addresses (denormalized for historical records)
    pickupAddress: text('pickup_address').notNull(),
    deliveryAddress: text('delivery_address').notNull(),
    deliveryInstructions: text('delivery_instructions'),
    // Timestamps
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),
    estimatedPickupTime: timestamp('estimated_pickup_time'),
    estimatedDeliveryTime: timestamp('estimated_delivery_time'),
    actualPickupTime: timestamp('actual_pickup_time'),
    actualDeliveryTime: timestamp('actual_delivery_time'),
    // Delivery details
    deliveryNotes: text('delivery_notes'),
    customerSignature: text('customer_signature'), // Base64 encoded signature image
    deliveryRating: integer('delivery_rating'), // 1-5 stars
    deliveryFeedback: text('delivery_feedback'),
    // Distance and route
    estimatedDistance: decimal('estimated_distance', {
      precision: 10,
      scale: 2,
    }), // Distance in km
    actualDistance: decimal('actual_distance', { precision: 10, scale: 2 }), // Actual distance traveled
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    orderIdIdx: index('delivery_assignments_order_id_idx').on(table.orderId),
    courierIdIdx: index('delivery_assignments_courier_id_idx').on(
      table.courierId
    ),
    statusIdx: index('delivery_assignments_status_idx').on(table.status),
  })
);

/**
 * ============================================
 * PRODUCT CATALOG SCHEMA
 * ============================================
 */

/**
 * Units of Measurement Table
 * Defines different units for products (kg, litro, unidade, etc)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const units: any = pgTable('units', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: text('code').notNull().unique(), // kg, l, un, g, ml, etc
  name: text('name').notNull(), // Quilograma, Litro, Unidade, etc
  abbreviation: text('abbreviation').notNull(), // kg, L, un, g, ml
  type: text('type').notNull(), // weight, volume, unit, length, area
  conversionFactor: decimal('conversion_factor', {
    precision: 10,
    scale: 6,
  }).default('1.000000'), // For unit conversions (e.g., 1 kg = 1000 g)
  baseUnitId: bigint('base_unit_id', { mode: 'number' }).references(
    () => units.id,
    { onDelete: 'set null' }
  ), // Self-reference to base unit
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
export const categories = pgTable(
  'categories',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
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
  },
  (table) => ({
    // Unique constraint: code must be unique within a department
    departmentCodeUnique: unique().on(table.departmentId, table.code),
  })
);

/**
 * Subcategories Table
 * Third level of hierarchy (e.g., Arroz, Feijão, Massas)
 */
export const subcategories = pgTable(
  'subcategories',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
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
  },
  (table) => ({
    // Unique constraint: code must be unique within a category
    categoryCodeUnique: unique().on(table.categoryId, table.code),
  })
);

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
export const productReviews = pgTable(
  'product_reviews',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // Customer reference (FK)
    customerId: bigint('customer_id', { mode: 'number' })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    // Denormalized customer name (can be anonymous)
    customerName: text('customer_name'), // Can be null for anonymous reviews
    // Review content
    rating: integer('rating').notNull(), // 1-5 stars
    title: text('title'),
    review: text('review'),
    // Review metadata
    isVerifiedPurchase: boolean('is_verified_purchase').default(false),
    isPublished: boolean('is_published').default(true),
    helpfulCount: integer('helpful_count').default(0),
    // Order reference (to verify purchase)
    orderId: bigint('order_id', { mode: 'number' }).references(
      () => orders.id,
      { onDelete: 'set null' }
    ), // Reference to order if verified purchase
    // Moderation
    moderatedBy: bigint('moderated_by', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' }
    ), // Admin who moderated
    moderatedAt: timestamp('moderated_at'),
    moderationNotes: text('moderation_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    productIdIdx: index('product_reviews_product_id_idx').on(table.productId),
    customerIdIdx: index('product_reviews_customer_id_idx').on(
      table.customerId
    ),
    ratingIdx: index('product_reviews_rating_idx').on(table.rating),
  })
);

// Type exports for use in domain layer

// User management types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Courier = typeof couriers.$inferSelect;
export type NewCourier = typeof couriers.$inferInsert;

// Order types
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
