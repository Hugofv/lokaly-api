/**
 * Domain Package
 *
 * Core business logic and domain models.
 * This package is completely framework-agnostic.
 *
 * Architecture Decision:
 * - Domain logic emits events (doesn't call services directly)
 * - Events are published via an event publisher interface
 * - This allows replacing Redis with RabbitMQ/SQS without changing domain logic
 * - All business rules live here, not in controllers
 */

// Export services and repositories
export {
  OrderService,
  type CreateOrderInput,
  type Order,
  type OrderStatus,
} from './order';
export { InventoryService } from './inventory';
export { DeliveryService } from './delivery';
export { UsersService, type UsersRepository, type UserFilters } from './users';
export {
  CustomersService,
  type CustomersRepository,
  type CustomerFilters,
} from './customers';
export { AddressesService, type AddressesRepository } from './addresses';
export {
  CouriersService,
  type CouriersRepository,
  type CourierFilters,
  type FindAvailableOptions,
} from './couriers';
export {
  ProductsService,
  type ProductsRepository,
  type ProductFilters,
} from './products';
export { DepartmentsService, type DepartmentsRepository } from './departments';
export { CategoriesService, type CategoriesRepository } from './categories';
export {
  SubcategoriesService,
  type SubcategoriesRepository,
} from './subcategories';
export { BrandsService, type BrandsRepository } from './brands';
export { UnitsService, type UnitsRepository } from './units';
export { WarehousesService, type WarehousesRepository } from './warehouses';
export {
  ProductImagesService,
  type ProductImagesRepository,
} from './product-images';
export {
  ProductVariantsService,
  type ProductVariantsRepository,
} from './product-variants';
export {
  ProductStockService,
  type ProductStockRepository,
} from './product-stock';
export {
  ProductPricesService,
  type ProductPricesRepository,
} from './product-prices';
export {
  ProductReviewsService,
  type ProductReviewsRepository,
} from './product-reviews';

// Export EventPublisher interface for use in apps
export type { EventPublisher } from './order';
