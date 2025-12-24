import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import type { UsersService } from '@lokaly/domain';
import { usersController } from './controller';

describe('admin-api usersController', () => {
  let mockService: Partial<UsersService>;
  let app: ReturnType<typeof usersController>;

  beforeEach(() => {
    mockService = {
      findMany: async () => [],
      count: async () => 0,
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({ id: 1 } as any),
      update: async () => null,
      delete: async () => false,
    };
    app = usersController(mockService as UsersService);
  });

  describe('GET /users', () => {
    it('should return paginated users list', async () => {
      mockService.findMany = async () =>
        [
          { id: 1, email: 'user1@test.com' },
          { id: 2, email: 'user2@test.com' },
        ] as any;
      mockService.count = async () => 10;

      const res = await app.handle(
        new Request('http://localhost/users?limit=2&offset=0')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        total: 10,
        limit: 2,
        offset: 0,
        hasMore: true,
      });
    });

    it('should apply filters correctly', async () => {
      mockService.findMany = async (opts) => {
        expect(opts?.filters?.role).toBe('admin');
        expect(opts?.filters?.isActive).toBe(true);
        return [] as any;
      };
      mockService.count = async () => 5;

      await app.handle(
        new Request('http://localhost/users?role=admin&isActive=true')
      );
    });

    it('should handle errors gracefully', async () => {
      mockService.findMany = async () => {
        throw new Error('Database error');
      };

      const res = await app.handle(new Request('http://localhost/users'));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Database error');
    });
  });

  describe('GET /users/search', () => {
    it('should return user by email', async () => {
      const user = { id: 1, email: 'test@test.com' };
      mockService.findByEmail = async () => user as any;

      const res = await app.handle(
        new Request('http://localhost/users/search?email=test@test.com')
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(user);
    });

    it('should return 404 when user not found', async () => {
      mockService.findByEmail = async () => null;

      const res = await app.handle(
        new Request('http://localhost/users/search?email=nonexistent@test.com')
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const user = { id: 1, email: 'test@test.com' };
      mockService.findById = async () => user as any;

      const res = await app.handle(new Request('http://localhost/users/1'));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(user);
    });

    it('should return 404 when user not found', async () => {
      mockService.findById = async () => null;

      const res = await app.handle(new Request('http://localhost/users/999'));

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const newUser = {
        id: 1,
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
      };
      mockService.create = async () => newUser as any;

      const res = await app.handle(
        new Request('http://localhost/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'new@test.com',
            passwordHash: 'hash123',
            firstName: 'New',
            lastName: 'User',
            role: 'admin',
          }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newUser);
    });

    it('should return 400 on validation error', async () => {
      mockService.create = async () => {
        throw new Error('Validation error');
      };

      const res = await app.handle(
        new Request('http://localhost/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid',
          }),
        })
      );

      // Elysia returns 422 for validation errors
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user', async () => {
      const updatedUser = { id: 1, email: 'updated@test.com' };
      mockService.update = async () => updatedUser as any;

      const res = await app.handle(
        new Request('http://localhost/users/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'updated@test.com' }),
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(updatedUser);
    });

    it('should return 404 when user not found', async () => {
      mockService.update = async () => null;

      const res = await app.handle(
        new Request('http://localhost/users/999', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'updated@test.com' }),
        })
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      mockService.delete = async () => true;

      const res = await app.handle(
        new Request('http://localhost/users/1', { method: 'DELETE' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('should return 404 when user not found', async () => {
      mockService.delete = async () => false;

      const res = await app.handle(
        new Request('http://localhost/users/999', { method: 'DELETE' })
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('User not found');
    });
  });
});
