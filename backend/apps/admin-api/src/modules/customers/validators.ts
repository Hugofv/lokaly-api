/**
 * Customers Validators
 * Elysia validators for customers endpoints
 */

import { t } from 'elysia';
import {
  paginationQuery,
  orderByQuery,
  numericId,
} from '../../shared/validators';

export const customerValidators = {
  list: {
    query: t.Composite([
      paginationQuery,
      orderByQuery(
        ['created_at', 'email', 'first_name', 'total_spent'] as const,
        'created_at'
      ),
      t.Object({
        status: t.Optional(t.String()),
        loyaltyTier: t.Optional(t.String()),
      }),
    ]),
  },
  search: {
    query: t.Object({
      q: t.String(),
      limit: t.Optional(t.Numeric({ default: 20 })),
    }),
  },
  byId: {
    params: numericId,
  },
  create: {
    body: t.Object({
      email: t.String(),
      firstName: t.String(),
      lastName: t.String(),
      phone: t.Optional(t.String()),
      cpf: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      gender: t.Optional(t.String()),
      status: t.Optional(t.String({ default: 'active' })),
      loyaltyTier: t.Optional(t.String({ default: 'bronze' })),
      referralCode: t.Optional(t.String()),
      referredBy: t.Optional(t.Numeric()),
    }),
  },
  update: {
    params: numericId,
    body: t.Partial(
      t.Object({
        email: t.String(),
        firstName: t.String(),
        lastName: t.String(),
        phone: t.String(),
        cpf: t.String(),
        dateOfBirth: t.String(),
        gender: t.String(),
        status: t.String(),
        loyaltyTier: t.String(),
      })
    ),
  },
  delete: {
    params: numericId,
  },
};

export const addressValidators = {
  list: {
    params: numericId,
  },
  create: {
    params: numericId,
    body: t.Object({
      type: t.String(), // home, work, other
      street: t.String(),
      number: t.String(),
      complement: t.Optional(t.String()),
      neighborhood: t.String(),
      city: t.String(),
      state: t.String(),
      zipCode: t.String(),
      country: t.Optional(t.String({ default: 'BR' })),
      isDefault: t.Optional(t.Boolean({ default: false })),
      label: t.Optional(t.String()),
      latitude: t.Optional(t.String()), // Decimal stored as string
      longitude: t.Optional(t.String()), // Decimal stored as string
      deliveryInstructions: t.Optional(t.String()),
    }),
  },
};
