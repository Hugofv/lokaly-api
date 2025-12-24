/**
 * Public Catalog Controller
 * Read-only catalog endpoints (JWT opcional)
 */

import { Elysia } from 'elysia';
import type {
  DepartmentsService,
  CategoriesService,
  SubcategoriesService,
  BrandsService,
  ProductsService,
} from '@lokaly/domain';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
} from '../../shared/responses';
import { catalogValidators } from './validators';

export const catalogController = (
  departmentsService: DepartmentsService,
  categoriesService: CategoriesService,
  subcategoriesService: SubcategoriesService,
  brandsService: BrandsService,
  productsService: ProductsService
) =>
  new Elysia({ prefix: '/catalog' })
    // Departments
    .get(
      '/departments',
      async ({ query }) => {
        try {
          const departments = await departmentsService.findMany({
            limit: query.limit || 100,
            offset: query.offset || 0,
          });
          return jsonResponse({ data: departments });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      catalogValidators.listDepartments
    )
    // Categories by department (optional departmentId, otherwise 400)
    .get(
      '/categories',
      async ({ query }) => {
        try {
          const departmentId = query.departmentId as number | undefined;
          if (!departmentId) {
            return errorResponse(
              'departmentId query parameter is required',
              400
            );
          }
          const categories = await categoriesService.findByDepartmentId(
            departmentId
          );
          return jsonResponse({ data: categories });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      catalogValidators.listCategories
    )
    // Subcategories by category (requires categoryId)
    .get(
      '/subcategories',
      async ({ query }) => {
        try {
          const categoryId = query.categoryId as number | undefined;
          if (!categoryId) {
            return errorResponse('categoryId query parameter is required', 400);
          }
          const subcategories = await subcategoriesService.findByCategoryId(
            categoryId
          );
          return jsonResponse({ data: subcategories });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      catalogValidators.listSubcategories
    )
    // Brands
    .get(
      '/brands',
      async ({ query }) => {
        try {
          const brands = await brandsService.findMany({
            limit: query.limit || 100,
            offset: query.offset || 0,
          });
          return jsonResponse({ data: brands });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      catalogValidators.listBrands
    )
    // Products list
    .get(
      '/products',
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
      catalogValidators.listProducts
    )
    // Product by id
    .get(
      '/products/:id',
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
      catalogValidators.getProductById
    )
    // Product by sku
    .get(
      '/products/by-sku',
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
      catalogValidators.getProductBySku
    )
    // Product search
    .get(
      '/products/search',
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
      catalogValidators.searchProducts
    );
