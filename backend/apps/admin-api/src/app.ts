/**
 * Admin API App
 * Elysia-based API server
 */

import { Elysia } from 'elysia';
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
    .get('/health', () => ({ status: 'ok', service: 'admin-api' }))
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
