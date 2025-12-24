/**
 * Products Validators
 * Elysia validators for products endpoints
 */

import { t } from 'elysia';
import {
  paginationQuery,
  orderByQuery,
  numericId,
} from '../../shared/validators';

export const productValidators = {
  list: {
    query: t.Composite([
      paginationQuery,
      orderByQuery(
        ['created_at', 'name', 'base_price', 'sku'] as const,
        'created_at'
      ),
      t.Object({
        subcategoryId: t.Optional(t.Numeric()),
        brandId: t.Optional(t.Numeric()),
        status: t.Optional(t.String()),
        isFeatured: t.Optional(t.Boolean()),
        isNew: t.Optional(t.Boolean()),
        isBestSeller: t.Optional(t.Boolean()),
      }),
    ]),
  },
  search: {
    query: t.Object({
      q: t.String(),
      limit: t.Optional(t.Numeric({ default: 20 })),
    }),
  },
  bySku: {
    query: t.Object({
      sku: t.String(),
    }),
  },
  byId: {
    params: numericId,
  },
  create: {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      sku: t.String(),
      barcode: t.Optional(t.String()),
      subcategoryId: t.Numeric(),
      brandId: t.Optional(t.Numeric()),
      unitId: t.Numeric(),
      basePrice: t.String(), // Decimal stored as string
      status: t.String({ default: 'active' }),
      isFeatured: t.Optional(t.Boolean({ default: false })),
      isNew: t.Optional(t.Boolean({ default: false })),
      isBestSeller: t.Optional(t.Boolean({ default: false })),
      weight: t.Optional(t.String()), // Decimal stored as string
      dimensions: t.Optional(t.String()),
      tags: t.Optional(t.String()), // JSON string or comma-separated
    }),
  },
  update: {
    params: numericId,
    body: t.Partial(
      t.Object({
        name: t.String(),
        description: t.String(),
        sku: t.String(),
        barcode: t.String(),
        subcategoryId: t.Numeric(),
        brandId: t.Numeric(),
        unitId: t.Numeric(),
        basePrice: t.String(), // Decimal stored as string
        status: t.String(),
        isFeatured: t.Boolean(),
        isNew: t.Boolean(),
        isBestSeller: t.Boolean(),
        weight: t.Numeric(),
        dimensions: t.String(),
        tags: t.String(), // JSON string or comma-separated
      })
    ),
  },
  delete: {
    params: numericId,
  },
};
