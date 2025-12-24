/**
 * Customers Routes
 * Customer management endpoints
 */

import { Elysia } from 'elysia';
import type { CustomersService, AddressesService } from '@lokaly/domain';
import type { Context } from 'elysia';
import { jsonResponse, errorResponse } from './base';

export function createCustomersRoutes(
  customersService: CustomersService,
  addressesService: AddressesService
) {
  return (
    new Elysia({ prefix: '/customers' })
      .get('/', async ({ query }: Context) => {
        const limit = parseInt((query.limit as string) || '50', 10);
        const offset = parseInt((query.offset as string) || '0', 10);
        const orderBy = query.orderBy as
          | 'created_at'
          | 'email'
          | 'first_name'
          | 'total_spent'
          | undefined;
        const orderDirection = ((query.orderDirection as string) || 'desc') as
          | 'asc'
          | 'desc';

        const filters: Record<string, unknown> = {};
        if (query.status) filters.status = query.status;
        if (query.loyaltyTier) filters.loyaltyTier = query.loyaltyTier;

        try {
          const customers = await customersService.findMany({
            limit,
            offset,
            orderBy,
            orderDirection,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          });

          const total = await customersService.count(
            Object.keys(filters).length > 0 ? filters : undefined
          );

          return jsonResponse({
            data: customers,
            pagination: {
              limit,
              offset,
              total,
              hasMore: offset + limit < total,
            },
          });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      })
      .get('/search', async ({ query }: Context) => {
        const searchQuery = query.q as string | undefined;
        const limit = parseInt((query.limit as string) || '20', 10);

        if (!searchQuery) {
          return errorResponse('Search query parameter is required', 400);
        }

        try {
          const results = await customersService.search(searchQuery, limit);
          return jsonResponse({ data: results });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      })
      .get('/:id', async ({ params }: Context) => {
        const id = parseInt(params.id as string, 10);
        if (isNaN(id)) {
          return errorResponse('Invalid customer ID', 400);
        }

        try {
          const customer = await customersService.findById(id);
          if (!customer) {
            return errorResponse('Customer not found', 404);
          }
          return jsonResponse(customer);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      })
      .post('/', async ({ body }: Context) => {
        try {
          const customer = await customersService.create(
            body as Parameters<typeof customersService.create>[0]
          );
          return jsonResponse(customer, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      })
      .patch('/:id', async ({ params, body }: Context) => {
        const id = parseInt(params.id as string, 10);
        if (isNaN(id)) {
          return errorResponse('Invalid customer ID', 400);
        }

        try {
          const customer = await customersService.update(
            id,
            body as Parameters<typeof customersService.update>[1]
          );
          if (!customer) {
            return errorResponse('Customer not found', 404);
          }
          return jsonResponse(customer);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      })
      .delete('/:id', async ({ params }: Context) => {
        const id = parseInt(params.id as string, 10);
        if (isNaN(id)) {
          return errorResponse('Invalid customer ID', 400);
        }

        try {
          const deleted = await customersService.delete(id);
          if (!deleted) {
            return errorResponse('Customer not found', 404);
          }
          return jsonResponse({ success: true });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      })
      // Customer addresses
      .get('/:id/addresses', async ({ params }: Context) => {
        const customerId = parseInt(params.id as string, 10);
        if (isNaN(customerId)) {
          return errorResponse('Invalid customer ID', 400);
        }

        try {
          const addresses = await addressesService.findByCustomerId(customerId);
          return jsonResponse({ data: addresses });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      })
      .post('/:id/addresses', async ({ params, body }: Context) => {
        const customerId = parseInt(params.id as string, 10);
        if (isNaN(customerId)) {
          return errorResponse('Invalid customer ID', 400);
        }

        try {
          const addressData = body as Parameters<
            typeof addressesService.create
          >[0];
          const address = await addressesService.create({
            ...addressData,
            customerId,
          });
          return jsonResponse(address, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      })
  );
}
