/**
 * Couriers Validators
 * Elysia validators for couriers endpoints
 */

import { t } from 'elysia';
import {
  paginationQuery,
  orderByQuery,
  numericId,
} from '../../shared/validators';

export const courierValidators = {
  list: {
    query: t.Composite([
      paginationQuery,
      orderByQuery(
        [
          'created_at',
          'email',
          'first_name',
          'total_deliveries',
          'total_rating',
        ] as const,
        'created_at'
      ),
      t.Object({
        status: t.Optional(t.String()),
        vehicleType: t.Optional(t.String()),
        isAvailable: t.Optional(t.Boolean()),
        isVerified: t.Optional(t.Boolean()),
      }),
    ]),
  },
  available: {
    query: t.Object({
      limit: t.Optional(t.Numeric({ default: 10 })),
      vehicleType: t.Optional(t.String()),
      minRating: t.Optional(t.Numeric()),
    }),
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
      passwordHash: t.String(),
      firstName: t.String(),
      lastName: t.String(),
      phone: t.String(),
      cpf: t.String(),
      vehicleType: t.String(),
      licensePlate: t.Optional(t.String()),
      status: t.String({ default: 'pending' }),
      isAvailable: t.Optional(t.Boolean({ default: false })),
      isVerified: t.Optional(t.Boolean({ default: false })),
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
        vehicleType: t.String(),
        vehiclePlate: t.String(),
        licenseNumber: t.String(),
        status: t.String(),
        isAvailable: t.Boolean(),
        isVerified: t.Boolean(),
      })
    ),
  },
  delete: {
    params: numericId,
  },
  updateLocation: {
    params: numericId,
    body: t.Object({
      latitude: t.Numeric(),
      longitude: t.Numeric(),
    }),
  },
  setAvailability: {
    params: numericId,
    body: t.Object({
      isAvailable: t.Boolean(),
    }),
  },
};
