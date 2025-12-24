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
import {
  createUsersRoutes,
  createCustomersRoutes,
  createAddressesRoutes,
  createCouriersRoutes,
  createProductsRoutes,
} from './controllers';
import { createAuthGuard, createAuthDerive } from './middleware/elysia-auth';

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

  // Auth middleware
  const authGuard = createAuthGuard(jwtService);
  const authDerive = createAuthDerive(jwtService);

  // Create route groups
  const usersRoutes = createUsersRoutes(usersService);
  const customersRoutes = createCustomersRoutes(
    customersService,
    addressesService
  );
  const addressesRoutes = createAddressesRoutes(addressesService);
  const couriersRoutes = createCouriersRoutes(couriersService);
  const productsRoutes = createProductsRoutes(productsService);

  // Build app
  const app = new Elysia()
    .get('/health', () => ({ status: 'ok', service: 'admin-api' }))
    .group('/api/admin', (app) =>
      app
        .onBeforeHandle(authGuard)
        .derive(authDerive)
        .use(usersRoutes)
        .use(customersRoutes)
        .use(addressesRoutes)
        .use(couriersRoutes)
        .use(productsRoutes)
    );

  return app;
}
