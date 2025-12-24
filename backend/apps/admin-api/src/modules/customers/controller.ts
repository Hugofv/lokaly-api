/**
 * Customers Controller
 * Customer management endpoints
 */

import { Elysia } from 'elysia';
import type { CustomersService, AddressesService } from '@lokaly/domain';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
} from '../../shared/responses';
import { customerValidators, addressValidators } from './validators';

export const customersController = (
  customersService: CustomersService,
  addressesService: AddressesService
) =>
  new Elysia({ prefix: '/customers' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const limit = query.limit || 50;
          const offset = query.offset || 0;

          const customers = await customersService.findMany({
            limit,
            offset,
            orderBy: query.orderBy,
            orderDirection: query.orderDirection || 'desc',
            filters: {
              ...(query.status && { status: query.status }),
              ...(query.loyaltyTier && { loyaltyTier: query.loyaltyTier }),
            },
          });

          const total = await customersService.count({
            ...(query.status && { status: query.status }),
            ...(query.loyaltyTier && { loyaltyTier: query.loyaltyTier }),
          });

          return paginatedResponse(customers, total, limit, offset);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...customerValidators.list,
        detail: {
          tags: ['Customers'],
          summary: 'List customers',
          description: 'Get paginated list of customers',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/search',
      async ({ query }) => {
        try {
          const results = await customersService.search(
            query.q,
            query.limit || 20
          );
          return jsonResponse({ data: results });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...customerValidators.search,
        detail: {
          tags: ['Customers'],
          summary: 'Search customers',
          description: 'Search customers by query string',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/:id',
      async ({ params }) => {
        try {
          const customer = await customersService.findById(params.id);
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
      },
      {
        ...customerValidators.byId,
        detail: {
          tags: ['Customers'],
          summary: 'Get customer by ID',
          description: 'Get customer details by ID',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/',
      async ({ body }) => {
        try {
          const customer = await customersService.create(body);
          return jsonResponse(customer, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...customerValidators.create,
        detail: {
          tags: ['Customers'],
          summary: 'Create customer',
          description: 'Create a new customer',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const customer = await customersService.update(params.id, body);
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
      },
      {
        ...customerValidators.update,
        detail: {
          tags: ['Customers'],
          summary: 'Update customer',
          description: 'Update customer information',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .delete(
      '/:id',
      async ({ params }) => {
        try {
          const deleted = await customersService.delete(params.id);
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
      },
      {
        ...customerValidators.delete,
        detail: {
          tags: ['Customers'],
          summary: 'Delete customer',
          description: 'Delete a customer (soft delete)',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    // Customer addresses
    .get(
      '/:id/addresses',
      async ({ params }) => {
        try {
          const addresses = await addressesService.findByCustomerId(params.id);
          return jsonResponse({ data: addresses });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...addressValidators.list,
        detail: {
          tags: ['Customers'],
          summary: 'List customer addresses',
          description: 'Get all addresses for a customer',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/:id/addresses',
      async ({ params, body }) => {
        try {
          const address = await addressesService.create({
            type: body.type,
            street: body.street,
            number: body.number,
            complement: body.complement,
            neighborhood: body.neighborhood,
            city: body.city,
            state: body.state,
            zipCode: body.zipCode,
            country: body.country || 'BR',
            isDefault: body.isDefault || false,
            label: body.label,
            latitude: body.latitude,
            longitude: body.longitude,
            deliveryInstructions: body.deliveryInstructions,
            customerId: params.id,
          });
          return jsonResponse(address, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...addressValidators.create,
        detail: {
          tags: ['Customers'],
          summary: 'Create customer address',
          description: 'Create a new address for a customer',
          security: [{ bearerAuth: [] }],
        },
      }
    );
