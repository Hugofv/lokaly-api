/**
 * Admin API App
 * Elysia-based API server
 */

import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import type { DbConnection } from '@lokaly/db';
import type { CacheService } from '@lokaly/cache';
import type { EventPublisher } from '@lokaly/domain';
import { JwtService } from '@lokaly/auth';
import {
  UsersService,
  CustomersService,
  AddressesService,
  CouriersService,
  ProductsService,
} from '@lokaly/domain';
import { authPlugin } from './shared/middleware/auth.plugin';
import { authController } from './modules/auth/controller';
import { usersController } from './modules/users/controller';
import { customersController } from './modules/customers/controller';
import { addressesController } from './modules/customers/addresses/controller';
import { couriersController } from './modules/couriers/controller';
import { productsController } from './modules/products/controller';

export function createApp(
  db: DbConnection,
  cache: CacheService,
  eventPublisher: EventPublisher,
  jwtService: JwtService
) {
  // Initialize services
  const usersService = new UsersService(db, cache);
  const customersService = new CustomersService(db, cache);
  const addressesService = new AddressesService(db, cache);
  const couriersService = new CouriersService(db, cache);
  const productsService = new ProductsService(db, cache);

  // Build app
  const app = new Elysia()
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Lokaly Admin API',
            version: '1.0.0',
            description:
              'Admin API for managing users, customers, couriers, products, and orders.',
            contact: {
              name: 'Lokaly Support',
              email: 'support@lokaly.com',
            },
          },
          tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Customers', description: 'Customer management endpoints' },
            { name: 'Addresses', description: 'Address management endpoints' },
            { name: 'Couriers', description: 'Courier management endpoints' },
            { name: 'Products', description: 'Product management endpoints' },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token obtained from /api/admin/auth/login',
              },
            },
          },
        },
        // Group operations by path prefix
        swaggerOptions: {
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      })
    )
    .get('/health', () => ({ status: 'ok', service: 'admin-api' }), {
      detail: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
      },
    })
    // Public admin auth endpoints (no auth plugin - login/refresh)
    .group('/api/admin/auth', (app) =>
      app.use(authController(usersService, jwtService))
    )
    // Protected admin endpoints (require auth plugin)
    .group('/api/admin', (app) =>
      app
        .use(authPlugin(jwtService))
        .use(usersController(usersService))
        .use(customersController(customersService, addressesService))
        .use(addressesController(addressesService))
        .use(couriersController(couriersService))
        .use(productsController(productsService))
    );

  return app;
}
