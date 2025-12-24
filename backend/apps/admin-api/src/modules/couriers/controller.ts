/**
 * Couriers Controller
 * Courier management endpoints
 */

import { Elysia } from 'elysia';
import type { CouriersService } from '@lokaly/domain';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
} from '../../shared/responses';
import { courierValidators } from './validators';

export const couriersController = (couriersService: CouriersService) =>
  new Elysia({ prefix: '/couriers' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const limit = query.limit || 50;
          const offset = query.offset || 0;

          const couriers = await couriersService.findMany({
            limit,
            offset,
            orderBy: query.orderBy,
            orderDirection: query.orderDirection || 'desc',
            filters: {
              ...(query.status && { status: query.status }),
              ...(query.vehicleType && { vehicleType: query.vehicleType }),
              ...(query.isAvailable !== undefined && {
                isAvailable: query.isAvailable,
              }),
              ...(query.isVerified !== undefined && {
                isVerified: query.isVerified,
              }),
            },
          });

          const total = await couriersService.count({
            ...(query.status && { status: query.status }),
            ...(query.vehicleType && { vehicleType: query.vehicleType }),
            ...(query.isAvailable !== undefined && {
              isAvailable: query.isAvailable,
            }),
            ...(query.isVerified !== undefined && {
              isVerified: query.isVerified,
            }),
          });

          return paginatedResponse(couriers, total, limit, offset);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...courierValidators.list,
        detail: {
          tags: ['Couriers'],
          summary: 'List couriers',
          description: 'Get paginated list of couriers',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/available',
      async ({ query }) => {
        try {
          const couriers = await couriersService.findAvailable({
            limit: query.limit || 10,
            vehicleType: query.vehicleType,
            minRating: query.minRating,
          });
          return jsonResponse({ data: couriers });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...courierValidators.available,
        detail: {
          tags: ['Couriers'],
          summary: 'List available couriers',
          description: 'Get list of available couriers',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/search',
      async ({ query }) => {
        try {
          const results = await couriersService.search(
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
        ...courierValidators.search,
        detail: {
          tags: ['Couriers'],
          summary: 'Search couriers',
          description: 'Search couriers by query string',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .get(
      '/:id',
      async ({ params }) => {
        try {
          const courier = await couriersService.findById(params.id);
          if (!courier) {
            return errorResponse('Courier not found', 404);
          }
          return jsonResponse(courier);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...courierValidators.byId,
        detail: {
          tags: ['Couriers'],
          summary: 'Get courier by ID',
          description: 'Get courier details by ID',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/',
      async ({ body }) => {
        try {
          const courier = await couriersService.create(body);
          return jsonResponse(courier, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...courierValidators.create,
        detail: {
          tags: ['Couriers'],
          summary: 'Create courier',
          description: 'Create a new courier',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const courier = await couriersService.update(params.id, body);
          if (!courier) {
            return errorResponse('Courier not found', 404);
          }
          return jsonResponse(courier);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...courierValidators.update,
        detail: {
          tags: ['Couriers'],
          summary: 'Update courier',
          description: 'Update courier information',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .delete(
      '/:id',
      async ({ params }) => {
        try {
          const deleted = await couriersService.delete(params.id);
          if (!deleted) {
            return errorResponse('Courier not found', 404);
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
        ...courierValidators.delete,
        detail: {
          tags: ['Couriers'],
          summary: 'Delete courier',
          description: 'Delete a courier (soft delete)',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/:id/location',
      async ({ params, body }) => {
        try {
          const updated = await couriersService.updateLocation(
            params.id,
            body.latitude,
            body.longitude
          );
          if (!updated) {
            return errorResponse('Courier not found', 404);
          }
          return jsonResponse({ success: true });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...courierValidators.updateLocation,
        detail: {
          tags: ['Couriers'],
          summary: 'Update courier location',
          description: 'Update courier current location',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/:id/availability',
      async ({ params, body }) => {
        try {
          const updated = await couriersService.setAvailability(
            params.id,
            body.isAvailable
          );
          if (!updated) {
            return errorResponse('Courier not found', 404);
          }
          return jsonResponse({ success: true });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...courierValidators.setAvailability,
        detail: {
          tags: ['Couriers'],
          summary: 'Set courier availability',
          description: 'Update courier availability status',
          security: [{ bearerAuth: [] }],
        },
      }
    );
