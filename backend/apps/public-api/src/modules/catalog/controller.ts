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
      {
        ...catalogValidators.listDepartments,
        detail: {
          tags: ['Catalog'],
          summary: 'List departments',
          description: 'Get list of all product departments',
          responses: {
            200: {
              description: 'List of departments',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        code: 'ALIM',
                        name: 'Alimentos',
                        description: 'Alimentos em geral',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      }
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
      {
        ...catalogValidators.listCategories,
        detail: {
          tags: ['Catalog'],
          summary: 'List categories by department',
          description:
            'Get all categories for a specific department. Requires departmentId query parameter.',
          responses: {
            200: {
              description: 'List of categories',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        departmentId: 1,
                        code: 'CEREAIS',
                        name: 'Cereais e Grãos',
                        description: 'Arroz, feijão, massas e cereais',
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: 'departmentId query parameter is required',
            },
          },
        },
      }
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
      {
        ...catalogValidators.listSubcategories,
        detail: {
          tags: ['Catalog'],
          summary: 'List subcategories by category',
          description:
            'Get all subcategories for a specific category. Requires categoryId query parameter.',
          responses: {
            200: {
              description: 'List of subcategories',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        categoryId: 1,
                        code: 'ARROZ',
                        name: 'Arroz',
                        description: 'Arroz branco, integral, parboilizado',
                      },
                    ],
                  },
                },
              },
            },
            400: { description: 'categoryId query parameter is required' },
          },
        },
      }
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
      {
        ...catalogValidators.listBrands,
        detail: {
          tags: ['Catalog'],
          summary: 'List brands',
          description: 'Get paginated list of all product brands',
          responses: {
            200: {
              description: 'List of brands',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        name: 'Coca-Cola',
                        logoUrl: 'https://example.com/logo.png',
                        website: 'https://coca-cola.com',
                        isActive: true,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      }
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
      {
        ...catalogValidators.listProducts,
        detail: {
          tags: ['Catalog'],
          summary: 'List products',
          description:
            'Get paginated list of products with optional filters. Supports filtering by subcategory, brand, featured status, and more.',
          responses: {
            200: {
              description: 'List of products with pagination',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        name: 'Arroz Tipo 1',
                        sku: 'ARROZ-001',
                        basePrice: '10.50',
                        status: 'active',
                        isFeatured: true,
                      },
                    ],
                    pagination: {
                      total: 100,
                      limit: 50,
                      offset: 0,
                      hasMore: true,
                    },
                  },
                },
              },
            },
          },
        },
      }
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
      {
        ...catalogValidators.getProductById,
        detail: {
          tags: ['Catalog'],
          summary: 'Get product by ID',
          description:
            'Get detailed product information including images, variants, prices, and stock by product ID',
          responses: {
            200: {
              description: 'Product found',
              content: {
                'application/json': {
                  example: {
                    id: 1,
                    name: 'Arroz Tipo 1',
                    sku: 'ARROZ-001',
                    basePrice: '10.50',
                    description: 'Arroz branco tipo 1',
                    images: [],
                    variants: [],
                  },
                },
              },
            },
            404: { description: 'Product not found' },
          },
        },
      }
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
      {
        ...catalogValidators.getProductBySku,
        detail: {
          tags: ['Catalog'],
          summary: 'Get product by SKU',
          description:
            'Get product information by SKU (Stock Keeping Unit) code. SKU is a unique identifier for products.',
          responses: {
            200: {
              description: 'Product found',
              content: {
                'application/json': {
                  example: {
                    id: 1,
                    name: 'Arroz Tipo 1',
                    sku: 'ARROZ-001',
                    basePrice: '10.50',
                  },
                },
              },
            },
            404: { description: 'Product not found' },
          },
        },
      }
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
      {
        ...catalogValidators.searchProducts,
        detail: {
          tags: ['Catalog'],
          summary: 'Search products',
          description:
            'Search products by name, description, or SKU. Returns matching products ordered by relevance.',
          responses: {
            200: {
              description: 'Search results',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        name: 'Arroz Tipo 1',
                        sku: 'ARROZ-001',
                        basePrice: '10.50',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      }
    );
