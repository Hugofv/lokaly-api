/**
 * Auth Plugin
 * Elysia plugin for authentication and authorization
 */

import { Elysia } from 'elysia';
import { JwtService, RBAC } from '@lokaly/auth';
import type { Context } from 'elysia';

function createAuthGuard(jwtService: JwtService) {
  return async ({ request, set }: Context) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const payload = await jwtService.verify(token);
    if (!payload) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Only allow admin roles on admin API
    if (!RBAC.isAdmin(payload.role)) {
      set.status = 403;
      return { error: 'Forbidden: Admin access required' };
    }

    // Auth is valid, continue
  };
}

function createAuthDerive(jwtService: JwtService) {
  return async ({ request }: Context) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return {};
    }

    const payload = await jwtService.verify(token);
    if (!payload) {
      return {};
    }

    // Return auth context to be added to context
    return {
      auth: {
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
      },
    };
  };
}

export const authPlugin = (jwtService: JwtService) =>
  new Elysia({ name: 'auth' })
    .derive(createAuthDerive(jwtService))
    .onBeforeHandle(createAuthGuard(jwtService));
