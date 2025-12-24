/**
 * Public Catalog Validators
 */

import { t } from 'elysia';
import {
  paginationQuery,
  orderByQuery,
  numericId,
} from '../../shared/validators';

export const catalogValidators = {
  listDepartments: {
    query: paginationQuery,
  },
  listCategories: {
    query: t.Composite([
      paginationQuery,
      t.Object({
        departmentId: t.Optional(t.Numeric()),
      }),
    ]),
  },
  listSubcategories: {
    query: t.Composite([
      paginationQuery,
      t.Object({
        categoryId: t.Optional(t.Numeric()),
      }),
    ]),
  },
  listBrands: {
    query: paginationQuery,
  },
  listProducts: {
    query: t.Composite([
      paginationQuery,
      orderByQuery(
        ['created_at', 'name', 'base_price', 'sku'] as const,
        'created_at'
      ),
      t.Object({
        subcategoryId: t.Optional(t.Numeric()),
        brandId: t.Optional(t.Numeric()),
        isFeatured: t.Optional(t.Boolean()),
        isNew: t.Optional(t.Boolean()),
        isBestSeller: t.Optional(t.Boolean()),
      }),
    ]),
  },
  getProductById: {
    params: numericId,
  },
  getProductBySku: {
    query: t.Object({
      sku: t.String(),
    }),
  },
  searchProducts: {
    query: t.Object({
      q: t.String(),
      limit: t.Optional(t.Numeric({ default: 20 })),
    }),
  },
};
