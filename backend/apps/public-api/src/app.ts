/**
 * Public API App (Elysia)
 */

import { Elysia } from 'elysia';
import type { DbConnection } from '@lokaly/db';
import type { EventPublisher } from '@lokaly/domain';
import { JwtService } from '@lokaly/auth';
import {
  OrderService,
  DepartmentsService,
  CategoriesService,
  SubcategoriesService,
  BrandsService,
  ProductsService,
} from '@lokaly/domain';
import { publicAuthPlugin } from './shared/middleware/auth.plugin';
import { catalogController } from './modules/catalog/controller';
import { ordersController } from './modules/orders/controller';

export function createApp(
  db: DbConnection,
  eventPublisher: EventPublisher,
  jwtService: JwtService
) {
  // Initialize domain services
  const orderService = new OrderService(db, eventPublisher);
  const departmentsService = new DepartmentsService(db, { get: async () => null, set: async () => {}, delete: async () => {}, invalidateList: async () => {}, invalidateEntity: async () => {} } as any);
  const categoriesService = new CategoriesService(db, { get: async () => null, set: async () => {}, delete: async () => {}, invalidateList: async () => {}, invalidateEntity: async () => {} } as any);
  const subcategoriesService = new SubcategoriesService(db, { get: async () => null, set: async () => {}, delete: async () => {}, invalidateList: async () => {}, invalidateEntity: async () => {} } as any);
  const brandsService = new BrandsService(db, { get: async () => null, set: async () => {}, delete: async () => {}, invalidateList: async () => {}, invalidateEntity: async () => {} } as any);
  const productsService = new ProductsService(db, { get: async () => null, set: async () => {}, delete: async () => {}, invalidateList: async () => {}, invalidateEntity: async () => {} } as any);

  const app = new Elysia()
    .get('/health', () => ({ status: 'ok', service: 'public-api' }))
    .group('/api', (app) =>
      app
        // JWT opcional: deriva auth se presente e válido
        .use(publicAuthPlugin(jwtService))
        // Catálogo público (read-only)
        .use(
          catalogController(
            departmentsService,
            categoriesService,
            subcategoriesService,
            brandsService,
            productsService
          )
        )
        // Pedidos (requer auth dentro do controller)
        .use(ordersController(orderService))
    );

  return app;
}
