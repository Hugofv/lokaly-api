/**
 * Public API App (Elysia)
 */

import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
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
  const departmentsService = new DepartmentsService(db, {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    invalidateList: async () => {},
    invalidateEntity: async () => {},
  } as any);
  const categoriesService = new CategoriesService(db, {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    invalidateList: async () => {},
    invalidateEntity: async () => {},
  } as any);
  const subcategoriesService = new SubcategoriesService(db, {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    invalidateList: async () => {},
    invalidateEntity: async () => {},
  } as any);
  const brandsService = new BrandsService(db, {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    invalidateList: async () => {},
    invalidateEntity: async () => {},
  } as any);
  const productsService = new ProductsService(db, {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    invalidateList: async () => {},
    invalidateEntity: async () => {},
  } as any);

  const app = new Elysia()
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Lokaly Public API',
            version: '1.0.0',
            description:
              'Public API for customers and couriers. Browse catalog, search products, and manage orders.',
            contact: {
              name: 'Lokaly Support',
              email: 'support@lokaly.com',
            },
          },
          tags: [
            { name: 'Catalog', description: 'Product catalog endpoints' },
            { name: 'Orders', description: 'Order management endpoints' },
            { name: 'Health', description: 'Health check endpoints' },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description:
                  'JWT token (optional for catalog endpoints, required for orders)',
              },
            },
          },
        },
      })
    )
    .get('/health', () => ({ status: 'ok', service: 'public-api' }), {
      detail: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
      },
    })
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
