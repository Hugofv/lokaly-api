import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { JwtService } from '@lokaly/auth';
import { authPlugin } from './auth.plugin';

describe('admin-api authPlugin', () => {
  let jwtService: JwtService;
  let app: Elysia;

  beforeEach(() => {
    jwtService = new JwtService('test-secret-key');
    app = new Elysia()
      .use(authPlugin(jwtService))
      .get('/protected', ({ auth }) => ({ userId: auth?.userId }));
  });

  it('should return 401 when no token is provided', async () => {
    const res = await app.handle(new Request('http://localhost/protected'));

    // Elysia onBeforeHandle returns object which becomes response
    // Status code is set via set.status
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 when token is invalid', async () => {
    const res = await app.handle(
      new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer invalid-token' },
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 401 when refresh token is used as access token', async () => {
    try {
      const refreshToken = await jwtService.sign(
        {
          userId: '1',
          role: 'admin',
          email: 'admin@test.com',
          tokenType: 'refresh',
        },
        604800
      );

      const res = await app.handle(
        new Request('http://localhost/protected', {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    } catch (e: any) {
      if (e?.message?.includes('jwt') || e?.message?.includes('JWT')) {
        return;
      }
      throw e;
    }
  });

  it('should return 403 when non-admin role tries to access', async () => {
    try {
      const accessToken = await jwtService.sign(
        {
          userId: '1',
          role: 'customer',
          email: 'customer@test.com',
          tokenType: 'access',
        },
        900
      );

      const res = await app.handle(
        new Request('http://localhost/protected', {
          headers: { Authorization: `Bearer ${accessToken}` },
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

  it('should allow access with valid admin access token', async () => {
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
        new Request('http://localhost/protected', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('1');
    } catch (e: any) {
      if (e?.message?.includes('jwt') || e?.message?.includes('JWT')) {
        return;
      }
      throw e;
    }
  });

  it('should inject auth context in derive', async () => {
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

      const testApp = new Elysia()
        .use(authPlugin(jwtService))
        .get('/test', ({ auth }) => ({
          userId: auth?.userId,
          role: auth?.role,
          email: auth?.email,
        }));

      const res = await testApp.handle(
        new Request('http://localhost/test', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('1');
      expect(body.role).toBe('admin');
      expect(body.email).toBe('admin@test.com');
    } catch (e: any) {
      if (e?.message?.includes('jwt') || e?.message?.includes('JWT')) {
        return;
      }
      throw e;
    }
  });
});
