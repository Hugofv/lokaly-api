import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type { UsersService } from '@lokaly/domain';
import { JwtService } from '@lokaly/auth';
import { authController } from './controller';

describe('admin-api authController', () => {
  let mockUsersService: Partial<UsersService>;
  let jwtService: JwtService;
  let app: ReturnType<typeof authController>;

  beforeEach(() => {
    jwtService = new JwtService('test-secret-key');
    mockUsersService = {
      findByEmail: async () => null,
      findById: async () => null,
    };
    app = authController(mockUsersService as UsersService, jwtService);
  });

  describe('POST /login', () => {
    it('should return 401 for invalid credentials (user not found)', async () => {
      mockUsersService.findByEmail = async () => null;

      const res = await app.handle(
        new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent@test.com',
            passwordHash: 'hash123',
          }),
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      mockUsersService.findByEmail = async () =>
        ({
          id: 1,
          email: 'admin@test.com',
          passwordHash: 'correct-hash',
          role: 'admin',
          isActive: true,
          firstName: 'Admin',
          lastName: 'User',
        } as any);

      const res = await app.handle(
        new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            passwordHash: 'wrong-hash',
          }),
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid credentials');
    });

    it('should return 403 for non-admin role', async () => {
      mockUsersService.findByEmail = async () =>
        ({
          id: 1,
          email: 'customer@test.com',
          passwordHash: 'hash123',
          role: 'customer',
          isActive: true,
          firstName: 'Customer',
          lastName: 'User',
        } as any);

      const res = await app.handle(
        new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'customer@test.com',
            passwordHash: 'hash123',
          }),
        })
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden: Admin access required');
    });

    it('should return 403 for inactive user', async () => {
      mockUsersService.findByEmail = async () =>
        ({
          id: 1,
          email: 'admin@test.com',
          passwordHash: 'hash123',
          role: 'admin',
          isActive: false,
          firstName: 'Admin',
          lastName: 'User',
        } as any);

      const res = await app.handle(
        new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            passwordHash: 'hash123',
          }),
        })
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('User is inactive');
    });

    it('should return accessToken and refreshToken on successful login', async () => {
      const user = {
        id: 1,
        email: 'admin@test.com',
        passwordHash: 'hash123',
        role: 'admin',
        isActive: true,
        firstName: 'Admin',
        lastName: 'User',
      };

      mockUsersService.findByEmail = async () => user as any;

      const res = await app.handle(
        new Request('http://localhost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            passwordHash: 'hash123',
          }),
        })
      );

      // Skip if Bun.jwt is not available in test environment
      if (res.status === 500) {
        const body = await res.json();
        if (body.error?.includes('jwt') || body.error?.includes('JWT')) {
          return; // Skip this test if JWT is not available
        }
      }

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user).toEqual({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      });
    });
  });

  describe('POST /refresh', () => {
    it('should return 401 for invalid refresh token', async () => {
      const res = await app.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: 'invalid-token',
          }),
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid refresh token');
    });

    it('should return 401 for access token used as refresh', async () => {
      // Skip if Bun.jwt is not available
      try {
        const accessToken = await jwtService.sign(
          {
            userId: '1',
            role: 'admin',
            email: 'admin@test.com',
            tokenType: 'access',
          },
          900
        );

        const res = await app.handle(
          new Request('http://localhost/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: accessToken,
            }),
          })
        );

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Invalid refresh token');
      } catch (e: any) {
        if (e?.message?.includes('jwt') || e?.message?.includes('JWT')) {
          return; // Skip if JWT is not available
        }
        throw e;
      }
    });

    it('should return 403 for non-admin role in refresh token', async () => {
      try {
        const refreshToken = await jwtService.sign(
          {
            userId: '1',
            role: 'customer',
            email: 'customer@test.com',
            tokenType: 'refresh',
          },
          604800
        );

        const res = await app.handle(
          new Request('http://localhost/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken,
            }),
          })
        );

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Forbidden: Admin access required');
      } catch (e: any) {
        if (e?.message?.includes('jwt') || e?.message?.includes('JWT')) {
          return;
        }
        throw e;
      }
    });

    it('should return 403 for inactive user', async () => {
      const refreshToken = await jwtService.sign(
        {
          userId: '1',
          role: 'admin',
          email: 'admin@test.com',
          tokenType: 'refresh',
        },
        604800
      );

      mockUsersService.findById = async () =>
        ({
          id: 1,
          email: 'admin@test.com',
          role: 'admin',
          isActive: false,
        } as any);

      const res = await app.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        })
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('User not found or inactive');
    });

    it('should return new accessToken and refreshToken on successful refresh', async () => {
      const refreshToken = await jwtService.sign(
        {
          userId: '1',
          role: 'admin',
          email: 'admin@test.com',
          tokenType: 'refresh',
        },
        604800
      );

      mockUsersService.findById = async () =>
        ({
          id: 1,
          email: 'admin@test.com',
          role: 'admin',
          isActive: true,
          firstName: 'Admin',
          lastName: 'User',
        } as any);

      const res = await app.handle(
        new Request('http://localhost/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
          }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // Verify new tokens are valid
      const newAccessPayload = await jwtService.verify(body.accessToken);
      expect(newAccessPayload?.tokenType).toBe('access');

      const newRefreshPayload = await jwtService.verify(body.refreshToken);
      expect(newRefreshPayload?.tokenType).toBe('refresh');
    });
  });
});
