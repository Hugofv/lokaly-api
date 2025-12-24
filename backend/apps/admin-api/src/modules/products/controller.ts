/**
 * Products Controller
 * Product management endpoints
 */

import { Elysia } from 'elysia';
import type { ProductsService } from '@lokaly/domain';
import { jsonResponse, errorResponse } from '../../shared/responses';
import { productValidators } from './validators';

export const productsController = (productsService: ProductsService) =>
  new Elysia({ prefix: '/products' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const products = await productsService.findMany({
            limit: query.limit || 50,
            offset: query.offset || 0,
            orderBy: query.orderBy,
            orderDirection: query.orderDirection || 'desc',
            filters: {
              ...(query.subcategoryId && {
                subcategoryId: query.subcategoryId,
              }),
              ...(query.brandId && { brandId: query.brandId }),
              ...(query.status && { status: query.status }),
              ...(query.isFeatured !== undefined && {
                isFeatured: query.isFeatured,
              }),
              ...(query.isNew !== undefined && { isNew: query.isNew }),
              ...(query.isBestSeller !== undefined && {
                isBestSeller: query.isBestSeller,
              }),
            },
          });

          const total = await productsService.count({
            ...(query.subcategoryId && { subcategoryId: query.subcategoryId }),
            ...(query.brandId && { brandId: query.brandId }),
            ...(query.status && { status: query.status }),
            ...(query.isFeatured !== undefined && {
              isFeatured: query.isFeatured,
            }),
            ...(query.isNew !== undefined && { isNew: query.isNew }),
            ...(query.isBestSeller !== undefined && {
              isBestSeller: query.isBestSeller,
            }),
          });

          return jsonResponse({
            data: products,
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
      productValidators.list
    )
    .get(
      '/search',
      async ({ query }) => {
        try {
          const results = await productsService.search(
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
      productValidators.search
    )
    .get(
      '/by-sku',
      async ({ query }) => {
        try {
          const product = await productsService.findBySku(query.sku);
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
      },
      productValidators.bySku
    )
    .get(
      '/:id',
      async ({ params }) => {
        try {
          const product = await productsService.findById(params.id);
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
      },
      productValidators.byId
    )
    .post(
      '/',
      async ({ body }) => {
        try {
          const product = await productsService.create(body);
          return jsonResponse(product, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      productValidators.create
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const product = await productsService.update(params.id, body);
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
      },
      productValidators.update
    )
    .delete(
      '/:id',
      async ({ params }) => {
        try {
          const deleted = await productsService.delete(params.id);
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
      },
      productValidators.delete
    );
