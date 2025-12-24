/**
 * Enum definitions for domain values
 * These enums are used in the backend, not stored as database enums
 */

/**
 * Order Status Enum
 */
export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PICKING: 'picking',
  READY: 'ready',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Payment Status Enum
 */
export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Payment Method Enum
 */
export const PaymentMethod = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  CASH: 'cash',
  PIX: 'pix',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/**
 * Inventory Reservation Status Enum
 */
export const InventoryReservationStatus = {
  RESERVED: 'reserved',
  RELEASED: 'released',
  FULFILLED: 'fulfilled',
} as const;

export type InventoryReservationStatus =
  (typeof InventoryReservationStatus)[keyof typeof InventoryReservationStatus];

/**
 * Delivery Assignment Status Enum
 */
export const DeliveryAssignmentStatus = {
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type DeliveryAssignmentStatus =
  (typeof DeliveryAssignmentStatus)[keyof typeof DeliveryAssignmentStatus];

/**
 * Helper function to validate order status
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
  return Object.values(OrderStatus).includes(status as OrderStatus);
}

/**
 * Helper function to validate payment status
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PaymentStatus).includes(status as PaymentStatus);
}

/**
 * Helper function to validate inventory reservation status
 */
export function isValidInventoryReservationStatus(
  status: string
): status is InventoryReservationStatus {
  return Object.values(InventoryReservationStatus).includes(
    status as InventoryReservationStatus
  );
}

/**
 * Helper function to validate delivery assignment status
 */
export function isValidDeliveryAssignmentStatus(
  status: string
): status is DeliveryAssignmentStatus {
  return Object.values(DeliveryAssignmentStatus).includes(
    status as DeliveryAssignmentStatus
  );
}

/**
 * Unit Type Enum
 */
export const UnitType = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  UNIT: 'unit',
  LENGTH: 'length',
  AREA: 'area',
} as const;

export type UnitType = (typeof UnitType)[keyof typeof UnitType];

/**
 * Product Status Enum
 */
export const ProductStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

/**
 * Product Variant Type Enum
 */
export const ProductVariantType = {
  SIZE: 'size',
  FLAVOR: 'flavor',
  COLOR: 'color',
  PACKAGE: 'package',
  WEIGHT: 'weight',
  VOLUME: 'volume',
  OTHER: 'other',
} as const;

export type ProductVariantType =
  (typeof ProductVariantType)[keyof typeof ProductVariantType];

/**
 * Product Image Size Enum
 */
export const ProductImageSize = {
  THUMBNAIL: 'thumbnail',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  ORIGINAL: 'original',
} as const;

export type ProductImageSize =
  (typeof ProductImageSize)[keyof typeof ProductImageSize];

/**
 * Product Price Type Enum
 */
export const ProductPriceType = {
  REGULAR: 'regular',
  SALE: 'sale',
  PROMOTIONAL: 'promotional',
  BULK: 'bulk',
} as const;

export type ProductPriceType =
  (typeof ProductPriceType)[keyof typeof ProductPriceType];

/**
 * Helper function to validate unit type
 */
export function isValidUnitType(type: string): type is UnitType {
  return Object.values(UnitType).includes(type as UnitType);
}

/**
 * Helper function to validate product status
 */
export function isValidProductStatus(status: string): status is ProductStatus {
  return Object.values(ProductStatus).includes(status as ProductStatus);
}

/**
 * Helper function to validate product variant type
 */
export function isValidProductVariantType(
  type: string
): type is ProductVariantType {
  return Object.values(ProductVariantType).includes(type as ProductVariantType);
}

/**
 * Helper function to validate product image size
 */
export function isValidProductImageSize(
  size: string
): size is ProductImageSize {
  return Object.values(ProductImageSize).includes(size as ProductImageSize);
}

/**
 * Helper function to validate product price type
 */
export function isValidProductPriceType(
  type: string
): type is ProductPriceType {
  return Object.values(ProductPriceType).includes(type as ProductPriceType);
}
