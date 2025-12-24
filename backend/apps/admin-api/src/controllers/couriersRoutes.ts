/**
 * Couriers Routes
 * Courier management endpoints
 */

import { Elysia } from 'elysia';
import type { CouriersService } from '@lokaly/domain';
import type { Context } from 'elysia';
import { jsonResponse, errorResponse } from './base';

export function createCouriersRoutes(couriersService: CouriersService) {
  return new Elysia({ prefix: '/couriers' })
    .get('/', async ({ query }: Context) => {
      const limit = parseInt((query.limit as string) || '50', 10);
      const offset = parseInt((query.offset as string) || '0', 10);
      const orderBy = query.orderBy as
        | 'created_at'
        | 'email'
        | 'first_name'
        | 'total_deliveries'
        | 'total_rating'
        | undefined;
      const orderDirection = ((query.orderDirection as string) || 'desc') as
        | 'asc'
        | 'desc';

      const filters: Record<string, unknown> = {};
      if (query.status) filters.status = query.status;
      if (query.vehicleType) filters.vehicleType = query.vehicleType;
      if (query.isAvailable !== undefined)
        filters.isAvailable = query.isAvailable === 'true';
      if (query.isVerified !== undefined)
        filters.isVerified = query.isVerified === 'true';

      try {
        const couriers = await couriersService.findMany({
          limit,
          offset,
          orderBy,
          orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });

        const total = await couriersService.count(
          Object.keys(filters).length > 0 ? filters : undefined
        );

        return jsonResponse({
          data: couriers,
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
    .get('/available', async ({ query }: Context) => {
      const limit = parseInt((query.limit as string) || '10', 10);
      const vehicleType = query.vehicleType as string | undefined;
      const minRating = query.minRating as string | undefined;

      try {
        const couriers = await couriersService.findAvailable({
          limit,
          vehicleType,
          minRating: minRating ? parseFloat(minRating) : undefined,
        });
        return jsonResponse({ data: couriers });
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
        const results = await couriersService.search(searchQuery, limit);
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
        return errorResponse('Invalid courier ID', 400);
      }

      try {
        const courier = await couriersService.findById(id);
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
    })
    .post('/', async ({ body }: Context) => {
      try {
        const courier = await couriersService.create(
          body as Parameters<typeof couriersService.create>[0]
        );
        return jsonResponse(courier, 201);
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
        return errorResponse('Invalid courier ID', 400);
      }

      try {
        const courier = await couriersService.update(
          id,
          body as Parameters<typeof couriersService.update>[1]
        );
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
    })
    .delete('/:id', async ({ params }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid courier ID', 400);
      }

      try {
        const deleted = await couriersService.delete(id);
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
    })
    .patch('/:id/location', async ({ params, body }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid courier ID', 400);
      }

      try {
        const bodyData = body as { latitude: number; longitude: number };
        const { latitude, longitude } = bodyData;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return errorResponse('Latitude and longitude are required', 400);
        }

        const updated = await couriersService.updateLocation(
          id,
          latitude,
          longitude
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
    })
    .patch('/:id/availability', async ({ params, body }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid courier ID', 400);
      }

      try {
        const bodyData = body as { isAvailable: boolean };
        const { isAvailable } = bodyData;
        if (typeof isAvailable !== 'boolean') {
          return errorResponse('isAvailable must be a boolean', 400);
        }

        const updated = await couriersService.setAvailability(id, isAvailable);
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
    });
}
