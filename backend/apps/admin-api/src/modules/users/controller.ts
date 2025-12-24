/**
 * Users Controller
 * User management endpoints
 */

import { Elysia } from 'elysia';
import type { UsersService } from '@lokaly/domain';
import {
  jsonResponse,
  errorResponse,
  paginatedResponse,
} from '../../shared/responses';
import { userValidators } from './validators';

export const usersController = (usersService: UsersService) =>
  new Elysia({ prefix: '/users' })
    .get(
      '/',
      async ({ query }) => {
        try {
          const limit = query.limit || 50;
          const offset = query.offset || 0;

          const users = await usersService.findMany({
            limit,
            offset,
            orderBy: query.orderBy,
            orderDirection: query.orderDirection || 'desc',
            filters: {
              ...(query.role && { role: query.role }),
              ...(query.isActive !== undefined && { isActive: query.isActive }),
              ...(query.department && { department: query.department }),
            },
          });

          const total = await usersService.count({
            ...(query.role && { role: query.role }),
            ...(query.isActive !== undefined && { isActive: query.isActive }),
            ...(query.department && { department: query.department }),
          });

          return paginatedResponse(users, total, limit, offset);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...userValidators.list,
        detail: {
          tags: ['Users'],
          summary: 'List users',
          description: 'Get paginated list of users with optional filters',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'List of users',
              content: {
                'application/json': {
                  example: {
                    data: [
                      {
                        id: 1,
                        email: 'admin@lokaly.com',
                        role: 'super_admin',
                        firstName: 'Super',
                        lastName: 'Admin',
                        isActive: true,
                      },
                    ],
                    pagination: {
                      total: 10,
                      limit: 50,
                      offset: 0,
                      hasMore: false,
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized',
            },
          },
        },
      }
    )
    .get(
      '/search',
      async ({ query }) => {
        try {
          const user = await usersService.findByEmail(query.email);
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
      },
      {
        ...userValidators.search,
        detail: {
          tags: ['Users'],
          summary: 'Search user by email',
          description: 'Find a user by email address',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User found' },
            404: { description: 'User not found' },
          },
        },
      }
    )
    .get(
      '/:id',
      async ({ params }) => {
        try {
          const user = await usersService.findById(params.id);
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
      },
      {
        ...userValidators.byId,
        detail: {
          tags: ['Users'],
          summary: 'Get user by ID',
          description: 'Get user details by ID',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User found' },
            404: { description: 'User not found' },
          },
        },
      }
    )
    .post(
      '/',
      async ({ body }) => {
        try {
          const user = await usersService.create(body);
          return jsonResponse(user, 201);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            400
          );
        }
      },
      {
        ...userValidators.create,
        detail: {
          tags: ['Users'],
          summary: 'Create user',
          description: 'Create a new admin user',
          security: [{ bearerAuth: [] }],
          responses: {
            201: { description: 'User created successfully' },
            400: { description: 'Validation error' },
          },
        },
      }
    )
    .patch(
      '/:id',
      async ({ params, body }) => {
        try {
          const user = await usersService.update(params.id, body);
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
      },
      {
        ...userValidators.update,
        detail: {
          tags: ['Users'],
          summary: 'Update user',
          description: 'Update user information',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User updated successfully' },
            404: { description: 'User not found' },
            400: { description: 'Validation error' },
          },
        },
      }
    )
    .delete(
      '/:id',
      async ({ params }) => {
        try {
          const deleted = await usersService.delete(params.id);
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
      },
      {
        ...userValidators.delete,
        detail: {
          tags: ['Users'],
          summary: 'Delete user',
          description: 'Delete a user (soft delete)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User deleted successfully' },
            404: { description: 'User not found' },
          },
        },
      }
    );
