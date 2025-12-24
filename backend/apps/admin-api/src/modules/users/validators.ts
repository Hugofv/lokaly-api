/**
 * Users Validators
 * Elysia validators for users endpoints
 */

import { t } from 'elysia';
import {
  paginationQuery,
  orderByQuery,
  numericId,
} from '../../shared/validators';

export const userValidators = {
  list: {
    query: t.Composite([
      paginationQuery,
      orderByQuery(
        ['created_at', 'email', 'first_name'] as const,
        'created_at'
      ),
      t.Object({
        role: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        department: t.Optional(t.String()),
      }),
    ]),
  },
  byId: {
    params: numericId,
  },
  search: {
    query: t.Object({
      email: t.String(),
    }),
  },
  create: {
    body: t.Object({
      email: t.String(),
      passwordHash: t.String(),
      firstName: t.String(),
      lastName: t.String(),
      role: t.Union([
        t.Literal('admin'),
        t.Literal('super_admin'),
        t.Literal('manager'),
        t.Literal('staff'),
      ]),
      department: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean({ default: true })),
    }),
  },
  update: {
    params: numericId,
    body: t.Partial(
      t.Object({
        email: t.String(),
        firstName: t.String(),
        lastName: t.String(),
        role: t.Union([
          t.Literal('admin'),
          t.Literal('super_admin'),
          t.Literal('manager'),
          t.Literal('staff'),
        ]),
        department: t.String(),
        phone: t.String(),
        isActive: t.Boolean(),
      })
    ),
  },
  delete: {
    params: numericId,
  },
};
