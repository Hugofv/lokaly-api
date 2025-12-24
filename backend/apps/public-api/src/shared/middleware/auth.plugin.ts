/**
 * Public API Auth Plugin
 *
 * - JWT opcional para catálogo (deriva `auth` se presente e válido)
 * - Garante que apenas roles `customer` / `courier` são aceitos
 * - NÃO aplica guarda global; cada rota decide se auth é obrigatório
 */

import { Elysia } from 'elysia';
import { JwtService, RBAC } from '@lokaly/auth';
import type { Context } from 'elysia';

function createPublicAuthDerive(jwtService: JwtService) {
  return async ({ request }: Context) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return {};
    }

    const payload = await jwtService.verify(token);
    if (!payload || (payload.tokenType && payload.tokenType !== 'access')) {
      return {};
    }

    // Apenas usuários públicos (customer, courier) na public API
    if (!RBAC.isPublicUser(payload.role)) {
      return {};
    }

    return {
      auth: {
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
      },
    };
  };
}

export const publicAuthPlugin = (jwtService: JwtService) =>
  new Elysia({ name: 'public-auth' }).derive(
    createPublicAuthDerive(jwtService)
  );
