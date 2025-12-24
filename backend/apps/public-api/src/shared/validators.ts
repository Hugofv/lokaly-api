/**
 * Shared Validators (public API)
 */

import { t } from 'elysia';

export const paginationQuery = t.Object({
  limit: t.Optional(t.Numeric({ default: 50 })),
  offset: t.Optional(t.Numeric({ default: 0 })),
});

export const orderByQuery = <T extends readonly string[]>(
  fields: T,
  defaultField?: T[number]
) =>
  t.Object({
    orderBy: t.Optional(
      t.Union(fields.map((f) => t.Literal(f)) as any, {
        default: defaultField,
      })
    ),
    orderDirection: t.Optional(
      t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'desc' })
    ),
  });

export const numericId = t.Object({
  id: t.Numeric(),
});
