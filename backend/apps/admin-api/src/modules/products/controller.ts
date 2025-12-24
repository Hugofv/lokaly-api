/**
 * Products Controller
 * Product management endpoints
 */

import { Elysia } from 'elysia';
import type { ProductsService } from '@lokaly/domain';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
} from '../../shared/responses';
import { productValidators } from './validators';

export const productsController = (productsService: ProductsService) =>
  new Elysia({ prefix: '/products' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const limit = query.limit || 50;
          const offset = query.offset || 0;

          const products = await productsService.findMany({
            limit,
            offset,
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

          return paginatedResponse(products, total, limit, offset);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...productValidators.list,
        detail: {
          tags: ['Products'],
          summary: 'List products',
          description: 'Get paginated list of products',
          security: [{ bearerAuth: [] }],
        },
      }
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
      {
        ...productValidators.search,
        detail: {
          tags: ['Products'],
          summary: 'Search products',
          description: 'Search products by query string',
          security: [{ bearerAuth: [] }],
        },
      }
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
      {
        ...productValidators.bySku,
        detail: {
          tags: ['Products'],
          summary: 'Get product by SKU',
          description: 'Get product details by SKU',
          security: [{ bearerAuth: [] }],
        },
      }
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
      {
        ...productValidators.byId,
        detail: {
          tags: ['Products'],
          summary: 'Get product by ID',
          description: 'Get product details by ID',
          security: [{ bearerAuth: [] }],
        },
      }
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
      {
        ...productValidators.create,
        detail: {
          tags: ['Products'],
          summary: 'Create product',
          description: 'Create a new product',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const product = await productsService.update(params.id, {
            ...(body as any),
            // Normalizar tipos numéricos que são strings no schema
            weight:
              typeof (body as any).weight === 'number'
                ? (body as any).weight.toString()
                : (body as any).weight,
            basePrice:
              typeof (body as any).basePrice === 'number'
                ? (body as any).basePrice.toString()
                : (body as any).basePrice,
          } as any);
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
      {
        ...productValidators.update,
        detail: {
          tags: ['Products'],
          summary: 'Update product',
          description: 'Update product information',
          security: [{ bearerAuth: [] }],
        },
      }
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
      {
        ...productValidators.delete,
        detail: {
          tags: ['Products'],
          summary: 'Delete product',
          description: 'Delete a product (soft delete)',
          security: [{ bearerAuth: [] }],
        },
      }
    );
