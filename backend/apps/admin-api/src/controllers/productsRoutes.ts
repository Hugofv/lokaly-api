/**
 * Products Routes
 * Product management endpoints
 */

import { Elysia } from 'elysia';
import type { ProductsService } from '@lokaly/domain';
import type { Context } from 'elysia';
import { jsonResponse, errorResponse } from './base';

export function createProductsRoutes(productsService: ProductsService) {
  return new Elysia({ prefix: '/products' })
    .get('/', async ({ query }: Context) => {
      const limit = parseInt((query.limit as string) || '50', 10);
      const offset = parseInt((query.offset as string) || '0', 10);
      const orderBy = query.orderBy as
        | 'created_at'
        | 'name'
        | 'base_price'
        | 'sku'
        | undefined;
      const orderDirection = ((query.orderDirection as string) || 'desc') as
        | 'asc'
        | 'desc';

      const filters: Record<string, unknown> = {};
      if (query.subcategoryId)
        filters.subcategoryId = parseInt(query.subcategoryId as string, 10);
      if (query.brandId)
        filters.brandId = parseInt(query.brandId as string, 10);
      if (query.status) filters.status = query.status;
      if (query.isFeatured !== undefined)
        filters.isFeatured = query.isFeatured === 'true';
      if (query.isNew !== undefined) filters.isNew = query.isNew === 'true';
      if (query.isBestSeller !== undefined)
        filters.isBestSeller = query.isBestSeller === 'true';

      try {
        const products = await productsService.findMany({
          limit,
          offset,
          orderBy,
          orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });

        const total = await productsService.count(
          Object.keys(filters).length > 0 ? filters : undefined
        );

        return jsonResponse({
          data: products,
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
        const results = await productsService.search(searchQuery, limit);
        return jsonResponse({ data: results });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    })
    .get('/by-sku', async ({ query }: Context) => {
      const sku = query.sku as string | undefined;
      if (!sku) {
        return errorResponse('SKU parameter is required', 400);
      }

      try {
        const product = await productsService.findBySku(sku);
        if (!product) {
          return errorResponse('Product not found', 404);
        }
        return jsonResponse(product);
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
        return errorResponse('Invalid product ID', 400);
      }

      try {
        const product = await productsService.findById(id);
        if (!product) {
          return errorResponse('Product not found', 404);
        }
        return jsonResponse(product);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    })
    .post('/', async ({ body }: Context) => {
      try {
        const product = await productsService.create(
          body as Parameters<typeof productsService.create>[0]
        );
        return jsonResponse(product, 201);
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
        return errorResponse('Invalid product ID', 400);
      }

      try {
        const product = await productsService.update(
          id,
          body as Parameters<typeof productsService.update>[1]
        );
        if (!product) {
          return errorResponse('Product not found', 404);
        }
        return jsonResponse(product);
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
        return errorResponse('Invalid product ID', 400);
      }

      try {
        const deleted = await productsService.delete(id);
        if (!deleted) {
          return errorResponse('Product not found', 404);
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
