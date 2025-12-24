/**
 * Addresses Routes
 * Address management endpoints
 */

import { Elysia } from 'elysia';
import type { AddressesService } from '@lokaly/domain';
import type { Context } from 'elysia';
import { jsonResponse, errorResponse } from './base';

export function createAddressesRoutes(addressesService: AddressesService) {
  return new Elysia({ prefix: '/addresses' })
    .get('/:id', async ({ params }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid address ID', 400);
      }

      try {
        const address = await addressesService.findById(id);
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
    })
    .patch('/:id', async ({ params, body }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid address ID', 400);
      }

      try {
        const address = await addressesService.update(
          id,
          body as Parameters<typeof addressesService.update>[1]
        );
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
    })
    .delete('/:id', async ({ params }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid address ID', 400);
      }

      try {
        const deleted = await addressesService.delete(id);
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
    });
}
