/**
 * Couriers Controller
 * Courier management endpoints
 */

import { Elysia } from 'elysia';
import type { CouriersService } from '@lokaly/domain';
import { jsonResponse, errorResponse } from '../../shared/responses';
import { courierValidators } from './validators';

export const couriersController = (couriersService: CouriersService) =>
  new Elysia({ prefix: '/couriers' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const couriers = await couriersService.findMany({
            limit: query.limit || 50,
            offset: query.offset || 0,
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

          return jsonResponse({
            data: couriers,
            pagination: {
              limit: query.limit || 50,
              offset: query.offset || 0,
              total,
              hasMore: (query.offset || 0) + (query.limit || 50) < total,
            },
          });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      courierValidators.list
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
      courierValidators.available
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
      courierValidators.search
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
      courierValidators.byId
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
      courierValidators.create
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
      courierValidators.update
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
      courierValidators.delete
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
      courierValidators.updateLocation
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
      courierValidators.setAvailability
    );
