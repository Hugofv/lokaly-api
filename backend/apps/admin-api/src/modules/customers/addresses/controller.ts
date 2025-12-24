/**
 * Addresses Controller
 * Address management endpoints
 */

import { Elysia, t } from 'elysia';
import type { AddressesService } from '@lokaly/domain';
import { jsonResponse, errorResponse } from '../../../shared/responses';
import { numericId } from '../../../shared/validators';

export const addressesController = (addressesService: AddressesService) =>
  new Elysia({ prefix: '/addresses' })
    .get(
      '/:id',
      async ({ params }) => {
        try {
          const address = await addressesService.findById(params.id);
          if (!address) {
            return errorResponse('Address not found', 404);
          }
          return jsonResponse(address);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      { params: numericId }
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const address = await addressesService.update(params.id, body);
          if (!address) {
            return errorResponse('Address not found', 404);
          }
          return jsonResponse(address);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        params: numericId,
        body: t.Partial(
          t.Object({
            type: t.String(),
            street: t.String(),
            number: t.String(),
            complement: t.String(),
            neighborhood: t.String(),
            city: t.String(),
            state: t.String(),
            zipCode: t.String(),
            country: t.String(),
            isDefault: t.Boolean(),
            label: t.String(),
            latitude: t.String(), // Decimal stored as string
            longitude: t.String(), // Decimal stored as string
            deliveryInstructions: t.String(),
          })
        ),
      }
    )
    .delete(
      '/:id',
      async ({ params }) => {
        try {
          const deleted = await addressesService.delete(params.id);
          if (!deleted) {
            return errorResponse('Address not found', 404);
          }
          return jsonResponse({ success: true });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      { params: numericId }
    );
