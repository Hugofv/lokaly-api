/**
 * Admin Auth Controller
 * Authentication endpoints for admin users
 */

import { Elysia, type AnyElysia } from 'elysia';
import type { UsersService } from '@lokaly/domain';
import { JwtService, RBAC } from '@lokaly/auth';
import { jsonResponse, errorResponse } from '../../shared/responses';
import { authValidators } from './validators';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutos
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

// Return type deixado como Elysia genérico para evitar problemas de tipos profundos
export const authController = (
  usersService: UsersService,
  jwtService: JwtService
): AnyElysia =>
  new Elysia()
    .post(
      '/login',
      async ({ body }) => {
        try {
          const { email, passwordHash } = body;

          const user = await usersService.findByEmail(email);
          if (!user) {
            return errorResponse('Invalid credentials', 401);
          }

          if (user.passwordHash !== passwordHash) {
            return errorResponse('Invalid credentials', 401);
          }

          if (!RBAC.isAdmin(user.role as any)) {
            return errorResponse('Forbidden: Admin access required', 403);
          }

          if (!user.isActive) {
            return errorResponse('User is inactive', 403);
          }

          const accessToken = await jwtService.sign(
            {
              userId: String(user.id),
              role: user.role as any,
              email: user.email,
              tokenType: 'access',
            },
            ACCESS_TOKEN_TTL_SECONDS
          );

          const refreshToken = await jwtService.sign(
            {
              userId: String(user.id),
              role: user.role as any,
              email: user.email,
              tokenType: 'refresh',
            },
            REFRESH_TOKEN_TTL_SECONDS
          );

          return jsonResponse({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...authValidators.login,
        detail: {
          tags: ['Auth'],
          summary: 'Admin login',
          description:
            'Authenticate admin user and receive access/refresh tokens',
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  example: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    user: {
                      id: 1,
                      email: 'admin@lokaly.com',
                      role: 'super_admin',
                      firstName: 'Super',
                      lastName: 'Admin',
                    },
                  },
                },
              },
            },
            401: {
              description: 'Invalid credentials',
            },
            403: {
              description: 'User is inactive or not an admin',
            },
          },
        },
      }
    )
    .post(
      '/refresh',
      async ({ body }) => {
        try {
          const { refreshToken } = body;

          const payload = await jwtService.verify(refreshToken);
          if (!payload || payload.tokenType !== 'refresh') {
            return errorResponse('Invalid refresh token', 401);
          }

          // Garantir que continua sendo admin/super_admin
          if (!RBAC.isAdmin(payload.role)) {
            return errorResponse('Forbidden: Admin access required', 403);
          }

          const userIdNum = Number(payload.userId);
          if (!Number.isFinite(userIdNum)) {
            return errorResponse('Invalid token payload', 400);
          }

          const user = await usersService.findById(userIdNum);
          if (!user || !user.isActive) {
            return errorResponse('User not found or inactive', 403);
          }

          const newAccessToken = await jwtService.sign(
            {
              userId: String(user.id),
              role: user.role as any,
              email: user.email,
              tokenType: 'access',
            },
            ACCESS_TOKEN_TTL_SECONDS
          );

          // opcionalmente, podemos rotacionar o refresh token também
          const newRefreshToken = await jwtService.sign(
            {
              userId: String(user.id),
              role: user.role as any,
              email: user.email,
              tokenType: 'refresh',
            },
            REFRESH_TOKEN_TTL_SECONDS
          );

          return jsonResponse({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : 'Unknown error',
            500
          );
        }
      },
      {
        ...authValidators.refresh,
        detail: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description:
            'Get new access and refresh tokens using a valid refresh token',
          responses: {
            200: {
              description: 'Tokens refreshed successfully',
              content: {
                'application/json': {
                  example: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
            401: {
              description: 'Invalid or expired refresh token',
            },
            403: {
              description: 'User is inactive or not an admin',
            },
          },
        },
      }
    );
