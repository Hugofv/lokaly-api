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
      userValidators.list
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
      userValidators.search
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
      userValidators.byId
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
      userValidators.create
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
      userValidators.update
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
      userValidators.delete
    );
