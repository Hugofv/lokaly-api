/**
 * Users Routes
 * User management endpoints
 */

import { Elysia } from 'elysia';
import type { UsersService } from '@lokaly/domain';
import type { Context } from 'elysia';
import { jsonResponse, errorResponse } from './base';

export function createUsersRoutes(usersService: UsersService) {
  return new Elysia({ prefix: '/users' })
    .get('/', async ({ query }: Context) => {
      const limit = parseInt((query.limit as string) || '50', 10);
      const offset = parseInt((query.offset as string) || '0', 10);
      const orderBy = query.orderBy as
        | 'created_at'
        | 'email'
        | 'first_name'
        | undefined;
      const orderDirection = ((query.orderDirection as string) || 'desc') as
        | 'asc'
        | 'desc';

      const filters: Record<string, unknown> = {};
      if (query.role) filters.role = query.role;
      if (query.isActive !== undefined)
        filters.isActive = query.isActive === 'true';
      if (query.department) filters.department = query.department;

      try {
        const users = await usersService.findMany({
          limit,
          offset,
          orderBy,
          orderDirection,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });

        const total = await usersService.count(
          Object.keys(filters).length > 0 ? filters : undefined
        );

        return jsonResponse({
          data: users,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
          },
        });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    })
    .get('/search', async ({ query }: Context) => {
      const email = query.email as string | undefined;
      if (!email) {
        return errorResponse('Email parameter is required', 400);
      }

      try {
        const user = await usersService.findByEmail(email);
        if (!user) {
          return errorResponse('User not found', 404);
        }
        return jsonResponse(user);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    })
    .get('/:id', async ({ params }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid user ID', 400);
      }

      try {
        const user = await usersService.findById(id);
        if (!user) {
          return errorResponse('User not found', 404);
        }
        return jsonResponse(user);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    })
    .post('/', async ({ body }: Context) => {
      try {
        const user = await usersService.create(
          body as Parameters<typeof usersService.create>[0]
        );
        return jsonResponse(user, 201);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          400
        );
      }
    })
    .patch('/:id', async ({ params, body }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid user ID', 400);
      }

      try {
        const user = await usersService.update(
          id,
          body as Parameters<typeof usersService.update>[1]
        );
        if (!user) {
          return errorResponse('User not found', 404);
        }
        return jsonResponse(user);
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          400
        );
      }
    })
    .delete('/:id', async ({ params }: Context) => {
      const id = parseInt(params.id as string, 10);
      if (isNaN(id)) {
        return errorResponse('Invalid user ID', 400);
      }

      try {
        const deleted = await usersService.delete(id);
        if (!deleted) {
          return errorResponse('User not found', 404);
        }
        return jsonResponse({ success: true });
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      }
    });
}
