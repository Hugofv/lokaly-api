/**
 * Admin Auth Validators
 * Elysia validators for admin authentication endpoints
 */

import { t } from 'elysia';

export const authValidators = {
  login: {
    body: t.Object({
      email: t.String(),
      passwordHash: t.String(), // already hashed on client side
    }),
  },
  refresh: {
    body: t.Object({
      refreshToken: t.String(),
    }),
  },
};
